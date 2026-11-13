import { Theme } from '../theme/palette';

/**
 * The holidays the app dresses up for, and how.
 *
 * Each is a window of days on the phone's own calendar — local dates, since
 * New Year arrives at local midnight, not UTC's — and brings an accent
 * colour for the whole app, something falling across the home screen, a
 * greeting, and an accessory for the streak flame (in the app and on the
 * widget). Outside every window the app is itself.
 */
export type HolidayId = 'newYear' | 'valentine' | 'womensDay' | 'hanami' | 'halloween';

export type ParticleKind = 'snow' | 'hearts' | 'petals' | 'spooky';

/** What the streak flame wears: a hat in place of its crown, or something beside it. */
export type FlameAccessory = 'santa' | 'witch' | 'heart' | 'flower';

type Accent = { primary: string; primaryLight: string };

export type Holiday = {
  id: HolidayId;
  /** First and last day, inclusive, as [month 1–12, day]. May run over New Year. */
  from: [number, number];
  to: [number, number];
  /** The app's accent for the holiday; null keeps the usual pink. */
  accent: { light: Accent; dark: Accent } | null;
  particles: ParticleKind;
  accessory: FlameAccessory;
};

export const HOLIDAYS: Holiday[] = [
  {
    id: 'newYear',
    from: [12, 20],
    to: [1, 10],
    accent: {
      light: { primary: '#D9364A', primaryLight: '#FBE0E3' },
      dark: { primary: '#F0596B', primaryLight: '#4A2228' },
    },
    particles: 'snow',
    accessory: 'santa',
  },
  {
    id: 'valentine',
    from: [2, 12],
    to: [2, 15],
    accent: {
      light: { primary: '#E5396E', primaryLight: '#FCDDE7' },
      dark: { primary: '#F4628E', primaryLight: '#4A2433' },
    },
    particles: 'hearts',
    accessory: 'heart',
  },
  {
    id: 'womensDay',
    from: [3, 6],
    to: [3, 9],
    accent: {
      light: { primary: '#C0479E', primaryLight: '#F7DDF0' },
      dark: { primary: '#DB6BBE', primaryLight: '#43263C' },
    },
    particles: 'petals',
    accessory: 'flower',
  },
  {
    // Cherry-blossom season: the app's pink already is sakura, so only the
    // petals and the flower come.
    id: 'hanami',
    from: [4, 1],
    to: [4, 14],
    accent: null,
    particles: 'petals',
    accessory: 'flower',
  },
  {
    id: 'halloween',
    from: [10, 27],
    to: [11, 1],
    accent: {
      light: { primary: '#EA6A12', primaryLight: '#FFE6D2' },
      dark: { primary: '#FB8B3C', primaryLight: '#43281A' },
    },
    particles: 'spooky',
    accessory: 'witch',
  },
];

const key = (month: number, day: number) => month * 100 + day;

/** The holiday on this local date, if any. */
export function holidayOn(date: Date): Holiday | null {
  const today = key(date.getMonth() + 1, date.getDate());
  for (const holiday of HOLIDAYS) {
    const from = key(...holiday.from);
    const to = key(...holiday.to);
    const inside = from <= to ? today >= from && today <= to : today >= from || today <= to;
    if (inside) return holiday;
  }
  return null;
}

/** The theme with the holiday's accent laid over it. */
export function withHoliday(theme: Theme, holiday: Holiday | null, scheme: 'light' | 'dark'): Theme {
  if (!holiday?.accent) return theme;
  return { ...theme, ...holiday.accent[scheme] };
}

/**
 * Which greeting a holiday gets today. New Year has two: looking forward to
 * it until the 31st, wishing it from the 1st.
 */
export function greetingKey(holiday: Holiday, date: Date): string {
  if (holiday.id === 'newYear') return date.getMonth() === 11 ? 'newYearSoon' : 'newYear';
  return holiday.id;
}

/** The next holiday from this date on, and how many days until it starts (0 while one is on). */
export function nextHoliday(date: Date): { holiday: Holiday; inDays: number } {
  const day = (i: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + i);
  for (let i = 0; i < 400; i++) {
    const holiday = holidayOn(day(i));
    if (holiday && (i === 0 || holidayOn(day(i - 1))?.id !== holiday.id)) return { holiday, inDays: i };
  }
  return { holiday: HOLIDAYS[0], inDays: 0 };
}
