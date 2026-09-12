/**
 * A 16-player double-elimination bracket with best-of-three matches.
 *
 * Nothing about who plays whom is stored. The bracket holds the entrants and
 * the games played, and every participant is derived from the results by
 * following the feed rules below. That way a bracket cannot desync from its
 * own results — there is no second copy of the truth to go stale.
 */

export const DE_SIZE = 16;
/** First to this many game wins takes the match. */
export const WINS_PER_MATCH = 2;
/** Questions in one game of a match. */
export const GAME_QUESTIONS = 7;

export type Entrant = {
  /** 0..15, the seed. 0 is the highest rated player in the bracket. */
  seed: number;
  userId: string | null;
  name: string;
  rating: number;
};

/** Where a match's participant comes from. */
export type Slot =
  | { from: 'seed'; seed: number }
  | { from: 'winner'; match: MatchId }
  | { from: 'loser'; match: MatchId };

export type MatchId = string;

export type Bracket = 'wb' | 'lb' | 'gf';

export type MatchDef = {
  id: MatchId;
  bracket: Bracket;
  /** 0-based round within its own bracket. */
  round: number;
  a: Slot;
  b: Slot;
};

/**
 * Standard 16-bracket seeding: the top seed meets the bottom one, and the
 * halves are arranged so the two strongest can only meet in the final.
 */
export const SEED_ORDER = [0, 15, 7, 8, 4, 11, 3, 12, 2, 13, 5, 10, 6, 9, 1, 14];

const wb = (round: number, index: number): MatchId => `wb${round}-${index}`;
const lb = (round: number, index: number): MatchId => `lb${round}-${index}`;
export const GRAND_FINAL: MatchId = 'gf';

function buildDefs(): MatchDef[] {
  const defs: MatchDef[] = [];

  // Winners bracket: 8 -> 4 -> 2 -> 1
  for (let i = 0; i < 8; i++) {
    defs.push({
      id: wb(0, i),
      bracket: 'wb',
      round: 0,
      a: { from: 'seed', seed: SEED_ORDER[i * 2] },
      b: { from: 'seed', seed: SEED_ORDER[i * 2 + 1] },
    });
  }
  for (let round = 1; round <= 3; round++) {
    const count = 8 >> round;
    for (let i = 0; i < count; i++) {
      defs.push({
        id: wb(round, i),
        bracket: 'wb',
        round,
        a: { from: 'winner', match: wb(round - 1, i * 2) },
        b: { from: 'winner', match: wb(round - 1, i * 2 + 1) },
      });
    }
  }

  // Losers bracket. Rounds alternate: one round of survivors playing each
  // other, then a round where players just knocked out of the winners
  // bracket drop in. The drop-ins are paired in reverse order so somebody
  // does not immediately meet the player who just beat them.
  for (let i = 0; i < 4; i++) {
    defs.push({
      id: lb(0, i),
      bracket: 'lb',
      round: 0,
      a: { from: 'loser', match: wb(0, i * 2) },
      b: { from: 'loser', match: wb(0, i * 2 + 1) },
    });
  }
  for (let i = 0; i < 4; i++) {
    defs.push({
      id: lb(1, i),
      bracket: 'lb',
      round: 1,
      a: { from: 'winner', match: lb(0, i) },
      b: { from: 'loser', match: wb(1, 3 - i) },
    });
  }
  for (let i = 0; i < 2; i++) {
    defs.push({
      id: lb(2, i),
      bracket: 'lb',
      round: 2,
      a: { from: 'winner', match: lb(1, i * 2) },
      b: { from: 'winner', match: lb(1, i * 2 + 1) },
    });
  }
  for (let i = 0; i < 2; i++) {
    defs.push({
      id: lb(3, i),
      bracket: 'lb',
      round: 3,
      a: { from: 'winner', match: lb(2, i) },
      b: { from: 'loser', match: wb(2, 1 - i) },
    });
  }
  defs.push({
    id: lb(4, 0),
    bracket: 'lb',
    round: 4,
    a: { from: 'winner', match: lb(3, 0) },
    b: { from: 'winner', match: lb(3, 1) },
  });
  defs.push({
    id: lb(5, 0),
    bracket: 'lb',
    round: 5,
    a: { from: 'winner', match: lb(4, 0) },
    b: { from: 'loser', match: wb(3, 0) },
  });

  defs.push({
    id: GRAND_FINAL,
    bracket: 'gf',
    round: 0,
    a: { from: 'winner', match: wb(3, 0) },
    b: { from: 'winner', match: lb(5, 0) },
  });

  return defs;
}

export const MATCH_DEFS: MatchDef[] = buildDefs();

const DEF_BY_ID = new Map(MATCH_DEFS.map((d) => [d.id, d]));

