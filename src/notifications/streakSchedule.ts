/**
 * When the streak reminders go off, worked out without touching the phone.
 *
 * Two a day, at noon and at eight in the evening, local time. Each one is
 * left out when the day it falls on is already played — the evening one is
 * the "you still have not played" nudge, so it only exists while that is
 * true. The phone keeps no rule like "unless they played"; instead the app
 * books single reminders a couple of weeks ahead and books them again
 * whenever it is opened and after every round, leaving out the ones that
 * no longer apply.
 *
 * A day here is the streak's day: the UTC date that `lastPlayedDate` is
 * written in. A reminder belongs to the streak day it fires in, so the
 * question "has this day been played" is asked in the same terms the
 * streak itself uses, wherever the phone is.
 */

export const REMINDER_SLOTS = [
  { slot: 'noon', hour: 12 },
  { slot: 'evening', hour: 20 },
] as const;

export type ReminderSlot = (typeof REMINDER_SLOTS)[number]['slot'];

/** How far ahead reminders are booked. Opening the app moves the window on. */
export const DAYS_AHEAD = 14;

/** Every scheduled reminder's identifier starts with this. */
export const REMINDER_ID_PREFIX = 'streak-reminder:';

export type PlannedReminder = {
  /** Stable per slot, so booking again replaces rather than duplicates. */
  id: string;
  slot: ReminderSlot;
  at: Date;
  /**
   * The streak that goes if this day stays unplayed, when it is known for
   * sure: only while the last round was on the day before. Further ahead
   * the streak has already lapsed (or rests on freezes), so the reminder
   * says nothing about a number.
   */
  atRisk: number | null;
};

const DAY_MS = 86_400_000;

/** The streak day (UTC date) a moment falls on. */
export function streakDayOf(moment: Date): string {
  return moment.toISOString().slice(0, 10);
}

function dayBefore(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);
}

export function planStreakReminders(
  now: Date,
  streak: { count: number; lastPlayedDate: string | null } | null,
  days = DAYS_AHEAD
): PlannedReminder[] {
  const planned: PlannedReminder[] = [];
  for (let offset = 0; offset < days; offset++) {
    for (const { slot, hour } of REMINDER_SLOTS) {
      // Local wall-clock time; the Date constructor rolls the month over.
      const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, 0, 0, 0);
      if (at.getTime() <= now.getTime()) continue;
      const day = streakDayOf(at);
      if (streak?.lastPlayedDate === day) continue;
      const atRisk =
        streak && streak.count > 0 && streak.lastPlayedDate === dayBefore(day) ? streak.count : null;
      planned.push({ id: `${REMINDER_ID_PREFIX}${localDateKey(at)}:${slot}`, slot, at, atRisk });
    }
  }
  return planned;
}

function localDateKey(at: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}
