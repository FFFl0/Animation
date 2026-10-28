import { CLEAR_SHARE, TIERS, isTierUnlocked, getTier } from '../difficulty';

describe('difficulty tier unlocking', () => {
  it('novice and fan are always unlocked', () => {
    expect(isTierUnlocked('novice', {})).toBe(true);
    expect(isTierUnlocked('fan', {})).toBe(true);
  });

  it('otaku has no prerequisite either', () => {
    expect(isTierUnlocked('otaku', {})).toBe(true);
  });

  it('expert requires clearing 60% of otaku', () => {
    expect(isTierUnlocked('expert', { otaku: CLEAR_SHARE - 0.01 })).toBe(false);
    expect(isTierUnlocked('expert', { otaku: CLEAR_SHARE })).toBe(true);
  });

  it('legend requires clearing 60% of expert', () => {
    expect(isTierUnlocked('legend', { expert: CLEAR_SHARE - 0.01 })).toBe(false);
    expect(isTierUnlocked('legend', { expert: CLEAR_SHARE })).toBe(true);
  });

  // The shares are what makes a short round and a long one comparable.
  it('judges a short round and a long one by the same bar', () => {
    const sixOfTen = 6 / 10;
    const nineOfFifteen = 9 / 15;
    expect(isTierUnlocked('expert', { otaku: sixOfTen })).toBe(true);
    expect(isTierUnlocked('legend', { expert: nineOfFifteen })).toBe(true);
    expect(isTierUnlocked('expert', { otaku: 5 / 10 })).toBe(false);
  });

  it('missing prerequisite score defaults to zero (locked)', () => {
    expect(isTierUnlocked('expert', {})).toBe(false);
  });
});

describe('the ladder of round lengths', () => {
  it('gets longer at every step up', () => {
    const lengths = TIERS.map((t) => t.questionsPerRound);
    for (let i = 1; i < lengths.length; i += 1) {
      expect(lengths[i]).toBeGreaterThan(lengths[i - 1]);
    }
  });

  // The flat eleven is what this replaced; a round of one or of fifty is
  // neither a warm-up nor a test.
  it('keeps every round a sensible length, and none of them equal', () => {
    const lengths = TIERS.map((t) => t.questionsPerRound);
    expect(new Set(lengths).size).toBe(lengths.length);
    for (const n of lengths) {
      expect(n).toBeGreaterThanOrEqual(5);
      expect(n).toBeLessThanOrEqual(25);
    }
  });

  it('asks for more right answers to clear a longer tier', () => {
    const thresholds = TIERS.map((t) => Math.ceil(t.questionsPerRound * 0.6));
    for (let i = 1; i < thresholds.length; i += 1) {
      expect(thresholds[i]).toBeGreaterThanOrEqual(thresholds[i - 1]);
    }
  });

  it('can be cleared at all: the bar is below a perfect round', () => {
    for (const tier of TIERS) {
      expect(Math.ceil(tier.questionsPerRound * 0.6)).toBeLessThan(tier.questionsPerRound);
    }
  });
});
