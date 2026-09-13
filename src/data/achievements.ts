import { Profile } from '../auth/types';
import { categoryStatsKey, getStat, modeStatsKey } from '../quiz/statsKey';
import { TIERS, getTier } from './difficulty';
import { CATEGORIES, CategoryId } from './categories';
import { levelFromStats } from './level';
import { IconName } from '../components/Icon';
import { Language } from '../i18n/LanguageContext';
import { pick } from './localize';

/** Which filter chip an achievement sits under. */
export type AchievementGroup = 'quiz' | 'stats' | 'collection' | 'special' | 'secret';

export const ACHIEVEMENT_GROUPS: AchievementGroup[] = ['quiz', 'stats', 'collection', 'special', 'secret'];

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  group: AchievementGroup;
  /** What it takes. The card shows progress out of this. */
  target: number;
  /** How far along, in the same units as target. */
  progress: (profile: Profile) => number;
  /** Hidden behind "???" until it is earned. */
  secret?: boolean;
};

function totalGamesPlayed(profile: Profile): number {
  return Object.values(profile.stats).reduce((sum, s) => sum + s.gamesPlayed, 0);
}

function totalCorrect(profile: Profile): number {
  return Object.values(profile.stats).reduce((sum, s) => sum + s.totalCorrect, 0);
}

function correctIn(profile: Profile, categoryId: CategoryId): number {
  return TIERS.reduce((sum, t) => sum + getStat(profile, categoryStatsKey(categoryId, t.id)).totalCorrect, 0);
}

function gamesIn(profile: Profile, categoryId: CategoryId): number {
  const tiered = TIERS.reduce((sum, t) => sum + getStat(profile, categoryStatsKey(categoryId, t.id)).gamesPlayed, 0);
  return tiered + getStat(profile, categoryStatsKey(categoryId)).gamesPlayed;
}

/** Tiers of one category cleared, at its best — a tier counts at 60% right. */
function tiersClearedIn(profile: Profile, categoryId: CategoryId): number {
  return TIERS.filter((tier) => {
    const need = Math.ceil(getTier(tier.id).questionsPerRound * 0.6);
    return getStat(profile, categoryStatsKey(categoryId, tier.id)).bestScore >= need;
  }).length;
}

export const ACHIEVEMENTS: Achievement[] = [
  // ---- quiz: playing, and playing well
  { id: 'first-steps', title: 'Первые шаги', description: 'Сыграй свой первый квиз', icon: 'film', group: 'quiz', target: 1, progress: totalGamesPlayed },
  { id: 'curious', title: 'Любопытный', description: 'Пройди 5 квизов', icon: 'sparkles', group: 'quiz', target: 5, progress: totalGamesPlayed },
  { id: 'dedicated', title: 'Втянулся', description: 'Пройди 25 квизов', icon: 'trophy', group: 'quiz', target: 25, progress: totalGamesPlayed },
  { id: 'marathon', title: 'Марафонец', description: 'Пройди 100 квизов', icon: 'medal', group: 'quiz', target: 100, progress: totalGamesPlayed },
  { id: 'perfect-ten', title: 'Без единой ошибки', description: 'Набери 10 из 10 в режиме «10 из 10»', icon: 'target', group: 'quiz', target: 10, progress: (p) => getStat(p, modeStatsKey('perfect10')).bestScore },
  { id: 'survivor', title: 'Живучий', description: 'Набери 15+ верных ответов в режиме «Выживший»', icon: 'heart', group: 'quiz', target: 15, progress: (p) => getStat(p, modeStatsKey('survivor')).bestScore },
  { id: 'speedrunner', title: 'Скорострел', description: 'Набери 8+ верных ответов в «Быстром квизе»', icon: 'bolt', group: 'quiz', target: 8, progress: (p) => getStat(p, modeStatsKey('quick')).bestScore },

  // ---- stats: the numbers that only go up
  { id: 'hundred-correct', title: 'Сотня', description: 'Дай 100 верных ответов', icon: 'check', group: 'stats', target: 100, progress: totalCorrect },
  { id: 'five-hundred-correct', title: 'Пять сотен', description: 'Дай 500 верных ответов', icon: 'stats', group: 'stats', target: 500, progress: totalCorrect },
  { id: 'thousand-correct', title: 'Тысяча', description: 'Дай 1000 верных ответов', icon: 'gem', group: 'stats', target: 1000, progress: totalCorrect },
  { id: 'level-ten', title: 'Десятый уровень', description: 'Дорасти до 10 уровня', icon: 'star', group: 'stats', target: 10, progress: (p) => levelFromStats(p.stats).level },
  { id: 'level-twenty-five', title: 'Двадцать пятый', description: 'Дорасти до 25 уровня', icon: 'crown', group: 'stats', target: 25, progress: (p) => levelFromStats(p.stats).level },

  // ---- collection: knowing each corner of the app
  { id: 'anime-scholar', title: 'Знаток аниме', description: 'Набери 20 верных ответов в категории «Аниме»', icon: 'book', group: 'collection', target: 20, progress: (p) => correctIn(p, 'anime') },
  { id: 'character-expert', title: 'Знаток персонажей', description: 'Набери 50 верных ответов в категории «Персонажи»', icon: 'character', group: 'collection', target: 50, progress: (p) => correctIn(p, 'characters') },
  { id: 'quote-master', title: 'Мастер цитат', description: 'Набери 20 верных ответов в категории «Цитаты»', icon: 'quote', group: 'collection', target: 20, progress: (p) => correctIn(p, 'quotes') },
  { id: 'opening-expert', title: 'Слух отаку', description: 'Набери 20 верных ответов в категории «Опенинги и эндинги»', icon: 'music', group: 'collection', target: 20, progress: (p) => correctIn(p, 'openings') },
  { id: 'battle-expert', title: 'Боевой опыт', description: 'Набери 20 верных ответов в категории «Бои и способности»', icon: 'swords', group: 'collection', target: 20, progress: (p) => correctIn(p, 'battles') },
  { id: 'world-expert', title: 'Картограф', description: 'Набери 20 верных ответов в категории «Мир аниме»', icon: 'globe', group: 'collection', target: 20, progress: (p) => correctIn(p, 'world') },
  { id: 'explorer', title: 'Всё попробовал', description: 'Сыграй хотя бы раз в каждой категории', icon: 'shuffle', group: 'collection', target: CATEGORIES.length, progress: (p) => CATEGORIES.filter((c) => gamesIn(p, c.id) > 0).length },

  // ---- special: streaks and the hardest tier
  { id: 'legend-tier', title: 'Легенда', description: 'Пройди уровень «Легенда» в любой категории', icon: 'crown', group: 'special', target: 1, progress: (p) => {
    const need = Math.ceil(getTier('legend').questionsPerRound * 0.6);
    return CATEGORIES.some((c) => getStat(p, categoryStatsKey(c.id, 'legend')).bestScore >= need) ? 1 : 0;
  } },
  { id: 'week-streak', title: 'Неделя огня', description: 'Играй 7 дней подряд', icon: 'flame', group: 'special', target: 7, progress: (p) => p.streak.count },
  { id: 'month-streak', title: 'Месяц отаку', description: 'Играй 30 дней подряд', icon: 'sakura', group: 'special', target: 30, progress: (p) => p.streak.count },

  // ---- secret: shown as ??? until earned
  { id: 'secret-tier-master', title: 'Все ступени', description: 'Пройди все уровни сложности в одной категории', icon: 'leaf', group: 'secret', secret: true, target: TIERS.length, progress: (p) => Math.max(0, ...CATEGORIES.map((c) => tiersClearedIn(p, c.id))) },
  { id: 'secret-completionist', title: 'Коллекционер', description: 'Открой все остальные достижения', icon: 'sparkles', group: 'secret', secret: true, target: 0, progress: () => 0 },
];

