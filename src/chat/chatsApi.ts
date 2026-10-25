import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { PlayerSummary, fetchPlayers } from '../friends/friendsApi';
import { Attachment, AttachmentKind, MediaScope } from './attachments';
import { copyAttachmentTo } from './attachmentStorage';
import { ChatGroup, getGroupReadMarks, listMyGroups, sendGroupMessage } from './groupApi';
import { getUnreadCountsByFriend, sendMessage } from './chatApi';

export { isSupabaseConfigured };

export type ChatKind = 'direct' | 'group';

/** One row of the chat list. Direct conversations and groups are kept in one
 * shape so the list can sort them together by recency — which is the whole
 * point of having a single list instead of two tabs. */
export type ChatSummary = {
  kind: ChatKind;
  /** The other player's id for a direct chat, the group's id for a group. */
  id: string;
  title: string;
  /** Set for a direct chat, so the row can draw an avatar and the chat screen
   * can be opened without another round-trip. */
  player: PlayerSummary | null;
  /** Set for a group, for the same reason. */
  group: ChatGroup | null;
  lastMessage: {
    body: string;
    senderId: string;
    createdAt: string;
    /** Enough of an attachment to label the row when the body is empty — a
     * photo with no caption still has to read as something. */
    attachment: { kind: AttachmentKind; name: string | null } | null;
  } | null;
  unread: number;
};

/**
 * How far back the list looks for "the last message in each chat".
 *
 * One query over the tail of each table, grouped by conversation on the
 * device, rather than a `distinct on` view or an RPC per chat: at this app's
 * size the newest few hundred messages cover every conversation that has any
 * recent activity, and a chat with nothing in that window sorts to the bottom
 * anyway. Direct unread counts do not depend on this window (they come from
 * an exact query); group unread counts are counted inside it, so a group with
 * more than this many unread messages reads as "99+" either way.
 */
const LIST_WINDOW = 400;

type PreviewRow = {
  body: string;
  created_at: string;
  sender_id: string;
  attachment_kind: AttachmentKind | null;
  attachment_name: string | null;
};

type DirectRow = PreviewRow & { id: string; recipient_id: string };
type GroupRow = PreviewRow & { id: string; group_id: string };

/** Only the two fields a list row needs; the full attachment is read when the
 * conversation itself is opened. */
const PREVIEW_COLUMNS = 'attachment_kind, attachment_name';

function toPreview(row: PreviewRow) {
  return {
    body: row.body,
    senderId: row.sender_id,
    createdAt: row.created_at,
    attachment: row.attachment_kind ? { kind: row.attachment_kind, name: row.attachment_name ?? null } : null,
  };
}

/** Newest message per conversation, plus the ids involved. Rows arrive newest
 * first, so the first one seen for a conversation is the one to keep. */
function newestPerKey<T>(rows: T[], keyOf: (row: T) => string): Map<string, T> {
  const out = new Map<string, T>();
  for (const row of rows) {
    const key = keyOf(row);
    if (!out.has(key)) out.set(key, row);
  }
  return out;
}

async function directChats(meId: string): Promise<ChatSummary[]> {
  if (!supabase) return [];

  // No filter needed: RLS on `messages` already limits a select to rows where
  // the caller is the sender or the recipient.
  const { data } = await supabase
    .from('messages')
    .select(`id, sender_id, recipient_id, body, created_at, ${PREVIEW_COLUMNS}`)
    .order('created_at', { ascending: false })
    .limit(LIST_WINDOW);

  const rows = (data as DirectRow[] | null) ?? [];
  if (rows.length === 0) return [];

  const peerOf = (row: DirectRow) => (row.sender_id === meId ? row.recipient_id : row.sender_id);
  const newest = newestPerKey(rows, peerOf);
  const [players, unread] = await Promise.all([
    fetchPlayers([...newest.keys()]),
    getUnreadCountsByFriend(meId),
  ]);

  const out: ChatSummary[] = [];
  for (const [peerId, row] of newest) {
    const player = players.get(peerId);
    // A peer whose profile no longer resolves (deleted account) would have no
    // name or avatar to draw, so the conversation is left out rather than
    // rendered as a blank row.
    if (!player) continue;
    out.push({
      kind: 'direct',
      id: peerId,
      title: player.username,
      player,
      group: null,
      lastMessage: toPreview(row),
      unread: unread.get(peerId) ?? 0,
    });
  }
  return out;
}

/** The tail of `group_messages` across every group the caller is in. RLS does
 * the filtering, so no group id has to be listed. */
async function groupMessageWindow(): Promise<GroupRow[]> {
  if (!supabase) return [];
  const { data } = await supabase
    .from('group_messages')
    .select(`id, group_id, sender_id, body, created_at, ${PREVIEW_COLUMNS}`)
    .order('created_at', { ascending: false })
    .limit(LIST_WINDOW);
  return (data as GroupRow[] | null) ?? [];
}

