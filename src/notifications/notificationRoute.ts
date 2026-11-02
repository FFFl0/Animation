/**
 * Where a notification leads when it is tapped.
 *
 * The notification itself only ever carries a `kind` — the same word the
 * server composes its text from — and the mapping from that to a screen
 * lives here, away from the native plumbing, so it can be read and tested
 * without a device.
 */

/** Every kind the app sends, from the server or from the phone itself. */
export type NotificationKind =
  | 'friendRequest'
  | 'battleInvite'
  | 'tournamentSignups'
  | 'tournamentStarted'
  | 'streak';

/** The screens a notification can open. */
export type NotificationTarget = 'friends' | 'tournament' | 'home';

const TARGETS: Record<NotificationKind, NotificationTarget> = {
  // Both the request and the invite are waiting on the same screen.
  friendRequest: 'friends',
  battleInvite: 'friends',
  tournamentSignups: 'tournament',
  tournamentStarted: 'tournament',
  // The streak reminder is about playing at all, and that starts at home.
  streak: 'home',
};

/**
 * The screen a notification's payload asks for, or null when it asks for
 * nothing this version understands — an older notification still sitting in
 * the tray, or one sent by a newer build. Tapping that should open the app
 * and leave it where it was, not throw.
 */
export function targetOf(data: unknown): NotificationTarget | null {
  if (!data || typeof data !== 'object') return null;
  const kind = (data as { kind?: unknown }).kind;
  if (typeof kind !== 'string') return null;
  return TARGETS[kind as NotificationKind] ?? null;
}
