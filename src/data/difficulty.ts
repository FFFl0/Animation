export type TierId = 'novice' | 'fan' | 'otaku' | 'expert' | 'legend';

export type Tier = {
  id: TierId;
  label: string;
  description: string;
  icon: string;
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
    icon: '🌿',
    color: '#22C55E',
    colorBg: '#E8F9EE',
    questionsPerRound: 20,
    unlockAfter: null,
  },
  {
    id: 'fan',
    label: 'Любитель',
    description: 'Второстепенные персонажи и детали',
    icon: '🌊',
    color: '#3B82F6',
    colorBg: '#E7F0FE',
    questionsPerRound: 20,
    unlockAfter: null,
  },
  {
    id: 'otaku',
    label: 'Отаку',
    description: 'Способности, организации и лор',
    icon: '🌸',
    color: '#F06292',
    colorBg: '#FADDE1',
    questionsPerRound: 20,
    unlockAfter: null,
  },
  {
    id: 'expert',
    label: 'Эксперт',
    description: 'Детали сюжета и неочевидные факты',
    icon: '🔥',
    color: '#EF4444',
    colorBg: '#FDEAEA',
    questionsPerRound: 20,
    unlockAfter: 'otaku',
  },
  {
    id: 'legend',
    label: 'Легенда',
    description: 'Только для элиты — редкие детали',
    icon: '👑',
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
