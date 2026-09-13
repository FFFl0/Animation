import { Avatar } from '../data/avatar';

export type ModeStat = {
  gamesPlayed: number;
  bestScore: number;
  totalCorrect: number;
  totalQuestions: number;
};

export const ZERO_STAT: ModeStat = { gamesPlayed: 0, bestScore: 0, totalCorrect: 0, totalQuestions: 0 };

export type Streak = {
  count: number;
  lastPlayedDate: string | null; // YYYY-MM-DD
};

export type DailyChallengeResult = {
  date: string; // YYYY-MM-DD
  score: number;
  total: number;
};

export type Profile = {
  id: string;
  username: string;
  createdAt: string;
  avatar: Avatar;
  favoriteCharacterId: string | null;
  stats: Record<string, ModeStat>;
  streak: Streak;
  achievements: string[];
  /** Achievement id -> the day it was earned, as YYYY-MM-DD. */
  achievementDates: Record<string, string>;
  dailyChallenge: DailyChallengeResult | null;
};

export type Account = Profile & {
  passwordHash: string;
  salt: string;
};
