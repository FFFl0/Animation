// Supabase Edge Function: the weekly 16-player double-elimination tournament.
//
// Registration runs all week and closes when the tournament starts at the
// weekend; if more than sixteen have signed up, the highest rated get in.
// Every write happens here with the service role, never from a client: seeds,
// pairings and game results decide who advances.
//
// The bracket rules below mirror src/tournament/doubleElim.ts, which is the
// readable source of truth for them and is the one covered by tests. Keep the
// two in step: the feed table and the resolve logic must match exactly.
//
// Deploy with: supabase functions deploy tournament
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY come from the
// runtime.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { ANSWER_KEY, KEY_POOL, KEY_QUESTIONS, KEY_VERSION } from '../_shared/tournamentKey.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-tournament-tick',
};

const SIZE = 16;
const WINS_PER_MATCH = 2;
const GAME_QUESTIONS = 7;
/** Day of the week the tournament starts on, 0 = Sunday. */
const START_WEEKDAY = 6;
const START_HOUR_UTC = 15;
/** How long a player has to hand in a score before the game is decided without them. */
const GAME_DEADLINE_MINUTES = 90;

/**
 * How many times one game may be started. Each start deals a fresh quiz,
 * so without a limit a player could look at the first question, leave, and
 * come back for an easier hand until one suited them. Three leaves room for
 * a crash or a dropped call without making re-rolling a strategy.
 */
const MAX_ATTEMPTS = 3;

/**
 * The window a dealt quiz may be handed in within.
 *
 * The floor is a tripwire, not a wall: seven questions cannot be read and
 * answered in four seconds by a person, so anything faster is a script —
 * though a script that waits walks straight past it. The ceiling is the
 * useful one: the clock in the app stops when the app is put away, and ten
 * minutes for a hundred seconds of questions is as long as that pause can
 * be stretched.
 */
// The key is cut for a game of exactly this length. If the two ever part
// company every game would be marked against the wrong digits, so the
// function refuses to start at all rather than do that quietly.
if (KEY_QUESTIONS !== GAME_QUESTIONS) {
  throw new Error(`answer key is for ${KEY_QUESTIONS}-question games, the tournament plays ${GAME_QUESTIONS}`);
}

const MIN_GAME_MS = 4_000;
const MAX_GAME_MS = 10 * 60_000;

