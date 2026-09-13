import { MedalKind, TournamentRecord } from '../tournament/medals';

/**
 * What a medal is worth in shop points, and the rouble figure each one
 * stands for. The two are the same number on purpose: one point is one
 * rouble of perceived value, so a 400-point reward reads as a 400 ₽ item
 * without anybody having to do arithmetic.
 *
 * The rate is calibrated against how many medals the tournament actually
 * mints — three a week for the whole player base — rather than picked to
 * look nice. docs/shop-economy.md shows the working.
 */
export const MEDAL_POINTS: Record<MedalKind, number> = {
  gold: 75,
  silver: 30,
  bronze: 10,
};

/**
 * Medals are trophies and stay on the shelf forever; what gets spent is the
 * points they are worth. Nobody loses a win they earned by buying a frame.
 */
export function earnedPoints(record: TournamentRecord): number {
  return record.gold * MEDAL_POINTS.gold + record.silver * MEDAL_POINTS.silver + record.bronze * MEDAL_POINTS.bronze;
}

export function balanceOf(record: TournamentRecord, spent: number): number {
  return Math.max(0, earnedPoints(record) - Math.max(0, spent));
}

export function canAfford(record: TournamentRecord, spent: number, price: number): boolean {
  return balanceOf(record, spent) >= price;
}

/** Points still to earn before a price is within reach, 0 once it is. */
export function shortBy(record: TournamentRecord, spent: number, price: number): number {
  return Math.max(0, price - balanceOf(record, spent));
}

/**
 * What an item costs in medal points. A point stands for a rouble of the
 * same value, so the two prices are one number: nothing to keep in step,
 * and "300 очков" reads as "300 ₽" without anybody doing arithmetic.
 */
export function pointsPrice(priceRub: number): number {
  return priceRub;
}

/** Prices in roubles are whole roubles — no kopecks anywhere in the shop. */
export function formatRub(price: number): string {
  return `${price.toLocaleString('ru-RU')} ₽`;
}
