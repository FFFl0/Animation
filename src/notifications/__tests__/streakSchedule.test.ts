import { REMINDER_ID_PREFIX, planStreakReminders, streakDayOf } from '../streakSchedule';

/**
 * The plan reads the phone's clock, which Jest pins for its own process, so
 * each case runs the same code in a fresh node process in a chosen zone.
 */
function planIn(zone: string, now: string, streak: { count: number; lastPlayedDate: string | null } | null, days: number) {
  const { execFileSync } = require('child_process');
  const ts = require('typescript');
  const { readFileSync } = require('fs');
  const { join } = require('path');
  const source = readFileSync(join(__dirname, '../streakSchedule.ts'), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const script = `${js}
const plan = exports.planStreakReminders(new Date(${JSON.stringify(now)}), ${JSON.stringify(streak)}, ${days});
process.stdout.write(JSON.stringify(plan.map((r) => ({ id: r.id, slot: r.slot, at: r.at.toISOString(), atRisk: r.atRisk }))));`;
  const out = execFileSync(process.execPath, ['-e', script], { env: { ...process.env, TZ: zone }, encoding: 'utf8' });
  return JSON.parse(out) as { id: string; slot: string; at: string; atRisk: number | null }[];
}

describe('the streak reminders', () => {
  it('go off at 12:00 and 20:00 on the phone, every day ahead', () => {
    // 10:00 in Moscow, nothing played since yesterday.
    const plan = planIn('Europe/Moscow', '2026-11-13T07:00:00Z', { count: 5, lastPlayedDate: '2026-11-12' }, 2);
    expect(plan.map((r) => [r.slot, r.at])).toEqual([
      ['noon', '2026-11-13T09:00:00.000Z'],
      ['evening', '2026-11-13T17:00:00.000Z'],
      ['noon', '2026-11-14T09:00:00.000Z'],
      ['evening', '2026-11-14T17:00:00.000Z'],
    ]);
  });

  it('name the streak only on the day it would be lost', () => {
    const plan = planIn('Europe/Moscow', '2026-11-13T07:00:00Z', { count: 5, lastPlayedDate: '2026-11-12' }, 2);
    expect(plan.map((r) => r.atRisk)).toEqual([5, 5, null, null]);
  });

  it('leave out both reminders of a day already played, and stay for the next one', () => {
    const plan = planIn('Europe/Moscow', '2026-11-13T07:00:00Z', { count: 6, lastPlayedDate: '2026-11-13' }, 2);
    expect(plan.map((r) => [r.slot, r.at, r.atRisk])).toEqual([
      ['noon', '2026-11-14T09:00:00.000Z', 6],
      ['evening', '2026-11-14T17:00:00.000Z', 6],
    ]);
  });

  it('only send the evening one once noon has passed', () => {
    // 13:00 in Moscow.
    const plan = planIn('Europe/Moscow', '2026-11-13T10:00:00Z', { count: 5, lastPlayedDate: '2026-11-12' }, 1);
    expect(plan.map((r) => r.slot)).toEqual(['evening']);
  });

  it('use the phone’s own hours wherever it is', () => {
    const plan = planIn('Asia/Vladivostok', '2026-11-13T00:30:00Z', null, 1);
    // 12:00 and 20:00 at UTC+10
    expect(plan.map((r) => r.at)).toEqual(['2026-11-13T02:00:00.000Z', '2026-11-13T10:00:00.000Z']);
    expect(plan.every((r) => r.atRisk === null)).toBe(true);
  });

  it('have one id per local day and slot, so booking again replaces them', () => {
    const plan = planIn('Europe/Moscow', '2026-11-13T07:00:00Z', null, 14);
    expect(plan).toHaveLength(28);
    expect(new Set(plan.map((r) => r.id)).size).toBe(28);
    expect(plan[0].id).toBe(`${REMINDER_ID_PREFIX}2026-11-13:noon`);
    expect(plan[27].id).toBe(`${REMINDER_ID_PREFIX}2026-11-26:evening`);
  });

  it('say nothing about a number when there is no streak', () => {
    const plan = planIn('Europe/Moscow', '2026-11-13T07:00:00Z', { count: 0, lastPlayedDate: '2026-11-12' }, 1);
    expect(plan.map((r) => r.atRisk)).toEqual([null, null]);
  });
});

describe('the streak day', () => {
  it('is the UTC date, the one lastPlayedDate is written in', () => {
    expect(streakDayOf(new Date('2026-11-13T23:30:00Z'))).toBe('2026-11-13');
    expect(streakDayOf(new Date('2026-11-14T00:00:00Z'))).toBe('2026-11-14');
  });

  it('runs on the planner without a zone', () => {
    // Same-process sanity: whatever the zone, nothing in the past is booked.
    const now = new Date();
    expect(planStreakReminders(now, null).every((r) => r.at.getTime() > now.getTime())).toBe(true);
  });
});
