import { ModeStat, Profile, ZERO_STAT } from '../../auth/types';
import {
  accuracyOf,
  bestRound,
  categoryLadderSources,
  ladderBest,
  categoryGamesPlayed,
  categoryShare,
  categoryStat,
  categoryStatsKeys,
  roundStats,
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
  // One per difficulty, plus the key with no difficulty on it: that is
  // where a round started from a game mode lands, and leaving it out hid
  // those rounds from the category entirely.
  it('gives an ordinary category its difficulties and its mode rounds', () => {
    const keys = categoryStatsKeys('anime');
    expect(keys).toHaveLength(6);
    expect(keys).toContain('cat:anime:novice');
    expect(keys).toContain('cat:anime:legend');
    expect(keys).toContain('cat:anime');
  });

  // These two are never played at a chosen difficulty, so they record under
  // one plain key and reading them per tier would always find nothing.
  it('gives the hard-only and mixed categories a single plain key', () => {
    expect(categoryStatsKeys('hard')).toEqual(['cat:hard']);
    expect(categoryStatsKeys('mixed')).toEqual(['cat:mixed']);
  });

  it('keeps the ladder itself to the difficulties', () => {
    expect(categoryLadderSources('anime').map((s) => s.key)).toEqual([
      'cat:anime:novice',
      'cat:anime:fan',
      'cat:anime:otaku',
      'cat:anime:expert',
      'cat:anime:legend',
    ]);
  });
});

describe('roundStats', () => {
  // The same round is banked twice, under its category and under the mode.
  it('counts a mode round once, under its category', () => {
    const rounds = roundStats({
      'cat:mixed': stat({ gamesPlayed: 3, totalCorrect: 20, totalQuestions: 30 }),
      'mode:quick': stat({ gamesPlayed: 3, totalCorrect: 20, totalQuestions: 30 }),
    });
    expect(rounds).toHaveLength(1);
    expect(sumStats(rounds)).toMatchObject({ gamesPlayed: 3, totalCorrect: 20, totalQuestions: 30 });
  });

  it('is empty for a profile that has only ever been seeded with modes', () => {
    expect(roundStats({ 'mode:daily': stat({ gamesPlayed: 1 }) })).toEqual([]);
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
      // Both records were kept without a length, so each is read against
      // its own tier's round — nine at Novice is six out of six, eleven at
      // Fan is eight out of eight — and the longer perfect round wins.
      bestScore: 8,
      bestOutOf: 8,
      totalCorrect: 29,
      totalQuestions: 33,
    });
  });

  // A round of «Угадай по силуэту» is a round about characters, played at
  // no difficulty — it used to be written and then read by nobody.
  it('counts the rounds a game mode played in this category', () => {
    const profile = profileWith({
      'cat:characters:novice': stat({ gamesPlayed: 1, bestScore: 5, bestOutOf: 6, totalCorrect: 5, totalQuestions: 6 }),
      'cat:characters': stat({ gamesPlayed: 2, bestScore: 10, bestOutOf: 15, totalCorrect: 18, totalQuestions: 30 }),
      'mode:silhouette': stat({ gamesPlayed: 2, bestScore: 10, bestOutOf: 15, totalCorrect: 18, totalQuestions: 30 }),
    });
    expect(categoryStat(profile, 'characters')).toMatchObject({
      gamesPlayed: 3,
      totalCorrect: 23,
      totalQuestions: 36,
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
    expect(rolled.bestScore).toBe(6);
    expect(rolled.bestOutOf).toBe(6);
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

describe('ladderBest', () => {
  // 6 + 8 + 10 + 12 + 15: the whole ladder, locked difficulties included.
  const LADDER = 51;

  it('adds every difficulty record up over the whole ladder', () => {
    const profile = profileWith({
      'cat:battles:novice': { gamesPlayed: 1, bestScore: 6, bestOutOf: 6, totalCorrect: 6, totalQuestions: 6 },
      'cat:battles:otaku': { gamesPlayed: 3, bestScore: 7, bestOutOf: 10, totalCorrect: 20, totalQuestions: 30 },
    });
    expect(ladderBest(profile, 'battles')).toEqual({ score: 13, outOf: LADDER });
  });

  // The figure the running totals cannot give: ten rounds of Novice is
  // still six of the six questions that tier asks.
  it('does not grow with the number of rounds played', () => {
    const profile = profileWith({
      'cat:battles:novice': { gamesPlayed: 10, bestScore: 6, bestOutOf: 6, totalCorrect: 48, totalQuestions: 60 },
    });
    expect(ladderBest(profile, 'battles')).toEqual({ score: 6, outOf: LADDER });
  });

  it('counts a record kept without a length against its own tier', () => {
    const profile = profileWith({
      'cat:battles:novice': { gamesPlayed: 1, bestScore: 10, totalCorrect: 10, totalQuestions: 11 },
    });
    expect(ladderBest(profile, 'battles')).toEqual({ score: 6, outOf: LADDER });
  });

  // A record set in a longer round than the tier runs today still cannot
  // put more answers into it than it holds.
  it('never counts a tier for more than its round', () => {
    const profile = profileWith({
      'cat:battles:novice': { gamesPlayed: 1, bestScore: 11, bestOutOf: 11, totalCorrect: 11, totalQuestions: 11 },
    });
    expect(ladderBest(profile, 'battles')).toEqual({ score: 6, outOf: LADDER });
  });

  it('measures a category with no difficulties against its one round', () => {
    const profile = profileWith({
      'cat:mixed': { gamesPlayed: 2, bestScore: 9, bestOutOf: 15, totalCorrect: 14, totalQuestions: 30 },
    });
    expect(ladderBest(profile, 'mixed')).toEqual({ score: 9, outOf: 15 });
  });

  // Modes are not a rung on the ladder: they are played at no difficulty,
  // so they cannot carry the climb forward.
  it('does not let a mode round stand in for a difficulty', () => {
    const profile = profileWith({
      'cat:battles': { gamesPlayed: 4, bestScore: 15, bestOutOf: 15, totalCorrect: 40, totalQuestions: 60 },
    });
    expect(ladderBest(profile, 'battles')).toEqual({ score: 0, outOf: LADDER });
  });

  it('is nothing out of the whole ladder before anything is played', () => {
    expect(ladderBest(profileWith({}), 'battles')).toEqual({ score: 0, outOf: LADDER });
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

  it('reads a record stored without its length against the round given', () => {
    expect(bestRound(stat({ gamesPlayed: 1, bestScore: 11 }), 6)).toEqual({ score: 6, outOf: 6 });
    expect(bestRound(stat({ gamesPlayed: 1, bestScore: 4 }), 10)).toEqual({ score: 4, outOf: 10 });
  });
});
