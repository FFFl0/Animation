import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { Friendship, PlayerSummary, fetchPlayers } from '../friends/friendsApi';

export { isSupabaseConfigured };

export type BattleInvite = {
  id: string;
  roomCode: string;
  fromPlayer: PlayerSummary;
  createdAt: string;
};

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted';
};

type BattleInviteRow = {
  id: string;
  room_code: string;
  from_user_id: string;
  to_user_id: string;
  created_at: string;
};

/** Pending requests someone else sent you — the half of `friendships` that
 * warrants a notification (an outgoing request you sent isn't news to you). */
export async function getIncomingFriendRequests(meId: string): Promise<Friendship[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('friendships')
    .select('id, requester_id, addressee_id, status')
    .eq('addressee_id', meId)
    .eq('status', 'pending');

  if (error || !data) return [];

  const rows = data as FriendshipRow[];
  const players = await fetchPlayers(rows.map((r) => r.requester_id));

  return rows
    .map((row) => {
      const player = players.get(row.requester_id);
      if (!player) return null;
      return { friendshipId: row.id, status: row.status, isOutgoing: false, player };
    })
    .filter((f): f is Friendship => f !== null);
}

export async function getPendingBattleInvites(meId: string): Promise<BattleInvite[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('battle_invites')
    .select('id, room_code, from_user_id, to_user_id, created_at')
    .eq('to_user_id', meId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  const rows = data as BattleInviteRow[];
  const players = await fetchPlayers(rows.map((r) => r.from_user_id));

  return rows
    .map((row) => {
      const fromPlayer = players.get(row.from_user_id);
      if (!fromPlayer) return null;
      return { id: row.id, roomCode: row.room_code, fromPlayer, createdAt: row.created_at };
    })
    .filter((i): i is BattleInvite => i !== null);
}

export async function sendBattleInvite(fromUserId: string, toUserId: string, roomCode: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('battle_invites').insert({ from_user_id: fromUserId, to_user_id: toUserId, room_code: roomCode });
}

export async function respondToBattleInvite(inviteId: string, accept: boolean): Promise<void> {
  if (!supabase) return;
  await supabase.from('battle_invites').update({ status: accept ? 'accepted' : 'declined' }).eq('id', inviteId);
}

/** Fires `onInsert` for every new row addressed to `meId` — callers just
 * re-fetch the relevant list rather than trying to reconstruct it from the
 * bare insert payload (which has no hydrated player summary). */
export function subscribeIncomingFriendRequests(meId: string, onInsert: () => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`friend-requests-${meId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${meId}` },
      () => onInsert()
    )
    .subscribe();
  return () => {
    supabase!.removeChannel(channel);
  };
}

export function subscribeBattleInvites(meId: string, onInsert: () => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`battle-invites-${meId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'battle_invites', filter: `to_user_id=eq.${meId}` },
      () => onInsert()
    )
    .subscribe();
  return () => {
    supabase!.removeChannel(channel);
  };
}
