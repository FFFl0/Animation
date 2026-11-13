import { daysBetween } from './streakFreeze';

/** One day of the week strip under the streak card. */
export type WeekDay = {
  /** YYYY-MM-DD, in the streak's own days (UTC, like lastPlayedDate). */
  date: string;
  /** 0 for Monday … 6 for Sunday. */
  weekday: number;
  played: boolean;
  today: boolean;
  future: boolean;
};

function addDays(day: string, delta: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + delta * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Monday to Sunday of the week holding `today`, with the days the current
 * streak covers marked as played.
 *
 * The profile keeps only the streak's length and its last day, so a played
 * day is one inside that unbroken run. A streak that is gone (`alive`
 * false) marks nothing: the strip shows the run that still counts, the
 * same as the number above it.
 */
export function streakWeek(
  streak: { count: number; lastPlayedDate: string | null },
  alive: boolean,
  today: string
): WeekDay[] {
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  const monday = addDays(today, -weekday);
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDays(monday, i);
    const back = streak.lastPlayedDate ? daysBetween(date, streak.lastPlayedDate) : -1;
    return {
      date,
      weekday: i,
      played: alive && streak.count > 0 && back >= 0 && back < streak.count,
      today: date === today,
      future: date > today,
    };
  });
}
