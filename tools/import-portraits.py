"""Turns uploaded character pictures into the app's portraits.

    python3 tools/import-portraits.py [another/folder]

Portraits live in assets/characters, named by the id in the characters
table (AnimeQuiz_Characters.xlsx): `naruto-1.jpg` is the table's naruto-1,
Madara. To add or replace one, put `<table id>.png` in that folder — from
GitHub's "Add files via upload" is fine — and run this. It can also take
pictures from another folder, named the same way.

Each picture is made into a 1024x1024 JPEG of the same name: a transparent
margin is trimmed off (round artwork then fills the circle the app cuts
portraits to), what is still see-through becomes white, and it is squeezed
to about 200 KB. The uploaded PNG is then deleted — at 2-3 MB a picture,
150 of them would make the app 360 MB. Then the lookup table the app reads,
src/data/avatarImages.ts, is rewritten.

Which character a table id is comes from tools/portrait-ids.json, made
from the table (the app's own ids are different for 73 characters; the
table's naruto-1 is Madara, the app's is Naruto). A picture whose name is
not a table id, or is a character the app does not have, is reported and
left alone, and so is an upload that arrived empty.

Needs ImageMagick's `convert`.
"""
import json
import os
import re
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets', 'characters')
TABLE = os.path.join(ROOT, 'src', 'data', 'avatarImages.ts')
CATALOGUE = os.path.join(ROOT, 'src', 'data', 'characters.ts')
IDS = os.path.join(ROOT, 'tools', 'portrait-ids.json')

# 1024 keeps a portrait sharp at its largest (230pt in the quiz,
# at up to 3x, and a little more); 80 keeps one near 200-280 KB.
SIZE = '1024x1024'
QUALITY = '80'
PICTURES = ('.png', '.jpg', '.jpeg', '.webp')


def app_characters():
    """(id, name) in catalogue order."""
    source = open(CATALOGUE, encoding='utf-8').read()
    return re.findall(r"^\s*c\('([^']+)', '([^']+)'", source, re.M)


def convert_args(source, target):
    """
    The picture as a square JPEG.

    Round artwork often comes as a PNG whose corners are see-through, with
    the medallion not quite touching the edges. The app shows every
    portrait cut to a circle, so the transparent margin is trimmed off
    first (the medallion then fills the circle), the rest is centred on a
    square, and anything still see-through is filled with white — a JPEG
    has no transparency, and left alone those corners would turn black.
    """
    side = SIZE.split('x')[0]
    return [
        'convert', source,
        '-fuzz', '3%', '-trim', '+repage',
        '-resize', SIZE, '-gravity', 'center', '-background', 'white', '-extent', f'{side}x{side}',
        '-alpha', 'remove', '-alpha', 'off',
        '-strip', '-sampling-factor', '4:2:0', '-quality', QUALITY, target,
    ]


def write_table(ids):
    """The app's lookup: app character id -> its portrait, named by table id."""
    table_id_of = {v['app']: tid for tid, v in ids.items() if v['app']}
    text = open(TABLE, encoding='utf-8').read()
    head = text[: text.index('export const AVATAR_IMAGES')]
    lines, missing = [], []
    for cid, name in app_characters():
        tid = table_id_of.get(cid)
        if tid and os.path.exists(os.path.join(ASSETS, tid + '.jpg')):
            lines.append(f"  '{cid}': require('../../assets/characters/{tid}.jpg'),")
        else:
            missing.append(f'{tid or "(no table row)"} {name}')
    with open(TABLE, 'w', encoding='utf-8') as out:
        out.write(head + 'export const AVATAR_IMAGES: Record<string, ImageSourcePropType> = {\n' + '\n'.join(lines) + '\n};\n')
    return len(lines), missing


def main():
    ids = json.load(open(IDS, encoding='utf-8'))
    sources = [ASSETS] + sys.argv[1:]

    added, skipped = [], []
    for folder in sources:
        for file in sorted(os.listdir(folder)):
            stem, ext = os.path.splitext(file)
            path = os.path.join(folder, file)
            # In the portraits folder only an upload is new; the .jpg files are the portraits themselves.
            if ext.lower() not in PICTURES or (folder == ASSETS and ext.lower() == '.jpg'):
                continue
            entry = ids.get(stem)
            if os.path.getsize(path) < 1024:
                skipped.append(f'{file}: arrived empty ({os.path.getsize(path)} bytes), upload it again')
                continue
            if not entry:
                skipped.append(f'{file}: "{stem}" is not an id in the characters table')
                continue
            if not entry['app']:
                skipped.append(f'{file}: {entry["name"]} ({entry["anime"]}) is not a character in the app')
                continue
            subprocess.run(convert_args(path, os.path.join(ASSETS, stem + '.jpg')), check=True)
            if folder == ASSETS:
                os.remove(path)
            added.append(f'{file} -> {stem}.jpg ({entry["name"]})')

    total, missing = write_table(ids)
    print(f'{len(added)} portrait(s) added:')
    for line in added:
        print('  ' + line)
    if skipped:
        print(f'{len(skipped)} file(s) left out:')
        for line in skipped:
            print('  ' + line)
    print(f'{total} of {len(app_characters())} characters have a portrait.')
    if missing:
        print('Still without one:')
        for line in missing:
            print('  ' + line)


if __name__ == '__main__':
    main()
