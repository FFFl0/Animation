import { ModeStat, Profile, ZERO_STAT } from '../../auth/types';
import {
  accuracyOf,
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
  it('takes the best score rather than adding the best scores', () => {
    expect(sumStats([stat({ bestScore: 9 }), stat({ bestScore: 7 })]).bestScore).toBe(9);
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
      totalCorrect: 29,
      totalQuestions: 33,
    });
  });

  it('is empty for a category that has never been played', () => {
    expect(categoryStat(profileWith({}), 'world')).toEqual(ZERO_STAT);
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
