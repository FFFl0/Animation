import { CATEGORIES, CategoryId } from './categories';
import { ModeStat } from '../auth/types';
import { categoryStatsKeys } from '../quiz/statsSummary';

/** Categories with the most games played, most-played first. Same
 * per-tier aggregation the Statistics screen uses for the signed-in
 * player's own breakdown, just ranked instead of listed in full. */
export function topCategories(stats: Record<string, ModeStat>, limit = 5): CategoryId[] {
  return CATEGORIES.map((cat) => {
    const games = categoryStatsKeys(cat.id).reduce((sum, k) => sum + (stats[k]?.gamesPlayed ?? 0), 0);
    return { id: cat.id, games };
  })
    .filter((c) => c.games > 0)
    .sort((a, b) => b.games - a.games)
    .slice(0, limit)
    .map((c) => c.id);
}
