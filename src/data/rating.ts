import { ModeStat, Profile } from '../auth/types';
import { ladderBest, roundStats } from '../quiz/statsSummary';
import { CATEGORIES } from './categories';

/**
 * The rating: how much of the game you have beaten, worth more when you
 * answer quickly.
 *
 *   очки = пройдено вопросов × множитель скорости
 *
 * "Пройдено вопросов" is the bounded figure the category pages show — the
 * best result on each difficulty, added up — not every answer ever given.
 * A long evening of easy rounds adds nothing to it; a difficulty you had
 * never beaten does. That is deliberate: a rating you can grind is a
 * measure of time spent, not of how good anybody is.
 *
 * The multiplier is the other half of it, and the reason the same climb is
 * worth more to a faster player.
 */

/** Average answer times the multiplier is pinned to. */
export const FAST_MS = 2000;
export const PAR_MS = 8000;
export const SLOW_MS = 15000;

/** What those times are worth. Between them the multiplier runs straight. */
export const FAST_MULTIPLIER = 2;
export const PAR_MULTIPLIER = 1;
export const SLOW_MULTIPLIER = 0.5;

function between(value: number, fromValue: number, toValue: number, fromResult: number, toResult: number): number {
  const share = (value - fromValue) / (toValue - fromValue);
  return fromResult + share * (toResult - fromResult);
}

/**
 * What one cleared question is worth at this average answer time: 2 at two
 * seconds, 1 at eight, 0.5 at fifteen and beyond.
 *
 * Nothing timed yet earns the plain multiplier rather than the best or the
 * worst — a player who has only ever played rounds from before the clock
 * was kept is neither fast nor slow, and should not be ranked as either.
 */
export function speedMultiplier(averageMs: number | null): number {
  if (averageMs === null) return PAR_MULTIPLIER;
  if (averageMs <= FAST_MS) return FAST_MULTIPLIER;
  if (averageMs >= SLOW_MS) return SLOW_MULTIPLIER;
  if (averageMs <= PAR_MS) return between(averageMs, FAST_MS, PAR_MS, FAST_MULTIPLIER, PAR_MULTIPLIER);
  return between(averageMs, PAR_MS, SLOW_MS, PAR_MULTIPLIER, SLOW_MULTIPLIER);
}

/**
 * How long an answer takes this player, over everything they have played,
 * or null when nothing was ever timed.
 *
 * The total over the count, rather than the mean of each round's mean: a
 * round of six and a round of fifteen do not weigh the same.
 */
export function averageThinkingMs(stats: Record<string, ModeStat>): number | null {
  const rounds = roundStats(stats);
  const answers = rounds.reduce((sum, stat) => sum + (stat.answeredCount ?? 0), 0);
  if (answers === 0) return null;
  const ms = rounds.reduce((sum, stat) => sum + (stat.answeredMs ?? 0), 0);
  return Math.round(ms / answers);
}

export type Rating = {
  points: number;
  /** Questions cleared, and how many there are to clear in all. */
  cleared: number;
  outOf: number;
  averageMs: number | null;
  multiplier: number;
};

/** Every question the game holds, across every category's ladder. */
export function ratingCeiling(): number {
  return CATEGORIES.reduce((sum, category) => sum + ladderBest({ stats: {} } as Profile, category.id).outOf, 0);
}

export function ratingOf(profile: Profile): Rating {
  const cleared = CATEGORIES.reduce((sum, category) => sum + ladderBest(profile, category.id).score, 0);
  const averageMs = averageThinkingMs(profile.stats);
  const multiplier = speedMultiplier(averageMs);
  return { points: Math.round(cleared * multiplier), cleared, outOf: ratingCeiling(), averageMs, multiplier };
}
