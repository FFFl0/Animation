import { MATCH_DEFS, DeBracket, championSeed, loserSeed } from './doubleElim';

/** Gold for the title, silver for losing the grand final, bronze for third. */
export type MedalKind = 'gold' | 'silver' | 'bronze';

export const MEDAL_KINDS: MedalKind[] = ['gold', 'silver', 'bronze'];

export type TournamentRecord = {
  runs: number;
  gold: number;
  silver: number;
  bronze: number;
  /** Best place ever taken, 1 for the title. 0 while nothing is finished. */
  bestPlace: number;
  /**
   * Which tournament was banked last. The bracket is re-read every few
   * seconds, so without this the same medal would be counted again on every
   * refresh once the run is over.
   */
  lastRunId?: string;
};

export const EMPTY_RECORD: TournamentRecord = { runs: 0, gold: 0, silver: 0, bronze: 0, bestPlace: 0 };

/**
 * Where each exit lands in the final standings, derived from the bracket
 * rather than written out: the losers-bracket final is third, and every round
 * before it is worth however many players are knocked out after it.
 *
 * Losing in the winners bracket is never an exit — it only drops a player
 * down — so those matches are not in here.
 */
function buildPlaces(): Record<string, number> {
  const lbRounds = [...new Set(MATCH_DEFS.filter((d) => d.bracket === 'lb').map((d) => d.round))].sort((a, b) => b - a);
  const places: Record<string, number> = { gf: 2 };
  let knockedOutLater = 0;
  for (const round of lbRounds) {
    const matches = MATCH_DEFS.filter((d) => d.bracket === 'lb' && d.round === round);
    for (const def of matches) places[def.id] = 3 + knockedOutLater;
    knockedOutLater += matches.length;
  }
  return places;
}

const PLACE_BY_EXIT = buildPlaces();

/** How many players share a place — 9th in a 16-bracket means 9th to 12th. */
const GROUP_SIZE: Record<number, number> = Object.values(PLACE_BY_EXIT).reduce<Record<number, number>>(
  (acc, place) => ({ ...acc, [place]: (acc[place] ?? 0) + 1 }),
  { 1: 1 }
);

/** The places a finish is shared with, as an inclusive range. */
export function placeRange(place: number): [number, number] {
  return [place, place + (GROUP_SIZE[place] ?? 1) - 1];
}

/**
 * Where a seed finished, or null while they are still in it. A player only
 * ever leaves through the losers bracket or the grand final, so the match
 * they lost there is the one that fixes their place.
 */
export function placeOf(bracket: DeBracket, seed: number): number | null {
  if (championSeed(bracket) === seed) return 1;
  const exit = MATCH_DEFS.find((d) => d.bracket !== 'wb' && loserSeed(bracket, d.id) === seed);
  return exit ? PLACE_BY_EXIT[exit.id] ?? null : null;
}

export function medalForPlace(place: number): MedalKind | null {
  if (place === 1) return 'gold';
  if (place === 2) return 'silver';
  if (place === 3) return 'bronze';
  return null;
}

/** What a finished run earned, or null while it is not over. */
export function medalFor(bracket: DeBracket, seed: number): MedalKind | null {
  const place = placeOf(bracket, seed);
  return place === null ? null : medalForPlace(place);
}

/** Folds a finished run into the record, ignoring a run already banked. */
export function applyRun(record: TournamentRecord, place: number, runId: string): TournamentRecord {
  if (record.lastRunId === runId) return record;
  const medal = medalForPlace(place);
  return {
    lastRunId: runId,
    runs: record.runs + 1,
    gold: record.gold + (medal === 'gold' ? 1 : 0),
    silver: record.silver + (medal === 'silver' ? 1 : 0),
    bronze: record.bronze + (medal === 'bronze' ? 1 : 0),
    // Lower is better, and 0 means nothing has been finished yet.
    bestPlace: record.bestPlace === 0 ? place : Math.min(record.bestPlace, place),
  };
}

export function totalMedals(record: TournamentRecord): number {
  return record.gold + record.silver + record.bronze;
}
