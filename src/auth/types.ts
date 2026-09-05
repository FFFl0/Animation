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

export type Profile = {
  id: string;
  username: string;
  createdAt: string;
  avatar: Avatar;
  favoriteCharacterId: string | null;
  stats: Record<string, ModeStat>;
  streak: Streak;
  achievements: string[];
};

export type Account = Profile & {
  passwordHash: string;
  salt: string;
};
