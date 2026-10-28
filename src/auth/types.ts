import { Avatar } from '../data/avatar';

export type ModeStat = {
  gamesPlayed: number;
  bestScore: number;
  /**
   * How many questions the best score was out of.
   *
   * A record is only meaningful against the round that set it: tiers have
   * not always been the same length, and nine out of fifteen is a better
   * round than six out of six is a longer one. Absent on anything recorded
   * before this was kept — see bestShare, which infers what it can.
   */
  bestOutOf?: number;
  totalCorrect: number;
  totalQuestions: number;
};

export const ZERO_STAT: ModeStat = { gamesPlayed: 0, bestScore: 0, totalCorrect: 0, totalQuestions: 0 };

/**
 * What the best score was out of, falling back for records kept before the
 * length was stored.
 *
 * The fallback is the longer of the score itself and the round's length
 * today: a score of eleven cannot have come from a round of six, so eleven
 * is the only honest denominator for it, while a score of four at a
 * six-question tier is four out of six.
 */
export function bestOutOf(stat: ModeStat, roundLength: number): number {
  return stat.bestOutOf ?? Math.max(stat.bestScore, roundLength);
}

/** The best round as a share of its own questions, 0..1. */
export function bestShare(stat: ModeStat, roundLength: number): number {
  const total = bestOutOf(stat, roundLength);
  return total > 0 ? Math.min(1, stat.bestScore / total) : 0;
}

export type Streak = {
  count: number;
  lastPlayedDate: string | null; // YYYY-MM-DD
};

export type DailyChallengeResult = {
  date: string; // YYYY-MM-DD
  score: number;
  total: number;
};

export type Profile = {
  id: string;
  username: string;
  createdAt: string;
  avatar: Avatar;
  favoriteCharacterId: string | null;
  stats: Record<string, ModeStat>;
  streak: Streak;
  achievements: string[];
  /** Achievement id -> the day it was earned, as YYYY-MM-DD. */
  achievementDates: Record<string, string>;
  dailyChallenge: DailyChallengeResult | null;
};

export type Account = Profile & {
  passwordHash: string;
  salt: string;
};
