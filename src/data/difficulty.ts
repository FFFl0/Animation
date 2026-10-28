import { IconName } from '../components/Icon';
import { Language } from '../i18n/LanguageContext';
import { pick } from './localize';

export type TierId = 'novice' | 'fan' | 'otaku' | 'expert' | 'legend';

/**
 * What a tier does differently, beyond asking about harder characters.
 *
 * Only the last one has any, which is the point: the ladder is a ladder of
 * length and obscurity until Legend, where it also changes the rules. Kept
 * as data on the tier rather than as conditionals spread over the quiz, so
 * what makes Legend hard can be read in one place — and shown to the player
 * before they start.
 */
export type TierRules = {
  /** Seconds a question is allowed. Absent means no clock. */
  timerSeconds?: number;
  /** Whether bought hints and skips are offered. Absent means they are. */
  items?: boolean;
  /**
   * Draw the wrong answers from as near the right one as the catalogue
   * allows — the same series first, then the same tier — instead of from
   * everybody. Three obscure names beside an obvious one is a question you
   * can answer without knowing anything.
   */
  closeDistractors?: boolean;
};

export type Tier = {
  id: TierId;
  label: string;
  description: string;
  icon: IconName;
  color: string;
  colorBg: string;
  /**
   * How long a round at this tier is.
   *
   * The ladder grows with the difficulty rather than running eleven
   * questions at every step: the first tier is short enough to try on a
   * whim, and the last is long enough to be a test of stamina as well as
   * knowledge. Everything derived — the score that clears a tier, the
   * progress bars, the quiz itself — reads this number, so the shape of the
   * ladder lives here and nowhere else.
   */
  questionsPerRound: number;
  unlockAfter: TierId | null;
  /** Present only where the tier plays by different rules. */
  rules?: TierRules;
};

export const TIERS: Tier[] = [
  {
    id: 'novice',
    label: 'Новичок',
    description: 'Главные герои популярных аниме',
    icon: 'leaf',
    color: '#22C55E',
    colorBg: '#E8F9EE',
    questionsPerRound: 6,
    unlockAfter: null,
  },
  {
    id: 'fan',
    label: 'Любитель',
    description: 'Второстепенные персонажи и детали',
    icon: 'wave',
    color: '#3B82F6',
    colorBg: '#E7F0FE',
    questionsPerRound: 8,
    unlockAfter: null,
  },
  {
    id: 'otaku',
    label: 'Отаку',
    description: 'Способности, организации и лор',
    icon: 'sakura',
    color: '#F06292',
    colorBg: '#FADDE1',
    questionsPerRound: 10,
    unlockAfter: null,
  },
  {
    id: 'expert',
    label: 'Эксперт',
    description: 'Детали сюжета и неочевидные факты',
    icon: 'flame',
    color: '#EF4444',
    colorBg: '#FDEAEA',
    questionsPerRound: 12,
    unlockAfter: 'otaku',
  },
  {
    id: 'legend',
    label: 'Легенда',
    description: 'Только для элиты — редкие детали',
    icon: 'crown',
    color: '#D4A017',
    colorBg: '#FBF0C9',
    questionsPerRound: 15,
    unlockAfter: 'expert',
    // Fifteen questions, twenty seconds each, nothing to buy your way out
    // with, and four names that all belong in the answer.
    rules: {
      timerSeconds: 20,
      items: false,
      closeDistractors: true,
    },
  },
];

export function getTier(id: TierId): Tier {
  return TIERS.find((t) => t.id === id)!;
}

export function isTierUnlocked(id: TierId, bestScoreByTier: Partial<Record<TierId, number>>): boolean {
  const tier = getTier(id);
  if (!tier.unlockAfter) return true;
  const prevBest = bestScoreByTier[tier.unlockAfter] ?? 0;
  return prevBest >= Math.ceil(getTier(tier.unlockAfter).questionsPerRound * 0.6);
}

const TIER_EN: Record<TierId, { label: string; description: string }> = {
  novice: { label: 'Novice', description: 'Main characters from popular anime' },
  fan: { label: 'Fan', description: 'Supporting characters and details' },
  otaku: { label: 'Otaku', description: 'Abilities, organizations and lore' },
  expert: { label: 'Expert', description: 'Plot details and lesser-known facts' },
  legend: { label: 'Legend', description: 'Elite only — rare details' },
};

export function tierLabel(tier: Tier, lang: Language): string {
  return pick(tier.label, TIER_EN[tier.id]?.label, lang);
}

export function tierDescription(tier: Tier, lang: Language): string {
  return pick(tier.description, TIER_EN[tier.id]?.description, lang);
}
