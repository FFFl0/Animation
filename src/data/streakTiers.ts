import { IconName } from '../components/Icon';

export type StreakTierId =
  | 'seed'
  | 'spark'
  | 'rolling'
  | 'week'
  | 'fortnight'
  | 'month'
  | 'iron'
  | 'legend'
  | 'beyond';

export type StreakTier = {
  id: StreakTierId;
  /** Lowest streak that reaches this tier. */
  minDays: number;
  icon: IconName;
  /** The tier's own colour: the icon tile and the headline take it. */
  accent: string;
};

/**
 * What the streak card looks like at a given run length. Ordered by minDays;
 * the last tier whose threshold is met wins, so the table can grow at either
 * end without touching the lookup.
 */
export const STREAK_TIERS: StreakTier[] = [
  { id: 'seed', minDays: 0, icon: 'leaf', accent: '#7C8B99' },
  { id: 'spark', minDays: 1, icon: 'flame', accent: '#F4556B' },
  { id: 'rolling', minDays: 3, icon: 'flame', accent: '#F472B6' },
  { id: 'week', minDays: 7, icon: 'flame', accent: '#FB923C' },
  { id: 'fortnight', minDays: 14, icon: 'flame', accent: '#FBBF24' },
  { id: 'month', minDays: 30, icon: 'crown', accent: '#A78BFA' },
  { id: 'iron', minDays: 60, icon: 'star', accent: '#F472B6' },
  { id: 'legend', minDays: 100, icon: 'gem', accent: '#60A5FA' },
  { id: 'beyond', minDays: 101, icon: 'infinity', accent: '#818CF8' },
];

export function tierForStreak(days: number): StreakTier {
  const safe = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0;
  let tier = STREAK_TIERS[0];
  for (const candidate of STREAK_TIERS) {
    if (safe >= candidate.minDays) tier = candidate;
  }
  return tier;
}

/**
 * How lively the card should look at this tier: 0 for a streak that has not
 * started and 1 at the top of the table.
 *
 * It lives here, next to the table it is derived from, so "the longer the
 * run, the more it moves" is one ordered list rather than a pile of
 * thresholds inside the card — and so it can be checked without rendering
 * anything. Adding a tier re-spaces the scale on its own.
 */
export function streakIntensity(days: number): number {
  const tier = tierForStreak(days);
  const index = STREAK_TIERS.findIndex((candidate) => candidate.id === tier.id);
  if (index <= 0) return 0;
  return index / (STREAK_TIERS.length - 1);
}

/**
 * How far along the player is between the tier they have reached and the
 * next one, 0..1. Already past the last tier counts as full.
 */
export function progressToNextTier(days: number): number {
  const safe = Math.max(0, Math.floor(days));
  const next = nextTier(safe);
  if (!next) return 1;
  const current = tierForStreak(safe);
  const span = next.minDays - current.minDays;
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (safe - current.minDays) / span));
}

/** The next milestone to aim at, or null once the last one is passed. */
export function nextTier(days: number): StreakTier | null {
  return STREAK_TIERS.find((tier) => tier.minDays > Math.max(0, Math.floor(days))) ?? null;
}