// The completionist counts every other achievement, so its target is filled in
// once the list exists rather than hard-coded and left to drift.
const COMPLETIONIST = ACHIEVEMENTS.find((a) => a.id === 'secret-completionist')!;
COMPLETIONIST.target = ACHIEVEMENTS.length - 1;
COMPLETIONIST.progress = (profile: Profile) =>
  ACHIEVEMENTS.filter((a) => a.id !== 'secret-completionist' && isUnlocked(a, profile)).length;

export function progressOf(achievement: Achievement, profile: Profile): number {
  return Math.max(0, Math.min(achievement.target, Math.floor(achievement.progress(profile))));
}

export function isUnlocked(achievement: Achievement, profile: Profile): boolean {
  return progressOf(achievement, profile) >= achievement.target;
}

export function unlockedCount(profile: Profile): number {
  return ACHIEVEMENTS.filter((a) => isUnlocked(a, profile)).length;
}

const ACHIEVEMENT_EN: Record<string, { title: string; description: string }> = {
  'first-steps': { title: 'First Steps', description: 'Play your first quiz' },
  curious: { title: 'Curious', description: 'Play 5 quizzes' },
  dedicated: { title: 'Hooked', description: 'Play 25 quizzes' },
  marathon: { title: 'Marathoner', description: 'Play 100 quizzes' },
  'perfect-ten': { title: 'Flawless', description: "Score 10 out of 10 in the '10 of 10' mode" },
  survivor: { title: 'Tenacious', description: 'Score 15+ correct answers in Survivor mode' },
  speedrunner: { title: 'Speedrunner', description: 'Score 8+ correct answers in Quick Quiz' },
  'hundred-correct': { title: 'A Hundred', description: 'Give 100 correct answers' },
  'five-hundred-correct': { title: 'Five Hundred', description: 'Give 500 correct answers' },
  'thousand-correct': { title: 'A Thousand', description: 'Give 1000 correct answers' },
  'level-ten': { title: 'Level Ten', description: 'Reach level 10' },
  'level-twenty-five': { title: 'Level Twenty-Five', description: 'Reach level 25' },
  'anime-scholar': { title: 'Anime Scholar', description: 'Score 20 correct answers in the Anime category' },
  'character-expert': { title: 'Character Expert', description: 'Score 50 correct answers in the Characters category' },
  'quote-master': { title: 'Quote Master', description: 'Score 20 correct answers in the Quotes category' },
  'opening-expert': { title: 'Otaku Ear', description: 'Score 20 correct answers in the Openings & Endings category' },
  'battle-expert': { title: 'Battle-Tested', description: 'Score 20 correct answers in the Battles & Abilities category' },
  'world-expert': { title: 'Cartographer', description: 'Score 20 correct answers in the Anime World category' },
  explorer: { title: 'Tried Everything', description: 'Play at least one quiz in every category' },
  'legend-tier': { title: 'Legend', description: 'Clear the Legend tier in any category' },
  'week-streak': { title: 'Week of Fire', description: 'Play 7 days in a row' },
  'month-streak': { title: 'Otaku Month', description: 'Play 30 days in a row' },
  'secret-tier-master': { title: 'Every Rung', description: 'Clear every difficulty tier in one category' },
  'secret-completionist': { title: 'Completionist', description: 'Unlock every other achievement' },
};

export function achievementTitle(a: Achievement, lang: Language): string {
  return pick(a.title, ACHIEVEMENT_EN[a.id]?.title, lang);
}

export function achievementDescription(a: Achievement, lang: Language): string {
  return pick(a.description, ACHIEVEMENT_EN[a.id]?.description, lang);
}
