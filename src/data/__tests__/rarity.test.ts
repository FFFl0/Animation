import {
  ACHIEVEMENTS,
  ACHIEVEMENT_RARITIES,
  rarestUnlocked,
  rarityRank,
} from '../achievements';

describe('achievement rarity', () => {
  it('is declared for every achievement, from the known set', () => {
    for (const a of ACHIEVEMENTS) {
      expect(ACHIEVEMENT_RARITIES).toContain(a.rarity);
    }
  });

  it('ranks the four levels in order', () => {
    expect(rarityRank('common')).toBeLessThan(rarityRank('rare'));
    expect(rarityRank('rare')).toBeLessThan(rarityRank('epic'));
    expect(rarityRank('epic')).toBeLessThan(rarityRank('legendary'));
  });

  it('has something at every level, or the scale is decoration', () => {
    for (const rarity of ACHIEVEMENT_RARITIES) {
      expect(ACHIEVEMENTS.some((a) => a.rarity === rarity)).toBe(true);
    }
  });
});

describe('rarestUnlocked', () => {
  it('puts the rarest first', () => {
    const picked = rarestUnlocked(['first-steps', 'thousand-correct', 'dedicated']);
    expect(picked.map((a) => a.id)).toEqual(['thousand-correct', 'dedicated', 'first-steps']);
  });

  it('shows at most three by default', () => {
    expect(rarestUnlocked(ACHIEVEMENTS.map((a) => a.id))).toHaveLength(3);
  });

  it('honours a different limit', () => {
    expect(rarestUnlocked(ACHIEVEMENTS.map((a) => a.id), 1)).toHaveLength(1);
    expect(rarestUnlocked(ACHIEVEMENTS.map((a) => a.id), 0)).toHaveLength(0);
  });

  it('returns only what the player actually earned', () => {
    const picked = rarestUnlocked(['curious']);
    expect(picked.map((a) => a.id)).toEqual(['curious']);
  });

  it('is empty for a player with nothing', () => {
    expect(rarestUnlocked([])).toEqual([]);
  });

  it('ignores an id that is not in the catalogue', () => {
    expect(rarestUnlocked(['no-such-achievement', 'curious']).map((a) => a.id)).toEqual(['curious']);
  });

  // The same three should stay in the same places between visits.
  it('breaks ties by catalogue order, so the row is stable', () => {
    const sameRarity = ACHIEVEMENTS.filter((a) => a.rarity === 'rare').map((a) => a.id);
    const forwards = rarestUnlocked(sameRarity, 3).map((a) => a.id);
    const backwards = rarestUnlocked([...sameRarity].reverse(), 3).map((a) => a.id);
    expect(backwards).toEqual(forwards);
  });
});
