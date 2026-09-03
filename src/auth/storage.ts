import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { QuizMode } from '../quiz/generateQuiz';
import { Profile, StoredAccount } from './types';

const ACCOUNTS_KEY = 'angelquiz:accounts';
const SESSION_KEY = 'angelquiz:sessionUserId';

const DEFAULT_AVATAR = {
  hairColor: '#B23A72',
  hairStyle: 'twin' as const,
  eyeColor: '#7048E8',
  accent: '#F3D9E7',
  badge: '⭐',
};

const EMPTY_MODE_STATS = { gamesPlayed: 0, bestScore: 0, totalCorrect: 0, totalQuestions: 0 };

function emptyStats(): Profile['stats'] {
  return {
    photo: { ...EMPTY_MODE_STATS },
    eyes: { ...EMPTY_MODE_STATS },
    description: { ...EMPTY_MODE_STATS },
    trivia: { ...EMPTY_MODE_STATS },
  };
}

async function readAccounts(): Promise<StoredAccount[]> {
  const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
  return raw ? (JSON.parse(raw) as StoredAccount[]) : [];
}

async function writeAccounts(accounts: StoredAccount[]): Promise<void> {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export class AuthError extends Error {}

export async function register(username: string, password: string): Promise<Profile> {
  const trimmed = username.trim();
  if (trimmed.length < 3) throw new AuthError('Имя пользователя — минимум 3 символа');
  if (password.length < 4) throw new AuthError('Пароль — минимум 4 символа');

  const accounts = await readAccounts();
  const exists = accounts.some((a) => normalizeUsername(a.username) === normalizeUsername(trimmed));
  if (exists) throw new AuthError('Это имя уже занято');

  const id = Crypto.randomUUID();
  const passwordSalt = Crypto.randomUUID();
  const passwordHash = await hashPassword(password, passwordSalt);

  const profile: Profile = {
    id,
    username: trimmed,
    avatar: DEFAULT_AVATAR,
    favoriteCharacterId: null,
    createdAt: new Date().toISOString(),
    lastPlayedAt: null,
    stats: emptyStats(),
  };

  const account: StoredAccount = { id, username: trimmed, passwordSalt, passwordHash, profile };
  await writeAccounts([...accounts, account]);
  await AsyncStorage.setItem(SESSION_KEY, id);
  return profile;
}

export async function login(username: string, password: string): Promise<Profile> {
  const accounts = await readAccounts();
  const account = accounts.find((a) => normalizeUsername(a.username) === normalizeUsername(username));
  if (!account) throw new AuthError('Пользователь не найден');

  const hash = await hashPassword(password, account.passwordSalt);
  if (hash !== account.passwordHash) throw new AuthError('Неверный пароль');

  await AsyncStorage.setItem(SESSION_KEY, account.id);
  return account.profile;
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function getSessionProfile(): Promise<Profile | null> {
  const userId = await AsyncStorage.getItem(SESSION_KEY);
  if (!userId) return null;
  const accounts = await readAccounts();
  const account = accounts.find((a) => a.id === userId);
  return account?.profile ?? null;
}

export async function getAllProfiles(): Promise<Profile[]> {
  const accounts = await readAccounts();
  return accounts.map((a) => a.profile);
}

async function updateAccount(userId: string, updater: (profile: Profile) => Profile): Promise<Profile> {
  const accounts = await readAccounts();
  const index = accounts.findIndex((a) => a.id === userId);
  if (index === -1) throw new AuthError('Аккаунт не найден');

  const nextProfile = updater(accounts[index].profile);
  const nextAccounts = [...accounts];
  nextAccounts[index] = { ...accounts[index], profile: nextProfile };
  await writeAccounts(nextAccounts);
  return nextProfile;
}

export async function updateProfile(
  userId: string,
  changes: Partial<Pick<Profile, 'avatar' | 'favoriteCharacterId'>>
): Promise<Profile> {
  return updateAccount(userId, (profile) => ({ ...profile, ...changes }));
}

export async function recordQuizResult(userId: string, mode: QuizMode, score: number, total: number): Promise<Profile> {
  return updateAccount(userId, (profile) => {
    const prev = profile.stats[mode];
    const nextStats = {
      ...profile.stats,
      [mode]: {
        gamesPlayed: prev.gamesPlayed + 1,
        bestScore: Math.max(prev.bestScore, score),
        totalCorrect: prev.totalCorrect + score,
        totalQuestions: prev.totalQuestions + total,
      },
    };
    return { ...profile, stats: nextStats, lastPlayedAt: new Date().toISOString() };
  });
}
