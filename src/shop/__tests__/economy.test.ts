import { EMPTY_RECORD, TournamentRecord } from '../../tournament/medals';
import { MEDAL_POINTS, balanceOf, canAfford, earnedPoints, formatRub, shortBy } from '../economy';

const record = (gold: number, silver: number, bronze: number): TournamentRecord => ({
  ...EMPTY_RECORD,
  gold,
  silver,
  bronze,
  runs: gold + silver + bronze,
});

describe('earnedPoints', () => {
  it('is nothing for an empty shelf', () => {
    expect(earnedPoints(EMPTY_RECORD)).toBe(0);
  });

  it('adds every medal at its own rate', () => {
    expect(earnedPoints(record(1, 0, 0))).toBe(MEDAL_POINTS.gold);
    expect(earnedPoints(record(0, 1, 0))).toBe(MEDAL_POINTS.silver);
    expect(earnedPoints(record(0, 0, 1))).toBe(MEDAL_POINTS.bronze);
    expect(earnedPoints(record(2, 1, 3))).toBe(2 * 75 + 30 + 3 * 10);
  });

  it('keeps gold worth more than silver and silver more than bronze', () => {
    expect(MEDAL_POINTS.gold).toBeGreaterThan(MEDAL_POINTS.silver);
    expect(MEDAL_POINTS.silver).toBeGreaterThan(MEDAL_POINTS.bronze);
  });
});

describe('balanceOf', () => {
  it('is what was won minus what was spent', () => {
    expect(balanceOf(record(1, 1, 1), 0)).toBe(115);
    expect(balanceOf(record(1, 1, 1), 100)).toBe(15);
  });

  it('never goes below zero, whatever the ledger says', () => {
    expect(balanceOf(record(0, 0, 1), 999)).toBe(0);
    expect(balanceOf(record(1, 0, 0), -50)).toBe(75);
  });
});

describe('canAfford', () => {
  it('lets a price through exactly at the balance', () => {
    expect(canAfford(record(2, 0, 0), 0, 150)).toBe(true);
    expect(canAfford(record(2, 0, 0), 0, 151)).toBe(false);
    expect(canAfford(record(2, 0, 0), 75, 150)).toBe(false);
  });
});

describe('shortBy', () => {
  it('counts the points still to earn, and nothing once affordable', () => {
    expect(shortBy(record(1, 0, 0), 0, 150)).toBe(75);
    expect(shortBy(record(2, 0, 0), 0, 150)).toBe(0);
    expect(shortBy(record(4, 0, 0), 0, 150)).toBe(0);
  });
});

describe('formatRub', () => {
  it('writes whole roubles with a separator', () => {
    expect(formatRub(390)).toBe('390 ₽');
    expect(formatRub(4490)).toMatch(/^4.490 ₽$/);
  });
});
