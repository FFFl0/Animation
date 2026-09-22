import {
  DE_SIZE,
  DeBracket,
  Entrant,
  GRAND_FINAL,
  MATCH_DEFS,
  SEED_ORDER,
  WINS_PER_MATCH,
  championSeed,
  createDeBracket,
  isDecided,
  isEliminated,
  isFinished,
  isPlayable,
  loserSeed,
  lossesOf,
  matchDef,
  openMatches,
  participantsOf,
  playableMatchesFor,
  reportGame,
  winnerSeed,
  winsOf,
} from '../doubleElim';

const entrants: Entrant[] = Array.from({ length: DE_SIZE }, (_, seed) => ({
  seed,
  userId: `u${seed}`,
  name: `P${seed}`,
  rating: 1000 - seed * 10,
}));

const fresh = () => createDeBracket(entrants);

/** Plays a match out in straight games, won by the given side. */
function winMatch(bracket: DeBracket, id: string, side: 'a' | 'b'): DeBracket {
  let next = bracket;
  for (let i = 0; i < WINS_PER_MATCH; i++) {
    next = reportGame(next, id, { winner: side, scoreA: side === 'a' ? 7 : 0, scoreB: side === 'b' ? 7 : 0 });
  }
  return next;
}

/** Runs the whole bracket, always giving it to the better seed (the lower number). */
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

describe('bracket shape', () => {
  it('has the 30 matches a 16-player double elimination needs', () => {
    expect(MATCH_DEFS).toHaveLength(30);
    expect(MATCH_DEFS.filter((d) => d.bracket === 'wb')).toHaveLength(15);
    expect(MATCH_DEFS.filter((d) => d.bracket === 'lb')).toHaveLength(14);
    expect(MATCH_DEFS.filter((d) => d.bracket === 'gf')).toHaveLength(1);
  });

  it('uses every seed exactly once in the first round', () => {
    expect([...SEED_ORDER].sort((x, y) => x - y)).toEqual(entrants.map((e) => e.seed));
  });

  it('sends the top seed against the bottom one', () => {
    expect(participantsOf(fresh(), 'wb0-0')).toEqual([0, 15]);
  });

  it('gives every match distinct ids and a known feed', () => {
    const ids = new Set(MATCH_DEFS.map((d) => d.id));
    expect(ids.size).toBe(MATCH_DEFS.length);
    for (const def of MATCH_DEFS) {
      for (const slot of [def.a, def.b]) {
        if (slot.from !== 'seed') expect(() => matchDef(slot.match)).not.toThrow();
      }
    }
  });

  it('only opens the first winners round on a fresh bracket', () => {
    expect(openMatches(fresh()).sort()).toEqual(
      Array.from({ length: 8 }, (_, i) => `wb0-${i}`)
    );
  });
});

describe('a match', () => {
  it('takes two game wins, and a third game only when it is 1-1', () => {
    let bracket = fresh();
    bracket = reportGame(bracket, 'wb0-0', { winner: 'a', scoreA: 5, scoreB: 3 });
    expect(isDecided(bracket, 'wb0-0')).toBe(false);
    expect(winsOf(bracket, 'wb0-0')).toEqual([1, 0]);

    bracket = reportGame(bracket, 'wb0-0', { winner: 'b', scoreA: 2, scoreB: 6 });
    expect(isDecided(bracket, 'wb0-0')).toBe(false);

    bracket = reportGame(bracket, 'wb0-0', { winner: 'a', scoreA: 7, scoreB: 1 });
    expect(isDecided(bracket, 'wb0-0')).toBe(true);
    expect(winnerSeed(bracket, 'wb0-0')).toBe(0);
    expect(loserSeed(bracket, 'wb0-0')).toBe(15);
  });

  it('ignores games reported after it is over', () => {
    const decided = winMatch(fresh(), 'wb0-0', 'a');
    const after = reportGame(decided, 'wb0-0', { winner: 'b', scoreA: 0, scoreB: 7 });
    expect(after).toBe(decided);
    expect(winnerSeed(after, 'wb0-0')).toBe(0);
  });

  it('refuses a game for a match whose participants are unknown', () => {
    expect(() => reportGame(fresh(), 'wb1-0', { winner: 'a', scoreA: 7, scoreB: 0 })).toThrow();
  });
});

