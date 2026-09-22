// Supabase Edge Function: resolves a username to its Auth account and
// performs login / password-reset server-side, so the account's email
// address (which may be a real address the player supplied for recovery,
// not just the synthesized `username@animequiz.local` one) never has to be
// sent back to the client. Deploy with:
//   supabase functions deploy auth-helper
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided
// automatically by the Edge Function runtime — no manual config needed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Escapes ILIKE wildcard metacharacters so a username containing "%" or "_"
// can't turn a lookup into an unintended pattern match.
function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, (c) => `\\${c}`);
}

const GENERIC_LOGIN_ERROR = 'Неверное имя пользователя или пароль';
const SYNTHETIC_EMAIL_DOMAIN = '@animequiz.local';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  let payload: { action?: string; username?: string; password?: string; redirectTo?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'invalid request body' }, 400);
  }

  const { action, username, password, redirectTo } = payload;
  if (!username || typeof username !== 'string' || !username.trim()) {
    return json({ error: 'username required' }, 400);
  }
  const trimmed = username.trim();

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);

  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .ilike('username', escapeLike(trimmed))
    .maybeSingle();

  if (action === 'login') {
    if (!password || typeof password !== 'string') return json({ error: 'password required' }, 400);
    if (!profile) return json({ error: GENERIC_LOGIN_ERROR }, 400);

    const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(profile.id);
    if (userErr || !userRes.user?.email) return json({ error: GENERIC_LOGIN_ERROR }, 400);

    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
      email: userRes.user.email,
      password,
    });
    if (signInError || !signInData.session) return json({ error: GENERIC_LOGIN_ERROR }, 400);

    return json({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
    });
  }

  if (action === 'reset') {
    // Always respond the same way whether or not the account exists, so this
    // can't be used to enumerate registered usernames.
    if (!profile) return json({ ok: true });

    const { data: userRes } = await admin.auth.admin.getUserById(profile.id);
    const email = userRes?.user?.email;
    if (!email || email.endsWith(SYNTHETIC_EMAIL_DOMAIN)) {
      return json({ ok: false, reason: 'Для этого аккаунта не указан email для восстановления пароля.' });
    }

    const { error } = await anon.auth.resetPasswordForEmail(
      email,
      typeof redirectTo === 'string' ? { redirectTo } : undefined
    );
    if (error) return json({ ok: false, reason: error.message });
    return json({ ok: true });
  }

  return json({ error: 'unknown action' }, 400);
});
