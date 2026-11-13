import { streakWeek } from '../streakWeek';

describe('the week strip', () => {
  // 2026-11-13 is a Friday.
  const today = '2026-11-13';

  it('runs Monday to Sunday around today', () => {
    const week = streakWeek({ count: 0, lastPlayedDate: null }, false, today);
    expect(week.map((d) => d.date)).toEqual([
      '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15',
    ]);
    expect(week.map((d) => d.today)).toEqual([false, false, false, false, true, false, false]);
    expect(week.filter((d) => d.future).map((d) => d.weekday)).toEqual([5, 6]);
  });

  it('marks the days the streak covers, up to its last round', () => {
    const week = streakWeek({ count: 3, lastPlayedDate: '2026-11-12' }, true, today);
    expect(week.map((d) => d.played)).toEqual([false, true, true, true, false, false, false]);
  });

  it('includes today once it is played, and runs back past Monday', () => {
    const week = streakWeek({ count: 30, lastPlayedDate: today }, true, today);
    expect(week.map((d) => d.played)).toEqual([true, true, true, true, true, false, false]);
  });

  it('marks nothing for a streak that is gone', () => {
    const week = streakWeek({ count: 5, lastPlayedDate: '2026-11-10' }, false, today);
    expect(week.some((d) => d.played)).toBe(false);
  });

  it('starts the week on Monday when today is Sunday', () => {
    const week = streakWeek({ count: 1, lastPlayedDate: '2026-11-15' }, true, '2026-11-15');
    expect(week[0].date).toBe('2026-11-09');
    expect(week[6]).toMatchObject({ date: '2026-11-15', today: true, played: true });
  });
});