const BOT_NAMES = [
  'Kenshin', 'SakuraFan', 'ShonenKing', 'OtakuNo1', 'RamenLover', 'BlueExorcist',
  'NekoChan', 'ZeroTwo', 'SenpaiX', 'MangaAddict', 'TitanSlayer', 'HokageDream',
  'StrawHatJoe', 'CursedEnergy', 'DemonBlade', 'PlusUltra', 'SoulReaper', 'AlchemyFan',
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------- bracket

type Slot = { from: 'seed'; seed: number } | { from: 'winner' | 'loser'; match: string };
type MatchDef = { id: string; bracket: 'wb' | 'lb' | 'gf'; round: number; a: Slot; b: Slot };

const SEED_ORDER = [0, 15, 7, 8, 4, 11, 3, 12, 2, 13, 5, 10, 6, 9, 1, 14];

function buildDefs(): MatchDef[] {
  const wb = (r: number, i: number) => `wb${r}-${i}`;
  const lb = (r: number, i: number) => `lb${r}-${i}`;
  const defs: MatchDef[] = [];

  for (let i = 0; i < 8; i++) {
    defs.push({
      id: wb(0, i), bracket: 'wb', round: 0,
      a: { from: 'seed', seed: SEED_ORDER[i * 2] },
      b: { from: 'seed', seed: SEED_ORDER[i * 2 + 1] },
    });
  }
  for (let round = 1; round <= 3; round++) {
    for (let i = 0; i < 8 >> round; i++) {
      defs.push({
        id: wb(round, i), bracket: 'wb', round,
        a: { from: 'winner', match: wb(round - 1, i * 2) },
        b: { from: 'winner', match: wb(round - 1, i * 2 + 1) },
      });
    }
  }
  for (let i = 0; i < 4; i++) {
    defs.push({
      id: lb(0, i), bracket: 'lb', round: 0,
      a: { from: 'loser', match: wb(0, i * 2) },
      b: { from: 'loser', match: wb(0, i * 2 + 1) },
    });
  }
  for (let i = 0; i < 4; i++) {
    defs.push({
      id: lb(1, i), bracket: 'lb', round: 1,
      a: { from: 'winner', match: lb(0, i) },
      b: { from: 'loser', match: wb(1, 3 - i) },
    });
  }
  for (let i = 0; i < 2; i++) {
    defs.push({
      id: lb(2, i), bracket: 'lb', round: 2,
      a: { from: 'winner', match: lb(1, i * 2) },
      b: { from: 'winner', match: lb(1, i * 2 + 1) },
    });
  }
  for (let i = 0; i < 2; i++) {
    defs.push({
      id: lb(3, i), bracket: 'lb', round: 3,
      a: { from: 'winner', match: lb(2, i) },
      b: { from: 'loser', match: wb(2, 1 - i) },
    });
  }
  defs.push({ id: lb(4, 0), bracket: 'lb', round: 4, a: { from: 'winner', match: lb(3, 0) }, b: { from: 'winner', match: lb(3, 1) } });
  defs.push({ id: lb(5, 0), bracket: 'lb', round: 5, a: { from: 'winner', match: lb(4, 0) }, b: { from: 'loser', match: wb(3, 0) } });
  defs.push({ id: 'gf', bracket: 'gf', round: 0, a: { from: 'winner', match: wb(3, 0) }, b: { from: 'winner', match: lb(5, 0) } });
  return defs;
}

const MATCH_DEFS = buildDefs();
const DEF_BY_ID = new Map(MATCH_DEFS.map((d) => [d.id, d]));

/** Mirrors MEDAL_POINTS in src/shop/economy.ts. */
const MEDAL_POINTS: Record<string, number> = { gold: 75, silver: 30, bronze: 10 };

/**
 * Where each exit lands in the final standings, derived from the bracket the
 * same way src/tournament/medals.ts derives it: the losers-bracket final is
 * third, and every round before it is worth however many players are knocked
 * out after it. Losing in the winners bracket is a drop, not an exit.
 */
const PLACE_BY_EXIT: Record<string, number> = (() => {
  const rounds = [...new Set(MATCH_DEFS.filter((d) => d.bracket === 'lb').map((d) => d.round))].sort((a, b) => b - a);
  const places: Record<string, number> = { gf: 2 };
  let knockedOutLater = 0;
  for (const round of rounds) {
    const matches = MATCH_DEFS.filter((d) => d.bracket === 'lb' && d.round === round);
    for (const def of matches) places[def.id] = 3 + knockedOutLater;
    knockedOutLater += matches.length;
  }
  return places;
})();

function medalForPlace(place: number): string | null {
  if (place === 1) return 'gold';
  if (place === 2) return 'silver';
  if (place === 3) return 'bronze';
  return null;
}

type GameRow = {
  match_id: string;
  game_no: number;
  score_a: number | null;
  score_b: number | null;
  submitted_a: string | null;
  submitted_b: string | null;
  winner: 'a' | 'b' | null;
  deadline: string | null;
};

/** Reads the bracket out of the game rows, exactly as the client engine does. */
class Bracket {
  private byMatch = new Map<string, GameRow[]>();

  constructor(rows: GameRow[]) {
    for (const row of rows) {
      const list = this.byMatch.get(row.match_id) ?? [];
      list.push(row);
      this.byMatch.set(row.match_id, list);
    }
    for (const list of this.byMatch.values()) list.sort((x, y) => x.game_no - y.game_no);
  }

  games(id: string): GameRow[] {
    return this.byMatch.get(id) ?? [];
  }

  wins(id: string): [number, number] {
    const decided = this.games(id).filter((g) => g.winner !== null);
    return [decided.filter((g) => g.winner === 'a').length, decided.filter((g) => g.winner === 'b').length];
  }

  decidedSide(id: string): 'a' | 'b' | null {
    const [a, b] = this.wins(id);
    if (a >= WINS_PER_MATCH) return 'a';
    if (b >= WINS_PER_MATCH) return 'b';
    return null;
  }

  resolveSlot(slot: Slot): number | null {
    if (slot.from === 'seed') return slot.seed;
    const side = this.decidedSide(slot.match);
    if (!side) return null;
    const def = DEF_BY_ID.get(slot.match)!;
    const winner = side === 'a' ? def.a : def.b;
    const loser = side === 'a' ? def.b : def.a;
    return this.resolveSlot(slot.from === 'winner' ? winner : loser);
  }

  participants(id: string): [number | null, number | null] {
    const def = DEF_BY_ID.get(id)!;
    return [this.resolveSlot(def.a), this.resolveSlot(def.b)];
  }

  isPlayable(id: string): boolean {
    const [a, b] = this.participants(id);
    return a !== null && b !== null && this.decidedSide(id) === null;
  }

  /** The seed that lost a decided match, or null while it is still open. */
  loserSeed(id: string): number | null {
    const side = this.decidedSide(id);
    if (!side) return null;
    const [a, b] = this.participants(id);
    return side === 'a' ? b : a;
  }

  /** The game currently being played in a match, if any. */
  openGame(id: string): GameRow | null {
    return this.games(id).find((g) => g.winner === null) ?? null;
  }

  nextGameNo(id: string): number {
    return this.games(id).length + 1;
  }
}

// ---------------------------------------------------------------- schedule

/** Midnight UTC on the Monday of the week the given moment falls in. */
function weekStart(now: Date): string {
  const day = now.getUTCDay();
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() - ((day + 6) % 7));
  return monday.toISOString().slice(0, 10);
}

