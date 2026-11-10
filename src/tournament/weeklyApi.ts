import { supabase, isSupabaseConfigured } from '../auth/supabaseClient';
import { DE_SIZE, DeBracket, Entrant, Game, MatchId } from './doubleElim';
import { reasonOf } from '../auth/functionReason';
import { TOURNAMENT_KEY_VERSION } from './keyVersion';

export type WeeklyStatus = 'registration' | 'seeding' | 'running' | 'finished';

export type ServerEntrant = { seed: number; name: string; rating: number; isBot: boolean; isMe: boolean };

export type ServerGame = {
  match_id: MatchId;
  game_no: number;
  score_a: number | null;
  score_b: number | null;
  submitted_a: string | null;
  submitted_b: string | null;
  winner: 'a' | 'b' | null;
  deadline: string | null;
};

export type WeeklyState = {
  tournament: {
    id: string;
    weekStart: string;
    status: WeeklyStatus;
    startsAt: string;
    championUserId: string | null;
  };
  entrants: ServerEntrant[];
  games: ServerGame[];
  registeredCount: number;
  amRegistered: boolean;
  mySeat: number | null;
  size: number;
  winsPerMatch: number;
  gameQuestions: number;
};

export const canPlayWeekly = isSupabaseConfigured;

/** A refusal the function gave by name, so the screen can say what it was. */
export class WeeklyError extends Error {
  constructor(public reason: string) {
    super(reason);
  }
}

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase!.functions.invoke('tournament', { body });
  if (error) throw new WeeklyError(await reasonOf(error));
  if (data?.error) throw new WeeklyError(String(data.error));
  return data as T;
}

const call = (body: Record<string, unknown>) => invoke<WeeklyState>(body);

/**
 * A dealt game: the seed of the one quiz whose answers the server will
 * accept for it, and the answer key that quiz has to agree with.
 */
export type GameTicket = { seed: number; keyVersion: string; attemptsLeft: number };

/**
 * Asks the server to deal the game. The app no longer makes up its own
 * tournament quiz: it plays the one this seed produces, and the server —
 * which holds the answers to it — does the marking.
 */
export async function startGame(matchId: MatchId): Promise<GameTicket> {
  const { ticket } = await invoke<{ ticket: GameTicket }>({ action: 'start', matchId });
  return ticket;
}

/** True when this build's generator produces the quiz the server will mark. */
export function canPlayTicket(ticket: GameTicket): boolean {
  return ticket.keyVersion === TOURNAMENT_KEY_VERSION;
}

export const fetchWeekly = () => call({ action: 'state' });

/**
 * The tournament before this one, or null when there has not been one.
 *
 * Same shape as the live state, so everything that reads a tournament —
 * the bracket, the list of players, who finished where — works on it
 * unchanged.
 */
export async function fetchPreviousWeekly(): Promise<WeeklyState | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.functions.invoke('tournament', { body: { action: 'previous' } });
  if (error) throw new Error(error.message);
  if (!data || (data as { error?: string }).error) return null;
  return data as WeeklyState;
}

export const registerForWeekly = () => call({ action: 'register' });
export const unregisterFromWeekly = () => call({ action: 'unregister' });
/**
 * Hands a played game in: which option was tapped on each question, -1
 * where the clock ran out. Not the score — that is the server's to work
 * out, which is the whole point.
 */
export const submitGamePicks = (matchId: MatchId, picks: number[]) =>
  call({ action: 'submit', matchId, picks, keyVersion: TOURNAMENT_KEY_VERSION });

/**
 * Turns the server's rows into the bracket the engine understands, so every
 * derived question — who plays whom, who is out, who is champion — is answered
 * by the same tested code on both sides.
 */
export function toDeBracket(state: WeeklyState): DeBracket | null {
  if (state.entrants.length !== DE_SIZE) return null;

  const entrants: Entrant[] = state.entrants.map((e) => ({
    seed: e.seed,
    // The server never sends anybody else's id; only the caller's own seat is
    // identified, which is all the app needs.
    userId: e.isMe ? 'me' : e.isBot ? null : 'player',
    name: e.name,
    rating: e.rating,
  }));

  const games: Record<MatchId, Game[]> = {};
  for (const row of [...state.games].sort((x, y) => x.game_no - y.game_no)) {
    if (!row.winner) continue;
    const list = games[row.match_id] ?? [];
    list.push({ winner: row.winner, scoreA: row.score_a ?? 0, scoreB: row.score_b ?? 0 });
    games[row.match_id] = list;
  }

  return { entrants, games };
}

/** The game currently open in a match, if the server has one waiting. */
export function openGameOf(state: WeeklyState, matchId: MatchId): ServerGame | null {
  return state.games.find((g) => g.match_id === matchId && g.winner === null) ?? null;
}

/** Whether the caller has already handed a score in for the open game. */
export function hasSubmitted(state: WeeklyState, matchId: MatchId, side: 'a' | 'b'): boolean {
  const open = openGameOf(state, matchId);
  if (!open) return false;
  return (side === 'a' ? open.score_a : open.score_b) !== null;
}

export function secondsUntil(iso: string): number {
  return Math.max(0, Math.ceil((Date.parse(iso) - Date.now()) / 1000));
}
