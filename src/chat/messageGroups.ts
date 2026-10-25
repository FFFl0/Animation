import { Language } from '../i18n/LanguageContext';

/** The minimum a bubble needs for the history to be laid out. Direct and
 * group messages both satisfy it. */
export type TimedMessage = {
  id: string;
  senderId: string;
  createdAt: string;
};

/**
 * Consecutive messages from the same person within this long are drawn as one
 * block: one author line, one rounded "tail" at the bottom, tight spacing in
 * between. A longer pause starts a new block even from the same person,
 * because the time stamp on the previous one has stopped describing it.
 */
const GROUP_WINDOW_MS = 5 * 60 * 1000;

export type ChatItem<T extends TimedMessage> =
  /** A day divider — "Today", "Yesterday", or a date. */
  | { kind: 'date'; key: string; at: string }
  /** The "unread messages" line, drawn once above the first unread one. */
  | { kind: 'unread'; key: string }
  | {
      kind: 'message';
      key: string;
      message: T;
      /** First of its block: carries the author's name in a group. */
      isFirstInGroup: boolean;
      /** Last of its block: carries the tail corner and the timestamp. */
      isLastInGroup: boolean;
    };

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'invalid';
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function minutesApart(a: string, b: string): number {
  const ta = new Date(a).getTime();
  const tb = new Date(b).getTime();
  if (Number.isNaN(ta) || Number.isNaN(tb)) return Infinity;
  return Math.abs(ta - tb);
}

/**
 * Turns a flat, chronological message list into the rows the history
 * actually draws: day dividers, the unread line, and messages tagged with
 * where they sit in their block.
 *
 * Kept separate from the rendering because it is all off-by-one decisions —
 * which message opens a block, which closes it, what a divider does to the
 * block that spans it — and those are worth testing without a renderer.
 */
export function buildChatItems<T extends TimedMessage>(
  messages: T[],
  firstUnreadId: string | null = null
): ChatItem<T>[] {
  const items: ChatItem<T>[] = [];

  messages.forEach((message, i) => {
    const prev = i > 0 ? messages[i - 1] : null;
    const next = i < messages.length - 1 ? messages[i + 1] : null;

    const startsDay = !prev || dayKey(prev.createdAt) !== dayKey(message.createdAt);
    if (startsDay) {
      items.push({ kind: 'date', key: `date-${dayKey(message.createdAt)}`, at: message.createdAt });
    }

    const startsUnread = firstUnreadId !== null && message.id === firstUnreadId;
    if (startsUnread) items.push({ kind: 'unread', key: 'unread-line' });

    // A divider of either sort breaks the block: a bubble must not look
    // joined to one sitting on the other side of a date line.
    const isFirstInGroup =
      startsDay ||
      startsUnread ||
      !prev ||
      prev.senderId !== message.senderId ||
      minutesApart(prev.createdAt, message.createdAt) > GROUP_WINDOW_MS;

    const nextStartsDay = !next || dayKey(next.createdAt) !== dayKey(message.createdAt);
    const nextStartsUnread = firstUnreadId !== null && next?.id === firstUnreadId;
    const isLastInGroup =
      !next ||
      nextStartsDay ||
      nextStartsUnread ||
      next.senderId !== message.senderId ||
      minutesApart(message.createdAt, next.createdAt) > GROUP_WINDOW_MS;

    items.push({ kind: 'message', key: message.id, message, isFirstInGroup, isLastInGroup });
  });

  return items;
}

/** The oldest message from the other side that has not been read yet — where
 * the "unread messages" line goes. Null when everything is read, or when the
 * conversation has no read flags at all (a group). */
export function firstUnreadIdOf<T extends TimedMessage & { read?: boolean }>(
  messages: T[],
  meId: string
): string | null {
  const unread = messages.find((m) => m.senderId !== meId && m.read === false);
  return unread?.id ?? null;
}

const MONTHS_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
];

const MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function daysBetween(iso: string, now: Date): number {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return NaN;
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** "Today" / "Yesterday" / "25 October" / "25 October 2024" — the label on a
 * day divider in the history. */
export function formatDayLabel(iso: string, lang: Language, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const days = daysBetween(iso, now);
  if (days === 0) return lang === 'ru' ? 'Сегодня' : 'Today';
  if (days === 1) return lang === 'ru' ? 'Вчера' : 'Yesterday';

  const month = (lang === 'ru' ? MONTHS_RU : MONTHS_EN)[d.getMonth()];
  const sameYear = d.getFullYear() === now.getFullYear();
  return sameYear ? `${d.getDate()} ${month}` : `${d.getDate()} ${month} ${d.getFullYear()}`;
}

/** The time column in the chat list: a clock for today, "Yesterday" for
 * yesterday, a weekday within the last week, a date beyond that. */
export function formatListStamp(iso: string, lang: Language, now = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const days = daysBetween(iso, now);
  if (days === 0) return formatClock(iso);
  if (days === 1) return lang === 'ru' ? 'вчера' : 'Yesterday';
  if (days < 7) {
    const ru = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
    const en = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (lang === 'ru' ? ru : en)[d.getDay()];
  }
  const month = (lang === 'ru' ? MONTHS_RU : MONTHS_EN)[d.getMonth()].slice(0, 3);
  return `${d.getDate()} ${month}`;
}

/** The status line under a name: "online", or when they were last around.
 * Empty when nothing was ever recorded, so the header shows no line at all
 * rather than claiming the person has never opened the app. */
export function formatLastSeen(
  lastSeenAt: string | null,
  online: boolean,
  lang: Language,
  now = new Date()
): string {
  if (online) return lang === 'ru' ? 'в сети' : 'online';
  if (!lastSeenAt) return '';
  const d = new Date(lastSeenAt);
  if (Number.isNaN(d.getTime())) return '';

  const days = daysBetween(lastSeenAt, now);
  const clock = formatClock(lastSeenAt);
  if (days === 0) return lang === 'ru' ? `был(а) в ${clock}` : `last seen at ${clock}`;
  if (days === 1) return lang === 'ru' ? `был(а) вчера в ${clock}` : `last seen yesterday at ${clock}`;

  const date = `${d.getDate()} ${(lang === 'ru' ? MONTHS_RU : MONTHS_EN)[d.getMonth()]}`;
  return lang === 'ru' ? `был(а) ${date}` : `last seen ${date}`;
}
