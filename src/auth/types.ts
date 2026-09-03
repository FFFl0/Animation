import { Avatar } from '../data/characters';
import { QuizMode } from '../quiz/generateQuiz';

export type ModeStats = {
  gamesPlayed: number;
  bestScore: number;
  totalCorrect: number;
  totalQuestions: number;
};

export type Profile = {
  id: string;
  username: string;
  avatar: Avatar;
  favoriteCharacterId: string | null;
  createdAt: string;
  lastPlayedAt: string | null;
  stats: Record<QuizMode, ModeStats>;
};

export type StoredAccount = {
  id: string;
  username: string;
  passwordSalt: string;
  passwordHash: string;
  profile: Profile;
};
