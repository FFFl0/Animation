import { Profile } from '../auth/types';
import { categoryStatsKey, getStat, modeStatsKey } from '../quiz/statsKey';
import { TIERS } from './difficulty';
import { CATEGORIES } from './categories';
import { IconName } from '../components/Icon';

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  check: (profile: Profile) => boolean;
};

function totalGamesPlayed(profile: Profile): number {
  return Object.values(profile.stats).reduce((sum, s) => sum + s.gamesPlayed, 0);
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-steps',
    title: 'Первые шаги',
    description: 'Сыграй свой первый квиз',
    icon: 'film',
    check: (p) => totalGamesPlayed(p) >= 1,
  },
  {
    id: 'character-expert',
    title: 'Знаток персонажей',
    description: 'Набери 50 верных ответов в категории «Персонажи»',
    icon: 'character',
    check: (p) => sumCorrect(p, 'characters') >= 50,
  },
  {
    id: 'quote-master',
    title: 'Мастер цитат',
    description: 'Набери 20 верных ответов в категории «Цитаты»',
    icon: 'quote',
    check: (p) => sumCorrect(p, 'quotes') >= 20,
  },
  {
    id: 'anime-scholar',
    title: 'Знаток аниме',
    description: 'Набери 20 верных ответов в категории «Аниме»',
    icon: 'book',
    check: (p) => sumCorrect(p, 'anime') >= 20,
  },
  {
    id: 'legend-tier',
    title: 'Легенда',
    description: 'Пройди уровень «Легенда» в любой категории',
    icon: 'crown',
    check: (p) => CATEGORIES.some((c) => getStat(p, categoryStatsKey(c.id, 'legend')).bestScore >= 12),
  },
  {
    id: 'perfect-ten',
    title: 'Без единой ошибки',
    description: 'Набери 10 из 10 в режиме «10 из 10»',
    icon: 'target',
    check: (p) => getStat(p, modeStatsKey('perfect10')).bestScore >= 10,
  },
  {
    id: 'survivor',
    title: 'Живучий',
    description: 'Набери 15+ верных ответов в режиме «Выживший»',
    icon: 'heart',
    check: (p) => getStat(p, modeStatsKey('survivor')).bestScore >= 15,
  },
  {
    id: 'week-streak',
    title: 'Неделя огня',
    description: 'Играй 7 дней подряд',
    icon: 'flame',
    check: (p) => p.streak.count >= 7,
  },
  {
    id: 'month-streak',
    title: 'Месяц отаку',
    description: 'Играй 30 дней подряд',
    icon: 'sakura',
    check: (p) => p.streak.count >= 30,
  },
  {
    id: 'speedrunner',
    title: 'Скорострел',
    description: 'Набери 8+ верных ответов в «Быстром квизе»',
    icon: 'bolt',
    check: (p) => getStat(p, modeStatsKey('quick')).bestScore >= 8,
  },
];

function sumCorrect(profile: Profile, categoryId: Parameters<typeof categoryStatsKey>[0]): number {
  return TIERS.reduce((sum, t) => sum + getStat(profile, categoryStatsKey(categoryId, t.id)).totalCorrect, 0);
}
