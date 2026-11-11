// Delivering a push, in one place.
//
// Every function that pushes needs the same three things: the recipients'
// tokens, the text in each recipient's own language, and a dead token
// cleared out rather than retried for ever. What differs is only who is
// being reached and why, which is the calling function's business.

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Expo takes a hundred messages per request. */
const BATCH = 100;

export type PushText = { title: string; body: string };

/** The same notice in each language the app speaks, Russian standing in for
 * anything else. */
export type PushCopy = Record<string, PushText>;

export type TokenRow = { token: string; language: string };

export function textIn(copy: PushCopy, language: string): PushText {
  return copy[language] ?? copy.ru;
}

// PUSH-CATEGORIES-BEGIN
/**
 * What a player can switch off in the app. Every notice belongs to one, and
 * a device that has muted it is left out before anything is sent.
 *
 * The app keeps the same list in src/notifications/notificationSettings.ts,
 * and a test fails if the two drift apart.
 */
export const PUSH_CATEGORIES = ['friends', 'battles', 'tournament'] as const;
// PUSH-CATEGORIES-END

export type PushCategory = (typeof PUSH_CATEGORIES)[number];

/**
 * The devices to send a notice of this category to: those of the players
 * named, or every device there is when nobody is named — minus any that
 * have the category switched off.
 *
 * The category comes first and is not optional, so a new notice cannot be
 * added without deciding which switch silences it.
 */
export async function tokensFor(
  admin: SupabaseClient,
  category: PushCategory,
  userIds?: string[]
): Promise<TokenRow[]> {
  if (userIds && userIds.length === 0) return [];
  const rows = () => {
    const query = admin.from('push_tokens').select('token, language');
    return userIds ? query.in('user_id', userIds) : query;
  };

  const wanted = await rows().not('muted', 'cs', `{${category}}`);
  if (!wanted.error) return (wanted.data ?? []) as TokenRow[];

  // The only way that filter fails is a database without the `muted` column
  // — one where nobody can have muted anything yet. Send as before.
  const { data } = await rows();
  return (data ?? []) as TokenRow[];
}

/**
 * Sends one notice to a list of devices and returns how many were reached.
 *
 * A token Expo refuses as `DeviceNotRegistered` belongs to an app that has
 * been uninstalled: it is deleted rather than kept for the next attempt.
 * Expo reports that per message instead of failing the request, so it has
 * to be read out of the tickets.
 */
export async function pushToTokens(
  admin: SupabaseClient,
  tokens: TokenRow[],
  copy: PushCopy,
  data: Record<string, unknown> = {}
): Promise<number> {
  let delivered = 0;

  for (let start = 0; start < tokens.length; start += BATCH) {
    const batch = tokens.slice(start, start + BATCH);
    const messages = batch.map((row) => {
      const { title, body } = textIn(copy, row.language);
      return { to: row.token, sound: 'default', title, body, data };
    });

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    // One rejected batch is not a reason to drop the rest.
    if (!response.ok) continue;

    const result = await response.json().catch(() => null);
    const tickets: { status?: string; details?: { error?: string } }[] = result?.data ?? [];
    const dead = tickets
      .map((ticket, i) => (ticket?.details?.error === 'DeviceNotRegistered' ? batch[i].token : null))
      .filter((token): token is string => !!token);
    if (dead.length > 0) await admin.from('push_tokens').delete().in('token', dead);

    delivered += batch.length - dead.length;
  }

  return delivered;
}