/**
 * Unread per group: messages newer than your read mark that somebody else
 * wrote. A group with no mark at all counts everything in the window, which
 * is what being added to a group with history should look like.
 */
function unreadPerGroup(rows: GroupRow[], marks: Map<string, string>, meId: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.sender_id === meId) continue;
    const mark = marks.get(row.group_id);
    const since = mark ? new Date(mark).getTime() : 0;
    if (new Date(row.created_at).getTime() <= since) continue;
    counts.set(row.group_id, (counts.get(row.group_id) ?? 0) + 1);
  }
  return counts;
}

async function groupChats(meId: string): Promise<ChatSummary[]> {
  if (!supabase) return [];

  const [groups, marks] = await Promise.all([listMyGroups(), getGroupReadMarks(meId)]);
  if (groups.length === 0) return [];

  const rows = await groupMessageWindow();
  const newest = newestPerKey(rows, (row) => row.group_id);
  const unread = unreadPerGroup(rows, marks, meId);

  return groups.map((group) => {
    const row = newest.get(group.id) ?? null;
    return {
      kind: 'group' as const,
      id: group.id,
      title: group.name,
      player: null,
      group,
      lastMessage: row ? toPreview(row) : null,
      unread: unread.get(group.id) ?? 0,
    };
  });
}

/** Every conversation the current user has, newest activity first. A group
 * with no messages yet still appears — it was created deliberately and
 * needs somewhere to be opened from — and sorts by when it was created. */
export async function listChats(meId: string): Promise<ChatSummary[]> {
  if (!isSupabaseConfigured || !supabase || !meId) return [];
  const [direct, groups] = await Promise.all([directChats(meId), groupChats(meId)]);

  const stamp = (chat: ChatSummary) =>
    new Date(chat.lastMessage?.createdAt ?? chat.group?.createdAt ?? 0).getTime();

  return [...direct, ...groups].sort((a, b) => stamp(b) - stamp(a));
}

export function totalUnread(chats: ChatSummary[]): number {
  return chats.reduce((sum, chat) => sum + chat.unread, 0);
}

/**
 * Just the number for the tab badge, without building the list. The badge is
 * live — it reloads on every message anywhere — so it reads the two things it
 * needs rather than paying for profiles and group rows it would throw away.
 */
export async function countUnread(meId: string): Promise<number> {
  if (!isSupabaseConfigured || !supabase || !meId) return 0;
  const [direct, marks, rows] = await Promise.all([
    getUnreadCountsByFriend(meId),
    getGroupReadMarks(meId),
    groupMessageWindow(),
  ]);

  let total = 0;
  for (const count of direct.values()) total += count;
  for (const count of unreadPerGroup(rows, marks, meId).values()) total += count;
  return total;
}

/** Where a chat's attachments live. Needed by a forward, which has to put a
 * copy in the destination's folder before pointing a message at it. */
export function scopeOf(chat: ChatSummary, meId: string): MediaScope {
  return chat.kind === 'direct'
    ? { kind: 'direct', meId, peerId: chat.id }
    : { kind: 'group', groupId: chat.id };
}

/**
 * Sends into whichever kind of chat a summary points at. Used by forwarding,
 * which picks a destination out of the list and so cannot know in advance
 * whether it is a person or a group.
 *
 * An attachment is copied rather than referenced: the original object sits in
 * a folder only the source conversation's people can read, so pointing the
 * new message at it would hand the recipients a path they are not allowed to
 * open. If the copy fails the whole forward does — a bubble promising a photo
 * that will not load is worse than a plain failure.
 */
export async function sendToChat(
  chat: ChatSummary,
  meId: string,
  body: string,
  forwardedFrom?: string | null,
  attachment?: Attachment | null
): Promise<boolean> {
  let carried: Attachment | null = null;
  if (attachment) {
    carried = await copyAttachmentTo(scopeOf(chat, meId), attachment);
    if (!carried) return false;
  }

  if (chat.kind === 'direct') {
    const sent = await sendMessage(meId, chat.id, body, null, forwardedFrom ?? null, carried);
    return sent !== null;
  }
  const sent = await sendGroupMessage(chat.id, meId, body, null, forwardedFrom ?? null, carried);
  return sent !== null;
}

/**
 * Anything that could reorder the list or change a badge: a message sent or
 * received, edited or deleted, in a direct chat or a group.
 *
 * The callback carries no payload on purpose. Working out where one new row
 * belongs means re-deriving the newest message and the unread count for its
 * conversation, which is what `listChats` already does — so the screen just
 * reloads, debounced, instead of carrying a second copy of that logic.
 */
export function subscribeChatList(onChange: () => void): () => void {
  if (!isSupabaseConfigured || !supabase) return () => {};

  let timer: ReturnType<typeof setTimeout> | null = null;
  const nudge = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(onChange, 400);
  };

  const channel = supabase
    .channel('chat-list')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, nudge)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'group_messages' }, nudge)
    .subscribe();

  return () => {
    if (timer) clearTimeout(timer);
    supabase!.removeChannel(channel);
  };
}
