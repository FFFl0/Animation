import { ANIME_SERIES, seriesTags, seriesTitle, seriesTitleById } from '../animeSeries';
import { CHARACTERS, characterName } from '../characters';
import { TIERS } from '../difficulty';

/**
 * The About screen lists every series and every character. These are the
 * invariants that list relies on: an orphaned character would silently vanish
 * from it, and a series with nobody in it would render an empty heading.
 */
describe('the content catalogue', () => {
  it('has a series for every character', () => {
    const ids = new Set(ANIME_SERIES.map((s) => s.id));
    const orphans = CHARACTERS.filter((c) => !ids.has(c.seriesId)).map((c) => c.id);
    expect(orphans).toEqual([]);
  });

  it('has at least one character for every series', () => {
    const empty = ANIME_SERIES.filter((s) => !CHARACTERS.some((c) => c.seriesId === s.id)).map((s) => s.id);
    expect(empty).toEqual([]);
  });

  it('loses nobody when the characters are grouped by series', () => {
    const grouped = ANIME_SERIES.reduce(
      (sum, s) => sum + CHARACTERS.filter((c) => c.seriesId === s.id).length,
      0
    );
    expect(grouped).toBe(CHARACTERS.length);
  });

  it('has unique ids', () => {
    expect(new Set(ANIME_SERIES.map((s) => s.id)).size).toBe(ANIME_SERIES.length);
    expect(new Set(CHARACTERS.map((c) => c.id)).size).toBe(CHARACTERS.length);
  });

  it('gives every character a tier the difficulty table knows', () => {
    const tiers = new Set(TIERS.map((t) => t.id));
    const unknown = CHARACTERS.filter((c) => !tiers.has(c.tier)).map((c) => c.id);
    expect(unknown).toEqual([]);
  });

  it('names every series and character in both languages', () => {
    for (const series of ANIME_SERIES) {
      expect(seriesTitle(series, 'ru').trim().length).toBeGreaterThan(0);
      expect(seriesTitle(series, 'en').trim().length).toBeGreaterThan(0);
    }
    for (const character of CHARACTERS) {
      expect(characterName(character, 'ru').trim().length).toBeGreaterThan(0);
      expect(characterName(character, 'en').trim().length).toBeGreaterThan(0);
    }
  });

  it('gives every series a year and at least one tag in both languages', () => {
    for (const series of ANIME_SERIES) {
      expect(series.year).toBeGreaterThan(1960);
      expect(seriesTags(series, 'ru').length).toBeGreaterThan(0);
      expect(seriesTags(series, 'en').length).toBeGreaterThan(0);
    }
  });

  it('resolves a series title by id, and falls back to the id when there is none', () => {
    expect(seriesTitleById('naruto', 'en')).toBe('Naruto');
    expect(seriesTitleById('not-a-series', 'ru')).toBe('not-a-series');
  });
});
