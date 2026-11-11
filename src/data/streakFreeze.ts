import { todayDateStr } from '../quiz/today';

/** The day streak as the profile keeps it. */
export type StreakState = { count: number; lastPlayedDate: string | null };

const DAY_MS = 86_400_000;

/** Whole days from one YYYY-MM-DD to another; negative if `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

/**
 * How many days were skipped between the last round and today: 0 if the
 * last round was today or yesterday, 1 if it was the day before, and so on.
 */
export function missedDays(streak: StreakState, today = todayDateStr()): number {
  if (!streak.lastPlayedDate) return 0;
  return Math.max(0, daysBetween(streak.lastPlayedDate, today) - 1);
}

/**
 * Where a streak stands before today's round, and what freezes will do.
 *
 * One freeze covers one missed day. A gap longer than the freezes on hand
 * cannot be covered, and then none are spent: burning two freezes on a
 * three-day gap would lose the streak and the freezes both.
 */
export type StreakOutlook =
  /** Nothing to protect yet. */
  | { kind: 'none' }
  /** Played today already, or yesterday — the streak is fine. */
  | { kind: 'safe' }
  /** Days were missed and the freezes on hand cover them. */
  | { kind: 'rescuable'; missed: number }
  /** Days were missed and there are not enough freezes; the next round starts over. */
  | { kind: 'broken'; missed: number };

export function streakOutlook(streak: StreakState, freezes: number, today = todayDateStr()): StreakOutlook {
  if (streak.count <= 0 || !streak.lastPlayedDate) return { kind: 'none' };
  const missed = missedDays(streak, today);
  if (missed === 0) return { kind: 'safe' };
  return missed <= freezes ? { kind: 'rescuable', missed } : { kind: 'broken', missed };
}

/**
 * Today's round, applied to the streak.
 *
 * `freezes` is how many streak freezes the player owns; the answer says how
 * many of them this round used up, which is the number of days it covered
 * and is never more than were offered.
 */
export function bumpStreak(
  streak: StreakState,
  freezes = 0,
  today = todayDateStr()
): { streak: StreakState; freezesUsed: number } {
  if (streak.lastPlayedDate === today) return { streak, freezesUsed: 0 };
  const outlook = streakOutlook(streak, freezes, today);
  switch (outlook.kind) {
    case 'safe':
      return { streak: { count: streak.count + 1, lastPlayedDate: today }, freezesUsed: 0 };
    // A freeze does not add a day, it only stops the count going back to
    // one — the same rule as before freezes were counted per day.
    case 'rescuable':
      return { streak: { count: streak.count, lastPlayedDate: today }, freezesUsed: outlook.missed };
    default:
      return { streak: { count: 1, lastPlayedDate: today }, freezesUsed: 0 };
  }
}
