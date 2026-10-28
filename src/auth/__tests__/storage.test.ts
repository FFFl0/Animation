import { mergeStat, bumpStreak } from '../storage';
import { ZERO_STAT, bestRecord, bestShare } from '../types';
import { validateCredentials } from '../validation';
import { AuthError } from '../authError';

describe('mergeStat', () => {
  it('starts from zero when there is no previous stat', () => {
    expect(mergeStat(undefined, 7, 10)).toEqual({
      gamesPlayed: 1,
      bestScore: 7,
      bestOutOf: 10,
      totalCorrect: 7,
      totalQuestions: 10,
      answeredMs: 0,
      answeredCount: 0,
    });
  });

  it('accumulates games played and totals, and keeps the best round', () => {
    const prev = { gamesPlayed: 2, bestScore: 8, bestOutOf: 10, totalCorrect: 15, totalQuestions: 20 };
    expect(mergeStat(prev, 5, 10)).toEqual({
      gamesPlayed: 3,
      bestScore: 8,
      bestOutOf: 10,
      totalCorrect: 20,
      totalQuestions: 30,
      answeredMs: 0,
      answeredCount: 0,
    });
    expect(mergeStat(prev, 9, 10)).toEqual({
      gamesPlayed: 3,
      bestScore: 9,
      bestOutOf: 10,
      totalCorrect: 24,
      totalQuestions: 30,
      answeredMs: 0,
      answeredCount: 0,
    });
  });

  // Rounds are not all the same length any more, so "best" is the better
  // round, not the bigger number.
  it('keeps the round with the larger share, not the higher score', () => {
    const nineOfFifteen = { gamesPlayed: 1, bestScore: 9, bestOutOf: 15, totalCorrect: 9, totalQuestions: 15 };
    const after = mergeStat(nineOfFifteen, 6, 6);
    expect(after.bestScore).toBe(6);
    expect(after.bestOutOf).toBe(6);
  });

  it('does not take a worse round even when its score is higher', () => {
    const sixOfSix = { gamesPlayed: 1, bestScore: 6, bestOutOf: 6, totalCorrect: 6, totalQuestions: 6 };
    const after = mergeStat(sixOfSix, 9, 15);
    expect(after.bestScore).toBe(6);
    expect(after.bestOutOf).toBe(6);
  });

  it('breaks a tie on share by the longer round', () => {
    const threeOfSix = { gamesPlayed: 1, bestScore: 3, bestOutOf: 6, totalCorrect: 3, totalQuestions: 6 };
    const after = mergeStat(threeOfSix, 5, 10);
    expect(after.bestScore).toBe(5);
    expect(after.bestOutOf).toBe(10);
  });

  // Records kept before the length was stored: read against the round being
  // played, which is also what finally gives them a length to keep.
  it('settles a record kept without a length against the round played', () => {
    const legacy = { gamesPlayed: 1, bestScore: 11, totalCorrect: 11, totalQuestions: 11 };
    const after = mergeStat(legacy, 4, 6);
    expect(after.bestScore).toBe(6);
    expect(after.bestOutOf).toBe(6);
  });

  // The old record survives on its merits, not on its bare number: a
  // legacy eight read against a round of six is a round of six, and a real
  // five out of six does not beat it.
  it('does not let a settled legacy record be beaten by a worse round', () => {
    const legacy = { gamesPlayed: 1, bestScore: 8, totalCorrect: 8, totalQuestions: 11 };
    const after = mergeStat(legacy, 5, 6);
    expect(after.bestScore).toBe(6);
    expect(after.bestOutOf).toBe(6);
  });
  // Thinking time is banked as a total and a count, so a player's average
  // can be taken over everything they have played.
  it('adds up the thinking time a round brings', () => {
    const first = mergeStat(undefined, 5, 6, { answeredMs: 24000, answered: 6 });
    expect(first).toMatchObject({ answeredMs: 24000, answeredCount: 6 });
    const second = mergeStat(first, 4, 6, { answeredMs: 12000, answered: 6 });
    expect(second).toMatchObject({ answeredMs: 36000, answeredCount: 12 });
  });

  it('leaves the clock alone for a round that brought no timing', () => {
    const timed = mergeStat(undefined, 5, 6, { answeredMs: 24000, answered: 6 });
    expect(mergeStat(timed, 6, 6)).toMatchObject({ answeredMs: 24000, answeredCount: 6 });
  });
});