/** When the tournament of a given week starts: the weekend, at a fixed hour. */
function startsAt(weekStartDate: string): string {
  const monday = new Date(`${weekStartDate}T00:00:00Z`);
  monday.setUTCDate(monday.getUTCDate() + ((START_WEEKDAY + 6) % 7));
  monday.setUTCHours(START_HOUR_UTC, 0, 0, 0);
  return monday.toISOString();
}

function rollBotScore(rating: number, rng: () => number): number {
  // A bot's rating stands in for its skill: the pool spans 200..1000.
  const skill = Math.max(0, Math.min(1, (rating - 200) / 800));
  const p = 0.32 + 0.58 * skill;
  let score = 0;
  for (let i = 0; i < GAME_QUESTIONS; i++) if (rng() < p) score++;
  return score;
}

function seededRng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------- lifecycle

type TournamentRow = {
  id: string;
  week_start: string;
  status: string;
  starts_at: string;
  champion_user_id: string | null;
};

/**
 * The two moments in a tournament's week worth waking somebody's phone for.
 *
 * Both are sent from here because this is where the week turns: the row for
 * a new week is inserted in one place and the bracket is closed in another,
 * and each of those is already guarded against happening twice. Announcing
 * them anywhere else would mean working out, after the fact, whether the
 * announcement had already gone.
 */
const SIGNUPS_OPEN: PushCopy = {
  ru: { title: 'Открылась запись на турнир', body: 'Новый недельный турнир — занимайте место в сетке' },
  en: { title: 'Tournament sign-ups are open', body: 'A new weekly tournament — take your seat in the bracket' },
};

const TOURNAMENT_STARTED: PushCopy = {
  ru: { title: 'Турнир начался', body: 'Сетка собрана — ваш первый матч уже ждёт' },
  en: { title: 'The tournament has started', body: 'The bracket is set — your first match is waiting' },
};

/** The tournament for this week, opening registration for it if it is new.
 * `opened` is true only for the caller that inserted the row, which is the
 * one that gets to announce it. */
async function ensureWeek(admin: SupabaseClient): Promise<{ tournament: TournamentRow; opened: boolean }> {
  const week = weekStart(new Date());
  const { data: existing } = await admin
    .from('weekly_tournaments')
    .select('*')
    .eq('week_start', week)
    .maybeSingle();
  if (existing) return { tournament: existing as TournamentRow, opened: false };

  const { data: created } = await admin
    .from('weekly_tournaments')
    .insert({ week_start: week, starts_at: startsAt(week) })
    .select('*')
    .maybeSingle();
  if (created) return { tournament: created as TournamentRow, opened: true };

  // Somebody else opened it in between, which is fine — and it is their
  // call that announces it, not this one.
  const { data: raced } = await admin
    .from('weekly_tournaments')
    .select('*')
    .eq('week_start', week)
    .single();
  return { tournament: raced as TournamentRow, opened: false };
}

type Entrant = { seed: number; user_id: string | null; name: string; rating: number };

/*
 * What a seat is decided on, and how far it can be trusted.
 *
 * The number comes from `stats`, and `stats` is written by the player's own
 * app — the server cannot check an ordinary round, because ordinary rounds
 * are played on the phone, offline if need be. So it cannot be made true;
 * what it can be made is *bounded*. Every record is held to the length of
 * the round it claims to be from, and only the categories and tiers that
 * exist are counted, so a forged profile can at most look like a player who
 * has perfected everything — it cannot outrank one, and inventing a
 * thousand categories of fifteen points each buys nothing.
 *
 * Both lists mirror the app (src/data/categories.ts, src/data/difficulty.ts,
 * src/data/modes.ts) and a test keeps them in step.
 */
