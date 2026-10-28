import { BestRound, ModeStat, Profile, ZERO_STAT, bestRecord } from '../auth/types';
import { CategoryId, getCategory } from '../data/categories';
import { TIERS } from '../data/difficulty';
import { categoryStatsKey } from './statsKey';

/**
 * Rolls several rounds' worth of stats into one. Everything adds up except
 * the best round, which is the best of the lot rather than their total.
 *
 * "Best" is the largest share of its own questions, not the biggest number:
 * these come from tiers of different lengths, so six out of six is a better
 * round than nine out of fifteen. The length rides along with the score, so
 * what comes out still describes one real round.
 */
export function sumStats(stats: ModeStat[]): ModeStat {
  return stats.reduce((acc, s) => {
    const accShare = acc.bestOutOf ? acc.bestScore / acc.bestOutOf : 0;
    const share = s.bestOutOf ? s.bestScore / s.bestOutOf : 0;
    const takeNew = s.gamesPlayed > 0 && (share > accShare || (share === accShare && s.bestScore > acc.bestScore));
    return {
      gamesPlayed: acc.gamesPlayed + s.gamesPlayed,
      bestScore: takeNew ? s.bestScore : acc.bestScore,
      bestOutOf: takeNew ? s.bestOutOf : acc.bestOutOf,
      totalCorrect: acc.totalCorrect + s.totalCorrect,
      totalQuestions: acc.totalQuestions + s.totalQuestions,
    };
  }, ZERO_STAT);
}

/**
 * The best round this stat holds, as a score out of its own questions, or
 * null when nothing has been played — a dash says that, and "0/0" does not.
 *
 * Takes the round length to read against for records kept before the length
 * was stored; a stat rolled up from several tiers has no single length, so
 * those pass the longest one they could have come from.
 */
export function bestRound(stat: ModeStat, fallbackLength: number): BestRound | null {
  if (stat.gamesPlayed === 0) return null;
  return bestRecord(stat, fallbackLength);
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
  return categoryStatSources(categoryId).map((source) => source.key);
}

/** How long a round is where a category keeps no difficulties: the length
 * the quiz uses when it is started without one. */
const UNTIERED_ROUND = 15;

/**
 * Where a category's rounds are recorded, and how long each of those rounds
 * is — which is what a record kept before the length was stored has to be
 * read against. One tier at a time, because the lengths differ.
 */
export function categoryStatSources(categoryId: CategoryId): { key: string; roundLength: number }[] {
  const category = getCategory(categoryId);
  if (category.hardOnly || categoryId === 'mixed') {
    return [{ key: categoryStatsKey(categoryId), roundLength: UNTIERED_ROUND }];
  }
  return TIERS.map((tier) => ({
    key: categoryStatsKey(categoryId, tier.id),
    roundLength: tier.questionsPerRound,
  }));
}

/**
 * Everything played in one category, across its difficulties.
 *
 * Each tier's record is read against that tier's own length before the
 * tiers are rolled together: once they are one stat there is no single
 * length left to read against, and a record kept without one would be held
 * up against the longest tier rather than the one it sits under.
 */
export function categoryStat(profile: Profile, categoryId: CategoryId): ModeStat {
  return sumStats(
    categoryStatSources(categoryId).map(({ key, roundLength }) => {
      const stat = profile.stats[key] ?? ZERO_STAT;
      const record = bestRecord(stat, roundLength);
      return { ...stat, bestScore: record.score, bestOutOf: record.outOf };
    })
  );
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
