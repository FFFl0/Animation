"""Minimal xlsx reader: a workbook is a zip of XML, and the stdlib has both."""
import re, sys, zipfile
import xml.etree.ElementTree as ET

NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
REL = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}'


def col_index(ref):
    letters = re.match(r'[A-Z]+', ref).group(0)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def read(path):
    z = zipfile.ZipFile(path)

    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        root = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in root.findall(f'{NS}si'):
            shared.append(''.join(t.text or '' for t in si.iter(f'{NS}t')))

    wb = ET.fromstring(z.read('xl/workbook.xml'))
    rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    target = {r.get('Id'): r.get('Target') for r in rels}

    sheets = []
    for sh in wb.find(f'{NS}sheets'):
        name = sh.get('name')
        tgt = target[sh.get(f'{REL}id')]
        if not tgt.startswith('xl/'):
            tgt = 'xl/' + tgt.lstrip('/')
        sheets.append((name, tgt))

    out = {}
    for name, tgt in sheets:
        root = ET.fromstring(z.read(tgt))
        rows = []
        for row in root.iter(f'{NS}row'):
            cells = {}
            for c in row.findall(f'{NS}c'):
                ref, typ = c.get('r'), c.get('t')
                if typ == 'inlineStr':
                    is_el = c.find(f'{NS}is')
                    value = ''.join(t.text or '' for t in is_el.iter(f'{NS}t')) if is_el is not None else ''
                else:
                    v = c.find(f'{NS}v')
                    if v is None:
                        continue
                    value = shared[int(v.text)] if typ == 's' else (v.text or '')
                cells[col_index(ref)] = value
            if cells:
                width = max(cells) + 1
                rows.append([cells.get(i, '') for i in range(width)])
        out[name] = rows
    return out


if __name__ == '__main__':
    book = read(sys.argv[1])
    for name, rows in book.items():
        print(f'--- {name}: {len(rows)} rows, widest {max((len(r) for r in rows), default=0)}')
        for r in rows[:3]:
            print('   ', r[:8])
