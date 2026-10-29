import { Profile } from '../../auth/types';
import { EMPTY_VICTORIES, TOURNAMENT_POINTS, Victories } from '../victories';
import {
  FAST_MS,
  PAR_MS,
  SLOW_MS,
  averageThinkingMs,
  ratingCeiling,
  ratingOf,
  speedMultiplier,
} from '../rating';

function profileWith(stats: Profile['stats'], victories?: Victories): Profile {
  return { stats, victories } as Profile;
}

describe('speedMultiplier', () => {
  it('pays double at the fast end and half at the slow one', () => {
    expect(speedMultiplier(FAST_MS)).toBe(2);
    expect(speedMultiplier(500)).toBe(2);
    expect(speedMultiplier(SLOW_MS)).toBe(0.5);
    expect(speedMultiplier(60000)).toBe(0.5);
  });

  it('pays plainly at the middle anchor', () => {
    expect(speedMultiplier(PAR_MS)).toBe(1);
  });

  it('runs straight between the anchors', () => {
    expect(speedMultiplier(5000)).toBeCloseTo(1.5);
    expect(speedMultiplier(11500)).toBeCloseTo(0.75);
  });

  // Somebody whose rounds were all played before the clock was kept is
  // neither fast nor slow, and should not be ranked as either.
  it('is neutral when nothing has ever been timed', () => {
    expect(speedMultiplier(null)).toBe(1);
  });
});

describe('averageThinkingMs', () => {
  it('is the total over the count, not the mean of the means', () => {
    const average = averageThinkingMs({
      // 6 answers at 2s, then 2 answers at 10s: 32000 / 8, not (2000+10000)/2
      'cat:anime:novice': { gamesPlayed: 1, bestScore: 6, totalCorrect: 6, totalQuestions: 6, answeredMs: 12000, answeredCount: 6 },
      'cat:anime:fan': { gamesPlayed: 1, bestScore: 2, totalCorrect: 2, totalQuestions: 2, answeredMs: 20000, answeredCount: 2 },
    });
    expect(average).toBe(4000);
  });

  // The round is banked under the mode as well; counting it twice would be
  // harmless for a mean but not for one taken over different lengths.
  it('does not count a mode round twice', () => {
    const stat = { gamesPlayed: 1, bestScore: 5, totalCorrect: 5, totalQuestions: 10, answeredMs: 30000, answeredCount: 10 };
    expect(averageThinkingMs({ 'cat:mixed': stat, 'mode:quick': stat })).toBe(3000);
  });

  it('is null before anything was timed', () => {
    expect(averageThinkingMs({})).toBeNull();
    expect(
      averageThinkingMs({ 'cat:mixed': { gamesPlayed: 2, bestScore: 5, totalCorrect: 9, totalQuestions: 20 } })
    ).toBeNull();
  });
});

describe('ratingOf', () => {
  // Six categories of 51 and two of 15.
  it('knows how many questions there are to clear in all', () => {
    expect(ratingCeiling()).toBe(336);
  });

  it('is nothing at all for a profile that has never played', () => {
    expect(ratingOf(profileWith({}))).toMatchObject({ points: 0, cleared: 0, outOf: 336 });
  });

  it('pays the questions cleared at the speed they were answered', () => {
    const rating = ratingOf(
      profileWith({
        'cat:anime:novice': { gamesPlayed: 1, bestScore: 6, bestOutOf: 6, totalCorrect: 6, totalQuestions: 6, answeredMs: 12000, answeredCount: 6 },
        'cat:quotes:otaku': { gamesPlayed: 1, bestScore: 8, bestOutOf: 10, totalCorrect: 8, totalQuestions: 10, answeredMs: 20000, answeredCount: 10 },
      })
    );
    expect(rating.cleared).toBe(14);
    expect(rating.averageMs).toBe(2000);
    expect(rating.multiplier).toBe(2);
    expect(rating.points).toBe(28);
  });

  // The whole reason this counts cleared questions rather than answers: an
  // evening of rounds that beat nothing is worth nothing.
  it('does not grow for rounds that set no record', () => {
    const once = profileWith({
      'cat:anime:novice': { gamesPlayed: 1, bestScore: 4, bestOutOf: 6, totalCorrect: 4, totalQuestions: 6, answeredMs: 48000, answeredCount: 6 },
    });
    const again = profileWith({
      'cat:anime:novice': { gamesPlayed: 40, bestScore: 4, bestOutOf: 6, totalCorrect: 160, totalQuestions: 240, answeredMs: 1920000, answeredCount: 240 },
    });
    expect(ratingOf(again).points).toBe(ratingOf(once).points);
  });

  // Tournaments and battles are played at no difficulty, so they climb no
  // ladder — they are added on top rather than multiplied in, or a player
  // who only ever played those would be multiplying nothing.
  it('adds what was won against other players', () => {
    const victories: Victories = { ...EMPTY_VICTORIES, runs: 1, gold: 1, battles: 2 };
    const stats = {
      'cat:anime:novice': { gamesPlayed: 1, bestScore: 6, bestOutOf: 6, totalCorrect: 6, totalQuestions: 6, answeredMs: 48000, answeredCount: 6 },
    };
    const without = ratingOf(profileWith(stats));
    const with_ = ratingOf(profileWith(stats, victories));
    expect(without.fromVictories).toBe(0);
    expect(with_.fromVictories).toBe(TOURNAMENT_POINTS.gold + 6);
    expect(with_.points).toBe(without.points + with_.fromVictories);
  });

  it('counts a tournament for a player who has answered nothing', () => {
    const rating = ratingOf(profileWith({}, { ...EMPTY_VICTORIES, runs: 1, gold: 1 }));
    expect(rating.cleared).toBe(0);
    expect(rating.points).toBe(TOURNAMENT_POINTS.gold);
  });

  it('is worth more to the faster of two players who cleared the same', () => {
    const cleared = { gamesPlayed: 1, bestScore: 6, bestOutOf: 6, totalCorrect: 6, totalQuestions: 6 };
    const quick = ratingOf(profileWith({ 'cat:anime:novice': { ...cleared, answeredMs: 12000, answeredCount: 6 } }));
    const slow = ratingOf(profileWith({ 'cat:anime:novice': { ...cleared, answeredMs: 120000, answeredCount: 6 } }));
    expect(quick.cleared).toBe(slow.cleared);
    expect(quick.points).toBeGreaterThan(slow.points);
    expect(quick.points).toBe(12);
    expect(slow.points).toBe(3);
  });
});
