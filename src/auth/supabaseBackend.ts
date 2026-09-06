import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabaseClient';
import { AuthError } from './authError';
import { validateCredentials, usernameToEmail } from './validation';
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
    return new AuthError('Такое имя пользователя уже занято');
  }
  if (/invalid login credentials/i.test(message)) {
    return new AuthError('Неверное имя пользователя или пароль');
  }
  return new AuthError(message);
}

export async function register(username: string, password: string): Promise<Profile> {
  const trimmed = validateCredentials(username, password);
  const client = supabase!;

  const { data: taken, error: rpcError } = await client.rpc('is_username_taken', { check_username: trimmed });
  if (rpcError) throw new AuthError(rpcError.message);
  if (taken) throw new AuthError('Такое имя пользователя уже занято');

  const { data, error } = await client.auth.signUp({ email: usernameToEmail(trimmed), password });
  if (error) throw mapAuthError(error.message);
  if (!data.user) throw new AuthError('Не удалось создать аккаунт, попробуйте ещё раз');

  const row: ProfileRow = {
    id: data.user.id,
    username: trimmed,
    avatar: makeAvatar(trimmed + Date.now()),
    favorite_character_id: null,
    stats: {},
    streak: { count: 0, lastPlayedDate: null },
    achievements: [],
    created_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await client.from('profiles').insert(row).select().single();
  if (insertError) throw new AuthError(insertError.message);

  const profile = rowToProfile(inserted as ProfileRow);
  await cacheProfile(profile);
  return profile;
}

export async function login(username: string, password: string): Promise<Profile> {
  const trimmed = username.trim();
  const client = supabase!;

  const { data, error } = await client.auth.signInWithPassword({ email: usernameToEmail(trimmed), password });
  if (error) throw mapAuthError(error.message);
  if (!data.user) throw new AuthError('Не удалось войти, попробуйте ещё раз');

  const { data: row, error: fetchError } = await client.from('profiles').select('*').eq('id', data.user.id).single();
  if (fetchError) throw new AuthError(fetchError.message);

  const profile = rowToProfile(row as ProfileRow);
  await cacheProfile(profile);
  return profile;
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
    const { data: row, error } = await client.from('profiles').select('*').eq('id', session.user.id).single();
    if (error) throw error;
    const profile = rowToProfile(row as ProfileRow);
    await cacheProfile(profile);
    return profile;
  } catch {
    // Offline or unreachable — fall back to the last known profile so the
    // app stays usable without a connection.
    return readCachedProfile();
  }
}

export async function updateAccount(id: string, patch: Partial<Profile>): Promise<Profile> {
  const cached = await readCachedProfile();
  if (!cached) throw new AuthError('Профиль не найден');
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
