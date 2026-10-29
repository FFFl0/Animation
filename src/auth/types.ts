import { Avatar } from '../data/avatar';
import { Victories } from '../data/victories';

export type ModeStat = {
  gamesPlayed: number;
  bestScore: number;
  /**
   * How many questions the best score was out of.
   *
   * A record is only meaningful against the round that set it: tiers have
   * not always been the same length, and nine out of fifteen is a better
   * round than six out of six is a longer one. Absent on anything recorded
   * before this was kept — see bestRecord, which reads those against the
   * round they would be played in today.
   */
  bestOutOf?: number;
  totalCorrect: number;
  totalQuestions: number;
  /**
   * Thinking time banked here, and how many answers it covers.
   *
   * The pair, not the mean: rounds are different lengths, and the player's
   * average is the total over the count. Absent on anything recorded before
   * the clock was kept, which simply does not count towards the average.
   */
  answeredMs?: number;
  answeredCount?: number;
};

export const ZERO_STAT: ModeStat = { gamesPlayed: 0, bestScore: 0, totalCorrect: 0, totalQuestions: 0 };

/** A record as it is shown: a score out of the questions it was over. */
export type BestRound = { score: number; outOf: number };

/**
 * The best round a stat holds, read against the round it would be played in
 * today.
 *
 * A record stored with its own length keeps it — that is the round it
 * really came from. One kept before the length was stored has nothing to
 * keep, and the only round left to show it against is the one on offer now:
 * a ladder of six, eight, ten, twelve and fifteen cannot put "10 / 10"
 * beside a Novice round of six questions. The score comes down with the
 * denominator, so a perfect old round still reads as perfect and no record
 * ever claims more answers than its round has questions.
 */
export function bestRecord(stat: ModeStat, roundLength: number): BestRound {
  const outOf = stat.bestOutOf ?? roundLength;
  return { score: Math.min(stat.bestScore, outOf), outOf };
}

/** The best round as a share of its own questions, 0..1. */
export function bestShare(stat: ModeStat, roundLength: number): number {
  const { score, outOf } = bestRecord(stat, roundLength);
  return outOf > 0 ? Math.min(1, score / outOf) : 0;
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
  /** Tournaments finished — the half of the rating that is not about
   * answering questions alone. */
  victories?: Victories;
  /**
   * The rating, derived from the stats by `ratingOf` and written down with
   * them. Derived figures do not normally belong in a profile, but this one
   * is what other players are ranked by, and the ranking cannot read anyone
   * else's stats to work it out. Absent until the first round is banked.
   */
  rating?: number;
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
