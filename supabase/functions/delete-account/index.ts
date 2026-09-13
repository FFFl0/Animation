// Supabase Edge Function: deletes the calling user's account for good.
//
// Deleting an auth user needs the service_role key, which must never reach a
// client, so it happens here. The caller proves who they are with their own
// access token and can only ever delete themselves — the id comes from the
// verified token, never from the request body.
//
// Both app stores require an in-app way to delete an account, so this is not
// optional. Deploy with:
//   supabase functions deploy delete-account
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'not signed in' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // Who is actually calling: verified against Auth rather than trusted from
  // the body, so one account can never delete another.
  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await asCaller.auth.getUser();
  if (userError || !userData.user) return json({ error: 'not signed in' }, 401);

  const userId = userData.user.id;
  const admin = createClient(url, serviceKey);

  // Storage is not covered by the foreign keys, so the avatar folder goes
  // first — otherwise the files would outlive the account that owns them.
  const { data: files } = await admin.storage.from('avatars').list(userId);
  if (files && files.length > 0) {
    await admin.storage.from('avatars').remove(files.map((file) => `${userId}/${file.name}`));
  }

  // Everything else — profile, friendships, messages, group membership,
  // reactions, round results — is wired to auth.users with ON DELETE CASCADE,
  // so removing the user removes all of it in one transaction.
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) return json({ error: deleteError.message }, 500);

  return json({ ok: true });
});
