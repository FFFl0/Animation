import { Bracket, TOURNAMENT_ROUNDS, mySeat } from './bracket';

/** Gold for the title, silver for losing the final, bronze for losing the semi. */
export type MedalKind = 'gold' | 'silver' | 'bronze';

export const MEDAL_KINDS: MedalKind[] = ['gold', 'silver', 'bronze'];

export type TournamentRecord = {
  runs: number;
  gold: number;
  silver: number;
  bronze: number;
  /**
   * Furthest round ever reached, counted as rounds survived: 0 means going
   * out in the first, TOURNAMENT_ROUNDS means winning the whole thing.
   */
  bestRound: number;
};

export const EMPTY_RECORD: TournamentRecord = { runs: 0, gold: 0, silver: 0, bronze: 0, bestRound: 0 };

/** Rounds the player got through, whether they were knocked out or won it. */
export function roundsReached(bracket: Bracket): number {
  return bracket.myExitRound ?? TOURNAMENT_ROUNDS;
}

/** What a finished run earned, or null for an exit before the semi-finals. */
export function medalFor(bracket: Bracket): MedalKind | null {
  if (bracket.championSeat === mySeat(bracket)) return 'gold';
  switch (bracket.myExitRound) {
    case TOURNAMENT_ROUNDS - 1:
      return 'silver';
    case TOURNAMENT_ROUNDS - 2:
      return 'bronze';
    default:
      return null;
  }
}

/** Folds a finished run into the player's record. Only ever called once per run. */
export function applyRun(record: TournamentRecord, bracket: Bracket): TournamentRecord {
  const medal = medalFor(bracket);
  return {
    runs: record.runs + 1,
    gold: record.gold + (medal === 'gold' ? 1 : 0),
    silver: record.silver + (medal === 'silver' ? 1 : 0),
    bronze: record.bronze + (medal === 'bronze' ? 1 : 0),
    bestRound: Math.max(record.bestRound, roundsReached(bracket)),
  };
}

export function totalMedals(record: TournamentRecord): number {
  return record.gold + record.silver + record.bronze;
}
