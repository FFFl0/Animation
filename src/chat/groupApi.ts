import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { reportHandledError } from '../monitoring/sentry';

export { isSupabaseConfigured };

export type ChatGroup = {
  id: string;
  name: string;
  ownerId: string;
  /** Public URL of the group's picture, or null for the default badge. */
  avatarUrl: string | null;
  createdAt: string;
};

export type GroupMessage = {
  id: string;
  groupId: string;
  senderId: string;
  body: string;
  createdAt: string;
  replyToId: string | null;
};

export type GroupReaction = {
  messageId: string;
  userId: string;
  emoji: string;
};

type GroupRow = { id: string; name: string; owner_id: string; avatar_url: string | null; created_at: string };
type MessageRow = {
  id: string;
  group_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  reply_to_id: string | null;
};
type ReactionRow = { message_id: string; user_id: string; emoji: string };

const MESSAGE_COLUMNS = 'id, group_id, sender_id, body, created_at, reply_to_id';

const GROUP_COLUMNS = 'id, name, owner_id, avatar_url, created_at';

function toGroup(row: GroupRow): ChatGroup {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    avatarUrl: row.avatar_url ?? null,
    createdAt: row.created_at,
  };
}

function toMessage(row: MessageRow): GroupMessage {
  return {
    id: row.id,
    groupId: row.group_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    replyToId: row.reply_to_id ?? null,
  };
}

/** Groups the current user belongs to. RLS already limits the table to those,
 * so this needs no filter of its own. */
export async function listMyGroups(): Promise<ChatGroup[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('chat_groups')
    .select(GROUP_COLUMNS)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as GroupRow[]).map(toGroup);
}

/**
 * Creates a group and seeds its roster in one go. The owner's own membership
 * row is what makes the group visible to them at all — without it the SELECT
 * policy would hide the row they just created.
 */
export async function createGroup(name: string, ownerId: string, memberIds: string[]): Promise<ChatGroup | null> {
  if (!supabase) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from('chat_groups')
    .insert({ name: trimmed, owner_id: ownerId })
    .select(GROUP_COLUMNS)
    .single();
  if (error || !data) return null;

  const group = toGroup(data as GroupRow);
  const roster = Array.from(new Set([ownerId, ...memberIds]));
  const { error: memberError } = await supabase
    .from('chat_group_members')
    .insert(roster.map((user_id) => ({ group_id: group.id, user_id })));

  if (memberError) {
    // A group nobody can see is worse than no group: undo it.
    reportHandledError(memberError, { where: 'seed group roster', groupId: group.id });
    await supabase.from('chat_groups').delete().eq('id', group.id);
    return null;
  }
  return group;
}

/** Owner-only, enforced by RLS. Passing null clears the picture back to the
 * default badge. Returns the updated row so the caller can drop its own copy
 * of the group in place rather than refetching the list. */
export async function setGroupAvatar(groupId: string, avatarUrl: string | null): Promise<ChatGroup | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('chat_groups')
    .update({ avatar_url: avatarUrl })
    .eq('id', groupId)
    .select(GROUP_COLUMNS)
    .single();

  if (error || !data) return null;
  return toGroup(data as GroupRow);
}

export async function getGroupMemberIds(groupId: string): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase.from('chat_group_members').select('user_id').eq('group_id', groupId);
  if (error || !data) return [];
  return (data as { user_id: string }[]).map((row) => row.user_id);
}

/** Owner-only, enforced by RLS. Existing members are ignored rather than
 * erroring, so re-adding somebody is harmless. */
export async function addGroupMembers(groupId: string, userIds: string[]): Promise<boolean> {
  if (!supabase || userIds.length === 0) return false;
  const { error } = await supabase
    .from('chat_group_members')
    .upsert(
      userIds.map((user_id) => ({ group_id: groupId, user_id })),
      { onConflict: 'group_id,user_id', ignoreDuplicates: true }
    );
  return !error;
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('chat_group_members').delete().eq('group_id', groupId).eq('user_id', userId);
}

/** Owner-only. Messages and memberships cascade away with the row. */
export async function deleteGroup(groupId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('chat_groups').delete().eq('id', groupId);
}

export async function getGroupMessages(groupId: string, limit = 200): Promise<GroupMessage[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await supabase
    .from('group_messages')
    .select(MESSAGE_COLUMNS)
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return (data as MessageRow[]).map(toMessage);
}

export async function sendGroupMessage(
  groupId: string,
  senderId: string,
  body: string,
  replyToId?: string | null
): Promise<GroupMessage | null> {
  if (!supabase) return null;
  const trimmed = body.trim();
  if (!trimmed) return null;

  const { data, error } = await supabase
    .from('group_messages')
    .insert({ group_id: groupId, sender_id: senderId, body: trimmed, reply_to_id: replyToId ?? null })
    .select(MESSAGE_COLUMNS)
    .single();

  if (error || !data) return null;
  return toMessage(data as MessageRow);
}

/** Sender-only, enforced by RLS. */
export async function deleteGroupMessage(messageId: string): Promise<void> {
  if (!supabase) return;
  await supabase.from('group_messages').delete().eq('id', messageId);
}

export async function getGroupReactions(messageIds: string[]): Promise<GroupReaction[]> {
  if (!isSupabaseConfigured || !supabase || messageIds.length === 0) return [];
  const { data, error } = await supabase
    .from('group_message_reactions')
    .select('message_id, user_id, emoji')
    .in('message_id', messageIds);

  if (error || !data) return [];
  return (data as ReactionRow[]).map((row) => ({ messageId: row.message_id, userId: row.user_id, emoji: row.emoji }));
}

/** One reaction per person per message, same rule as direct messages. */
export async function toggleGroupReaction(
  messageId: string,
  userId: string,
  emoji: string,
  current: string | null
): Promise<void> {
  if (!supabase) return;
  if (current === emoji) {
    await supabase.from('group_message_reactions').delete().eq('message_id', messageId).eq('user_id', userId);
    return;
  }
  await supabase
    .from('group_message_reactions')
    .upsert({ message_id: messageId, user_id: userId, emoji }, { onConflict: 'message_id,user_id' });
}

export function subscribeGroupMessages(groupId: string, onMessage: (m: GroupMessage) => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`group-${groupId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` },
      (payload) => onMessage(toMessage(payload.new as MessageRow))
    )
    .subscribe();
  return () => {
    supabase!.removeChannel(channel);
  };
}

/** The table is REPLICA IDENTITY FULL, so the old row carries `group_id` and
 * this can be narrowed to the open group. */
export function subscribeGroupMessageDeletes(groupId: string, onDelete: (messageId: string) => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`group-del-${groupId}`)
    .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'group_messages' }, (payload) => {
      const row = payload.old as Partial<MessageRow>;
      if (row.id && row.group_id === groupId) onDelete(row.id);
    })
    .subscribe();
  return () => {
    supabase!.removeChannel(channel);
  };
}

export function subscribeGroupReactions(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel('group-reactions')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'group_message_reactions' }, () => onChange())
    .subscribe();
  return () => {
    supabase!.removeChannel(channel);
  };
}
