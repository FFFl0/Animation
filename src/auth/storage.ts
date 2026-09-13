import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Account, ModeStat, Profile, Streak } from './types';
import { makeAvatar } from '../data/avatar';
import { AuthError } from './authError';
import { validateCredentials, validateUsername } from './validation';
import { todayDateStr } from '../quiz/today';

export { AuthError };

const ACCOUNTS_KEY = 'animequiz.accounts';
const SESSION_KEY = 'animequiz.session';

async function readAccounts(): Promise<Account[]> {
  const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Account[];
    return parsed.map(normalizeAccount);
  } catch {
    return [];
  }
}

function normalizeAccount(account: Account): Account {
  return {
    ...account,
    stats: account.stats ?? {},
    streak: account.streak ?? { count: 0, lastPlayedDate: null },
    achievements: account.achievements ?? [],
    achievementDates: account.achievementDates ?? {},
    favoriteCharacterId: account.favoriteCharacterId ?? null,
    dailyChallenge: account.dailyChallenge ?? null,
  };
}

async function writeAccounts(accounts: Account[]): Promise<void> {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

function randomSalt(): string {
  const bytes = Crypto.getRandomBytes(16);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

export async function register(username: string, password: string, _recoveryEmail?: string): Promise<Profile> {
  const trimmed = validateCredentials(username, password);

  const accounts = await readAccounts();
  if (accounts.some((a) => a.username.toLowerCase() === trimmed.toLowerCase())) {
    throw new AuthError('Такое имя пользователя уже занято', 'usernameTaken');
  }

  const salt = randomSalt();
  const passwordHash = await hashPassword(password, salt);
  const account: Account = {
    id: `u_${Date.now()}_${Math.round(Math.random() * 1e6)}`,
    username: trimmed,
    createdAt: new Date().toISOString(),
    avatar: makeAvatar(trimmed + Date.now()),
    favoriteCharacterId: null,
    stats: {},
    streak: { count: 0, lastPlayedDate: null },
    achievements: [],
    achievementDates: {},
    dailyChallenge: null,
    passwordHash,
    salt,
  };

  await writeAccounts([...accounts, account]);
  await AsyncStorage.setItem(SESSION_KEY, account.id);
  return toProfile(account);
}

export async function login(username: string, password: string): Promise<Profile> {
  const accounts = await readAccounts();
  const account = accounts.find((a) => a.username.toLowerCase() === username.trim().toLowerCase());
  if (!account) throw new AuthError('Пользователь не найден', 'userNotFound');

  const hash = await hashPassword(password, account.salt);
  if (hash !== account.passwordHash) throw new AuthError('Неверный пароль', 'wrongPassword');

  await AsyncStorage.setItem(SESSION_KEY, account.id);
  return toProfile(account);
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

/** For a device-only account there is nothing to ask a server: drop the
 * record and the session with it. */
export async function deleteAccount(id: string): Promise<void> {
  const accounts = await readAccounts();
  await writeAccounts(accounts.filter((a) => a.id !== id));
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function getSessionProfile(): Promise<Profile | null> {
  const id = await AsyncStorage.getItem(SESSION_KEY);
  if (!id) return null;
  const accounts = await readAccounts();
  const account = accounts.find((a) => a.id === id);
  return account ? toProfile(account) : null;
}

export async function updateAccount(id: string, patch: Partial<Profile>): Promise<Profile> {
  const accounts = await readAccounts();
  const index = accounts.findIndex((a) => a.id === id);
  if (index === -1) throw new AuthError('Профиль не найден', 'profileNotFound');
  const updated: Account = { ...accounts[index], ...patch };
  accounts[index] = updated;
  await writeAccounts(accounts);
  return toProfile(updated);
}

/** Renames the account, keeping the name unique on this device the same
 * way register() does. Nothing else identifies the account — the session
 * key holds the id — so the new name takes effect immediately. */
export async function renameAccount(id: string, username: string): Promise<Profile> {
  const trimmed = validateUsername(username);
  const accounts = await readAccounts();
  const index = accounts.findIndex((a) => a.id === id);
  if (index === -1) throw new AuthError('Профиль не найден', 'profileNotFound');
  if (accounts.some((a) => a.id !== id && a.username.toLowerCase() === trimmed.toLowerCase())) {
    throw new AuthError('Такое имя пользователя уже занято', 'usernameTaken');
  }

  const updated: Account = { ...accounts[index], username: trimmed };
  accounts[index] = updated;
  await writeAccounts(accounts);
  return toProfile(updated);
}

/** No realtime concept for the local-only backend; kept for interface parity with supabaseBackend. */
export function subscribeProfile(_id: string, _onChange: (profile: Profile) => void): () => void {
  return () => {};
}

/** Local accounts have no server to email — recovery is not possible by design. */
export async function requestPasswordReset(_username: string): Promise<{ ok: boolean; reason?: string }> {
  return { ok: false, reason: 'localAccountNoRecovery' };
}

export async function completeRecoverySession(_accessToken: string, _refreshToken: string): Promise<void> {
  throw new AuthError('Недоступно для локального аккаунта', 'localAccountUnavailable');
}

export async function updatePassword(_newPassword: string): Promise<void> {
  throw new AuthError('Недоступно для локального аккаунта', 'localAccountUnavailable');
}

/** No OAuth without a backend — local accounts are username+password only. */
export async function signInWithGoogle(): Promise<Profile | null> {
  throw new AuthError('Вход через Google недоступен без облачного аккаунта', 'googleUnavailableLocal');
}

function toProfile(account: Account): Profile {
  const { passwordHash, salt, ...profile } = account;
  return profile;
}

export function bumpStreak(streak: Streak): Streak {
  const today = todayDateStr();
  if (streak.lastPlayedDate === today) return streak;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const count = streak.lastPlayedDate === yesterday ? streak.count + 1 : 1;
  return { count, lastPlayedDate: today };
}

/** No period-scoped leaderboard for the local-only backend — there's no
 * shared table to log rounds into, and nobody else's device to compare
 * against anyway. */
export async function logRoundResult(_userId: string, _score: number, _total: number): Promise<void> {}

export function mergeStat(prev: ModeStat | undefined, score: number, total: number): ModeStat {
  const base = prev ?? { gamesPlayed: 0, bestScore: 0, totalCorrect: 0, totalQuestions: 0 };
  return {
    gamesPlayed: base.gamesPlayed + 1,
    bestScore: Math.max(base.bestScore, score),
    totalCorrect: base.totalCorrect + score,
    totalQuestions: base.totalQuestions + total,
  };
}
