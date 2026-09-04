import { RoundConfig } from '../quiz/types';

export type ModeId =
  | 'quick'
  | 'survivor'
  | 'perfect10'
  | 'silhouette'
  | 'eyes'
  | 'whoSaidIt'
  | 'whichAnime'
  | 'mixed'
  | 'daily';

export type GameMode = {
  id: ModeId;
  title: string;
  subtitle: string;
  icon: string;
  config: Omit<RoundConfig, 'dailySeed'>;
};

export const GAME_MODES: GameMode[] = [
  {
    id: 'quick',
    title: 'Быстрый квиз',
    subtitle: '10 вопросов · на скорость',
    icon: '⚡',
    config: { categoryId: 'mixed', questionCount: 10, timerSeconds: 12 },
  },
  {
    id: 'survivor',
    title: 'Выживший',
    subtitle: '3 жизни — до первой ошибки',
    icon: '❤️',
    config: { categoryId: 'mixed', questionCount: 30, lives: 3 },
  },
  {
    id: 'perfect10',
    title: '10 из 10',
    subtitle: 'Без права на ошибку',
    icon: '🎯',
    config: { categoryId: 'mixed', questionCount: 10 },
  },
  {
    id: 'silhouette',
    title: 'Угадай по силуэту',
    subtitle: 'Только тёмный контур героя',
    icon: '🌑',
    config: { categoryId: 'characters', questionCount: 15, forceType: 'guessCharacterSilhouette' },
  },
  {
    id: 'eyes',
    title: 'Угадай по глазам',
    subtitle: 'Лишь фрагмент лица',
    icon: '👀',
    config: { categoryId: 'characters', questionCount: 15, forceType: 'guessCharacterEyes' },
  },
  {
    id: 'whoSaidIt',
    title: 'Кто это сказал?',
    subtitle: 'Цитата — выбери героя',
    icon: '💬',
    config: { categoryId: 'quotes', questionCount: 15, forceType: 'guessQuote' },
  },
  {
    id: 'whichAnime',
    title: 'Из какого аниме?',
    subtitle: 'Персонаж — назови сериал',
    icon: '🎬',
    config: { categoryId: 'anime', questionCount: 15, forceType: 'guessSeries' },
  },
  {
    id: 'mixed',
    title: 'Смешанный',
    subtitle: 'Вопросы случайной сложности',
    icon: '♾️',
    config: { categoryId: 'mixed', questionCount: 15 },
  },
  {
    id: 'daily',
    title: 'Испытание дня',
    subtitle: 'Новый квиз каждый день',
    icon: '📅',
    config: { categoryId: 'mixed', questionCount: 10 },
  },
];

export function getMode(id: ModeId): GameMode {
  return GAME_MODES.find((m) => m.id === id)!;
}
