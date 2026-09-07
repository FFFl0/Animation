import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';

export { isSupabaseConfigured };

export type ChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
};

type MessageRow = { id: string; sender_id: string; recipient_id: string; body: string; created_at: string };

function toMessage(row: MessageRow): ChatMessage {
  return { id: row.id, senderId: row.sender_id, recipientId: row.recipient_id, body: row.body, createdAt: row.created_at };
}

export async function getConversation(meId: string, friendId: string, limit = 200): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, recipient_id, body, created_at')
    .or(`and(sender_id.eq.${meId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${meId})`)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return (data as MessageRow[]).map(toMessage);
}

export async function sendMessage(meId: string, friendId: string, body: string): Promise<ChatMessage | null> {
  if (!supabase) return null;
  const trimmed = body.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: meId, recipient_id: friendId, body: trimmed })
    .select('id, sender_id, recipient_id, body, created_at')
    .single();

  if (error || !data) return null;
  return toMessage(data as MessageRow);
}

/** Only fires for messages from `friendId` addressed to `meId` — a chat
 * screen only cares about new messages in the conversation it has open. */
export function subscribeIncomingMessages(meId: string, friendId: string, onMessage: (m: ChatMessage) => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`chat-${meId}-${friendId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${meId}` },
      (payload) => {
        const row = payload.new as MessageRow;
        if (row.sender_id === friendId) onMessage(toMessage(row));
      }
    )
    .subscribe();
  return () => {
    supabase!.removeChannel(channel);
  };
}

/** Number of unread messages per sender — used to show a small dot next to
 * friends with something new, without a full inbox screen. */
export async function getUnreadCountsByFriend(meId: string): Promise<Map<string, number>> {
  if (!isSupabaseConfigured || !supabase) return new Map();
  const { data, error } = await supabase.from('messages').select('sender_id').eq('recipient_id', meId).eq('read', false);
  if (error || !data) return new Map();

  const counts = new Map<string, number>();
  for (const row of data as { sender_id: string }[]) {
    counts.set(row.sender_id, (counts.get(row.sender_id) ?? 0) + 1);
  }
  return counts;
}

export async function markConversationRead(meId: string, friendId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('messages').update({ read: true }).eq('recipient_id', meId).eq('sender_id', friendId).eq('read', false);
}
