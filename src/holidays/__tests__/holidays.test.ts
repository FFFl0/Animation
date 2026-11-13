import { lightTheme, darkTheme } from '../../theme/palette';
import { HOLIDAYS, greetingKey, holidayOn, nextHoliday, withHoliday } from '../holidays';

const on = (y: number, m: number, d: number) => holidayOn(new Date(y, m - 1, d))?.id ?? null;

describe('the holiday calendar', () => {
  it('runs New Year across the turn of the year', () => {
    expect(on(2026, 12, 19)).toBeNull();
    expect(on(2026, 12, 20)).toBe('newYear');
    expect(on(2026, 12, 31)).toBe('newYear');
    expect(on(2027, 1, 1)).toBe('newYear');
    expect(on(2027, 1, 10)).toBe('newYear');
    expect(on(2027, 1, 11)).toBeNull();
  });

  it('knows each holiday by its days, edges included', () => {
    expect([on(2027, 2, 11), on(2027, 2, 12), on(2027, 2, 15), on(2027, 2, 16)]).toEqual([null, 'valentine', 'valentine', null]);
    expect([on(2027, 3, 5), on(2027, 3, 8), on(2027, 3, 10)]).toEqual([null, 'womensDay', null]);
    expect([on(2027, 3, 31), on(2027, 4, 1), on(2027, 4, 14), on(2027, 4, 15)]).toEqual([null, 'hanami', 'hanami', null]);
    expect([on(2026, 10, 26), on(2026, 10, 31), on(2026, 11, 1), on(2026, 11, 2)]).toEqual([null, 'halloween', 'halloween', null]);
    expect(on(2026, 7, 15)).toBeNull();
  });

  it('never has two holidays on one day', () => {
    for (let d = 0; d < 366; d++) {
      const date = new Date(2028, 0, 1 + d);
      const matching = HOLIDAYS.filter((h) => holidayOn(date)?.id === h.id);
      expect(matching.length).toBeLessThanOrEqual(1);
    }
  });

  it('wishes a happy New Year only once it has come', () => {
    const ny = HOLIDAYS[0];
    expect(greetingKey(ny, new Date(2026, 11, 28))).toBe('newYearSoon');
    expect(greetingKey(ny, new Date(2027, 0, 2))).toBe('newYear');
  });

  it('says how far off the next holiday is', () => {
    expect(nextHoliday(new Date(2026, 9, 20))).toMatchObject({ holiday: { id: 'halloween' }, inDays: 7 });
    expect(nextHoliday(new Date(2026, 9, 29))).toMatchObject({ holiday: { id: 'halloween' }, inDays: 0 });
    expect(nextHoliday(new Date(2026, 10, 13))).toMatchObject({ holiday: { id: 'newYear' }, inDays: 37 });
  });
});

describe('the holiday colours', () => {
  it('lay the accent over the theme and leave the rest', () => {
    const ny = HOLIDAYS[0];
    const t = withHoliday(lightTheme, ny, 'light');
    expect(t.primary).toBe('#D9364A');
    expect(t.background).toBe(lightTheme.background);
    expect(withHoliday(darkTheme, ny, 'dark').primary).toBe('#F0596B');
  });

  it('keep the usual pink when the holiday brings none, or there is none', () => {
    const hanami = HOLIDAYS.find((h) => h.id === 'hanami')!;
    expect(withHoliday(lightTheme, hanami, 'light')).toBe(lightTheme);
    expect(withHoliday(lightTheme, null, 'light')).toBe(lightTheme);
  });

  it('keep white text readable on every holiday button', () => {
    // WCAG contrast of white on the accent, at least 3:1 for bold text.
    const lum = (hex: string) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    for (const h of HOLIDAYS) {
      if (!h.accent) continue;
      expect(1.05 / (lum(h.accent.light.primary) + 0.05)).toBeGreaterThanOrEqual(3);
    }
  });
});
