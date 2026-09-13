import { CATEGORIES, CategoryId } from './categories';
import { TIERS } from './difficulty';
import { ModeStat } from '../auth/types';
import { categoryStatsKey } from '../quiz/statsKey';

/** Categories with the most games played, most-played first. Same
 * per-tier aggregation the Statistics screen uses for the signed-in
 * player's own breakdown, just ranked instead of listed in full. */
export function topCategories(stats: Record<string, ModeStat>, limit = 5): CategoryId[] {
  return CATEGORIES.map((cat) => {
    const keys = cat.hardOnly || cat.id === 'mixed' ? [categoryStatsKey(cat.id)] : TIERS.map((t) => categoryStatsKey(cat.id, t.id));
    const games = keys.reduce((sum, k) => sum + (stats[k]?.gamesPlayed ?? 0), 0);
    return { id: cat.id, games };
  })
    .filter((c) => c.games > 0)
    .sort((a, b) => b.games - a.games)
    .slice(0, limit)
    .map((c) => c.id);
}
