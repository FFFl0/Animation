import { TIERS, isTierUnlocked, getTier } from '../difficulty';

describe('difficulty tier unlocking', () => {
  it('novice and fan are always unlocked', () => {
    expect(isTierUnlocked('novice', {})).toBe(true);
    expect(isTierUnlocked('fan', {})).toBe(true);
  });

  it('otaku has no prerequisite either', () => {
    expect(isTierUnlocked('otaku', {})).toBe(true);
  });

  it('expert requires clearing 60% of otaku', () => {
    const threshold = Math.ceil(getTier('otaku').questionsPerRound * 0.6);
    expect(isTierUnlocked('expert', { otaku: threshold - 1 })).toBe(false);
    expect(isTierUnlocked('expert', { otaku: threshold })).toBe(true);
  });

  it('legend requires clearing 60% of expert', () => {
    const threshold = Math.ceil(getTier('expert').questionsPerRound * 0.6);
    expect(isTierUnlocked('legend', { expert: threshold - 1 })).toBe(false);
    expect(isTierUnlocked('legend', { expert: threshold })).toBe(true);
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
