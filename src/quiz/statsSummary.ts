import { ModeStat, Profile, ZERO_STAT } from '../auth/types';
import { CategoryId, getCategory } from '../data/categories';
import { TIERS } from '../data/difficulty';
import { categoryStatsKey } from './statsKey';

/**
 * Rolls several rounds' worth of stats into one. Everything adds up except
 * the best score, which is the best of the lot rather than their total.
 */
export function sumStats(stats: ModeStat[]): ModeStat {
  return stats.reduce(
    (acc, s) => ({
      gamesPlayed: acc.gamesPlayed + s.gamesPlayed,
      bestScore: Math.max(acc.bestScore, s.bestScore),
      totalCorrect: acc.totalCorrect + s.totalCorrect,
      totalQuestions: acc.totalQuestions + s.totalQuestions,
    }),
    ZERO_STAT
  );
}

/** Percentage of answers that were right, rounded; 0 before anything is played. */
export function accuracyOf(stat: ModeStat): number {
  return stat.totalQuestions > 0 ? Math.round((stat.totalCorrect / stat.totalQuestions) * 100) : 0;
}

/**
 * Every key a category's rounds are recorded under. Most categories keep one
 * per difficulty; the hard-only ones and the mixed bag have a single key,
 * because they are never played at a chosen difficulty.
 */
export function categoryStatsKeys(categoryId: CategoryId): string[] {
  const category = getCategory(categoryId);
  if (category.hardOnly || categoryId === 'mixed') return [categoryStatsKey(categoryId)];
  return TIERS.map((tier) => categoryStatsKey(categoryId, tier.id));
}

/** Everything played in one category, across its difficulties. */
export function categoryStat(profile: Profile, categoryId: CategoryId): ModeStat {
  return sumStats(categoryStatsKeys(categoryId).map((key) => profile.stats[key] ?? ZERO_STAT));
}

/**
 * Rounds played in categories, for working out how much of someone's play a
 * single category accounts for. Mode rounds are deliberately left out: they
 * are the same rounds counted a second time under a different key, so adding
 * them would make every share look smaller than it is.
 */
export function categoryGamesPlayed(profile: Profile): number {
  return Object.entries(profile.stats)
    .filter(([key]) => key.startsWith('cat:'))
    .reduce((total, [, stat]) => total + stat.gamesPlayed, 0);
}

/** How much of the player's category rounds went into this one, 0..1. */
export function categoryShare(profile: Profile, categoryId: CategoryId): number {
  const total = categoryGamesPlayed(profile);
  if (total <= 0) return 0;
  return categoryStat(profile, categoryId).gamesPlayed / total;
}
