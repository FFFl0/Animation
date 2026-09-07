import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { AuthError } from './authError';
import { validateCredentials, usernameToEmail } from './validation';
import { parseAuthTokensFromUrl } from './parseRecoveryUrl';
import { Profile } from './types';
import { makeAvatar } from '../data/avatar';

const PROFILE_CACHE_KEY = 'animequiz.supabaseProfileCache';

type ProfileRow = {
  id: string;
  username: string;
  avatar: Profile['avatar'];
  favorite_character_id: string | null;
  stats: Profile['stats'];
  streak: Profile['streak'];
  achievements: string[];
  daily_challenge: Profile['dailyChallenge'];
  created_at: string;
};

function rowToProfile(row: ProfileRow): Profile {
  return {
    id: row.id,
    username: row.username,
    avatar: row.avatar,
    favoriteCharacterId: row.favorite_character_id,
    stats: row.stats ?? {},
    streak: row.streak ?? { count: 0, lastPlayedDate: null },
    achievements: row.achievements ?? [],
    dailyChallenge: row.daily_challenge ?? null,
    createdAt: row.created_at,
  };
}

function patchToRow(patch: Partial<Profile>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.avatar !== undefined) row.avatar = patch.avatar;
  if (patch.favoriteCharacterId !== undefined) row.favorite_character_id = patch.favoriteCharacterId;
  if (patch.stats !== undefined) row.stats = patch.stats;
  if (patch.streak !== undefined) row.streak = patch.streak;
  if (patch.achievements !== undefined) row.achievements = patch.achievements;
  if (patch.dailyChallenge !== undefined) row.daily_challenge = patch.dailyChallenge;
  return row;
}

async function cacheProfile(profile: Profile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
}

async function readCachedProfile(): Promise<Profile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
  return raw ? (JSON.parse(raw) as Profile) : null;
}

function mapAuthError(message: string): AuthError {
  if (/already registered|already exists/i.test(message)) {
    return new AuthError('Такое имя пользователя уже занято', 'usernameTaken');
  }
  if (/invalid login credentials/i.test(message)) {
    return new AuthError('Неверное имя пользователя или пароль', 'invalidCredentials');
  }
  return new AuthError(message);
}

