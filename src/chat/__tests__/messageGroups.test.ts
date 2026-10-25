import {
  buildChatItems,
  firstUnreadIdOf,
  formatClock,
  formatDayLabel,
  formatLastSeen,
  formatListStamp,
} from '../messageGroups';

type M = { id: string; senderId: string; createdAt: string; read?: boolean };

function msg(id: string, senderId: string, iso: string, read?: boolean): M {
  return { id, senderId, createdAt: iso, read };
}

/** Local time, so the tests read the same way the app does — the formatters
 * all work off the device clock, not UTC. */
function at(day: number, hour: number, minute = 0): string {
  return new Date(2026, 9, day, hour, minute).toISOString();
}

describe('buildChatItems', () => {
  it('puts a day divider before the first message and on every change of day', () => {
    const items = buildChatItems([msg('a', 'u1', at(20, 10)), msg('b', 'u1', at(21, 10))]);
    expect(items.map((i) => i.kind)).toEqual(['date', 'message', 'date', 'message']);
  });

  it('groups consecutive messages from one sender and closes the run on the last', () => {
    const items = buildChatItems([
      msg('a', 'u1', at(20, 10, 0)),
      msg('b', 'u1', at(20, 10, 1)),
      msg('c', 'u1', at(20, 10, 2)),
    ]);
    const messages = items.filter((i) => i.kind === 'message');
    expect(messages.map((i) => (i.kind === 'message' ? [i.isFirstInGroup, i.isLastInGroup] : null))).toEqual([
      [true, false],
      [false, false],
      [false, true],
    ]);
  });

  it('starts a new run when the sender changes', () => {
    const items = buildChatItems([msg('a', 'u1', at(20, 10, 0)), msg('b', 'u2', at(20, 10, 1))]);
    const messages = items.filter((i) => i.kind === 'message');
    expect(messages.every((i) => i.kind === 'message' && i.isFirstInGroup && i.isLastInGroup)).toBe(true);
  });

  it('starts a new run after a long pause, even from the same sender', () => {
    const items = buildChatItems([msg('a', 'u1', at(20, 10, 0)), msg('b', 'u1', at(20, 10, 30))]);
    const second = items.find((i) => i.kind === 'message' && i.message.id === 'b');
    expect(second?.kind === 'message' && second.isFirstInGroup).toBe(true);
  });

  it('does not join a run across a day divider', () => {
    const items = buildChatItems([msg('a', 'u1', at(20, 23, 59)), msg('b', 'u1', at(21, 0, 1))]);
    const first = items.find((i) => i.kind === 'message' && i.message.id === 'a');
    const second = items.find((i) => i.kind === 'message' && i.message.id === 'b');
    expect(first?.kind === 'message' && first.isLastInGroup).toBe(true);
    expect(second?.kind === 'message' && second.isFirstInGroup).toBe(true);
  });

  it('draws the unread line once, above the message it is anchored to', () => {
    const items = buildChatItems(
      [msg('a', 'u1', at(20, 10, 0)), msg('b', 'u1', at(20, 10, 1)), msg('c', 'u1', at(20, 10, 2))],
      'b'
    );
    expect(items.map((i) => i.kind)).toEqual(['date', 'message', 'unread', 'message', 'message']);
  });

  it('breaks the run at the unread line, so bubbles never look joined across it', () => {
    const items = buildChatItems(
      [msg('a', 'u1', at(20, 10, 0)), msg('b', 'u1', at(20, 10, 1))],
      'b'
    );
    const first = items.find((i) => i.kind === 'message' && i.message.id === 'a');
    const second = items.find((i) => i.kind === 'message' && i.message.id === 'b');
    expect(first?.kind === 'message' && first.isLastInGroup).toBe(true);
    expect(second?.kind === 'message' && second.isFirstInGroup).toBe(true);
  });

  it('renders nothing for an empty conversation', () => {
    expect(buildChatItems([])).toEqual([]);
  });
});

describe('firstUnreadIdOf', () => {
  it('finds the oldest unread message from the other side', () => {
    const messages = [
      msg('a', 'me', at(20, 10, 0), true),
      msg('b', 'them', at(20, 10, 1), true),
      msg('c', 'them', at(20, 10, 2), false),
      msg('d', 'them', at(20, 10, 3), false),
    ];
    expect(firstUnreadIdOf(messages, 'me')).toBe('c');
  });

  it('ignores your own messages, read or not', () => {
    const messages = [msg('a', 'me', at(20, 10, 0), false), msg('b', 'them', at(20, 10, 1), true)];
    expect(firstUnreadIdOf(messages, 'me')).toBeNull();
  });

  it('is null in a group, where messages carry no read flag', () => {
    const messages = [msg('a', 'them', at(20, 10, 0)), msg('b', 'other', at(20, 10, 1))];
    expect(firstUnreadIdOf(messages, 'me')).toBeNull();
  });
});

describe('date and time formatting', () => {
  const now = new Date(2026, 9, 25, 15, 30);

  it('labels today and yesterday by name', () => {
    expect(formatDayLabel(at(25, 9), 'ru', now)).toBe('Сегодня');
    expect(formatDayLabel(at(24, 9), 'ru', now)).toBe('Вчера');
    expect(formatDayLabel(at(25, 9), 'en', now)).toBe('Today');
    expect(formatDayLabel(at(24, 9), 'en', now)).toBe('Yesterday');
  });

  it('labels an older day with its date, and adds the year only when it differs', () => {
    expect(formatDayLabel(at(20, 9), 'ru', now)).toBe('20 октября');
    expect(formatDayLabel(new Date(2025, 2, 3, 9).toISOString(), 'ru', now)).toBe('3 марта 2025');
    expect(formatDayLabel(at(20, 9), 'en', now)).toBe('20 October');
  });

  it('steps the chat list stamp from a clock to a weekday to a date', () => {
    expect(formatListStamp(at(25, 9, 5), 'ru', now)).toBe('09:05');
    expect(formatListStamp(at(24, 9), 'ru', now)).toBe('вчера');
    // Three days back lands on a weekday name.
    expect(formatListStamp(at(22, 9), 'ru', now)).toBe('чт');
    expect(formatListStamp(at(10, 9), 'ru', now)).toBe('10 окт');
  });

  it('pads the clock to two digits', () => {
    expect(formatClock(at(25, 9, 5))).toBe('09:05');
    expect(formatClock('not a date')).toBe('');
  });
});

describe('formatLastSeen', () => {
  const now = new Date(2026, 9, 25, 15, 30);

  it('says online when they are, whatever the stamp says', () => {
    expect(formatLastSeen(at(20, 9), true, 'ru', now)).toBe('в сети');
    expect(formatLastSeen(null, true, 'en', now)).toBe('online');
  });

  it('gives a time for today and yesterday, a date beyond that', () => {
    expect(formatLastSeen(at(25, 14, 5), false, 'ru', now)).toBe('был(а) в 14:05');
    expect(formatLastSeen(at(24, 14, 5), false, 'ru', now)).toBe('был(а) вчера в 14:05');
    expect(formatLastSeen(at(18, 14, 5), false, 'ru', now)).toBe('был(а) 18 октября');
    expect(formatLastSeen(at(25, 14, 5), false, 'en', now)).toBe('last seen at 14:05');
  });

  it('says nothing at all when presence was never recorded', () => {
    expect(formatLastSeen(null, false, 'ru', now)).toBe('');
    expect(formatLastSeen('rubbish', false, 'ru', now)).toBe('');
  });
});
