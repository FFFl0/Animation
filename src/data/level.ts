import { ModeStat } from '../auth/types';
import { TIERS, tierLabel } from './difficulty';
import { Language } from '../i18n/LanguageContext';

const XP_PER_CORRECT_ANSWER = 10;
const XP_PER_LEVEL = 200;

export type PlayerLevel = { xp: number; level: number; title: string };

export function sumTotalCorrect(stats: Record<string, ModeStat>): number {
  return Object.values(stats).reduce((sum, s) => sum + s.totalCorrect, 0);
}

/** Derived, not stored — same total-correct-answers count the app already tracks
 * per stat, just rolled into one global number so friends can be ranked and
 * compared. Level titles reuse the existing difficulty tier names (Новичок
 * .. Легенда) instead of inventing a second set of labels. */
export function levelFromTotalCorrect(totalCorrect: number, lang: Language = 'ru'): PlayerLevel {
  const xp = totalCorrect * XP_PER_CORRECT_ANSWER;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const tierIndex = Math.min(TIERS.length - 1, Math.floor((level - 1) / 4));
  return { xp, level, title: tierLabel(TIERS[tierIndex], lang) };
}

export function levelFromStats(stats: Record<string, ModeStat>, lang: Language = 'ru'): PlayerLevel {
  return levelFromTotalCorrect(sumTotalCorrect(stats), lang);
}
