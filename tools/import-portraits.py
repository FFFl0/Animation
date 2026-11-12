"""Adds drawn character portraits to the app.

    python3 tools/import-portraits.py path/to/folder path/to/AnimeQuiz_Characters.xlsx

The folder holds one picture per character, named by the workbook's id —
`naruto-1.png`, `csm-6.png` and so on. Those ids are the workbook's own row
numbers, not the app's (the workbook's `naruto-1` is Madara; the app's is
Naruto), so each file is matched to a character by name through the
workbook, the same way import-characters.py matches rows.

Each match is scaled to 512x512 and saved as `assets/characters/<app id>.jpg`,
replacing a generated placeholder PNG if there was one, and the lookup table
in src/data/avatarImages.ts is rewritten to cover whatever is in the folder
now. A file that matches no character in the app is listed and left alone.

Needs ImageMagick's `convert`.
"""
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from xlsx import read  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets', 'characters')
TABLE = os.path.join(ROOT, 'src', 'data', 'avatarImages.ts')
CATALOGUE = os.path.join(ROOT, 'src', 'data', 'characters.ts')

# The same spelling differences import-characters.py knows about.
ALIASES = {'л': 'l', 'зенитsuагацума': 'зеницуагацума', 'хисокаморроу': 'хисокамороу', 'асуна': 'асунаюки'}

# 512 is enough for the largest place a portrait is drawn (140pt in the quiz,
# at up to 3x); 84 keeps a portrait near 90 KB.
SIZE = '512x512'
QUALITY = '84'


def norm(name):
    key = re.sub(r'[^а-яёa-z]', '', name.lower().replace('ё', 'е'))
    return ALIASES.get(key, key)


def app_characters():
    """(id, name) in catalogue order."""
    source = open(CATALOGUE, encoding='utf-8').read()
    return re.findall(r"^\s*c\('([^']+)', '([^']+)'", source, re.M)


def write_table(order):
    files = {f[:-4]: f[-4:] for f in os.listdir(ASSETS) if f.endswith(('.png', '.jpg'))}
    text = open(TABLE, encoding='utf-8').read()
    head = text[: text.index('export const AVATAR_IMAGES')]
    body = '\n'.join(
        f"  '{cid}': require('../../assets/characters/{cid}{files[cid]}')," for cid in order if cid in files
    )
    with open(TABLE, 'w', encoding='utf-8') as out:
        out.write(head + 'export const AVATAR_IMAGES: Record<string, ImageSourcePropType> = {\n' + body + '\n};\n')
    return sum(1 for cid in order if cid in files)


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    folder, workbook = sys.argv[1], sys.argv[2]

    sheet = {}
    for row in read(workbook)['Персонажи'][1:]:
        row = (row + [''] * 3)[:3]
        if row[1].strip():
            sheet[row[1].strip()] = row[2].strip()

    characters = app_characters()
    by_name = {}
    for cid, name in characters:
        by_name.setdefault(norm(name), []).append(cid)

    added, skipped = [], []
    for file in sorted(os.listdir(folder)):
        stem, ext = os.path.splitext(file)
        if ext.lower() not in ('.png', '.jpg', '.jpeg', '.webp'):
            continue
        name = sheet.get(stem)
        targets = by_name.get(norm(name), []) if name else []
        if len(targets) != 1:
            skipped.append(f'{file}: ' + (f'"{name}" is not a character in the app' if name else 'not an id in the workbook'))
            continue
        cid = targets[0]
        subprocess.run(
            ['convert', os.path.join(folder, file), '-resize', SIZE, '-strip', '-sampling-factor', '4:2:0',
             '-quality', QUALITY, os.path.join(ASSETS, cid + '.jpg')],
            check=True,
        )
        placeholder = os.path.join(ASSETS, cid + '.png')
        if os.path.exists(placeholder):
            os.remove(placeholder)
        added.append(f'{file} -> {cid} ({name})')

    total = write_table([cid for cid, _ in characters])
    print(f'{len(added)} portrait(s) added:')
    for line in added:
        print('  ' + line)
    if skipped:
        print(f'{len(skipped)} file(s) left out:')
        for line in skipped:
            print('  ' + line)
    print(f'{total} of {len(characters)} characters now have a picture.')


if __name__ == '__main__':
    main()
