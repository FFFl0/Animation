import { streakOutlook } from '../data/streakFreeze';
import { Language } from '../i18n/LanguageContext';

/**
 * What the home-screen streak widget shows, worked out from the little the
 * app leaves behind for it.
 *
 * The widget is drawn by Android while the app is closed, often hours after
 * the last round, so it cannot be given a finished picture. The app saves
 * the streak as it stood (`WidgetSnapshot`), and every redraw — the app's
 * own after a round, or Android's every half hour — works out from that and
 * the clock whether today is done, still open, saved by a freeze or lost.
 * The rules are the streak's own (data/streakFreeze), so the widget never
 * disagrees with the home screen.
 */
export type WidgetSnapshot = {
  count: number;
  lastPlayedDate: string | null;
  freezes: number;
  language: Language;
};

export type WidgetKind =
  /** Today's round is in: the streak is extended. */
  | 'done'
  /** Played yesterday, not yet today: the streak waits for a round. */
  | 'pending'
  /** Days were missed, and freezes will cover them on the next round. */
  | 'frozen'
  /** No streak, or it is gone: the next round starts one. */
  | 'start';

export type WidgetState = { kind: WidgetKind; count: number };

export function widgetStateOf(snapshot: WidgetSnapshot | null, today: string): WidgetState {
  if (!snapshot) return { kind: 'start', count: 0 };
  const streak = { count: snapshot.count, lastPlayedDate: snapshot.lastPlayedDate };
  if (streak.count > 0 && streak.lastPlayedDate === today) return { kind: 'done', count: streak.count };
  const outlook = streakOutlook(streak, snapshot.freezes, today);
  switch (outlook.kind) {
    case 'safe':
      return { kind: 'pending', count: streak.count };
    case 'rescuable':
      return { kind: 'frozen', count: streak.count };
    default:
      return { kind: 'start', count: 0 };
  }
}

/** 1 день подряд, 2 дня подряд, 5 дней подряд. */
function daysInARowRu(n: number): string {
  const inTeens = n % 100 >= 11 && n % 100 <= 14;
  const last = n % 10;
  if (inTeens || last === 0 || last >= 5) return 'дней подряд';
  return last === 1 ? 'день подряд' : 'дня подряд';
}

export const WIDGET_TEXT: Record<
  Language,
  { label: (count: number) => string; footer: Record<WidgetKind, string>; picker: { label: string; description: string } }
> = {
  ru: {
    label: daysInARowRu,
    footer: {
      done: 'Серия продлена ✓',
      pending: 'Продли серию!',
      frozen: 'Заморозка спасёт ❄',
      start: 'Начни серию',
    },
    picker: { label: 'Серия', description: 'Сколько дней подряд ты играешь' },
  },
  en: {
    label: () => 'day streak',
    footer: {
      done: 'Streak extended ✓',
      pending: 'Extend your streak!',
      frozen: 'A freeze will save it ❄',
      start: 'Start a streak',
    },
    picker: { label: 'Streak', description: 'How many days in a row you play' },
  },
};

/** Reads a saved snapshot, keeping only what makes sense. */
export function parseSnapshot(raw: string | null): WidgetSnapshot | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<WidgetSnapshot>;
    const count = typeof value.count === 'number' && value.count >= 0 ? Math.floor(value.count) : 0;
    const lastPlayedDate =
      typeof value.lastPlayedDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.lastPlayedDate) ? value.lastPlayedDate : null;
    const freezes = typeof value.freezes === 'number' && value.freezes >= 0 ? Math.floor(value.freezes) : 0;
    const language: Language = value.language === 'en' ? 'en' : 'ru';
    return { count, lastPlayedDate, freezes, language };
  } catch {
    return null;
  }
}

export const WIDGET_NAME = 'Streak';
export const SNAPSHOT_KEY = 'animequiz.widget.streak';
