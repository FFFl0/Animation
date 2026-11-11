import { CATEGORIES, CategoryId } from '../data/categories';
import { CONSUMABLE_IDS, ConsumableId } from '../shop/consumables';
import { dateSeed, seededRng } from '../quiz/generateQuiz';

/**
 * Three small things to do today.
 *
 * The streak already rewards turning up; this gives turning up a shape —
 * something to aim a round at. The three are chosen by the date alone, so
 * everybody has the same three and a friend can be asked "did you do the
 * no-mistakes one?".
 *
 * Doing all three earns one consumable. One, and only for all three, on
 * purpose: the same items are sold in the shop, and a hint a day for
 * showing up is a taste of them, where three a day would be a reason never
 * to buy one. Medal points are not touched at all — those come from the
 * tournament and nowhere else.
 */
export type Quest =
  | { id: string; kind: 'rounds'; target: number }
  | { id: string; kind: 'correct'; target: number }
  | { id: string; kind: 'accuracy'; target: 1 }
  | { id: string; kind: 'perfect'; target: 1 }
  | { id: string; kind: 'category'; target: 1; categoryId: CategoryId };

/** What a finished round is, as far as a quest cares. */
export type RoundFacts = { categoryId: CategoryId; score: number; total: number };

export const QUESTS_PER_DAY = 3;

/** A round has to be at least this long for "80%" or "no mistakes" to mean anything. */
export const MIN_ROUND_FOR_SKILL = 6;
export const ACCURACY_SHARE = 0.8;

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

/**
 * Today's three: one about turning up, one about where, one about how well.
 * Always that mix, so no day is three chores of the same kind and no day
 * asks for skill three times over.
 */
export function questsForDay(day: string): Quest[] {
  const rng = seededRng(dateSeed(`quests:${day}`));

  const effort: Quest = rng() < 0.5
    ? { id: 'rounds', kind: 'rounds', target: pick([2, 3], rng) }
    : { id: 'correct', kind: 'correct', target: pick([15, 20, 25], rng) };

  const where: Quest = { id: 'category', kind: 'category', target: 1, categoryId: pick(CATEGORIES, rng).id };

  const skill: Quest = rng() < 0.6
    ? { id: 'accuracy', kind: 'accuracy', target: 1 }
    : { id: 'perfect', kind: 'perfect', target: 1 };

  return [effort, where, skill];
}

/** How far a quest has got after one more round. Never past its target. */
export function progressAfter(quest: Quest, current: number, round: RoundFacts): number {
  const gained = (() => {
    switch (quest.kind) {
      case 'rounds':
        return 1;
      case 'correct':
        return round.score;
      case 'category':
        return round.categoryId === quest.categoryId ? 1 : 0;
      case 'accuracy':
        return round.total >= MIN_ROUND_FOR_SKILL && round.score / round.total >= ACCURACY_SHARE ? 1 : 0;
      case 'perfect':
        return round.total >= MIN_ROUND_FOR_SKILL && round.score === round.total ? 1 : 0;
    }
  })();
  return Math.min(quest.target, Math.max(0, current) + Math.max(0, gained));
}

export type QuestProgress = Record<string, number>;

export function applyRound(quests: Quest[], progress: QuestProgress, round: RoundFacts): QuestProgress {
  const next: QuestProgress = { ...progress };
  for (const quest of quests) next[quest.id] = progressAfter(quest, progress[quest.id] ?? 0, round);
  return next;
}

export function isDone(quest: Quest, progress: QuestProgress): boolean {
  return (progress[quest.id] ?? 0) >= quest.target;
}

export function allDone(quests: Quest[], progress: QuestProgress): boolean {
  return quests.every((quest) => isDone(quest, progress));
}

/** Whole days since 1970, UTC — the number the reward rotates on. */
export function dayNumber(day: string): number {
  return Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
}

/**
 * What all three earn. It rotates by the day rather than being drawn, so
 * the server can work out the same answer from the date and the app never
 * has to be believed about which item it is owed.
 */
export function rewardForDay(day: string): ConsumableId {
  return CONSUMABLE_IDS[dayNumber(day) % CONSUMABLE_IDS.length];
}
