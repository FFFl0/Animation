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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SIZE = 16;
const WINS_PER_MATCH = 2;
const GAME_QUESTIONS = 7;
/** Day of the week the tournament starts on, 0 = Sunday. */
const START_WEEKDAY = 6;
const START_HOUR_UTC = 15;
/** How long a player has to hand in a score before the game is decided without them. */
const GAME_DEADLINE_MINUTES = 90;

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

/** The tournament for this week, opening registration for it if it is new. */
async function ensureWeek(admin: SupabaseClient): Promise<TournamentRow> {
  const week = weekStart(new Date());
  const { data: existing } = await admin
    .from('weekly_tournaments')
    .select('*')
    .eq('week_start', week)
    .maybeSingle();
  if (existing) return existing as TournamentRow;

  const { data: created } = await admin
    .from('weekly_tournaments')
    .insert({ week_start: week, starts_at: startsAt(week) })
    .select('*')
    .maybeSingle();
  if (created) return created as TournamentRow;

  // Somebody else opened it in between, which is fine.
  const { data: raced } = await admin
    .from('weekly_tournaments')
    .select('*')
    .eq('week_start', week)
    .single();
  return raced as TournamentRow;
}

type Entrant = { seed: number; user_id: string | null; name: string; rating: number };

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
      .select('id, username, total_score')
      .in('id', ids);
    rated = ((rows ?? []) as { id: string; username: string; total_score: number }[]).map((r) => ({
      user_id: r.id,
      name: r.username,
      rating: r.total_score ?? 0,
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const asCaller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });

  // The caller is whoever the bearer token says, never whoever the body says.
  const { data: userData } = await asCaller.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: 'not signed in' }, 401);

  let payload: { action?: string; matchId?: string; score?: number };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'invalid request body' }, 400);
  }

  let tournament = await ensureWeek(admin);

  if (tournament.status === 'registration' && Date.parse(tournament.starts_at) <= Date.now()) {
    await seedBracket(admin, tournament);
  }
  await recoverSeeding(admin, tournament.id);

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

  if (payload.action === 'submit') {
    if (tournament.status !== 'running') return json({ error: 'no tournament is running' }, 409);

    const score = payload.score;
    const matchId = payload.matchId;
    if (!matchId || !DEF_BY_ID.has(matchId)) return json({ error: 'unknown match' }, 400);
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > GAME_QUESTIONS) {
      return json({ error: 'bad score' }, 400);
    }

    const { data: entrantRows } = await admin
      .from('tournament_entrants')
      .select('seed, user_id')
      .eq('tournament_id', tournament.id);
    const mySeat = ((entrantRows ?? []) as { seed: number; user_id: string | null }[]).find((e) => e.user_id === user.id)?.seed;
    if (mySeat === undefined) return json({ error: 'not in this tournament' }, 403);

    const { data: gameRows } = await admin
      .from('tournament_games')
      .select('match_id, game_no, score_a, score_b, submitted_a, submitted_b, winner, deadline')
      .eq('tournament_id', tournament.id);
    const bracket = new Bracket((gameRows ?? []) as GameRow[]);

    if (!bracket.isPlayable(matchId)) return json({ error: 'match is not open' }, 409);
    const [seatA, seatB] = bracket.participants(matchId);
    const side = seatA === mySeat ? 'a' : seatB === mySeat ? 'b' : null;
    if (!side) return json({ error: 'not your match' }, 403);

    const open = bracket.openGame(matchId);
    if (!open) return json({ error: 'no game to play' }, 409);
    // Only ever the first submission: a second would be a replay of the same
    // game with a better score.
    const already = side === 'a' ? open.score_a : open.score_b;
    if (already === null) {
      await admin
        .from('tournament_games')
        .update(
          side === 'a'
            ? { score_a: score, submitted_a: new Date().toISOString() }
            : { score_b: score, submitted_b: new Date().toISOString() }
        )
        .eq('tournament_id', tournament.id)
        .eq('match_id', matchId)
        .eq('game_no', open.game_no)
        .is('winner', null);
    }

    await settle(admin, tournament);
    const { data: after } = await admin.from('weekly_tournaments').select('*').eq('id', tournament.id).single();
    return json(await readState(admin, after as TournamentRow, user.id));
  }

  if (payload.action === 'state') {
    if (tournament.status === 'running') await settle(admin, tournament);
    const { data: after } = await admin.from('weekly_tournaments').select('*').eq('id', tournament.id).single();
    return json(await readState(admin, after as TournamentRow, user.id));
  }

  return json({ error: 'unknown action' }, 400);
});
