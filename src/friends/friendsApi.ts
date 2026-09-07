import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { Avatar } from '../data/avatar';
import { ModeStat } from '../auth/types';

export { isSupabaseConfigured };

export type PlayerSummary = {
  id: string;
  username: string;
  avatar: Avatar;
  streakCount: number;
  achievements: string[];
  stats: Record<string, ModeStat>;
  totalScore: number;
  totalCorrect: number;
  totalQuestions: number;
  totalGames: number;
};

export type FriendshipStatus = 'pending' | 'accepted';

export type Friendship = {
  friendshipId: string;
  status: FriendshipStatus;
  /** True when the current user sent this request (relevant while pending). */
  isOutgoing: boolean;
  player: PlayerSummary;
};

type LeaderboardRow = {
  id: string;
  username: string;
  avatar: Avatar;
  streak: { count: number; lastPlayedDate: string | null } | null;
  achievements: string[] | null;
  stats: Record<string, ModeStat> | null;
  total_score: number;
  total_correct: number;
  total_questions: number;
  total_games: number;
};

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
};

function toPlayerSummary(row: LeaderboardRow): PlayerSummary {
  return {
    id: row.id,
    username: row.username,
    avatar: row.avatar,
    streakCount: row.streak?.count ?? 0,
    achievements: row.achievements ?? [],
    stats: row.stats ?? {},
    totalScore: row.total_score,
    totalCorrect: row.total_correct,
    totalQuestions: row.total_questions,
    totalGames: row.total_games,
  };
}

export async function fetchPlayers(ids: string[]): Promise<Map<string, PlayerSummary>> {
  const map = new Map<string, PlayerSummary>();
  if (!supabase || ids.length === 0) return map;
  const { data } = await supabase.from('leaderboard').select('*').in('id', ids);
  for (const row of (data as LeaderboardRow[] | null) ?? []) {
    map.set(row.id, toPlayerSummary(row));
  }
  return map;
}

export async function searchPlayers(query: string, meId: string, limit = 15): Promise<PlayerSummary[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .ilike('username', `%${trimmed}%`)
    .neq('id', meId)
    .limit(limit);

  if (error || !data) return [];
  return (data as LeaderboardRow[]).map(toPlayerSummary);
}

/** All friendships (accepted or pending) touching the current user, with the
 * other player's public summary attached. */
export async function getFriendships(meId: string): Promise<Friendship[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .or(`requester_id.eq.${meId},addressee_id.eq.${meId}`);

  if (error || !data) return [];

  const rows = data as FriendshipRow[];
  const otherIds = rows.map((r) => (r.requester_id === meId ? r.addressee_id : r.requester_id));
  const players = await fetchPlayers(otherIds);

  return rows
    .map((row) => {
      const otherId = row.requester_id === meId ? row.addressee_id : row.requester_id;
      const player = players.get(otherId);
      if (!player) return null;
      return {
        friendshipId: row.id,
        status: row.status,
        isOutgoing: row.requester_id === meId,
        player,
      };
    })
    .filter((f): f is Friendship => f !== null);
}

export async function sendFriendRequest(meId: string, targetId: string): Promise<void> {
  if (!supabase) return;

  const { data: existing } = await supabase
    .from('friendships')
    .select('id, requester_id, status')
    .or(`and(requester_id.eq.${meId},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${meId})`)
    .maybeSingle();

  if (existing) {
    // They already sent us a pending request — accepting it is more useful
    // than leaving two one-way requests sitting around.
    if (existing.status === 'pending' && existing.requester_id === targetId) {
      await supabase.from('friendships').update({ status: 'accepted' }).eq('id', existing.id);
    }
    return;
  }

  await supabase.from('friendships').insert({ requester_id: meId, addressee_id: targetId, status: 'pending' });
}

export async function respondToRequest(friendshipId: string, accept: boolean): Promise<void> {
  if (!supabase) return;
  if (accept) {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
  } else {
    await supabase.from('friendships').delete().eq('id', friendshipId);
  }
}

export async function removeFriend(friendshipId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('friendships').delete().eq('id', friendshipId);
}

export async function getRecommendations(meId: string, excludeIds: string[], limit = 10): Promise<PlayerSummary[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const exclude = Array.from(new Set([meId, ...excludeIds]));
  const { data, error } = await supabase
    .from('leaderboard')
    .select('*')
    .not('id', 'in', `(${exclude.join(',')})`)
    .order('total_score', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return (data as LeaderboardRow[]).map(toPlayerSummary);
}