// SEATING-BEGIN
const CATEGORY_IDS = ['anime', 'characters', 'openings', 'quotes', 'battles', 'world', 'hard', 'mixed'];
const TIER_LENGTH: Record<string, number> = { novice: 6, fan: 8, otaku: 10, expert: 12, legend: 15 };
const MAX_ROUND = 30;
// SEATING-END

function boundedBest(stats: Record<string, unknown>, key: string, cap: number): number {
  const best = Number((stats[key] as { bestScore?: unknown } | undefined)?.bestScore);
  return Number.isFinite(best) ? Math.max(0, Math.min(cap, Math.floor(best))) : 0;
}

function seatingScore(stats: unknown): number {
  if (!stats || typeof stats !== 'object') return 0;
  const record = stats as Record<string, unknown>;
  let total = 0;
  for (const category of CATEGORY_IDS) {
    // A round played outside the ladder — a mode — is banked under the bare
    // category, and the longest of those is MAX_ROUND questions.
    total += boundedBest(record, `cat:${category}`, MAX_ROUND);
    for (const [tier, length] of Object.entries(TIER_LENGTH)) {
      total += boundedBest(record, `cat:${category}:${tier}`, length);
    }
  }
  return total;
}

/**
 * Closes registration and fixes the bracket: the highest rated sixteen who
 * signed up take the seats, and bots fill whatever is left so a quiet week
 * still runs. Seeded by rating, so the top seed meets the bottom one.
 */
async function seedBracket(admin: SupabaseClient, tournament: TournamentRow): Promise<void> {
  const { data: claimed } = await admin
    .from('weekly_tournaments')
    .update({ status: 'seeding' })
    .eq('id', tournament.id)
    .eq('status', 'registration')
    .select('id');
  if (!claimed?.length) return;

  const { data: signups } = await admin
    .from('tournament_registrations')
    .select('user_id, registered_at')
    .eq('tournament_id', tournament.id)
    .order('registered_at');

  const ids = ((signups ?? []) as { user_id: string }[]).map((r) => r.user_id);
  let rated: { user_id: string; name: string; rating: number }[] = [];
  if (ids.length) {
    const { data: rows } = await admin
      .from('leaderboard')
      .select('id, username, stats')
      .in('id', ids);
    rated = ((rows ?? []) as { id: string; username: string; stats: unknown }[]).map((r) => ({
      user_id: r.id,
      name: r.username,
      // Counted here, bounded, rather than read as the view's own sum —
      // see seatingScore for why that sum cannot be taken at its word.
      rating: seatingScore(r.stats),
    }));
  }

  // Highest rating first; an earlier signup breaks a tie.
  rated.sort((x, y) => y.rating - x.rating || ids.indexOf(x.user_id) - ids.indexOf(y.user_id));
  const humans = rated.slice(0, SIZE);

  const rng = seededRng(Date.parse(tournament.starts_at) | 0);
  const names = [...BOT_NAMES];
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }

  const botCount = SIZE - humans.length;
  const bots = Array.from({ length: botCount }, (_, i) => ({
    user_id: null,
    name: names[i % names.length],
    rating: Math.round(200 + rng() * 600),
  }));

  const pool = [...humans, ...bots].sort((x, y) => y.rating - x.rating);
  const entrants: Entrant[] = pool.map((entry, seed) => ({ seed, ...entry }));

  await admin
    .from('tournament_entrants')
    .upsert(
      entrants.map((e) => ({ tournament_id: tournament.id, ...e })),
      { onConflict: 'tournament_id,seed', ignoreDuplicates: true }
    );
  await admin.from('weekly_tournaments').update({ status: 'running' }).eq('id', tournament.id);

  // Only the people in it, and only the people: a bot has no phone, and
  // somebody who registered after the sixteen seats were taken has no
  // tournament to be told about.
  const playing = entrants.map((e) => e.user_id).filter((id): id is string => !!id);
  if (playing.length > 0) {
    await pushToTokens(admin, await tokensFor(admin, playing), TOURNAMENT_STARTED, { kind: 'tournamentStarted' });
  }
}

/** Picks a bracket back up if seeding was claimed but never finished. */
async function recoverSeeding(admin: SupabaseClient, id: string): Promise<void> {
  const { data } = await admin.from('weekly_tournaments').select('status').eq('id', id).single();
  if (data?.status !== 'seeding') return;
  const { count } = await admin
    .from('tournament_entrants')
    .select('seed', { count: 'exact', head: true })
    .eq('tournament_id', id);
  await admin
    .from('weekly_tournaments')
    .update({ status: (count ?? 0) === SIZE ? 'running' : 'registration' })
    .eq('id', id)
    .eq('status', 'seeding');
}

