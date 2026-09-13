import { TOURNAMENT_ROUNDS, createBracket, resolveRound } from '../bracket';
import { buildSeats } from '../bots';
import { EMPTY_PRACTICE_RECORD, applyPracticeRun, roundsReached } from '../practiceRecord';

const fresh = (seed = 4) => createBracket(buildSeats('Me', [], seed), seed);

/** A run that ends with the player knocked out in `round`. */
function runOut(round: number) {
  let bracket = fresh();
  for (let r = 0; r < round; r++) bracket = resolveRound(bracket, 7);
  return resolveRound(bracket, 0);
}

function runWon() {
  let bracket = fresh();
  for (let r = 0; r < TOURNAMENT_ROUNDS; r++) bracket = resolveRound(bracket, 7);
  return bracket;
}

describe('roundsReached', () => {
  it('counts rounds survived, with a win as the full set', () => {
    expect(roundsReached(runOut(0))).toBe(0);
    expect(roundsReached(runOut(3))).toBe(3);
    expect(roundsReached(runWon())).toBe(TOURNAMENT_ROUNDS);
  });
});

describe('applyPracticeRun', () => {
  it('counts the run and keeps the furthest round', () => {
    let record = applyPracticeRun(EMPTY_PRACTICE_RECORD, runWon(), 'a');
    expect(record).toEqual({ lastRunId: 'a', runs: 1, bestRound: TOURNAMENT_ROUNDS });

    record = applyPracticeRun(record, runOut(0), 'b');
    expect(record.runs).toBe(2);
    // the early exit must not drag the best result back down
    expect(record.bestRound).toBe(TOURNAMENT_ROUNDS);
  });

  it('ignores a run that was already banked', () => {
    const once = applyPracticeRun(EMPTY_PRACTICE_RECORD, runWon(), 'same');
    expect(applyPracticeRun(once, runWon(), 'same')).toBe(once);
    expect(applyPracticeRun(once, runWon(), 'other').runs).toBe(2);
  });
});
