// Supabase Edge Function: delivers a push notification to another player.
//
// The caller never gets to say what the notification says — it picks a `kind`
// and the text is composed here, in the recipient's own language. And it can
// only reach somebody it already has a reason to reach: the function checks,
// with the service role, that the friend request or battle invite it claims
// to be announcing actually exists and was created by the caller. Without
// that check any signed-in account could push arbitrary text at anybody.
//
// Deploy with:
//   supabase functions deploy send-push
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided
// automatically by the Edge Function runtime — no manual config needed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

type Kind = 'friendRequest' | 'battleInvite';

const TEXT: Record<Kind, Record<string, { title: string; body: string }>> = {
  friendRequest: {
    ru: { title: 'Новая заявка в друзья', body: 'Кто-то хочет добавить вас в друзья' },
    en: { title: 'New friend request', body: 'Somebody wants to add you as a friend' },
  },
  battleInvite: {
    ru: { title: 'Вызов на битву', body: 'Вас зовут в «Битву фанатов»' },
    en: { title: 'Battle invite', body: 'You have been challenged to a fan battle' },
  },
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'not signed in' }, 401);

  let payload: { kind?: Kind; toUserId?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'invalid request body' }, 400);
  }

  const { kind, toUserId } = payload;
  if ((kind !== 'friendRequest' && kind !== 'battleInvite') || !toUserId) {
    return json({ error: 'invalid request body' }, 400);
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await asCaller.auth.getUser();
  if (userError || !userData.user) return json({ error: 'not signed in' }, 401);
  const fromUserId = userData.user.id;
  if (fromUserId === toUserId) return json({ error: 'nothing to send' }, 400);

  const admin = createClient(url, serviceKey);

  // The reason to notify has to already exist in the database.
  const { count } =
    kind === 'friendRequest'
      ? await admin
          .from('friendships')
          .select('id', { count: 'exact', head: true })
          .eq('requester_id', fromUserId)
          .eq('addressee_id', toUserId)
          .eq('status', 'pending')
      : await admin
          .from('battle_invites')
          .select('id', { count: 'exact', head: true })
          .eq('from_user_id', fromUserId)
          .eq('to_user_id', toUserId)
          .eq('status', 'pending');

  if (!count) return json({ error: 'no such invitation' }, 403);

  const { data: tokens } = await admin
    .from('push_tokens')
    .select('token, language')
    .eq('user_id', toUserId);

  if (!tokens || tokens.length === 0) return json({ ok: true, delivered: 0 });

  const messages = tokens.map((row: { token: string; language: string }) => {
    const text = TEXT[kind][row.language] ?? TEXT[kind].ru;
    return { to: row.token, sound: 'default', title: text.title, body: text.body, data: { kind } };
  });

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });

  if (!response.ok) return json({ error: 'push service rejected the request' }, 502);

  // Expo reports a dead token per-message rather than failing the request, so
  // the ones it refuses are cleared out here instead of being retried forever.
  const result = await response.json().catch(() => null);
  const tickets: { status?: string; details?: { error?: string } }[] = result?.data ?? [];
  const dead = tickets
    .map((ticket, i) => (ticket.details?.error === 'DeviceNotRegistered' ? messages[i].to : null))
    .filter((t): t is string => !!t);
  if (dead.length > 0) {
    await admin.from('push_tokens').delete().eq('user_id', toUserId).in('token', dead);
  }

  return json({ ok: true, delivered: messages.length - dead.length });
});
