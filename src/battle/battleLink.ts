import * as Linking from 'expo-linking';
import { ROOM_CODE_LENGTH, normalizeRoomCode } from './battleRoom';

/**
 * An optional web address that redirects into the app, e.g.
 * `https://example.com/b`. With it set, invites are shared as
 * `https://example.com/b/battle/ABCDE` — a link every messenger makes
 * tappable — and the page it points at is expected to forward to the
 * `animequiz://` link below. Without it, the invite is the scheme link
 * itself, which opens the app directly but is plain text in most chats;
 * that is why the room code always travels alongside it.
 *
 * Read once at module load: it is baked into the build like the other
 * EXPO_PUBLIC_ values and cannot change while the app runs.
 */
const WEB_BASE = process.env.EXPO_PUBLIC_BATTLE_LINK_BASE?.trim().replace(/\/+$/, '') || null;

/** The path segment that marks a link as a battle invite. */
const MARKER = 'battle';

/**
 * The link that puts a friend straight into this room.
 *
 * `createURL` is what makes this work in a development client too: in a
 * build it returns `animequiz://battle/ABCDE`, while in Expo Go it returns
 * the `exp://.../--/battle/ABCDE` form that actually reaches the running
 * project. Both are understood by the parser below.
 */
export function battleInviteUrl(code: string): string {
  const path = `${MARKER}/${encodeURIComponent(code)}`;
  return WEB_BASE ? `${WEB_BASE}/${path}` : Linking.createURL(path);
}

/**
 * The room code out of a battle invite link, or null if the URL is not one.
 *
 * Deliberately tolerant about shape, because the same code has to be found
 * in everything the link can arrive as: the three slashes of a scheme link,
 * the `/--/` of a development client, an `https://` redirect, a trailing
 * slash a chat app appended, or a `?code=` query. What it is strict about is
 * the marker segment — without it, an unrelated link carrying a `code`
 * parameter would be read as an invite.
 */
export function parseBattleInviteUrl(url: string): string | null {
  if (!url) return null;

  const [beforeFragment = ''] = url.split('#');
  const [path = '', query = ''] = beforeFragment.split('?');
  const segments = path.split('/').filter((segment) => segment.length > 0);

  const marker = segments.findIndex((segment) => segment.toLowerCase() === MARKER);
  if (marker < 0) return null;

  for (const candidate of [segments[marker + 1], codeParam(query)]) {
    if (!candidate) continue;
    const code = normalizeRoomCode(decodeSafely(candidate));
    if (code.length === ROOM_CODE_LENGTH) return code;
  }
  return null;
}

function codeParam(query: string): string | null {
  if (!query) return null;
  try {
    return new URLSearchParams(query).get('code');
  } catch {
    return null;
  }
}

/** A code never needs escaping, but a link that has been through a chat app
 * and back might arrive percent-encoded anyway. */
function decodeSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** True for text that is a link rather than a typed code, so the join field
 * knows not to upper-case and truncate what was just pasted into it. */
export function looksLikeInviteLink(text: string): boolean {
  return /[:/]/.test(text);
}

/**
 * The room code behind whatever was put in the join field — an invite link
 * pasted whole, or a code typed by hand — or null if it is neither.
 */
export function roomCodeFromInput(text: string): string | null {
  const fromLink = parseBattleInviteUrl(text);
  if (fromLink) return fromLink;
  const typed = normalizeRoomCode(text);
  return typed.length === ROOM_CODE_LENGTH ? typed : null;
}
