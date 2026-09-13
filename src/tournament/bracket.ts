import { seededRng } from '../quiz/generateQuiz';

export const TOURNAMENT_SIZE = 32;
/** 32 -> 16 -> 8 -> 4 -> 2 -> 1 */
export const TOURNAMENT_ROUNDS = 5;
/** Questions in one tournament match. Short on purpose: five of these back to back is a long session already. */
export const MATCH_QUESTIONS = 7;

/** Where a seat's occupant came from. Real players fill seats first; bots take what is left. */
export type SeatKind = 'me' | 'player' | 'bot';

export type Seat = {
  /** 0..31 — the position in the bracket, fixed for the whole tournament. */
  seat: number;
  name: string;
  kind: SeatKind;
  /**
   * 0..1, how often this opponent answers correctly. Only meaningful for
   * bots; a seat played by a person scores whatever they actually score.
   */
  skill: number;
};

export type Match = {
  round: number;
  /** Position within the round: round r holds 16 >> r matches. */
  index: number;
  seatA: number | null;
  seatB: number | null;
  scoreA: number | null;
  scoreB: number | null;
  winner: number | null;
};

export type Bracket = {
  seats: Seat[];
  matches: Match[];
  /** The round being played now; equals TOURNAMENT_ROUNDS once it is over. */
  round: number;
  /** Seat that won the whole thing, or null while it is still running. */
  championSeat: number | null;
  /** Round the player went out in, or null while they are still alive. */
  myExitRound: number | null;
  seed: number;
};

export function matchesInRound(round: number): number {
  return (TOURNAMENT_SIZE >> round) / 2;
}

export function findMatch(bracket: Bracket, round: number, index: number): Match | undefined {
  return bracket.matches.find((m) => m.round === round && m.index === index);
}

export function seatOf(bracket: Bracket, seat: number | null): Seat | null {
  return seat === null ? null : bracket.seats[seat] ?? null;
}

export function mySeat(bracket: Bracket): number {
  return bracket.seats.findIndex((s) => s.kind === 'me');
}

/** The player's match in the current round, or null once they are out or the tournament is over. */
export function myMatch(bracket: Bracket): Match | null {
  if (bracket.round >= TOURNAMENT_ROUNDS) return null;
  const me = mySeat(bracket);
  return (
    bracket.matches.find((m) => m.round === bracket.round && (m.seatA === me || m.seatB === me)) ?? null
  );
}

export function opponentSeat(match: Match, me: number): number | null {
  if (match.seatA === me) return match.seatB;
  if (match.seatB === me) return match.seatA;
  return null;
}

/** Builds the first round by pairing neighbouring seats: 0v1, 2v3, and so on. */
export function createBracket(seats: Seat[], seed: number): Bracket {
  if (seats.length !== TOURNAMENT_SIZE) {
    throw new Error(`a bracket needs exactly ${TOURNAMENT_SIZE} seats, got ${seats.length}`);
  }

  const matches: Match[] = [];
  for (let round = 0; round < TOURNAMENT_ROUNDS; round++) {
    for (let index = 0; index < matchesInRound(round); index++) {
      matches.push({
        round,
        index,
        seatA: round === 0 ? index * 2 : null,
        seatB: round === 0 ? index * 2 + 1 : null,
        scoreA: null,
        scoreB: null,
        winner: null,
      });
    }
  }

  return { seats, matches, round: 0, championSeat: null, myExitRound: null, seed };
}

/** Draws a plausible score for a bot: skill shifts how often it gets a question right. */
export function rollBotScore(skill: number, questions: number, rng: () => number): number {
  const p = 0.32 + 0.58 * Math.max(0, Math.min(1, skill));
  let score = 0;
  for (let i = 0; i < questions; i++) {
    if (rng() < p) score++;
  }
  return score;
}

/**
 * Records the player's score for their match, plays out every other match in
 * the round, and moves the winners into the next one.
 *
 * A draw goes to the player. Two bots drawing is broken by skill, then by the
 * rng, so a round always produces exactly one winner per match.
 */
export function resolveRound(bracket: Bracket, myScore: number | null): Bracket {
  if (bracket.round >= TOURNAMENT_ROUNDS) return bracket;

  const rng = seededRng(bracket.seed + bracket.round * 7919);
  const me = mySeat(bracket);
  const matches = bracket.matches.map((m) => ({ ...m }));
  const current = matches.filter((m) => m.round === bracket.round);

  for (const match of current) {
    const a = bracket.seats[match.seatA!];
    const b = bracket.seats[match.seatB!];
    const iPlay = match.seatA === me || match.seatB === me;

    const scoreA = a.kind === 'me' ? myScore ?? 0 : rollBotScore(a.skill, MATCH_QUESTIONS, rng);
    const scoreB = b.kind === 'me' ? myScore ?? 0 : rollBotScore(b.skill, MATCH_QUESTIONS, rng);

    match.scoreA = scoreA;
    match.scoreB = scoreB;

    if (scoreA !== scoreB) {
      match.winner = scoreA > scoreB ? match.seatA : match.seatB;
    } else if (iPlay) {
      match.winner = me;
    } else if (a.skill !== b.skill) {
      match.winner = a.skill > b.skill ? match.seatA : match.seatB;
    } else {
      match.winner = rng() < 0.5 ? match.seatA : match.seatB;
    }
  }

  const nextRound = bracket.round + 1;
  if (nextRound < TOURNAMENT_ROUNDS) {
    for (const match of matches.filter((m) => m.round === nextRound)) {
      match.seatA = current.find((m) => m.index === match.index * 2)!.winner;
      match.seatB = current.find((m) => m.index === match.index * 2 + 1)!.winner;
    }
  }

  const myMatchNow = current.find((m) => m.seatA === me || m.seatB === me);
  const wentOut = myMatchNow && myMatchNow.winner !== me;

  return {
    ...bracket,
    matches,
    round: nextRound,
    championSeat: nextRound === TOURNAMENT_ROUNDS ? current[0].winner : null,
    myExitRound: bracket.myExitRound ?? (wentOut ? bracket.round : null),
  };
}

/** Seats still in it at the start of the given round. */
export function survivorsAt(bracket: Bracket, round: number): number {
  return TOURNAMENT_SIZE >> Math.min(round, TOURNAMENT_ROUNDS);
}

export function isMyTournamentOver(bracket: Bracket): boolean {
  return bracket.myExitRound !== null || bracket.round >= TOURNAMENT_ROUNDS;
}
