import { IconName } from '../components/Icon';
import { Language } from '../i18n/LanguageContext';
import { pick } from './localize';

export type TierId = 'novice' | 'fan' | 'otaku' | 'expert' | 'legend';

export type Tier = {
  id: TierId;
  label: string;
  description: string;
  icon: IconName;
  color: string;
  colorBg: string;
  questionsPerRound: number;
  unlockAfter: TierId | null;
};

export const TIERS: Tier[] = [
  {
    id: 'novice',
    label: 'Новичок',
    description: 'Главные герои популярных аниме',
    icon: 'leaf',
    color: '#22C55E',
    colorBg: '#E8F9EE',
    questionsPerRound: 20,
    unlockAfter: null,
  },
  {
    id: 'fan',
    label: 'Любитель',
    description: 'Второстепенные персонажи и детали',
    icon: 'wave',
    color: '#3B82F6',
    colorBg: '#E7F0FE',
    questionsPerRound: 20,
    unlockAfter: null,
  },
  {
    id: 'otaku',
    label: 'Отаку',
    description: 'Способности, организации и лор',
    icon: 'sakura',
    color: '#F06292',
    colorBg: '#FADDE1',
    questionsPerRound: 20,
    unlockAfter: null,
  },
  {
    id: 'expert',
    label: 'Эксперт',
    description: 'Детали сюжета и неочевидные факты',
    icon: 'flame',
    color: '#EF4444',
    colorBg: '#FDEAEA',
    questionsPerRound: 20,
    unlockAfter: 'otaku',
  },
  {
    id: 'legend',
    label: 'Легенда',
    description: 'Только для элиты — редкие детали',
    icon: 'crown',
    color: '#D4A017',
    colorBg: '#FBF0C9',
    questionsPerRound: 20,
    unlockAfter: 'expert',
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