export function matchDef(id: MatchId): MatchDef {
  const def = DEF_BY_ID.get(id);
  if (!def) throw new Error(`unknown match: ${id}`);
  return def;
}

/** One game of a match: which side won, and the question scores behind it. */
export type Game = { winner: 'a' | 'b'; scoreA: number; scoreB: number };

export type DeBracket = {
  entrants: Entrant[];
  /** Games played, per match. A match is decided once a side reaches WINS_PER_MATCH. */
  games: Record<MatchId, Game[]>;
};

export function createDeBracket(entrants: Entrant[]): DeBracket {
  if (entrants.length !== DE_SIZE) {
    throw new Error(`a double-elimination bracket needs exactly ${DE_SIZE} entrants, got ${entrants.length}`);
  }
  return { entrants, games: {} };
}

export function gamesOf(bracket: DeBracket, id: MatchId): Game[] {
  return bracket.games[id] ?? [];
}

export function winsOf(bracket: DeBracket, id: MatchId): [number, number] {
  const games = gamesOf(bracket, id);
  return [games.filter((g) => g.winner === 'a').length, games.filter((g) => g.winner === 'b').length];
}

export function isDecided(bracket: DeBracket, id: MatchId): boolean {
  const [a, b] = winsOf(bracket, id);
  return a >= WINS_PER_MATCH || b >= WINS_PER_MATCH;
}

/** Which side took the match, or null while it is still open. */
export function decidedSide(bracket: DeBracket, id: MatchId): 'a' | 'b' | null {
  const [a, b] = winsOf(bracket, id);
  if (a >= WINS_PER_MATCH) return 'a';
  if (b >= WINS_PER_MATCH) return 'b';
  return null;
}

/** The seed filling a slot, or null while whatever feeds it is undecided. */
export function resolveSlot(bracket: DeBracket, slot: Slot): number | null {
  if (slot.from === 'seed') return slot.seed;
  const side = decidedSide(bracket, slot.match);
  if (!side) return null;
  const def = matchDef(slot.match);
  const winner = side === 'a' ? def.a : def.b;
  const loser = side === 'a' ? def.b : def.a;
  return resolveSlot(bracket, slot.from === 'winner' ? winner : loser);
}

export function participantsOf(bracket: DeBracket, id: MatchId): [number | null, number | null] {
  const def = matchDef(id);
  return [resolveSlot(bracket, def.a), resolveSlot(bracket, def.b)];
}

export function winnerSeed(bracket: DeBracket, id: MatchId): number | null {
  const side = decidedSide(bracket, id);
  if (!side) return null;
  const [a, b] = participantsOf(bracket, id);
  return side === 'a' ? a : b;
}

export function loserSeed(bracket: DeBracket, id: MatchId): number | null {
  const side = decidedSide(bracket, id);
  if (!side) return null;
  const [a, b] = participantsOf(bracket, id);
  return side === 'a' ? b : a;
}

/** A match is ready once both participants are known and it is not over. */
export function isPlayable(bracket: DeBracket, id: MatchId): boolean {
  const [a, b] = participantsOf(bracket, id);
  return a !== null && b !== null && !isDecided(bracket, id);
}

/** Records one game. The side is whoever won that game, not the match. */
export function reportGame(bracket: DeBracket, id: MatchId, game: Game): DeBracket {
  if (isDecided(bracket, id)) return bracket;
  const [a, b] = participantsOf(bracket, id);
  if (a === null || b === null) throw new Error(`match ${id} has no participants yet`);
  return { ...bracket, games: { ...bracket.games, [id]: [...gamesOf(bracket, id), game] } };
}

export const CHAMPION_MATCH = GRAND_FINAL;

export function championSeed(bracket: DeBracket): number | null {
  return winnerSeed(bracket, GRAND_FINAL);
}

/** How many losses a seed has taken. Two and they are out. */
export function lossesOf(bracket: DeBracket, seed: number): number {
  return MATCH_DEFS.filter((d) => loserSeed(bracket, d.id) === seed).length;
}

export function isEliminated(bracket: DeBracket, seed: number): boolean {
  return lossesOf(bracket, seed) >= 2;
}

/** Every match a seed is in that can be played right now. */
export function playableMatchesFor(bracket: DeBracket, seed: number): MatchId[] {
  return MATCH_DEFS.filter((d) => {
    if (!isPlayable(bracket, d.id)) return false;
    const [a, b] = participantsOf(bracket, d.id);
    return a === seed || b === seed;
  }).map((d) => d.id);
}

/** Matches that can be played right now, for the round the bracket is on. */
export function openMatches(bracket: DeBracket): MatchId[] {
  return MATCH_DEFS.filter((d) => isPlayable(bracket, d.id)).map((d) => d.id);
}

export function isFinished(bracket: DeBracket): boolean {
  return isDecided(bracket, GRAND_FINAL);
}
