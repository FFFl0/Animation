import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';

export { isSupabaseConfigured };

export type ChatMessage = {
  id: string;
  senderId: string;
  recipientId: string;
  body: string;
  createdAt: string;
  read: boolean;
  replyToId: string | null;
  /** When it was last edited, or null if it never was. */
  editedAt: string | null;
  /** Display name of whoever wrote the message this was forwarded from. */
  forwardedFrom: string | null;
};

export type MessageReaction = {
  messageId: string;
  userId: string;
  emoji: string;
};

type MessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read: boolean;
  reply_to_id: string | null;
  edited_at: string | null;
  forwarded_from: string | null;
};

type ReactionRow = { message_id: string; user_id: string; emoji: string };

const MESSAGE_COLUMNS =
  'id, sender_id, recipient_id, body, created_at, read, reply_to_id, edited_at, forwarded_from';

function toMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    body: row.body,
    createdAt: row.created_at,
    read: row.read ?? false,
    replyToId: row.reply_to_id ?? null,
    editedAt: row.edited_at ?? null,
    forwardedFrom: row.forwarded_from ?? null,
  };
}

function toReaction(row: ReactionRow): MessageReaction {
  return { messageId: row.message_id, userId: row.user_id, emoji: row.emoji };
}

export async function getConversation(meId: string, friendId: string, limit = 200): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('messages')
    .select(MESSAGE_COLUMNS)
    .or(`and(sender_id.eq.${meId},recipient_id.eq.${friendId}),and(sender_id.eq.${friendId},recipient_id.eq.${meId})`)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return (data as MessageRow[]).map(toMessage);
}

export async function sendMessage(
  meId: string,
  friendId: string,
  body: string,
  replyToId?: string | null,
  forwardedFrom?: string | null
): Promise<ChatMessage | null> {
  if (!supabase) return null;
  const trimmed = body.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: meId,
      recipient_id: friendId,
      body: trimmed,
      reply_to_id: replyToId ?? null,
      forwarded_from: forwardedFrom ?? null,
    })
    .select(MESSAGE_COLUMNS)
    .single();

  if (error || !data) return null;
  return toMessage(data as MessageRow);
}

/**
 * Rewrites a message you sent. Goes through a SQL function rather than a
 * plain update: the table's only UPDATE policy belongs to the recipient (for
 * the read flag), and widening it to the sender would hand them the whole
 * row. Returns the new edit timestamp, or null if the message wasn't yours.
 */
export async function editMessage(messageId: string, body: string): Promise<string | null> {
  if (!supabase) return null;
  const trimmed = body.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase.rpc('edit_message', { p_id: messageId, p_body: trimmed });
  if (error) return null;
  return (data as string | null) ?? null;
}

/** Sender-only, enforced by RLS — this just avoids a pointless round-trip. */
export async function deleteMessage(messageId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('messages').delete().eq('id', messageId);
}

export async function getReactions(messageIds: string[]): Promise<MessageReaction[]> {
  if (!isSupabaseConfigured || !supabase || messageIds.length === 0) return [];
  const { data, error } = await supabase
    .from('message_reactions')
    .select('message_id, user_id, emoji')
    .in('message_id', messageIds);

  if (error || !data) return [];
  return (data as ReactionRow[]).map(toReaction);
}

/**
 * One reaction per person per message: reacting with the emoji you already
 * picked clears it, a different one replaces it. Returns the emoji now in
 * effect (null when cleared) so the caller can update state without refetching.
 */
export async function toggleReaction(
  messageId: string,
  userId: string,
  emoji: string,
  current: string | null
): Promise<string | null> {
  if (!supabase) return current;

  if (current === emoji) {
    await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', userId);
    return null;
  }

  await supabase
    .from('message_reactions')
    .upsert({ message_id: messageId, user_id: userId, emoji }, { onConflict: 'message_id,user_id' });
  return emoji;
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

/** Edits and read receipts from the other side. Both arrive as UPDATEs on a
 * row that already exists locally, so the screen patches its copy in place
 * instead of refetching the conversation. */
export function subscribeMessageUpdates(
  meId: string,
  friendId: string,
  onUpdate: (m: ChatMessage) => void
): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`chat-upd-${meId}-${friendId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, (payload) => {
      const row = payload.new as MessageRow;
      const involvesThisChat =
        (row.sender_id === friendId && row.recipient_id === meId) ||
        (row.sender_id === meId && row.recipient_id === friendId);
      if (involvesThisChat) onUpdate(toMessage(row));
    })
    .subscribe();
  return () => {
    supabase!.removeChannel(channel);
  };
}

/** Deletions the other side made. The payload carries the whole old row
 * (the table is REPLICA IDENTITY FULL), so this can be narrowed to the open
 * conversation instead of reacting to every delete in the table. */
export function subscribeMessageDeletes(meId: string, friendId: string, onDelete: (messageId: string) => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`chat-del-${meId}-${friendId}`)
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, (payload) => {
      const row = payload.old as Partial<MessageRow>;
      const involvesThisChat =
        (row.sender_id === friendId && row.recipient_id === meId) ||
        (row.sender_id === meId && row.recipient_id === friendId);
      if (row.id && involvesThisChat) onDelete(row.id);
    })
    .subscribe();
  return () => {
    supabase!.removeChannel(channel);
  };
}

/** Any reaction change in this conversation. Reactions are cheap to refetch
 * and arrive rarely, so the callback just asks the screen to reload them
 * rather than trying to patch one row in place. */
export function subscribeReactions(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel('chat-reactions')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => onChange())
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
