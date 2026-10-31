import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { Avatar } from '../data/avatar';
import { ModeStat } from '../auth/types';
import { ratingOf } from '../data/rating';
import { Victories } from '../data/victories';

export type LeaderboardPeriod = 'all' | 'week' | 'season';

export type LeaderboardRow = {
  id: string;
  username: string;
  avatar: Avatar;
  /** What this tab ranks by: rating points all-time, answers in a period. */
  score: number;
  /** The player's rating, whichever tab this row came from — it is what
   * their profile shows, and a period score is not it. */
  rating: number;
  totalCorrect: number;
  totalQuestions: number;
};

type LeaderboardViewRow = {
  id: string;
  username: string;
  avatar: Avatar;
  total_score: number;
  stats: Record<string, ModeStat> | null;
  victories: Victories | null;
  total_correct: number;
  total_questions: number;
};

type PeriodViewRow = {
  id: string;
  username: string;
  avatar: Avatar;
  period_score: number;
  period_questions: number;
  stats: Record<string, ModeStat> | null;
  victories: Victories | null;
};

export { isSupabaseConfigured };

/**
 * A row's rating, worked out from the stats it carries.
 *
 * The profiles table keeps a copy of this number so the server has
 * something to order by, but it is written by each player's own app: it
 * can be missing on a profile that has not been opened since the rating
 * existed, and a round out of date on one that has. The stats cannot be,
 * so the figure anybody reads is derived from those.
 */
function ratingOfRow(row: { stats: Record<string, ModeStat> | null; victories: Victories | null }): number {
  return ratingOf({ stats: row.stats ?? {}, victories: row.victories ?? undefined }).points;
}

/** `period` picks which of the three safe views to read from — `leaderboard`
 * (all-time, ranked by rating points) or `leaderboard_weekly` /
 * `leaderboard_season` (ranked by correct answers logged via
 * round_results within that window). Same shape either way so the screen
 * doesn't need to know which one it's showing. */
export async function fetchLeaderboard(period: LeaderboardPeriod = 'all', limit = 50): Promise<LeaderboardRow[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  if (period === 'all') {
    // Ordered by the stored copy, which is what the server can sort on —
    // but a database that predates that column must still give a board, so
    // the older ordering stands in. Either way the rows are put back in
    // order by the rating actually shown.
    const byRating = await supabase.from('leaderboard').select('*').order('rating', { ascending: false }).limit(limit);
    const { data, error } = byRating.error
      ? await supabase.from('leaderboard').select('*').order('total_score', { ascending: false }).limit(limit)
      : byRating;

    if (error || !data) return [];
    return (data as LeaderboardViewRow[])
      .map((row) => ({
        id: row.id,
        username: row.username,
        avatar: row.avatar,
        score: ratingOfRow(row),
        rating: ratingOfRow(row),
        totalCorrect: row.total_correct,
        totalQuestions: row.total_questions,
      }))
      .sort((a, b) => b.rating - a.rating);
  }

  const table = period === 'week' ? 'leaderboard_weekly' : 'leaderboard_season';
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .order('period_score', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as PeriodViewRow[])
    .filter((row) => row.period_score > 0 || row.period_questions > 0)
    .map((row) => ({
      id: row.id,
      username: row.username,
      avatar: row.avatar,
      score: row.period_score,
      rating: ratingOfRow(row),
      totalCorrect: row.period_score,
      totalQuestions: row.period_questions,
    }));
}