async function uniqueUsernameFrom(client: SupabaseClient, seed: string): Promise<string> {
  const base = seed.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 16) || 'player';
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}${Math.floor(Math.random() * 10000)}`;
    const { data: taken } = await client.rpc('is_username_taken', { check_username: candidate });
    if (!taken) return candidate;
  }
  return `${base}${Date.now()}`;
}

/** Fetches the profile row for an authenticated user, auto-provisioning one
 * the first time (e.g. a first-ever Google sign-in, which has no row yet
 * since it skips our own register() flow). */
async function resolveOrCreateProfile(client: SupabaseClient, userId: string, emailHint?: string | null): Promise<Profile> {
  const { data: row, error } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) throw new AuthError(error.message);
  if (row) {
    const profile = rowToProfile(row as ProfileRow);
    await cacheProfile(profile);
    return profile;
  }

  const username = await uniqueUsernameFrom(client, emailHint?.split('@')[0] ?? 'player');
  const newRow: ProfileRow = {
    id: userId,
    username,
    avatar: makeAvatar(username + Date.now()),
    favorite_character_id: null,
    stats: {},
    streak: { count: 0, lastPlayedDate: null },
    achievements: [],
    daily_challenge: null,
    created_at: new Date().toISOString(),
  };
  const { data: inserted, error: insertError } = await client.from('profiles').insert(newRow).select().single();
  if (insertError) throw new AuthError(insertError.message);

  const profile = rowToProfile(inserted as ProfileRow);
  await cacheProfile(profile);
  return profile;
}

export async function register(username: string, password: string, recoveryEmail?: string): Promise<Profile> {
  const trimmed = validateCredentials(username, password);
  const client = supabase!;

  const { data: taken, error: rpcError } = await client.rpc('is_username_taken', { check_username: trimmed });
  if (rpcError) throw new AuthError(rpcError.message);
  if (taken) throw new AuthError('Такое имя пользователя уже занято', 'usernameTaken');

  const email = recoveryEmail?.trim() || usernameToEmail(trimmed);
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw mapAuthError(error.message);
  if (!data.user) throw new AuthError('Не удалось создать аккаунт, попробуйте ещё раз', 'accountCreateFailed');

  const row: ProfileRow = {
    id: data.user.id,
    username: trimmed,
    avatar: makeAvatar(trimmed + Date.now()),
    favorite_character_id: null,
    stats: {},
    streak: { count: 0, lastPlayedDate: null },
    achievements: [],
    daily_challenge: null,
    created_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await client.from('profiles').insert(row).select().single();
  if (insertError) throw new AuthError(insertError.message);

  const profile = rowToProfile(inserted as ProfileRow);
  await cacheProfile(profile);
  return profile;
}

/**
 * Calls the `auth-helper` Edge Function, which does the username→email
 * resolution server-side (via the service role) — the account's email can
 * be a real address the player supplied for password recovery, and must
 * never be sent back to the client just to let it sign in or trigger a
 * reset. See supabase/functions/auth-helper.
 */
async function callAuthHelper<T>(body: Record<string, unknown>): Promise<T> {
  const client = supabase!;
  const { data, error } = await client.functions.invoke('auth-helper', { body });
  if (error) throw new AuthError('Не удалось связаться с сервером, попробуйте ещё раз', 'serverUnreachable');
  if (data?.error) throw mapAuthError(data.error);
  return data as T;
}

export async function login(username: string, password: string): Promise<Profile> {
  const client = supabase!;
  const { access_token, refresh_token } = await callAuthHelper<{ access_token: string; refresh_token: string }>({
    action: 'login',
    username: username.trim(),
    password,
  });

  const { data, error } = await client.auth.setSession({ access_token, refresh_token });
  if (error || !data.user) throw new AuthError('Не удалось войти, попробуйте ещё раз', 'loginFailed');

  return resolveOrCreateProfile(client, data.user.id, data.user.email);
}

export async function logout(): Promise<void> {
  await supabase!.auth.signOut();
  await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
}

export async function getSessionProfile(): Promise<Profile | null> {
  const client = supabase!;
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) return null;

  try {
    return await resolveOrCreateProfile(client, session.user.id, session.user.email);
  } catch {
    // Offline or unreachable — fall back to the last known profile so the
    // app stays usable without a connection.
    return readCachedProfile();
  }
}

export async function updateAccount(id: string, patch: Partial<Profile>): Promise<Profile> {
  const cached = await readCachedProfile();
  if (!cached) throw new AuthError('Профиль не найден', 'profileNotFound');
  const optimistic: Profile = { ...cached, ...patch, id };
  await cacheProfile(optimistic);

  // Best-effort background sync — the optimistic local write above is what
  // keeps the UI responsive and usable offline; a failed push here just
  // means the next successful write will carry the latest state up.
  supabase!
    .from('profiles')
    .update(patchToRow(patch))
    .eq('id', id)
    .then(({ error }) => {
      if (error) console.warn('Supabase sync failed, will retry on next update:', error.message);
    });

  return optimistic;
}

/**
 * Returns the signed-in Profile on native (where we complete the OAuth
 * round-trip ourselves via an in-app browser). On web, `signInWithOAuth`
 * navigates the whole page away to Google; Supabase's client picks the
 * session back up from the redirect URL on reload, so there's nothing to
 * return here — `getSessionProfile()` on the next app start provisions the
 * profile row if needed.
 */
export async function signInWithGoogle(): Promise<Profile | null> {
  const client = supabase!;
  const redirectTo = Linking.createURL('');

  if (Platform.OS === 'web') {
    const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) throw new AuthError(error.message);
    return null;
  }

  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw new AuthError(error?.message ?? 'Не удалось начать вход через Google', 'googleStartFailed');

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') throw new AuthError('Вход через Google отменён', 'googleCancelled');

  const tokens = parseAuthTokensFromUrl(result.url);
  if (!tokens) throw new AuthError('Не удалось завершить вход через Google', 'googleCompleteFailed');

  const { error: sessionError } = await client.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });
  if (sessionError) throw new AuthError(sessionError.message);

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new AuthError(userError?.message ?? 'Не удалось получить данные пользователя', 'googleUserFetchFailed');

  return resolveOrCreateProfile(client, userData.user.id, userData.user.email);
}

export async function requestPasswordReset(username: string): Promise<{ ok: boolean; reason?: string }> {
  // A bare root path (no trailing path segment) works both as a custom-scheme
  // deep link on native and as a reachable URL on a single-page web deploy
  // with no server-side routing — a named path like `/reset-password` would
  // 404 there. The recovery vs. OAuth callback is told apart by the tokens
  // in the URL fragment, not by the path.
  const redirectTo = Linking.createURL('');
  return callAuthHelper<{ ok: boolean; reason?: string }>({
    action: 'reset',
    username: username.trim(),
    redirectTo,
  });
}

export async function completeRecoverySession(accessToken: string, refreshToken: string): Promise<void> {
  const { error } = await supabase!.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) throw new AuthError(error.message);
}

export async function updatePassword(newPassword: string): Promise<void> {
  const { error } = await supabase!.auth.updateUser({ password: newPassword });
  if (error) throw new AuthError(error.message);
}

/** Fire-and-forget: the weekly/seasonal leaderboards are a nice-to-have
 * derived view, not something the round result itself should ever fail on. */
export async function logRoundResult(userId: string, score: number, total: number): Promise<void> {
  const { error } = await supabase!.from('round_results').insert({ user_id: userId, score, total });
  if (error) console.warn('Failed to log round result for period leaderboards:', error.message);
}

export function subscribeProfile(id: string, onChange: (profile: Profile) => void): () => void {
  const client = supabase!;
  const channel = client
    .channel(`profiles-${id}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${id}` }, (payload) => {
      const profile = rowToProfile(payload.new as ProfileRow);
      cacheProfile(profile);
      onChange(profile);
    })
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
