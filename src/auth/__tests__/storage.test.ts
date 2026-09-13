import { mergeStat, bumpStreak } from '../storage';
import { validateCredentials } from '../validation';
import { AuthError } from '../authError';

describe('mergeStat', () => {
  it('starts from zero when there is no previous stat', () => {
    expect(mergeStat(undefined, 7, 10)).toEqual({
      gamesPlayed: 1,
      bestScore: 7,
      totalCorrect: 7,
      totalQuestions: 10,
    });
  });

  it('accumulates games played and totals, and keeps the best score', () => {
    const prev = { gamesPlayed: 2, bestScore: 8, totalCorrect: 15, totalQuestions: 20 };
    expect(mergeStat(prev, 5, 10)).toEqual({
      gamesPlayed: 3,
      bestScore: 8,
      totalCorrect: 20,
      totalQuestions: 30,
    });
    expect(mergeStat(prev, 9, 10)).toEqual({
      gamesPlayed: 3,
      bestScore: 9,
      totalCorrect: 24,
      totalQuestions: 30,
    });
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
