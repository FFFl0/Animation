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

/** Every key a category's rounds are recorded under, difficulties and
 * game modes alike. */
export function categoryStatsKeys(categoryId: CategoryId): string[] {
  return categoryStatSources(categoryId).map((source) => source.key);
}

/** How long a round is where a category keeps no difficulties: the length
 * the quiz uses when it is started without one. */
const UNTIERED_ROUND = 15;

/**
 * The difficulties a category is climbed through, and how long a round is
 * at each — which is also what a record kept before the length was stored
 * has to be read against. One tier at a time, because the lengths differ.
 *
 * The hard-only categories and the mixed bag have a single source, because
 * they are never played at a chosen difficulty.
 */
export function categoryLadderSources(categoryId: CategoryId): { key: string; roundLength: number }[] {
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
 * Everywhere this category's rounds are recorded: its ladder, and the key
 * with no difficulty on it.
 *
 * That last one is where a round started from a game mode lands — «Угадай
 * по силуэту» is a round about characters, played at no difficulty at all.
 * Those rounds were being written and then read by nobody, so a category
 * could show no rounds at all while the tiles above counted them.
 */
export function categoryStatSources(categoryId: CategoryId): { key: string; roundLength: number }[] {
  const ladder = categoryLadderSources(categoryId);
  const untiered = categoryStatsKey(categoryId);
  if (ladder.some((source) => source.key === untiered)) return ladder;
  return [...ladder, { key: untiered, roundLength: UNTIERED_ROUND }];
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
 * How much of a category has actually been answered: every difficulty's
 * record added up, out of every question the ladder holds.
 *
 * Not the same thing as the running totals above, which count every answer
 * ever given and grow without end — six right answers in ten rounds of
 * Novice is still six of the six that tier asks. This is the one figure
 * that says how far through a category someone is, so it is bounded by the
 * ladder: 6 + 8 + 10 + 12 + 15 where the category has difficulties, and one
 * round where it has none.
 *
 * Difficulties still locked count towards the total. They are the rest of
 * the climb, not a part of it that does not exist.
 */
export function ladderBest(profile: Pick<Profile, 'stats'>, categoryId: CategoryId): BestRound {
  return categoryLadderSources(categoryId).reduce(
    (acc, { key, roundLength }) => {
      const record = bestRecord(profile.stats[key] ?? ZERO_STAT, roundLength);
      return { score: acc.score + Math.min(record.score, roundLength), outOf: acc.outOf + roundLength };
    },
    { score: 0, outOf: 0 }
  );
}

/**
 * The stats that stand for rounds played, each round once.
 *
 * A round started from a game mode is banked twice: under the category it
 * was about and again under the mode. Anything that adds up every key
 * therefore counts those rounds, and every answer in them, twice over. The
 * category keys are the ones every round has, mode or not, so they are the
 * set to add up.
 */
export function roundStats(stats: Record<string, ModeStat>): ModeStat[] {
  return Object.entries(stats)
    .filter(([key]) => key.startsWith('cat:'))
    .map(([, stat]) => stat);
}

/** Rounds played in categories, for working out how much of someone's play
 * a single category accounts for. */
export function categoryGamesPlayed(profile: Profile): number {
  return roundStats(profile.stats).reduce((total, stat) => total + stat.gamesPlayed, 0);
}

/** How much of the player's category rounds went into this one, 0..1. */
export function categoryShare(profile: Profile, categoryId: CategoryId): number {
  const total = categoryGamesPlayed(profile);
  if (total <= 0) return 0;
  return categoryStat(profile, categoryId).gamesPlayed / total;
}
