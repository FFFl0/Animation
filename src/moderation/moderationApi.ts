import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { pokeReportNotify } from './reportNotify';
import { PlayerSummary, fetchPlayers } from '../friends/friendsApi';
import { ReportReason, ReportTarget, reportArgs } from './reports';

export { REPORT_COMMENT_MAX, REPORT_REASONS, reportArgs } from './reports';
export type { ReportReason, ReportTarget } from './reports';

/**
 * Blocking somebody and reporting something.
 *
 * Both are the server's to enforce and the server's to keep: a block is a
 * row the database checks on every message, friend request and invite, and
 * a report is a row with a snapshot of what was reported. This file only
 * asks for them — see "МОДЕРАЦИЯ" in supabase/schema.sql.
 */
export const canModerate = isSupabaseConfigured;

/** The ids this player has blocked. Only ever their own list. */
export async function fetchBlockedIds(): Promise<string[]> {
  if (!canModerate || !supabase) return [];
  const { data, error } = await supabase.from('user_blocks').select('blocked_id');
  if (error) throw new Error(error.message);
  return ((data ?? []) as { blocked_id: string }[]).map((row) => row.blocked_id);
}

/** The same list with names and avatars, for the screen that undoes a block. */
export async function fetchBlockedPlayers(): Promise<PlayerSummary[]> {
  const ids = await fetchBlockedIds();
  if (!ids.length) return [];
  const players = await fetchPlayers(ids);
  return ids.flatMap((id) => {
    const player = players.get(id);
    return player ? [player] : [];
  });
}

/**
 * Blocks a player. The server also ends the friendship and withdraws any
 * pending invite between the two, in the same transaction — a blocked
 * person who stayed a friend would still sit in the chat list.
 */
export async function blockUser(userId: string): Promise<void> {
  const { error } = await supabase!.rpc('block_user', { p_user: userId });
  if (error) throw new Error(error.message);
}

export async function unblockUser(userId: string): Promise<void> {
  const { error } = await supabase!.rpc('unblock_user', { p_user: userId });
  if (error) throw new Error(error.message);
}

/**
 * Files a report. Only an id goes up: the server finds the message itself,
 * decides who it is against, and keeps a copy of the text as it stood —
 * so editing or deleting the message afterwards does not erase the case.
 */
export async function sendReport(target: ReportTarget, reason: ReportReason, comment: string): Promise<void> {
  const { error } = await supabase!.rpc('report_content', reportArgs(target, reason, comment));
  if (error) throw new Error(error.message);
  pokeReportNotify();
}
