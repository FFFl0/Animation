import { Bracket, TOURNAMENT_ROUNDS } from './bracket';

/**
 * What the practice bracket keeps. No medals: those are for the weekly
 * tournament, where the opponents are real.
 */
export type PracticeRecord = {
  runs: number;
  /**
   * Furthest round ever reached, counted as rounds survived: 0 means going
   * out in the first, TOURNAMENT_ROUNDS means winning the whole thing.
   */
  bestRound: number;
  /** The run banked last, so a re-render cannot count it twice. */
  lastRunId?: string;
};

export const EMPTY_PRACTICE_RECORD: PracticeRecord = { runs: 0, bestRound: 0 };

/** Rounds the player got through, whether they were knocked out or won it. */
export function roundsReached(bracket: Bracket): number {
  return bracket.myExitRound ?? TOURNAMENT_ROUNDS;
}

export function applyPracticeRun(record: PracticeRecord, bracket: Bracket, runId: string): PracticeRecord {
  if (record.lastRunId === runId) return record;
  return {
    lastRunId: runId,
    runs: record.runs + 1,
    bestRound: Math.max(record.bestRound, roundsReached(bracket)),
  };
}