/**
 * Decides whatever can be decided and opens whatever is next: a game both
 * sides have handed in, a game past its deadline, a bot's game (rolled on the
 * spot), and the first game of every match that just became playable.
 */
async function settle(admin: SupabaseClient, tournament: TournamentRow): Promise<void> {
  const { data: entrantRows } = await admin
    .from('tournament_entrants')
    .select('seed, user_id, name, rating')
    .eq('tournament_id', tournament.id);
  const entrants = new Map<number, Entrant>(((entrantRows ?? []) as Entrant[]).map((e) => [e.seed, e]));
  if (entrants.size !== SIZE) return;

  for (let pass = 0; pass < 40; pass++) {
    const { data: gameRows } = await admin
      .from('tournament_games')
      .select('match_id, game_no, score_a, score_b, submitted_a, submitted_b, winner, deadline')
      .eq('tournament_id', tournament.id);
    const bracket = new Bracket((gameRows ?? []) as GameRow[]);
    const now = Date.now();
    let changed = false;

    for (const def of MATCH_DEFS) {
      if (!bracket.isPlayable(def.id)) continue;
      const [seatA, seatB] = bracket.participants(def.id);
      const a = entrants.get(seatA!)!;
      const b = entrants.get(seatB!)!;
      const open = bracket.openGame(def.id);

      if (!open) {
        // Nothing in flight: open the next game of the match.
        await admin.from('tournament_games').upsert(
          {
            tournament_id: tournament.id,
            match_id: def.id,
            game_no: bracket.nextGameNo(def.id),
            deadline: new Date(now + GAME_DEADLINE_MINUTES * 60000).toISOString(),
          },
          { onConflict: 'tournament_id,match_id,game_no', ignoreDuplicates: true }
        );
        changed = true;
        continue;
      }

      const rng = seededRng((Date.parse(tournament.starts_at) | 0) + open.game_no * 7919 + def.id.length);
      const expired = open.deadline ? Date.parse(open.deadline) <= now : false;
      const scoreA = a.user_id === null ? rollBotScore(a.rating, rng) : open.score_a;
      const scoreB = b.user_id === null ? rollBotScore(b.rating, rng) : open.score_b;

      const aIn = a.user_id === null || scoreA !== null;
      const bIn = b.user_id === null || scoreB !== null;
      if (!expired && (!aIn || !bIn)) continue;

      const finalA = scoreA ?? 0;
      const finalB = scoreB ?? 0;
      let winner: 'a' | 'b';
      if (finalA !== finalB) {
        winner = finalA > finalB ? 'a' : 'b';
      } else if (open.submitted_a && open.submitted_b) {
        // A drawn game goes to whoever answered first.
        winner = Date.parse(open.submitted_a) <= Date.parse(open.submitted_b) ? 'a' : 'b';
      } else if (open.submitted_a || open.submitted_b) {
        // One of them never showed up.
        winner = open.submitted_a ? 'a' : 'b';
      } else {
        // Neither did: the better seed goes through.
        winner = seatA! < seatB! ? 'a' : 'b';
      }

      await admin
        .from('tournament_games')
        .update({ score_a: finalA, score_b: finalB, winner })
        .eq('tournament_id', tournament.id)
        .eq('match_id', def.id)
        .eq('game_no', open.game_no)
        .is('winner', null);
      changed = true;
    }

    if (!changed) break;
  }

  const { data: finalRows } = await admin
    .from('tournament_games')
    .select('match_id, game_no, score_a, score_b, submitted_a, submitted_b, winner, deadline')
    .eq('tournament_id', tournament.id);
  const bracket = new Bracket((finalRows ?? []) as GameRow[]);
  const side = bracket.decidedSide('gf');
  if (side) {
    const [a, b] = bracket.participants('gf');
    const championSeed = side === 'a' ? a! : b!;
    await awardMedals(admin, tournament, entrants, bracket, championSeed);
    await admin
      .from('weekly_tournaments')
      .update({
        status: 'finished',
        champion_user_id: entrants.get(championSeed)?.user_id ?? null,
        finished_at: new Date().toISOString(),
      })
      .eq('id', tournament.id)
      .neq('status', 'finished');
  }
}

/**
 * Writes everybody's finish once the grand final is decided. Medals live
 * here rather than on the phone: a device can be wiped, reinstalled or
 * edited, and a record of what somebody won should survive all three.
 *
 * Keyed on (tournament, user), so running the settle loop again — which
 * happens on every visit to the screen — cannot award the same medal twice.
 */
