"""Regenerates animeSeries.ts and characters.ts from the supplied workbook.

Two rules shape the output:

  * Characters already in the app keep their existing ids. A character id is
    not a private detail — it is stored in every player's profile as their
    favourite, it keys the pre-rendered avatar PNGs, and it keys the recorded
    quote audio. The workbook renumbers everything (its `naruto-1` is Madara,
    the app's is Naruto), so adopting its ids wholesale would silently change
    whose face a player picked and which voice line plays.

  * Rows the workbook itself flagged "⚠ проверить привязку к аниме" are left
    out. They carry no quote, ability or faction, which the app requires, and
    their series attribution is exactly what the flag doubts.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from xlsx import read  # noqa: E402  (needs the path above)

ROOT = os.path.dirname(HERE)

TIER_BY_LABEL = {
    'Новичок': 'novice',
    'Любитель': 'fan',
    'Отаку': 'otaku',
    'Эксперт': 'expert',
    # The workbook grades 15 characters "Хардкор", a sixth tier the app does
    # not have. Folded into expert on request, rather than adding a tier.
    'Хардкор': 'expert',
    'Легенда': 'legend',
}

GENDER_BY_LABEL = {'Мужской': 'male', 'Женский': 'female'}

# Spelling differs between the app and the workbook for these four; they are
# the same characters, so the app's id is kept.
ALIASES = {
    'л': 'l',
    'зенитsuагацума': 'зеницуагацума',
    'хисокаморроу': 'хисокамороу',
    'асуна': 'асунаюки',
}

# Typos in the workbook, corrected on the way in so a re-run does not undo
# the fix. "Кira" is a Cyrillic К followed by Latin "ira"; the same faction is
# spelled correctly on Misa's row two lines below it.
CORRECTIONS = {
    'Кira': 'Кира',
}

AVATAR_OVERRIDES = {
    'naruto-1': "{ hairStyle: 'spiky', hairColor: '#D9B24C' }",
    'op-1': "{ hairStyle: 'short', hairColor: '#2B2B33' }",
}


def cell(value):
    """Numbers arrive from the sheet as '2016.0'; years and counts are ints."""
    value = (value or '').strip()
    return str(int(float(value))) if re.fullmatch(r'-?\d+(\.0+)?', value) else value


def load(path):
    book = read(path)
    rows = []
    for r in book['Персонажи'][1:]:
        r = (r + [''] * 17)[:17]
        rows.append({
            'id': r[1].strip(), 'ru': r[2].strip(), 'en': r[3].strip(),
            'series_ru': r[4].strip(), 'gender': r[7].strip(), 'tier': r[8].strip(),
            'quote_ru': r[10].strip(), 'quote_en': r[11].strip(),
            'ability_ru': r[12].strip(), 'ability_en': r[13].strip(),
            'faction_ru': r[14].strip(), 'faction_en': r[15].strip(),
        })
    series = []
    for r in book['Аниме'][1:]:
        r = (r + [''] * 8)[:8]
        series.append({'id': r[1].strip(), 'ru': r[2].strip(), 'en': r[3].strip(),
                       'year': cell(r[4]), 'tags_ru': r[5].strip(), 'tags_en': r[6].strip()})
    return rows, series


def norm(name):
    return re.sub(r'[^а-яёa-z]', '', name.lower().replace('ё', 'е'))


def fix(value):
    return CORRECTIONS.get(value, value)


def ts(value):
    """A TypeScript string literal, quoted so nothing has to be escaped."""
    if "'" not in value:
        return "'" + value + "'"
    if '"' not in value:
        return '"' + value + '"'
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"


def main():
    if len(sys.argv) < 2:
        print(f'usage: python3 {sys.argv[0]} <workbook.xlsx>')
        return 1
    rows, series_rows = load(sys.argv[1])

    src = open(f'{ROOT}/src/data/characters.ts').read()
    app = [
        {'id': m.group(1), 'ru': m.group(2)}
        for m in re.finditer(r"^\s*c\('([^']+)', '((?:[^'\\]|\\.)*)', '([^']+)'", src, re.M)
    ]
    app_ids = {c['id'] for c in app}
    app_by_name = {norm(c['ru']): c['id'] for c in app}
    for app_name, sheet_name in ALIASES.items():
        if app_name in app_by_name:
            app_by_name[sheet_name] = app_by_name[app_name]

    skipped = [r for r in rows if not (r['quote_ru'] and r['ability_ru'] and r['faction_ru'])]
    usable = [r for r in rows if r not in skipped]

    # --- assign ids
    taken = set()
    assigned = {}
    for row in usable:
        existing = app_by_name.get(norm(row['ru']))
        if existing:
            assigned[row['id']] = existing
            taken.add(existing)

    def free_id(series_id):
        n = 1
        while f'{series_id}-{n}' in taken or f'{series_id}-{n}' in app_ids:
            n += 1
        return f'{series_id}-{n}'

    series_of = {s['ru']: s['id'] for s in series_rows}
    renumbered = []
    for row in usable:
        if row['id'] in assigned:
            continue
        series_id = series_of[row['series_ru']]
        wanted = row['id']
        if wanted in taken or wanted in app_ids:
            wanted = free_id(series_id)
            renumbered.append((row['id'], wanted, row['ru']))
        assigned[row['id']] = wanted
        taken.add(wanted)

    # --- series that still have characters
    used_series = {series_of[r['series_ru']] for r in usable}
    kept_series = [s for s in series_rows if s['id'] in used_series]
    dropped_series = [s for s in series_rows if s['id'] not in used_series]

    by_series = {}
    for row in usable:
        by_series.setdefault(series_of[row['series_ru']], []).append(row)

    tier_order = ['novice', 'fan', 'otaku', 'expert', 'legend']
    for group in by_series.values():
        group.sort(key=lambda r: tier_order.index(TIER_BY_LABEL[r['tier']]))

    write_series(kept_series)
    write_characters(kept_series, by_series, assigned)

    print(f'series: {len(kept_series)} kept, {len(dropped_series)} dropped '
          f'({", ".join(s["id"] for s in dropped_series) or "none"})')
    print(f'characters: {len(usable)} written, {len(skipped)} skipped')
    for row in skipped:
        print(f'   skipped {row["id"]:16} {row["ru"]}')
    print(f'ids kept from the app: {len([r for r in usable if assigned[r["id"]] in app_ids])}')
    print(f'ids renumbered to avoid a collision: {len(renumbered)}')
    for old, new, name in renumbered:
        print(f'   {old:16} -> {new:16} {name}')
    missing = app_ids - set(assigned.values())
    print(f'app ids no longer used: {sorted(missing) if missing else "none"}')
    return 0


def write_series(kept):
    lines = [
        "import { Language } from '../i18n/LanguageContext';",
        "import { pick } from './localize';",
        '',
        'export type AnimeSeries = {',
        '  id: string;',
        '  title: string;',
        '  year: number;',
        '  tags: string[];',
        '};',
        '',
        'export const ANIME_SERIES: AnimeSeries[] = [',
    ]
    for s in kept:
        tags = ', '.join(ts(t.strip()) for t in s['tags_ru'].split(','))
        lines.append(f"  {{ id: {ts(s['id'])}, title: {ts(s['ru'])}, year: {s['year']}, tags: [{tags}] }},")
    lines += [
        '];',
        '',
        'const SERIES_EN: Record<string, { title: string; tags: string[] }> = {',
    ]
    for s in kept:
        tags = ', '.join(ts(t.strip()) for t in s['tags_en'].split(','))
        key = s['id'] if re.fullmatch(r'[a-z][a-z0-9]*', s['id']) else ts(s['id'])
        lines.append(f"  {key}: {{ title: {ts(s['en'])}, tags: [{tags}] }},")
    lines += [
        '};',
        '',
        'export function seriesTitle(series: AnimeSeries, lang: Language): string {',
        '  return pick(series.title, SERIES_EN[series.id]?.title, lang);',
        '}',
        '',
        "/** The genre tags, in the reader's language. The English table already",
        ' * carries them; this is the only way out of the module. */',
        'export function seriesTags(series: AnimeSeries, lang: Language): string[] {',
        "  const english = SERIES_EN[series.id]?.tags;",
        "  return lang === 'en' && english ? english : series.tags;",
        '}',
        '',
        'export function seriesTitleById(id: string, lang: Language): string {',
        '  const series = ANIME_SERIES.find((s) => s.id === id);',
        '  return series ? seriesTitle(series, lang) : id;',
        '}',
    ]
    open(f'{ROOT}/src/data/animeSeries.ts', 'w').write('\n'.join(lines) + '\n')


def write_characters(kept_series, by_series, assigned):
    head = open(f'{ROOT}/src/data/characters.ts').read()
    prologue = head[:head.index('export const CHARACTERS: Character[] = [')]

    lines = [prologue.rstrip('\n'), '', 'export const CHARACTERS: Character[] = [']
    for s in kept_series:
        group = by_series.get(s['id'], [])
        if not group:
            continue
        lines.append(f"  // {s['ru']}")
        for row in group:
            cid = assigned[row['id']]
            override = AVATAR_OVERRIDES.get(cid)
            parts = [
                ts(cid),
                ts(fix(row['ru'])),
                ts(s['id']),
                ts(GENDER_BY_LABEL[row['gender']]),
                ts(TIER_BY_LABEL[row['tier']]),
                ts(fix(row['quote_ru'])),
                ts(fix(row['ability_ru'])),
                ts(fix(row['faction_ru'])),
            ]
            if override:
                parts.append(override)
            lines.append(f"  c({', '.join(parts)}),")
        lines.append('')
    if lines[-1] == '':
        lines.pop()
    lines += [
        '];',
        '',
        'export function getCharacter(id: string): Character | undefined {',
        '  return CHARACTERS.find((ch) => ch.id === id);',
        '}',
        '',
        'type CharacterEn = { name: string; quote: string; ability: string; faction: string };',
        '',
        'const CHARACTER_EN: Record<string, CharacterEn> = {',
    ]
    for s in kept_series:
        group = by_series.get(s['id'], [])
        if not group:
            continue
        for row in group:
            cid = assigned[row['id']]
            key = cid if re.fullmatch(r'[a-z][a-z0-9]*', cid) else ts(cid)
            lines.append(
                f"  {key}: {{ name: {ts(row['en'])}, quote: {ts(row['quote_en'])}, "
                f"ability: {ts(row['ability_en'])}, faction: {ts(row['faction_en'])} }},"
            )
        lines.append('')
    if lines[-1] == '':
        lines.pop()
    lines += [
        '};',
        '',
        'export function localizeCharacter(c: Character, lang: Language): CharacterEn {',
        '  const en = CHARACTER_EN[c.id];',
        '  return {',
        '    name: pick(c.name, en?.name, lang),',
        '    quote: pick(c.quote, en?.quote, lang),',
        '    ability: pick(c.ability, en?.ability, lang),',
        '    faction: pick(c.faction, en?.faction, lang),',
        '  };',
        '}',
        '',
        'export function characterName(c: Character, lang: Language): string {',
        '  return pick(c.name, CHARACTER_EN[c.id]?.name, lang);',
        '}',
    ]
    open(f'{ROOT}/src/data/characters.ts', 'w').write('\n'.join(lines) + '\n')


if __name__ == '__main__':
    sys.exit(main())
