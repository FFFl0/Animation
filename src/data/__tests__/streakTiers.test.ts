import { STREAK_TIERS, nextTier, progressToNextTier, streakIntensity, tierForStreak } from '../streakTiers';

describe('tierForStreak', () => {
  it('starts everybody at the first tier', () => {
    expect(tierForStreak(0).id).toBe('seed');
  });

  it('picks the tier each threshold opens', () => {
    const expected: [number, string][] = [
      [1, 'spark'],
      [3, 'rolling'],
      [7, 'week'],
      [14, 'fortnight'],
      [30, 'month'],
      [60, 'iron'],
      [100, 'legend'],
      [101, 'beyond'],
    ];
    for (const [days, id] of expected) expect(tierForStreak(days).id).toBe(id);
  });

  it('holds a tier until the next threshold', () => {
    expect(tierForStreak(2).id).toBe('spark');
    expect(tierForStreak(6).id).toBe('rolling');
    expect(tierForStreak(29).id).toBe('fortnight');
    expect(tierForStreak(99).id).toBe('iron');
  });

  it('keeps the last tier however long the run gets', () => {
    expect(tierForStreak(500).id).toBe('beyond');
    expect(tierForStreak(100000).id).toBe('beyond');
  });

  it('survives nonsense instead of crashing the home screen', () => {
    expect(tierForStreak(-5).id).toBe('seed');
    expect(tierForStreak(NaN).id).toBe('seed');
    expect(tierForStreak(2.7).id).toBe('spark');
  });
});

describe('nextTier', () => {
  it('points at the milestone being worked towards', () => {
    expect(nextTier(0)?.id).toBe('spark');
    expect(nextTier(3)?.id).toBe('week');
    expect(nextTier(60)?.id).toBe('legend');
  });

  it('runs out once the last tier is reached', () => {
    expect(nextTier(101)).toBeNull();
    expect(nextTier(999)).toBeNull();
  });
});

describe('the tier table', () => {
  it('is ordered and has no duplicate thresholds, which the lookup relies on', () => {
    const thresholds = STREAK_TIERS.map((t) => t.minDays);
    expect(thresholds).toEqual([...thresholds].sort((a, b) => a - b));
    expect(new Set(thresholds).size).toBe(thresholds.length);
    expect(new Set(STREAK_TIERS.map((t) => t.id)).size).toBe(STREAK_TIERS.length);
  });
});

describe('streakIntensity', () => {
  it('leaves a streak that has not started completely still', () => {
    expect(streakIntensity(0)).toBe(0);
  });

  it('rises with the run and tops out at the last tier', () => {
    expect(streakIntensity(1)).toBeGreaterThan(0);
    expect(streakIntensity(101)).toBe(1);
  });

  // The whole point: longer is visibly more.
  it('never goes down as the streak grows', () => {
    let previous = -1;
    for (const days of [0, 1, 2, 3, 6, 7, 13, 14, 29, 30, 59, 60, 99, 100, 101, 500]) {
      const value = streakIntensity(days);
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
  });

  it('stays inside 0..1 for anything it is handed', () => {
    for (const days of [-5, 0, 7, 100, 10000]) {
      const value = streakIntensity(days);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe('progressToNextTier', () => {
  it('is empty the day a tier is reached', () => {
    expect(progressToNextTier(7)).toBe(0);
    expect(progressToNextTier(30)).toBe(0);
  });

  it('fills as the next milestone comes closer', () => {
    // 7 to 14: ten days in is three sevenths of the way there.
    expect(progressToNextTier(10)).toBeCloseTo(3 / 7);
    expect(progressToNextTier(13)).toBeCloseTo(6 / 7);
  });

  it('is full once there is nothing left to reach', () => {
    expect(progressToNextTier(101)).toBe(1);
    expect(progressToNextTier(900)).toBe(1);
  });

  it('stays inside 0..1 below zero', () => {
    expect(progressToNextTier(-3)).toBe(0);
  });
});