describe('advancing', () => {
  it('carries the winner up and drops the loser into the losers bracket', () => {
    let bracket = winMatch(fresh(), 'wb0-0', 'a');
    bracket = winMatch(bracket, 'wb0-1', 'a');

    expect(participantsOf(bracket, 'wb1-0')).toEqual([0, 7]);
    // both first-round losers meet in the first losers round
    expect(participantsOf(bracket, 'lb0-0')).toEqual([15, 8]);
    expect(isPlayable(bracket, 'lb0-0')).toBe(true);
  });

  it('pairs winners-bracket drop-ins against losers-bracket survivors in reverse order', () => {
    // lb1-0 takes the winner of lb0-0 and the loser of the last wb1 match
    expect(matchDef('lb1-0').b).toEqual({ from: 'loser', match: 'wb1-3' });
    expect(matchDef('lb1-3').b).toEqual({ from: 'loser', match: 'wb1-0' });
  });

  it('counts losses and eliminates on the second one', () => {
    let bracket = winMatch(fresh(), 'wb0-0', 'a'); // 15 loses once
    expect(lossesOf(bracket, 15)).toBe(1);
    expect(isEliminated(bracket, 15)).toBe(false);

    bracket = winMatch(bracket, 'wb0-1', 'a'); // 8 loses once
    bracket = winMatch(bracket, 'lb0-0', 'a'); // 15 beats 8, so 8 is out
    expect(lossesOf(bracket, 8)).toBe(2);
    expect(isEliminated(bracket, 8)).toBe(true);
    expect(isEliminated(bracket, 15)).toBe(false);
  });

  it('offers a player only the match they can actually play', () => {
    const bracket = winMatch(fresh(), 'wb0-0', 'a');
    expect(playableMatchesFor(bracket, 0)).toEqual([]); // waiting on wb0-1
    expect(playableMatchesFor(bracket, 15)).toEqual([]); // waiting on an opponent too
    expect(playableMatchesFor(bracket, 1)).toEqual(['wb0-7']);
  });
});

describe('a full run', () => {
  it('ends with one champion and everybody else out', () => {
    const done = runFavourites(fresh());

    expect(isFinished(done)).toBe(true);
    expect(championSeed(done)).toBe(0);

    const champion = championSeed(done)!;
    expect(isEliminated(done, champion)).toBe(false);
    for (const entrant of entrants) {
      if (entrant.seed !== champion) expect(isEliminated(done, entrant.seed)).toBe(true);
    }
  });

  it('decides every match and leaves nothing open', () => {
    const done = runFavourites(fresh());
    expect(openMatches(done)).toEqual([]);
    for (const def of MATCH_DEFS) expect(isDecided(done, def.id)).toBe(true);
  });

  it('puts the winners-bracket winner and the losers-bracket winner in the grand final', () => {
    const done = runFavourites(fresh());
    const [a, b] = participantsOf(done, GRAND_FINAL);
    expect(a).toBe(winnerSeed(done, 'wb3-0'));
    expect(b).toBe(winnerSeed(done, 'lb5-0'));
    expect(a).not.toBe(b);
  });

  it('lets a player who lost early still reach the grand final', () => {
    // Seed 15 loses its opener, then wins out through the losers bracket.
    let bracket = winMatch(fresh(), 'wb0-0', 'a');
    for (let i = 1; i < 8; i++) bracket = winMatch(bracket, `wb0-${i}`, 'a');

    // 15 runs the whole losers bracket; everywhere else the favourite wins.
    for (let guard = 0; guard < 200; guard++) {
      const open = openMatches(bracket);
      if (!open.length) break;
      for (const id of open) {
        const [a, b] = participantsOf(bracket, id);
        if (a === 15) bracket = winMatch(bracket, id, 'a');
        else if (b === 15) bracket = winMatch(bracket, id, 'b');
        else bracket = winMatch(bracket, id, (a as number) < (b as number) ? 'a' : 'b');
      }
    }

    expect(lossesOf(bracket, 15)).toBe(1);
    expect(championSeed(bracket)).toBe(15);
  });
});
