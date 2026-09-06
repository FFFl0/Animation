import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { Avatar } from '../data/avatar';

export type LeaderboardRow = {
  username: string;
  avatar: Avatar;
  totalScore: number;
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

export { isSupabaseConfigured };

export async function fetchLeaderboard(limit = 50): Promise<LeaderboardRow[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .order('total_score', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  return (data as LeaderboardViewRow[]).map((row) => ({
    username: row.username,
    avatar: row.avatar,
    totalScore: row.total_score,
    totalCorrect: row.total_correct,
    totalQuestions: row.total_questions,
  }));
}
