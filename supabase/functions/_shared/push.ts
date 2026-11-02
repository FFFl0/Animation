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

/** Every device a set of players has registered, or every device there is
 * when no players are named. */
export async function tokensFor(admin: SupabaseClient, userIds?: string[]): Promise<TokenRow[]> {
  if (userIds && userIds.length === 0) return [];
  const query = admin.from('push_tokens').select('token, language');
  const { data } = userIds ? await query.in('user_id', userIds) : await query;
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
