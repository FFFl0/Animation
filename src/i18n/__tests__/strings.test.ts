import { getT } from '../strings';

const ru = getT('ru');
const en = getT('en');

describe('round counts', () => {
  // Russian picks a different form for 1, for 2-4, and for everything else,
  // with the teens all taking the last one.
  it.each([
    [1, 'раунд'],
    [2, 'раунда'],
    [4, 'раунда'],
    [5, 'раундов'],
    [11, 'раундов'],
    [14, 'раундов'],
    [21, 'раунд'],
    [22, 'раунда'],
    [25, 'раундов'],
    [111, 'раундов'],
    [0, 'раундов'],
  ])('says %i раунд(а/ов) correctly', (count, form) => {
    expect(ru('categoryStats.tierLine', count, 80)).toContain(`${count} ${form} ·`);
  });

  it('keeps English to the one plural it has', () => {
    expect(en('categoryStats.tierLine', 1, 80)).toContain('1 round ·');
    expect(en('categoryStats.tierLine', 2, 80)).toContain('2 rounds ·');
  });
});

describe('the category stats page', () => {
  it('has every string it renders, in both languages', () => {
    const keys = [
      'back',
      'rounds',
      'accuracy',
      'correct',
      'answersTitle',
      'byDifficulty',
      'tierUnplayed',
      'tierLocked',
      'best',
      'emptyTitle',
      'emptyText',
      'play',
    ];
    for (const key of keys) {
      for (const t of [ru, en]) {
        const value = t(`categoryStats.${key}`);
        // A missing key comes back as the path itself.
        expect(value).not.toBe(`categoryStats.${key}`);
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });

  it('fills in the counted strings', () => {
    expect(ru('categoryStats.answersOf', 94, 121)).toBe('94 из 121');
    expect(en('categoryStats.answersOf', 94, 121)).toBe('94 of 121');
    expect(ru('categoryStats.shareLine', 69)).toContain('69%');
    expect(en('categoryStats.shareLine', 69)).toContain('69%');
  });
});
