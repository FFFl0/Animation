import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { Avatar } from '../data/avatar';

export type LeaderboardPeriod = 'all' | 'week' | 'season';

export type LeaderboardRow = {
  username: string;
  avatar: Avatar;
  score: number;
  totalCorrect: number;
  totalQuestions: number;
};

type LeaderboardViewRow = {
  username: string;
  avatar: Avatar;
  total_score: number;
  total_correct: number;
  total_questions: number;
};

type PeriodViewRow = {
  username: string;
  avatar: Avatar;
  period_score: number;
  period_questions: number;
};

export { isSupabaseConfigured };

/** `period` picks which of the three safe views to read from — `leaderboard`
 * (all-time, ranked by summed best scores) or `leaderboard_weekly` /
 * `leaderboard_season` (ranked by correct answers logged via
 * round_results within that window). Same shape either way so the screen
 * doesn't need to know which one it's showing. */
export async function fetchLeaderboard(period: LeaderboardPeriod = 'all', limit = 50): Promise<LeaderboardRow[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  if (period === 'all') {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('total_score', { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return (data as LeaderboardViewRow[]).map((row) => ({
      username: row.username,
      avatar: row.avatar,
      score: row.total_score,
      totalCorrect: row.total_correct,
      totalQuestions: row.total_questions,
    }));
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
      username: row.username,
      avatar: row.avatar,
      score: row.period_score,
      totalCorrect: row.period_score,
      totalQuestions: row.period_questions,
    }));
}
