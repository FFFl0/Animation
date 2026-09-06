import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Account, ModeStat, Profile, Streak } from './types';
import { makeAvatar } from '../data/avatar';
import { AuthError } from './authError';
import { validateCredentials } from './validation';

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
    favoriteCharacterId: account.favoriteCharacterId ?? null,
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

export async function register(username: string, password: string): Promise<Profile> {
  const trimmed = validateCredentials(username, password);

  const accounts = await readAccounts();
  if (accounts.some((a) => a.username.toLowerCase() === trimmed.toLowerCase())) {
    throw new AuthError('Такое имя пользователя уже занято');
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
  if (!account) throw new AuthError('Пользователь не найден');

  const hash = await hashPassword(password, account.salt);
  if (hash !== account.passwordHash) throw new AuthError('Неверный пароль');

  await AsyncStorage.setItem(SESSION_KEY, account.id);
  return toProfile(account);
}

export async function logout(): Promise<void> {
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
  if (index === -1) throw new AuthError('Профиль не найден');
  const updated: Account = { ...accounts[index], ...patch };
  accounts[index] = updated;
  await writeAccounts(accounts);
  return toProfile(updated);
}

/** No realtime concept for the local-only backend; kept for interface parity with supabaseBackend. */
export function subscribeProfile(_id: string, _onChange: (profile: Profile) => void): () => void {
  return () => {};
}

function toProfile(account: Account): Profile {
  const { passwordHash, salt, ...profile } = account;
  return profile;
}

export function bumpStreak(streak: Streak): Streak {
  const today = new Date().toISOString().slice(0, 10);
  if (streak.lastPlayedDate === today) return streak;
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const count = streak.lastPlayedDate === yesterday ? streak.count + 1 : 1;
  return { count, lastPlayedDate: today };
}

export function mergeStat(prev: ModeStat | undefined, score: number, total: number): ModeStat {
  const base = prev ?? { gamesPlayed: 0, bestScore: 0, totalCorrect: 0, totalQuestions: 0 };
  return {
    gamesPlayed: base.gamesPlayed + 1,
    bestScore: Math.max(base.bestScore, score),
    totalCorrect: base.totalCorrect + score,
    totalQuestions: base.totalQuestions + total,
  };
}
