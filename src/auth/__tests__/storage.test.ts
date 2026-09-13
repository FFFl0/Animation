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

  it('starts a new streak on first play', () => {
    const result = bumpStreak({ count: 0, lastPlayedDate: null });
    expect(result.count).toBe(1);
    expect(result.lastPlayedDate).toBe(new Date().toISOString().slice(0, 10));
  });

  it('does not change when already played today', () => {
    const today = new Date().toISOString().slice(0, 10);
    const streak = { count: 4, lastPlayedDate: today };
    expect(bumpStreak(streak)).toEqual(streak);
  });

  it('increments when the last play was yesterday', () => {
    const yesterday = new Date(Date.now() - DAY).toISOString().slice(0, 10);
    const result = bumpStreak({ count: 4, lastPlayedDate: yesterday });
    expect(result.count).toBe(5);
  });

  it('resets to 1 when a day was missed', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * DAY).toISOString().slice(0, 10);
    const result = bumpStreak({ count: 12, lastPlayedDate: twoDaysAgo });
    expect(result.count).toBe(1);
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
