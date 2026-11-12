import { getT } from '../../i18n/strings';
import { localClock, nextQuestReset, timeUntil } from '../questClock';

describe('when the quests change', () => {
  it('is the next midnight in UTC', () => {
    expect(nextQuestReset(new Date('2026-11-11T22:30:00Z')).toISOString()).toBe('2026-11-12T00:00:00.000Z');
    // exactly at midnight the next change is a whole day away
    expect(nextQuestReset(new Date('2026-11-12T00:00:00Z')).toISOString()).toBe('2026-11-13T00:00:00.000Z');
    // across a month and a year
    expect(nextQuestReset(new Date('2026-12-31T10:00:00Z')).toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('is the moment the quest day itself moves on', () => {
    // The quest day is the UTC date (todayDateStr); the shown time must be
    // when that date changes, not some other midnight.
    const reset = nextQuestReset(new Date('2026-11-11T15:00:00Z'));
    const before = new Date(reset.getTime() - 1).toISOString().slice(0, 10);
    const after = reset.toISOString().slice(0, 10);
    expect([before, after]).toEqual(['2026-11-11', '2026-11-12']);
  });

  it('reads 03:00 on a phone in Moscow and 00:00 on one in London', () => {
    // Jest pins the time zone of its own process, so the phone's clock is
    // checked in a fresh node process per zone, running the same code.
    const { execFileSync } = require('child_process');
    const ts = require('typescript');
    const { readFileSync } = require('fs');
    const { join } = require('path');
    const source = readFileSync(join(__dirname, '../questClock.ts'), 'utf8');
    const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
    const script = `${js}\nprocess.stdout.write(exports.localClock(exports.nextQuestReset(new Date('2026-11-11T15:00:00Z'))));`;
    const clockIn = (zone: string) =>
      execFileSync(process.execPath, ['-e', script], { env: { ...process.env, TZ: zone }, encoding: 'utf8' });
    expect(clockIn('Europe/Moscow')).toBe('03:00');
    expect(clockIn('Europe/London')).toBe('00:00');
    expect(clockIn('Asia/Vladivostok')).toBe('10:00');
  });

  it('pads the hour and the minute', () => {
    const at = (h: number, m: number) => ({ getHours: () => h, getMinutes: () => m }) as unknown as Date;
    expect(localClock(at(3, 0))).toBe('03:00');
    expect(localClock(at(14, 5))).toBe('14:05');
  });

  it('counts down in whole minutes, rounding up', () => {
    const to = new Date('2026-11-12T00:00:00Z');
    expect(timeUntil(to, new Date('2026-11-11T18:47:30Z'))).toEqual({ hours: 5, minutes: 13 });
    expect(timeUntil(to, new Date('2026-11-11T23:59:59Z'))).toEqual({ hours: 0, minutes: 1 });
    expect(timeUntil(to, new Date('2026-11-12T00:00:05Z'))).toEqual({ hours: 0, minutes: 0 });
  });
});

describe('the wording', () => {
  const ru = getT('ru');

  it('agrees the Russian words with every target a quest can have', () => {
    expect(ru('quests.rounds', 2)).toBe('Сыграй 2 раунда');
    expect(ru('quests.rounds', 3)).toBe('Сыграй 3 раунда');
    expect(ru('quests.correct', 15)).toBe('Ответь правильно 15 раз');
    expect(ru('quests.correct', 22)).toBe('Ответь правильно 22 раза');
  });

  it('says when, and how long until', () => {
    expect(ru('quests.resetsAt', '03:00')).toBe('Новые задания в 03:00');
    expect(ru('quests.resetsIn', 5, 13)).toBe('через 5 ч 13 мин');
    expect(ru('quests.resetsIn', 0, 7)).toBe('через 7 мин');
    expect(getT('en')('quests.resetsAt', '00:00')).toBe('New quests at 00:00');
  });
});
