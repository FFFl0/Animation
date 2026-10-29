import { medalForPlace } from '../tournament/medals';

/**
 * What a player has won against other people, as opposed to what they have
 * answered: weekly tournaments and fan battles.
 *
 * Kept on the profile rather than on the device, because the rating is read
 * from the profile by a ranking that cannot see anybody's phone — the medal
 * shelf in the shop is the same run seen from the other side, and stays
 * local.
 */
export type Victories = {
  /** Tournaments played to the end, podium or not. */
  runs: number;
  gold: number;
  silver: number;
  bronze: number;
  /** The last tournament banked. A finished bracket is re-read every few
   * seconds, and without this it would be paid for on every read. */
  lastRunId?: string;
  /** Fan battles won. */
  battles: number;
};

export const EMPTY_VICTORIES: Victories = { runs: 0, gold: 0, silver: 0, bronze: 0, battles: 0 };

/** What finishing a tournament is worth, by where it finished. */
export const TOURNAMENT_POINTS = { gold: 30, silver: 20, bronze: 12, played: 5 };

/** What winning a fan battle is worth, and the most they can ever add up to. */
export const BATTLE_POINTS = 3;

/**
 * A fan battle is played against whoever you like, as often as you like, so
 * without a ceiling the rating would go to whoever had the most patient
 * friend. The tournament has no ceiling because the server only runs one a
 * week: there is nothing to grind.
 */
export const BATTLE_CAP = 60;

export function tournamentPoints(victories: Victories): number {
  const { runs, gold, silver, bronze } = victories;
  const offPodium = Math.max(0, runs - gold - silver - bronze);
  return (
    gold * TOURNAMENT_POINTS.gold +
    silver * TOURNAMENT_POINTS.silver +
    bronze * TOURNAMENT_POINTS.bronze +
    offPodium * TOURNAMENT_POINTS.played
  );
}

export function battlePoints(victories: Victories): number {
  return Math.min(BATTLE_CAP, victories.battles * BATTLE_POINTS);
}

export function victoryPoints(victories: Victories): number {
  return tournamentPoints(victories) + battlePoints(victories);
}

/** Folds a finished tournament in, ignoring one already banked. */
export function applyTournamentRun(victories: Victories, place: number, runId: string): Victories {
  if (victories.lastRunId === runId) return victories;
  const medal = medalForPlace(place);
  return {
    ...victories,
    lastRunId: runId,
    runs: victories.runs + 1,
    gold: victories.gold + (medal === 'gold' ? 1 : 0),
    silver: victories.silver + (medal === 'silver' ? 1 : 0),
    bronze: victories.bronze + (medal === 'bronze' ? 1 : 0),
  };
}

export function applyBattleWin(victories: Victories): Victories {
  return { ...victories, battles: victories.battles + 1 };
}