async function awardMedals(
  admin: SupabaseClient,
  tournament: TournamentRow,
  entrants: Map<number, Entrant>,
  bracket: Bracket,
  championSeed: number
): Promise<void> {
  const rows: { tournament_id: string; user_id: string; place: number; medal: string | null; points: number }[] = [];

  for (const [seed, entrant] of entrants) {
    // Bots win nothing: there is nobody to give it to.
    if (!entrant.user_id) continue;

    let place: number | null = null;
    if (seed === championSeed) {
      place = 1;
    } else {
      const exit = MATCH_DEFS.find((d) => d.bracket !== 'wb' && bracket.loserSeed(d.id) === seed);
      place = exit ? PLACE_BY_EXIT[exit.id] ?? null : null;
    }
    if (place === null) continue;

    const medal = medalForPlace(place);
    rows.push({
      tournament_id: tournament.id,
      user_id: entrant.user_id,
      place,
      medal,
      points: medal ? MEDAL_POINTS[medal] : 0,
    });
  }

  if (rows.length) {
    await admin.from('tournament_medals').upsert(rows, { onConflict: 'tournament_id,user_id', ignoreDuplicates: true });
  }
}

async function readState(admin: SupabaseClient, tournament: TournamentRow, userId: string) {
  const [{ data: entrants }, { data: games }, { count: registered }, { data: mine }] = await Promise.all([
    admin.from('tournament_entrants').select('seed, user_id, name, rating').eq('tournament_id', tournament.id).order('seed'),
    admin
      .from('tournament_games')
      .select('match_id, game_no, score_a, score_b, submitted_a, submitted_b, winner, deadline')
      .eq('tournament_id', tournament.id),
    admin
      .from('tournament_registrations')
      .select('user_id', { count: 'exact', head: true })
      .eq('tournament_id', tournament.id),
    admin
      .from('tournament_registrations')
      .select('registered_at')
      .eq('tournament_id', tournament.id)
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const entrantList = (entrants ?? []) as Entrant[];
  const mySeat = entrantList.find((e) => e.user_id === userId)?.seed ?? null;
  return {
    tournament: {
      id: tournament.id,
      weekStart: tournament.week_start,
      status: tournament.status,
      startsAt: tournament.starts_at,
      championUserId: tournament.champion_user_id,
    },
    // user ids stay inside the function apart from the caller's own seat
    entrants: entrantList.map((e) => ({
      seed: e.seed,
      name: e.name,
      rating: e.rating,
      isBot: e.user_id === null,
      isMe: e.user_id === userId,
    })),
    games: games ?? [],
    registeredCount: registered ?? 0,
    amRegistered: !!mine,
    mySeat,
    size: SIZE,
    winsPerMatch: WINS_PER_MATCH,
    gameQuestions: GAME_QUESTIONS,
  };
}

/**
 * Marks a handed-in quiz. `picks[q]` is the option tapped on question q,
 * or -1 where the clock ran out; the key holds the index of the right one.
 */
function scorePicks(seed: number, picks: number[]): number {
  let score = 0;
  for (let q = 0; q < KEY_QUESTIONS; q++) {
    if (String(picks[q]) === ANSWER_KEY[(seed - 1) * KEY_QUESTIONS + q]) score++;
  }
  return score;
}

/** Seven whole numbers, each an option index or the "ran out of time" -1. */
function readPicks(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length !== KEY_QUESTIONS) return null;
  for (const pick of value) {
    if (typeof pick !== 'number' || !Number.isInteger(pick) || pick < -1 || pick > 3) return null;
  }
  return value as number[];
}

/** A seed from the pool, drawn where the caller cannot predict or steer it. */
function drawSeed(): number {
  const word = new Uint32Array(1);
  crypto.getRandomValues(word);
  return 1 + (word[0] % KEY_POOL);
}

type OpenGame =
  | { ok: false; error: string; status: number }
  | { ok: true; side: 'a' | 'b'; gameNo: number; alreadyIn: boolean };

/**
 * The game a player is entitled to play right now, or why there is none.
 * Starting a game and handing one in ask exactly the same question, so
 * they ask it here once.
 */
async function openGameFor(
  admin: SupabaseClient,
  tournament: TournamentRow,
  userId: string,
  matchId: string | undefined
): Promise<OpenGame> {
  if (tournament.status !== 'running') return { ok: false, error: 'no tournament is running', status: 409 };
  if (!matchId || !DEF_BY_ID.has(matchId)) return { ok: false, error: 'unknown match', status: 400 };

  const { data: entrantRows } = await admin
    .from('tournament_entrants')
    .select('seed, user_id')
    .eq('tournament_id', tournament.id);
  const mySeat = ((entrantRows ?? []) as { seed: number; user_id: string | null }[]).find(
    (e) => e.user_id === userId
  )?.seed;
  if (mySeat === undefined) return { ok: false, error: 'not in this tournament', status: 403 };

  const { data: gameRows } = await admin
    .from('tournament_games')
    .select('match_id, game_no, score_a, score_b, submitted_a, submitted_b, winner, deadline')
    .eq('tournament_id', tournament.id);
  const bracket = new Bracket((gameRows ?? []) as GameRow[]);

  if (!bracket.isPlayable(matchId)) return { ok: false, error: 'match is not open', status: 409 };
  const [seatA, seatB] = bracket.participants(matchId);
  const side = seatA === mySeat ? 'a' : seatB === mySeat ? 'b' : null;
  if (!side) return { ok: false, error: 'not your match', status: 403 };

  const open = bracket.openGame(matchId);
  if (!open) return { ok: false, error: 'no game to play', status: 409 };

  return { ok: true, side, gameNo: open.game_no, alreadyIn: (side === 'a' ? open.score_a : open.score_b) !== null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const asCaller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });

  let payload: {
    action?: string;
    matchId?: string;
    /** Which option was tapped on each question, -1 where the clock ran out. */
    picks?: unknown;
    /** The answer key the app's generator agrees with — see _shared/tournamentKey.ts. */
    keyVersion?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'invalid request body' }, 400);
  }

  /**
   * Opens the week and closes the bracket when their time has come. Both
   * send a notification on the way through, so whoever calls this decides
   * when the two notices go out.
   */
  const turnTheWeek = async (): Promise<TournamentRow> => {
    const { tournament: current, opened } = await ensureWeek(admin);
    if (opened) {
      // Everybody, not only last week's entrants: the point of this one is
      // to reach the people who are not in it yet.
      await pushToTokens(admin, await tokensFor(admin), SIGNUPS_OPEN, { kind: 'tournamentSignups' });
    }
    if (current.status === 'registration' && Date.parse(current.starts_at) <= Date.now()) {
      await seedBracket(admin, current);
    }
    await recoverSeeding(admin, current.id);
    return current;
  };

  /**
   * A poke from a scheduler rather than a player, carrying a shared secret
   * instead of a session.
   *
   * Without it the week turns when somebody next opens the tournament
   * screen, and the two notices go out then — hours or days after the
   * moment they are about. With it they go out on time. The secret is set
   * with `supabase secrets set TOURNAMENT_TICK_SECRET=...`; where it is
   * unset there is nothing to call, and the lazy path still works.
   */
  if (payload.action === 'tick') {
    const expected = Deno.env.get('TOURNAMENT_TICK_SECRET');
    const given = req.headers.get('x-tournament-tick');
    if (!expected || given !== expected) return json({ error: 'not allowed' }, 403);
    const current = await turnTheWeek();
    const { data: after } = await admin.from('weekly_tournaments').select('status').eq('id', current.id).single();
    return json({ ok: true, status: (after as { status: string } | null)?.status ?? current.status });
  }

  // The caller is whoever the bearer token says, never whoever the body says.
  const { data: userData } = await asCaller.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: 'not signed in' }, 401);

  let tournament = await turnTheWeek();

  const { data: refreshed } = await admin.from('weekly_tournaments').select('*').eq('id', tournament.id).single();
  tournament = refreshed as TournamentRow;

  if (payload.action === 'register' || payload.action === 'unregister') {
    if (tournament.status !== 'registration') return json({ error: 'registration is closed' }, 409);

    if (payload.action === 'register') {
      await admin
        .from('tournament_registrations')
        .upsert({ tournament_id: tournament.id, user_id: user.id }, { onConflict: 'tournament_id,user_id', ignoreDuplicates: true });
    } else {
      await admin
        .from('tournament_registrations')
        .delete()
        .eq('tournament_id', tournament.id)
        .eq('user_id', user.id);
    }
    return json(await readState(admin, tournament, user.id));
  }

  /**
   * Deals a game.
   *
   * The app used to make up its own quiz and report its own score. Now it
   * asks here first and is handed a seed; the quiz that seed produces is
   * the only one whose answers will be accepted for this game, and the
   * marking is done on this side when it comes back.
   *
   * Each start deals afresh and replaces the last deal, so a game cut short
   * by a crash can be played again — but only MAX_ATTEMPTS times, or
   * leaving and coming back would be a way to shop for easy questions.
   */
  if (payload.action === 'start') {
    const game = await openGameFor(admin, tournament, user.id, payload.matchId);
    if (!game.ok) return json({ error: game.error }, game.status);
    if (game.alreadyIn) return json({ error: 'alreadyPlayed' }, 409);

    const ticketOf = admin
      .from('tournament_tickets')
      .select('attempts')
      .eq('tournament_id', tournament.id)
      .eq('match_id', payload.matchId!)
      .eq('game_no', game.gameNo)
      .eq('side', game.side);
    const { data: existing } = await ticketOf.maybeSingle();
    const used = (existing as { attempts: number } | null)?.attempts ?? 0;
    if (used >= MAX_ATTEMPTS) return json({ error: 'noAttemptsLeft' }, 409);

    const seed = drawSeed();
    const { error } = await admin.from('tournament_tickets').upsert(
      {
        tournament_id: tournament.id,
        match_id: payload.matchId,
        game_no: game.gameNo,
        side: game.side,
        seed,
        attempts: used + 1,
        issued_at: new Date().toISOString(),
      },
      { onConflict: 'tournament_id,match_id,game_no,side' }
    );
    if (error) return json({ error: 'startFailed' }, 500);

    return json({ ticket: { seed, keyVersion: KEY_VERSION, attemptsLeft: MAX_ATTEMPTS - used - 1 } });
  }

  if (payload.action === 'submit') {
    // A build whose generator disagrees with the key — or one from before
    // there was a key, which sends a bare score — cannot be marked fairly:
    // its questions are not the ones these answers belong to. It is told
    // to update rather than being scored against the wrong sheet.
    if (payload.keyVersion !== KEY_VERSION) return json({ error: 'updateRequired' }, 409);
    const picks = readPicks(payload.picks);
    if (!picks) return json({ error: 'badPicks' }, 400);

    const game = await openGameFor(admin, tournament, user.id, payload.matchId);
    if (!game.ok) return json({ error: game.error }, game.status);

    // Only ever the first hand-in: a second would be a replay of the same
    // game with a better score.
    if (!game.alreadyIn) {
      const { data: ticket } = await admin
        .from('tournament_tickets')
        .select('seed, issued_at')
        .eq('tournament_id', tournament.id)
        .eq('match_id', payload.matchId!)
        .eq('game_no', game.gameNo)
        .eq('side', game.side)
        .maybeSingle();
      const dealt = ticket as { seed: number; issued_at: string } | null;
      // Answers to a quiz nobody was dealt are answers to nothing.
      if (!dealt) return json({ error: 'noTicket' }, 409);

      const elapsed = Date.now() - Date.parse(dealt.issued_at);
      if (elapsed < MIN_GAME_MS) return json({ error: 'tooFast' }, 409);
      if (elapsed > MAX_GAME_MS) return json({ error: 'ticketExpired' }, 409);

      const score = scorePicks(dealt.seed, picks);
      await admin
        .from('tournament_games')
        .update(
          game.side === 'a'
            ? { score_a: score, submitted_a: new Date().toISOString() }
            : { score_b: score, submitted_b: new Date().toISOString() }
        )
        .eq('tournament_id', tournament.id)
        .eq('match_id', payload.matchId!)
        .eq('game_no', game.gameNo)
        .is('winner', null)
        // and only into an empty slot: two hand-ins racing each other must
        // not leave the second one's score standing over the first.
        .is(game.side === 'a' ? 'score_a' : 'score_b', null);
    }

    await settle(admin, tournament);
    const { data: after } = await admin.from('weekly_tournaments').select('*').eq('id', tournament.id).single();
    return json(await readState(admin, after as TournamentRow, user.id));
  }

  /**
   * The last tournament that finished, in the same shape as the current
   * one, so the app can read it with the code it already has: the bracket
   * it draws, the names, who the caller was in it.
   *
   * The week being played now is excluded even when it is over — that one
   * is already on the screen; this is the one before it.
   */
  if (payload.action === 'previous') {
    const { data: last } = await admin
      .from('weekly_tournaments')
      .select('*')
      .eq('status', 'finished')
      .neq('id', tournament.id)
      .order('week_start', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!last) return json(null);
    return json(await readState(admin, last as TournamentRow, user.id));
  }

  if (payload.action === 'state') {
    if (tournament.status === 'running') await settle(admin, tournament);
    const { data: after } = await admin.from('weekly_tournaments').select('*').eq('id', tournament.id).single();
    return json(await readState(admin, after as TournamentRow, user.id));
  }

  return json({ error: 'unknown action' }, 400);
});
