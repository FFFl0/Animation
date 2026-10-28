import { ModeStat, Profile, ZERO_STAT } from '../../auth/types';
import {
  accuracyOf,
  bestRound,
  categoryGamesPlayed,
  categoryShare,
  categoryStat,
  categoryStatsKeys,
  sumStats,
} from '../statsSummary';

function stat(over: Partial<ModeStat> = {}): ModeStat {
  return { ...ZERO_STAT, ...over };
}

function profileWith(stats: Record<string, ModeStat>): Profile {
  return { stats } as unknown as Profile;
}

describe('sumStats', () => {
  it('adds the counts up', () => {
    const total = sumStats([
      stat({ gamesPlayed: 2, totalCorrect: 8, totalQuestions: 10 }),
      stat({ gamesPlayed: 3, totalCorrect: 15, totalQuestions: 20 }),
    ]);
    expect(total).toMatchObject({ gamesPlayed: 5, totalCorrect: 23, totalQuestions: 30 });
  });

  // Two rounds of 9 is not a best of 18.
  it('takes the best round rather than adding the best scores', () => {
    const rolled = sumStats([
      stat({ gamesPlayed: 1, bestScore: 9, bestOutOf: 10 }),
      stat({ gamesPlayed: 1, bestScore: 7, bestOutOf: 10 }),
    ]);
    expect(rolled.bestScore).toBe(9);
    expect(rolled.bestOutOf).toBe(10);
  });

  // Rounds are different lengths per tier, so the bigger number is not
  // automatically the better round.
  it('prefers the larger share over the larger score', () => {
    const rolled = sumStats([
      stat({ gamesPlayed: 1, bestScore: 9, bestOutOf: 15 }),
      stat({ gamesPlayed: 1, bestScore: 6, bestOutOf: 6 }),
    ]);
    expect(rolled.bestScore).toBe(6);
    expect(rolled.bestOutOf).toBe(6);
  });

  it('ignores a tier that was never played', () => {
    const rolled = sumStats([stat({ gamesPlayed: 0 }), stat({ gamesPlayed: 2, bestScore: 4, bestOutOf: 8 })]);
    expect(rolled.bestScore).toBe(4);
    expect(rolled.bestOutOf).toBe(8);
  });

  it('is all zeroes for nothing at all', () => {
    expect(sumStats([])).toEqual(ZERO_STAT);
  });
});

describe('accuracyOf', () => {
  it('rounds to whole percent', () => {
    expect(accuracyOf(stat({ totalCorrect: 2, totalQuestions: 3 }))).toBe(67);
  });

  it('is zero before anything is answered, not a division by zero', () => {
    expect(accuracyOf(ZERO_STAT)).toBe(0);
    expect(Number.isNaN(accuracyOf(ZERO_STAT))).toBe(false);
  });
});

describe('categoryStatsKeys', () => {
  it('gives an ordinary category one key per difficulty', () => {
    const keys = categoryStatsKeys('anime');
    expect(keys).toHaveLength(5);
    expect(keys).toContain('cat:anime:novice');
    expect(keys).toContain('cat:anime:legend');
  });

  // These two are never played at a chosen difficulty, so they record under
  // one plain key and reading them per tier would always find nothing.
  it('gives the hard-only and mixed categories a single plain key', () => {
    expect(categoryStatsKeys('hard')).toEqual(['cat:hard']);
    expect(categoryStatsKeys('mixed')).toEqual(['cat:mixed']);
  });
});

describe('categoryStat', () => {
  it('rolls every difficulty of one category together', () => {
    const profile = profileWith({
      'cat:anime:novice': stat({ gamesPlayed: 2, bestScore: 9, totalCorrect: 18, totalQuestions: 22 }),
      'cat:anime:fan': stat({ gamesPlayed: 1, bestScore: 11, totalCorrect: 11, totalQuestions: 11 }),
      'cat:quotes:novice': stat({ gamesPlayed: 5, bestScore: 10, totalCorrect: 40, totalQuestions: 55 }),
    });
    expect(categoryStat(profile, 'anime')).toEqual({
      gamesPlayed: 3,
      bestScore: 11,
      // Kept without a length, so read against its own score: a round of
      // eleven, not the eight that tier runs today.
      bestOutOf: 11,
      totalCorrect: 29,
      totalQuestions: 33,
    });
  });

  it('is empty for a category that has never been played', () => {
    expect(categoryStat(profileWith({}), 'world')).toEqual(ZERO_STAT);
  });

  // Each tier's record is read against that tier before they are rolled
  // together; afterwards there is no single length left to read it against.
  it('reads a legacy record against its own tier, not the longest one', () => {
    const profile = profileWith({
      'cat:battles:novice': { gamesPlayed: 1, bestScore: 11, totalCorrect: 11, totalQuestions: 11 },
    });
    const rolled = categoryStat(profile, 'battles');
    expect(rolled.bestScore).toBe(11);
    expect(rolled.bestOutOf).toBe(11);
  });

  it('keeps a short perfect round over a long middling one', () => {
    const profile = profileWith({
      'cat:anime:novice': { gamesPlayed: 1, bestScore: 6, bestOutOf: 6, totalCorrect: 6, totalQuestions: 6 },
      'cat:anime:legend': { gamesPlayed: 1, bestScore: 9, bestOutOf: 15, totalCorrect: 9, totalQuestions: 15 },
    });
    const rolled = categoryStat(profile, 'anime');
    expect(rolled.bestScore).toBe(6);
    expect(rolled.bestOutOf).toBe(6);
  });
});

describe('categoryShare', () => {
  it('measures a category against the other categories', () => {
    const profile = profileWith({
      'cat:anime:novice': stat({ gamesPlayed: 3 }),
      'cat:quotes:novice': stat({ gamesPlayed: 1 }),
    });
    expect(categoryGamesPlayed(profile)).toBe(4);
    expect(categoryShare(profile, 'anime')).toBeCloseTo(0.75);
  });

  // Mode rounds are the same rounds under a second key; counting them would
  // quietly shrink every category's share.
  it('ignores the rounds counted again under a mode', () => {
    const profile = profileWith({
      'cat:anime:novice': stat({ gamesPlayed: 2 }),
      'mode:daily': stat({ gamesPlayed: 6 }),
    });
    expect(categoryGamesPlayed(profile)).toBe(2);
    expect(categoryShare(profile, 'anime')).toBe(1);
  });

  it('is zero rather than NaN before anything is played', () => {
    expect(categoryShare(profileWith({}), 'anime')).toBe(0);
  });
});

describe('bestRound', () => {
  it('reads a record back against its own questions', () => {
    expect(bestRound(stat({ gamesPlayed: 2, bestScore: 9, bestOutOf: 15 }), 15)).toEqual({ score: 9, outOf: 15 });
  });

  // Nothing played is a dash on the screen, not a zero out of zero.
  it('is null when nothing has been played', () => {
    expect(bestRound(stat({ gamesPlayed: 0 }), 10)).toBeNull();
  });

  it('falls back for a record stored without its length', () => {
    expect(bestRound(stat({ gamesPlayed: 1, bestScore: 11 }), 6)).toEqual({ score: 11, outOf: 11 });
    expect(bestRound(stat({ gamesPlayed: 1, bestScore: 4 }), 10)).toEqual({ score: 4, outOf: 10 });
  });
});
