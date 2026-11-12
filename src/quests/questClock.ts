/**
 * When today's quests give way to tomorrow's.
 *
 * The quest day is the calendar day in UTC — the same date the server
 * checks a reward claim against — so the change happens at UTC midnight,
 * which is a different hour on every phone: 03:00 in Moscow, 00:00 in
 * London. Showing that hour in the phone's own time is the whole point.
 */
export function nextQuestReset(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

/** "03:00" — the reset in the phone's own clock, without leaning on Intl, which Hermes builds may lack. */
export function localClock(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Whole hours and minutes until `to`, rounded up to the minute so it never reads "0 min" early. */
export function timeUntil(to: Date, now: Date = new Date()): { hours: number; minutes: number } {
  const total = Math.max(0, Math.ceil((to.getTime() - now.getTime()) / 60_000));
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}
