import {
  DE_SIZE,
  DeBracket,
  Entrant,
  WINS_PER_MATCH,
  createDeBracket,
  openMatches,
  participantsOf,
  reportGame,
} from '../doubleElim';
import { EMPTY_RECORD, applyRun, medalFor, placeOf, placeRange, totalMedals } from '../medals';

const entrants: Entrant[] = Array.from({ length: DE_SIZE }, (_, seed) => ({
  seed,
  userId: `u${seed}`,
  name: `P${seed}`,
  rating: 1000 - seed * 10,
}));

const fresh = () => createDeBracket(entrants);

function winMatch(bracket: DeBracket, id: string, side: 'a' | 'b'): DeBracket {
  let next = bracket;
  for (let i = 0; i < WINS_PER_MATCH; i++) {
    next = reportGame(next, id, { winner: side, scoreA: side === 'a' ? 7 : 0, scoreB: side === 'b' ? 7 : 0 });
  }
  return next;
}

/** Runs the whole bracket out, always giving it to the better seed. */
function runFavourites(bracket: DeBracket): DeBracket {
  let next = bracket;
  for (let guard = 0; guard < 200; guard++) {
    const open = openMatches(next);
    if (!open.length) break;
    for (const id of open) {
      const [a, b] = participantsOf(next, id);
      next = winMatch(next, id, (a as number) < (b as number) ? 'a' : 'b');
    }
  }
  return next;
}

const done = runFavourites(fresh());

describe('placeOf', () => {
  it('gives nobody a place while the bracket is untouched', () => {
    const start = fresh();
    for (let seed = 0; seed < DE_SIZE; seed++) expect(placeOf(start, seed)).toBeNull();
  });

  it('puts the champion first and the grand-final loser second', () => {
    expect(placeOf(done, 0)).toBe(1);
    expect(placeOf(done, 1)).toBe(2);
  });

  it('fixes a place the moment a player takes their second loss', () => {
    // Seed 15 loses its opener, then loses again the first time out in the
    // losers bracket — last place, with the bracket still running.
    let bracket = winMatch(fresh(), 'wb0-0', 'a');
    for (let i = 1; i < 8; i++) bracket = winMatch(bracket, `wb0-${i}`, 'a');
    bracket = winMatch(bracket, 'lb0-0', 'b');

    expect(placeOf(bracket, 15)).toBe(13);
    // Losing in the winners bracket alone is not an exit.
    expect(placeOf(bracket, 8)).toBeNull();
  });

  it('hands out every place in the bracket exactly as often as it can be shared', () => {
    const counts = new Map<number, number>();
    for (let seed = 0; seed < DE_SIZE; seed++) {
      const place = placeOf(done, seed);
      expect(place).not.toBeNull();
      counts.set(place!, (counts.get(place!) ?? 0) + 1);
    }
    expect(Object.fromEntries(counts)).toEqual({ 1: 1, 2: 1, 3: 1, 4: 1, 5: 2, 7: 2, 9: 4, 13: 4 });
  });
});

describe('placeRange', () => {
  it('leaves the top four alone and groups the rest', () => {
    expect(placeRange(1)).toEqual([1, 1]);
    expect(placeRange(4)).toEqual([4, 4]);
    expect(placeRange(5)).toEqual([5, 6]);
    expect(placeRange(9)).toEqual([9, 12]);
    expect(placeRange(13)).toEqual([13, 16]);
  });
});

describe('medalFor', () => {
  it('gives gold, silver and bronze to the top three and nothing below', () => {
    expect(medalFor(done, 0)).toBe('gold');
    expect(medalFor(done, 1)).toBe('silver');
    expect(medalFor(done, 2)).toBe('bronze');
    expect(medalFor(done, 3)).toBeNull();
    expect(medalFor(done, 15)).toBeNull();
  });

  it('gives nothing while the run is not over', () => {
    expect(medalFor(fresh(), 0)).toBeNull();
  });
});

describe('applyRun', () => {
  it('counts the run and the medal it earned', () => {
    expect(applyRun(EMPTY_RECORD, 1, 'week-1')).toEqual({
      lastRunId: 'week-1',
      runs: 1,
      gold: 1,
      silver: 0,
      bronze: 0,
      bestPlace: 1,
    });
  });

  it('accumulates across runs and keeps the best place', () => {
    let record = applyRun(EMPTY_RECORD, 3, 'week-1');
    record = applyRun(record, 13, 'week-2');
    record = applyRun(record, 1, 'week-3');

    expect(record.runs).toBe(3);
    expect(record.gold).toBe(1);
    expect(record.bronze).toBe(1);
    expect(totalMedals(record)).toBe(2);
    // the early exit must not drag the best result back down
    expect(record.bestPlace).toBe(1);
  });

  it('ignores a run that was already banked', () => {
    const once = applyRun(EMPTY_RECORD, 1, 'same');
    expect(applyRun(once, 1, 'same')).toBe(once);
    expect(applyRun(once, 1, 'other').runs).toBe(2);
  });

  it('records a medal-less run without awarding anything', () => {
    const record = applyRun(EMPTY_RECORD, 9, 'week-1');
    expect(record.runs).toBe(1);
    expect(totalMedals(record)).toBe(0);
    expect(record.bestPlace).toBe(9);
  });
});