describe('bumpStreak', () => {
  const DAY = 86400000;
  const dayAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString().slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  it('starts a new streak on first play', () => {
    const { streak, freezeUsed } = bumpStreak({ count: 0, lastPlayedDate: null });
    expect(streak.count).toBe(1);
    expect(streak.lastPlayedDate).toBe(today);
    expect(freezeUsed).toBe(false);
  });

  it('does not change when already played today', () => {
    const streak = { count: 4, lastPlayedDate: today };
    expect(bumpStreak(streak).streak).toEqual(streak);
  });

  it('increments when the last play was yesterday', () => {
    expect(bumpStreak({ count: 4, lastPlayedDate: dayAgo(1) }).streak.count).toBe(5);
  });

  it('resets to 1 when a day was missed', () => {
    expect(bumpStreak({ count: 12, lastPlayedDate: dayAgo(2) }).streak.count).toBe(1);
  });

  describe('with a streak freeze offered', () => {
    it('holds the streak where it was instead of resetting it', () => {
      const { streak, freezeUsed } = bumpStreak({ count: 12, lastPlayedDate: dayAgo(2) }, true);
      // a freeze rescues the count, it does not add a day to it
      expect(streak.count).toBe(12);
      expect(streak.lastPlayedDate).toBe(today);
      expect(freezeUsed).toBe(true);
    });

    it('is not spent when the streak was never in danger', () => {
      expect(bumpStreak({ count: 4, lastPlayedDate: dayAgo(1) }, true)).toEqual({
        streak: { count: 5, lastPlayedDate: today },
        freezeUsed: false,
      });
      expect(bumpStreak({ count: 4, lastPlayedDate: today }, true).freezeUsed).toBe(false);
    });

    it('is not spent on a first-ever round, which has no streak to save', () => {
      const { streak, freezeUsed } = bumpStreak({ count: 0, lastPlayedDate: null }, true);
      expect(streak.count).toBe(1);
      expect(freezeUsed).toBe(false);
    });
  });
});

describe('validateCredentials', () => {
  it('trims and returns the username when valid', () => {
    expect(validateCredentials('  hero  ', 'longenough')).toBe('hero');
  });

  it('rejects a too-short username', () => {
    expect(() => validateCredentials('ab', 'longenough')).toThrow(AuthError);
  });

  it('rejects a too-short password', () => {
    expect(() => validateCredentials('hero', 'abc')).toThrow(AuthError);
  });
});

describe('reading a record back', () => {
  it('keeps the round a stored record really came from', () => {
    const stored = { gamesPlayed: 1, bestScore: 9, bestOutOf: 15, totalCorrect: 9, totalQuestions: 15 };
    expect(bestRecord(stored, 6)).toEqual({ score: 9, outOf: 15 });
  });

  // The whole point of the change: a record kept before lengths were stored
  // is shown against the round it would be set in today, never against a
  // number of questions the tier no longer asks.
  it('reads a record kept without a length against today round', () => {
    const legacy = { gamesPlayed: 1, bestScore: 10, totalCorrect: 10, totalQuestions: 11 };
    expect(bestRecord(legacy, 6)).toEqual({ score: 6, outOf: 6 });
    expect(bestShare(legacy, 6)).toBe(1);
  });

  it('leaves a legacy score that fits the round alone', () => {
    const legacy = { gamesPlayed: 1, bestScore: 4, totalCorrect: 4, totalQuestions: 6 };
    expect(bestRecord(legacy, 6)).toEqual({ score: 4, outOf: 6 });
    expect(bestShare(legacy, 6)).toBeCloseTo(4 / 6);
  });

  it('never reports more than a perfect round', () => {
    const impossible = { gamesPlayed: 1, bestScore: 20, bestOutOf: 10, totalCorrect: 20, totalQuestions: 10 };
    expect(bestRecord(impossible, 10)).toEqual({ score: 10, outOf: 10 });
    expect(bestShare(impossible, 10)).toBe(1);
  });

  it('is zero for a tier never played', () => {
    expect(bestShare(ZERO_STAT, 10)).toBe(0);
  });
});
