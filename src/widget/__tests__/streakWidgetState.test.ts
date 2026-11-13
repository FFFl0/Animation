import { WIDGET_TEXT, parseSnapshot, widgetStateOf } from '../streakWidgetState';

const snap = (count: number, lastPlayedDate: string | null, freezes = 0) => ({
  count,
  lastPlayedDate,
  freezes,
  language: 'ru' as const,
});

describe('the streak widget', () => {
  const today = '2026-11-13';

  it('shows the streak extended once today is played', () => {
    expect(widgetStateOf(snap(7, today), today)).toEqual({ kind: 'done', count: 7 });
  });

  it('asks for a round when the last one was yesterday', () => {
    expect(widgetStateOf(snap(7, '2026-11-12'), today)).toEqual({ kind: 'pending', count: 7 });
  });

  it('keeps the number when freezes will cover the missed days', () => {
    expect(widgetStateOf(snap(7, '2026-11-10', 2), today)).toEqual({ kind: 'frozen', count: 7 });
  });

  it('drops to zero when the streak is lost', () => {
    expect(widgetStateOf(snap(7, '2026-11-10', 1), today)).toEqual({ kind: 'start', count: 0 });
    expect(widgetStateOf(snap(7, '2026-11-11'), today)).toEqual({ kind: 'start', count: 0 });
  });

  it('starts from nothing without a snapshot or a streak', () => {
    expect(widgetStateOf(null, today)).toEqual({ kind: 'start', count: 0 });
    expect(widgetStateOf(snap(0, null), today)).toEqual({ kind: 'start', count: 0 });
  });

  it('agrees with the streak rules after midnight without the app', () => {
    // Saved right after a round; Android redraws the next day.
    const saved = snap(3, '2026-11-12');
    expect(widgetStateOf(saved, '2026-11-12').kind).toBe('done');
    expect(widgetStateOf(saved, '2026-11-13').kind).toBe('pending');
    expect(widgetStateOf(saved, '2026-11-14').kind).toBe('start');
  });

  it('says days in a row the Russian way', () => {
    const label = WIDGET_TEXT.ru.label;
    expect([1, 2, 5, 11, 21, 22, 25, 112].map(label)).toEqual([
      'день подряд',
      'дня подряд',
      'дней подряд',
      'дней подряд',
      'день подряд',
      'дня подряд',
      'дней подряд',
      'дней подряд',
    ]);
  });
});

describe('the saved snapshot', () => {
  it('reads back what was saved', () => {
    expect(parseSnapshot(JSON.stringify({ count: 4, lastPlayedDate: '2026-11-13', freezes: 1, language: 'en' }))).toEqual({
      count: 4,
      lastPlayedDate: '2026-11-13',
      freezes: 1,
      language: 'en',
    });
  });

  it('survives nothing, junk and odd fields', () => {
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot('{oops')).toBeNull();
    expect(parseSnapshot(JSON.stringify({ count: -3, lastPlayedDate: 'yesterday', freezes: 'x', language: 'de' }))).toEqual({
      count: 0,
      lastPlayedDate: null,
      freezes: 0,
      language: 'ru',
    });
  });
});
