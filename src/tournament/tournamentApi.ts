import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import {
  Bracket,
  Match,
  Seat,
  TOURNAMENT_ROUNDS,
  TOURNAMENT_SIZE,
  matchesInRound,
} from './bracket';

export type ServerSeat = { seat: number; name: string; skill: number; isPlayer: boolean; isMe: boolean };

export type ServerMatch = {
  round: number;
  idx: number;
  seat_a: number | null;
  seat_b: number | null;
  score_a: number | null;
  score_b: number | null;
  winner_seat: number | null;
  deadline: string | null;
};

export type ServerTournament = {
  id: string;
  status: 'lobby' | 'running' | 'finished';
  round: number;
  champion_seat: number | null;
  starts_at: string;
};

export type ServerState = {
  tournament: ServerTournament | null;
  seats: ServerSeat[];
  matches: ServerMatch[];
  mySeat: number | null;
  lobbySeconds: number;
};

export const canPlayOnline = isSupabaseConfigured;

async function call(body: Record<string, unknown>): Promise<ServerState> {
  const { data, error } = await supabase!.functions.invoke('tournament', { body });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(String(data.error));
  return data as ServerState;
}

/** The tournament the player is already in, if any — opening the screen must not enrol them. */
export function resumeTournament(): Promise<ServerState> {
  return call({ action: 'resume' });
}

/** Takes a seat in the lobby that is open right now, opening one if there is none. */
export function joinTournament(): Promise<ServerState> {
  return call({ action: 'join' });
}

export function fetchTournament(tournamentId: string): Promise<ServerState> {
  return call({ action: 'state', tournamentId });
}

export function submitMatchScore(tournamentId: string, score: number): Promise<ServerState> {
  return call({ action: 'submit', tournamentId, score });
}

/**
 * Turns the server's rows into the same Bracket the offline run uses, so
 * every screen — the path list, the results, the medals — works the same
 * either way. Rounds the server has not drawn yet come back as empty
 * matches, exactly as createBracket leaves them.
 */
export function toBracket(state: ServerState): Bracket | null {
  if (!state.tournament || state.seats.length !== TOURNAMENT_SIZE) return null;

  const seats: Seat[] = state.seats.map((s) => ({
    seat: s.seat,
    name: s.name,
    kind: s.isMe ? 'me' : s.isPlayer ? 'player' : 'bot',
    skill: s.skill,
  }));

  const byKey = new Map(state.matches.map((m) => [`${m.round}:${m.idx}`, m]));
  const matches: Match[] = [];
  for (let round = 0; round < TOURNAMENT_ROUNDS; round++) {
    for (let idx = 0; idx < matchesInRound(round); idx++) {
      const row = byKey.get(`${round}:${idx}`);
      matches.push({
        round,
        index: idx,
        seatA: row?.seat_a ?? null,
        seatB: row?.seat_b ?? null,
        scoreA: row?.score_a ?? null,
        scoreB: row?.score_b ?? null,
        winner: row?.winner_seat ?? null,
      });
    }
  }

  const me = seats.findIndex((s) => s.kind === 'me');
  const exit = matches.find((m) => m.winner !== null && (m.seatA === me || m.seatB === me) && m.winner !== me);

  return {
    seats,
    matches,
    round: state.tournament.round,
    championSeat: state.tournament.champion_seat,
    myExitRound: exit ? exit.round : null,
    seed: 0,
  };
}

/** Seconds left before the lobby closes and the bracket is sealed. */
export function lobbySecondsLeft(tournament: ServerTournament): number {
  return Math.max(0, Math.ceil((Date.parse(tournament.starts_at) - Date.now()) / 1000));
}
