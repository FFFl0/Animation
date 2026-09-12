import { TOURNAMENT_ROUNDS, createBracket, mySeat, resolveRound } from '../bracket';
import { buildSeats } from '../bots';
import { EMPTY_RECORD, applyRun, medalFor, roundsReached, totalMedals } from '../medals';

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

describe('medalFor', () => {
  it('gives gold for the title', () => {
    const won = runWon();
    expect(won.championSeat).toBe(mySeat(won));
    expect(medalFor(won)).toBe('gold');
  });

  it('gives silver for losing the final and bronze for the semi', () => {
    expect(medalFor(runOut(TOURNAMENT_ROUNDS - 1))).toBe('silver');
    expect(medalFor(runOut(TOURNAMENT_ROUNDS - 2))).toBe('bronze');
  });

  it('gives nothing for an earlier exit', () => {
    expect(medalFor(runOut(0))).toBeNull();
    expect(medalFor(runOut(1))).toBeNull();
    expect(medalFor(runOut(2))).toBeNull();
  });
});

describe('roundsReached', () => {
  it('counts rounds survived, with a win as the full set', () => {
    expect(roundsReached(runOut(0))).toBe(0);
    expect(roundsReached(runOut(3))).toBe(3);
    expect(roundsReached(runWon())).toBe(TOURNAMENT_ROUNDS);
  });
});

describe('applyRun', () => {
  it('counts the run and the medal it earned', () => {
    const after = applyRun(EMPTY_RECORD, runWon());
    expect(after).toEqual({ runs: 1, gold: 1, silver: 0, bronze: 0, bestRound: TOURNAMENT_ROUNDS });
  });

  it('accumulates across runs and keeps the best result', () => {
    let record = applyRun(EMPTY_RECORD, runWon());
    record = applyRun(record, runOut(0));
    record = applyRun(record, runOut(TOURNAMENT_ROUNDS - 2));

    expect(record.runs).toBe(3);
    expect(record.gold).toBe(1);
    expect(record.bronze).toBe(1);
    expect(totalMedals(record)).toBe(2);
    // the early exit must not drag the best result back down
    expect(record.bestRound).toBe(TOURNAMENT_ROUNDS);
  });

  it('records a medal-less run without awarding anything', () => {
    const record = applyRun(EMPTY_RECORD, runOut(1));
    expect(record.runs).toBe(1);
    expect(totalMedals(record)).toBe(0);
    expect(record.bestRound).toBe(1);
  });
});
