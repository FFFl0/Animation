// Supabase Edge Function: the shared 32-player tournament bracket.
//
// Every write to a bracket happens here with the service role, never from a
// client: seats, pairings and winners decide who advances, so a client that
// could write them could seat itself into the final. Deploy with:
//   supabase functions deploy tournament
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by the runtime.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SIZE = 32;
const ROUNDS = 5;
const MATCH_QUESTIONS = 7;
/** How long a lobby stays open before the bracket is sealed and seeded. */
const LOBBY_SECONDS = 20;
/** How long a match waits for a person to hand in a score before they forfeit. */
const MATCH_DEADLINE_SECONDS = 180;

const BOT_NAMES = [
  'Kenshin', 'SakuraFan', 'ShonenKing', 'OtakuNo1', 'RamenLover', 'BlueExorcist',
  'NekoChan', 'ZeroTwo', 'SenpaiX', 'MangaAddict', 'TitanSlayer', 'HokageDream',
  'StrawHatJoe', 'CursedEnergy', 'DemonBlade', 'PlusUltra', 'SoulReaper', 'AlchemyFan',
  'PirateQueen', 'NinjaWay', 'SharinganX', 'MoonPrism', 'GhoulEater', 'SpiritGun',
  'IsekaiTruck', 'WaifuHunter', 'SakuraStorm', 'TokyoDrifter', 'LevelUpSolo', 'ChainsawGuy',
  'QuirkLess', 'BlackClover', 'HunterExam', 'DeathNoteL', 'SteinsFan', 'EvaPilot01',
];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** mulberry32, the same generator the app uses, so bots behave the same on both sides. */
function seededRng(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rollBotScore(skill: number, rng: () => number): number {
  const p = 0.32 + 0.58 * Math.max(0, Math.min(1, skill));
  let score = 0;
  for (let i = 0; i < MATCH_QUESTIONS; i++) if (rng() < p) score++;
  return score;
}

function matchesInRound(round: number): number {
  return (SIZE >> round) / 2;
}

type SeatRow = { tournament_id: string; seat: number; user_id: string | null; name: string; skill: number };
type MatchRow = {
  tournament_id: string;
  round: number;
  idx: number;
  seat_a: number | null;
  seat_b: number | null;
  score_a: number | null;
  score_b: number | null;
  submitted_a: string | null;
  submitted_b: string | null;
  winner_seat: number | null;
  deadline: string | null;
};
type TournamentRow = {
  id: string;
  status: string;
  seed: number;
  round: number;
  champion_seat: number | null;
  starts_at: string;
};

/**
 * Seals a lobby: bots take the seats nobody claimed, everyone is shuffled
 * into the bracket, and the first round is drawn.
 */
async function seedBracket(admin: SupabaseClient, tournament: TournamentRow): Promise<void> {
  // Claim the seeding first: two players arriving at zero at the same moment
  // would otherwise both delete and re-seat everybody.
  const { data: claimed } = await admin
    .from('tournaments')
    .update({ status: 'seeding' })
    .eq('id', tournament.id)
    .eq('status', 'lobby')
    .select('id');
  if (!claimed?.length) return;

  const { data: joined } = await admin
    .from('tournament_seats')
    .select('*')
    .eq('tournament_id', tournament.id)
    .order('seat');

  const humans = (joined ?? []) as SeatRow[];
  const rng = seededRng(Number(tournament.seed) | 0);

  const names = [...BOT_NAMES];
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [names[i], names[j]] = [names[j], names[i]];
  }

  const botCount = SIZE - humans.length;
  const pool: { user_id: string | null; name: string; skill: number }[] = [
    ...humans.map((h) => ({ user_id: h.user_id, name: h.name, skill: 0 })),
    ...Array.from({ length: botCount }, (_, i) => ({
      user_id: null,
      name: names[i % names.length],
      skill: botCount <= 1 ? 0.5 : 0.28 + (i / (botCount - 1)) * 0.62,
    })),
  ];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  await admin.from('tournament_seats').delete().eq('tournament_id', tournament.id);
  await admin.from('tournament_seats').insert(
    pool.map((entry, seat) => ({ tournament_id: tournament.id, seat, ...entry }))
  );

  const deadline = new Date(Date.now() + MATCH_DEADLINE_SECONDS * 1000).toISOString();
  await admin.from('tournament_matches').upsert(
    Array.from({ length: matchesInRound(0) }, (_, idx) => ({
      tournament_id: tournament.id,
      round: 0,
      idx,
      seat_a: idx * 2,
      seat_b: idx * 2 + 1,
      deadline,
    })),
    { onConflict: 'tournament_id,round,idx', ignoreDuplicates: true }
  );

  await admin.from('tournaments').update({ status: 'running', round: 0 }).eq('id', tournament.id);
}

/**
 * Picks a bracket back up if seeding was claimed but never finished — the
 * seats are written before the status flips, so a run cut short between the
 * two would otherwise sit in 'seeding' forever.
 */
async function recoverSeeding(admin: SupabaseClient, tournamentId: string): Promise<void> {
  const { data } = await admin.from('tournaments').select('status').eq('id', tournamentId).single();
  if (data?.status !== 'seeding') return;

  const { count } = await admin
    .from('tournament_seats')
    .select('seat', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId);

  if ((count ?? 0) === SIZE) {
    await admin.from('tournaments').update({ status: 'running' }).eq('id', tournamentId).eq('status', 'seeding');
  } else {
    // Nothing was written, so let the lobby be sealed again from scratch.
    await admin.from('tournaments').update({ status: 'lobby' }).eq('id', tournamentId).eq('status', 'seeding');
  }
}

/**
 * Decides whatever can be decided right now and moves the bracket on:
 * bot-only matches resolve at once, matches past their deadline resolve with
 * a forfeit for whoever never handed a score in, and a round whose matches
 * are all decided draws the next one.
 */
async function settle(admin: SupabaseClient, tournamentId: string): Promise<void> {
  for (let guard = 0; guard < ROUNDS + 1; guard++) {
    const { data: tRow } = await admin.from('tournaments').select('*').eq('id', tournamentId).single();
    const tournament = tRow as TournamentRow;
    if (!tournament || tournament.status !== 'running') return;

    const { data: seatRows } = await admin.from('tournament_seats').select('*').eq('tournament_id', tournamentId);
    const seats = new Map((seatRows as SeatRow[]).map((s) => [s.seat, s]));

    const { data: matchRows } = await admin
      .from('tournament_matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('round', tournament.round);
    const matches = (matchRows ?? []) as MatchRow[];
    if (!matches.length) return;

    const rng = seededRng((Number(tournament.seed) | 0) + tournament.round * 7919);
    const now = Date.now();
    let changed = false;

    for (const match of matches) {
      if (match.winner_seat !== null) continue;
      const a = seats.get(match.seat_a!);
      const b = seats.get(match.seat_b!);
      if (!a || !b) continue;

      const expired = match.deadline ? Date.parse(match.deadline) <= now : false;
      const aReady = a.user_id === null || match.score_a !== null || expired;
      const bReady = b.user_id === null || match.score_b !== null || expired;
      if (!aReady || !bReady) continue;

      // A bot rolls its score now; a person who never showed up forfeits.
      const scoreA = a.user_id === null ? rollBotScore(a.skill, rng) : match.score_a ?? 0;
      const scoreB = b.user_id === null ? rollBotScore(b.skill, rng) : match.score_b ?? 0;

      let winner: number;
      if (scoreA !== scoreB) {
        winner = scoreA > scoreB ? match.seat_a! : match.seat_b!;
      } else if (a.user_id && b.user_id) {
        // two people drew: the one who answered first takes it
        const ta = match.submitted_a ? Date.parse(match.submitted_a) : Infinity;
        const tb = match.submitted_b ? Date.parse(match.submitted_b) : Infinity;
        winner = ta <= tb ? match.seat_a! : match.seat_b!;
      } else if (a.user_id || b.user_id) {
        // a person drawing with a bot goes through
        winner = a.user_id ? match.seat_a! : match.seat_b!;
      } else if (a.skill !== b.skill) {
        winner = a.skill > b.skill ? match.seat_a! : match.seat_b!;
      } else {
        winner = rng() < 0.5 ? match.seat_a! : match.seat_b!;
      }

      await admin
        .from('tournament_matches')
        .update({ score_a: scoreA, score_b: scoreB, winner_seat: winner })
        .eq('tournament_id', tournamentId)
        .eq('round', match.round)
        .eq('idx', match.idx);

      match.score_a = scoreA;
      match.score_b = scoreB;
      match.winner_seat = winner;
      changed = true;
    }

    if (matches.some((m) => m.winner_seat === null)) return;

    const nextRound = tournament.round + 1;
    if (nextRound >= ROUNDS) {
      await admin
        .from('tournaments')
        .update({
          status: 'finished',
          round: nextRound,
          champion_seat: matches[0].winner_seat,
          finished_at: new Date().toISOString(),
        })
        .eq('id', tournamentId);
      return;
    }

    const byIdx = new Map(matches.map((m) => [m.idx, m]));
    const deadline = new Date(Date.now() + MATCH_DEADLINE_SECONDS * 1000).toISOString();
    // Two people can finish their matches at once and both find the round
    // complete, so drawing the next one has to tolerate being done twice.
    await admin.from('tournament_matches').upsert(
      Array.from({ length: matchesInRound(nextRound) }, (_, idx) => ({
        tournament_id: tournamentId,
        round: nextRound,
        idx,
        seat_a: byIdx.get(idx * 2)!.winner_seat,
        seat_b: byIdx.get(idx * 2 + 1)!.winner_seat,
        deadline,
      })),
      { onConflict: 'tournament_id,round,idx', ignoreDuplicates: true }
    );
    await admin.from('tournaments').update({ round: nextRound }).eq('id', tournamentId);

    if (!changed && guard > 0) return;
  }
}

/** Everything the app needs to draw the bracket from the caller's point of view. */
async function readState(admin: SupabaseClient, tournamentId: string, userId: string) {
  const { data: tournament } = await admin.from('tournaments').select('*').eq('id', tournamentId).single();
  const { data: seats } = await admin
    .from('tournament_seats')
    .select('seat, user_id, name, skill')
    .eq('tournament_id', tournamentId)
    .order('seat');
  const { data: matches } = await admin
    .from('tournament_matches')
    .select('round, idx, seat_a, seat_b, score_a, score_b, winner_seat, deadline')
    .eq('tournament_id', tournamentId)
    .order('round')
    .order('idx');

  const mySeat = (seats ?? []).find((s: { user_id: string | null }) => s.user_id === userId)?.seat ?? null;
  return {
    tournament,
    // user ids never leave the function; the app only needs to know which
    // seat is the caller's and which seats are people rather than bots
    seats: (seats ?? []).map((s: SeatRow) => ({
      seat: s.seat,
      name: s.name,
      skill: s.skill,
      isPlayer: s.user_id !== null,
      isMe: s.user_id === userId,
    })),
    matches: matches ?? [],
    mySeat,
    lobbySeconds: LOBBY_SECONDS,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // The caller is whoever the bearer token says, never whoever the body says.
  const authHeader = req.headers.get('Authorization') ?? '';
  const asCaller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await asCaller.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: 'not signed in' }, 401);

  let payload: { action?: string; tournamentId?: string; score?: number };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'invalid request body' }, 400);
  }

  const { data: profile } = await admin.from('profiles').select('username').eq('id', user.id).maybeSingle();
  const username = profile?.username ?? 'player';

  /** The tournament the caller is already in, if any. */
  async function currentTournamentId(): Promise<string | null> {
    const { data } = await admin
      .from('tournament_seats')
      .select('tournament_id, tournaments!inner(status)')
      .eq('user_id', user.id)
      .neq('tournaments.status', 'finished')
      .limit(1);
    return data?.length ? (data[0].tournament_id as string) : null;
  }

  // Opening the screen must not enrol anybody, so resuming is its own action.
  if (payload.action === 'resume') {
    const id = await currentTournamentId();
    if (!id) return json({ tournament: null });

    const { data: tRow } = await admin.from('tournaments').select('*').eq('id', id).single();
    const tournament = tRow as TournamentRow;
    if (tournament?.status === 'lobby' && Date.parse(tournament.starts_at) <= Date.now()) {
      await seedBracket(admin, tournament);
    }
    await recoverSeeding(admin, id);
    await settle(admin, id);
    return json(await readState(admin, id, user.id));
  }

  if (payload.action === 'join') {
    const existing = await currentTournamentId();
    if (existing) {
      await settle(admin, existing);
      return json(await readState(admin, existing, user.id));
    }

    const nowIso = new Date().toISOString();
    const { data: openLobbies } = await admin
      .from('tournaments')
      .select('id, starts_at')
      .eq('status', 'lobby')
      .gt('starts_at', nowIso)
      .order('starts_at')
      .limit(1);

    let tournamentId: string;
    if (openLobbies?.length) {
      tournamentId = openLobbies[0].id as string;
    } else {
      const { data: created, error } = await admin
        .from('tournaments')
        .insert({
          seed: Math.floor(Math.random() * 2 ** 31),
          starts_at: new Date(Date.now() + LOBBY_SECONDS * 1000).toISOString(),
        })
        .select('id')
        .single();
      if (error || !created) return json({ error: 'could not open a tournament' }, 500);
      tournamentId = created.id as string;
    }

    const { count } = await admin
      .from('tournament_seats')
      .select('seat', { count: 'exact', head: true })
      .eq('tournament_id', tournamentId);
    if ((count ?? 0) >= SIZE) return json({ error: 'tournament is full' }, 409);

    await admin.from('tournament_seats').insert({
      tournament_id: tournamentId,
      seat: count ?? 0,
      user_id: user.id,
      name: username,
    });

    return json(await readState(admin, tournamentId, user.id));
  }

  if (payload.action === 'state' || payload.action === 'submit') {
    const tournamentId = payload.tournamentId;
    if (!tournamentId) return json({ error: 'tournamentId required' }, 400);

    const { data: seat } = await admin
      .from('tournament_seats')
      .select('seat')
      .eq('tournament_id', tournamentId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!seat) return json({ error: 'not your tournament' }, 403);

    const { data: tRow } = await admin.from('tournaments').select('*').eq('id', tournamentId).single();
    const tournament = tRow as TournamentRow;
    if (!tournament) return json({ error: 'no such tournament' }, 404);

    if (tournament.status === 'lobby' && Date.parse(tournament.starts_at) <= Date.now()) {
      await seedBracket(admin, tournament);
    }
    await recoverSeeding(admin, tournamentId);

    if (payload.action === 'submit') {
      const score = payload.score;
      if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > MATCH_QUESTIONS) {
        return json({ error: 'bad score' }, 400);
      }

      const { data: fresh } = await admin.from('tournaments').select('round, status').eq('id', tournamentId).single();
      const { data: match } = await admin
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('round', fresh!.round)
        .or(`seat_a.eq.${seat.seat},seat_b.eq.${seat.seat}`)
        .maybeSingle();

      if (match && (match as MatchRow).winner_seat === null) {
        const row = match as MatchRow;
        const mine = row.seat_a === seat.seat ? 'a' : 'b';
        // Only ever the first submission: a second one would be a replay of
        // the same match with a better score.
        if ((mine === 'a' ? row.score_a : row.score_b) === null) {
          await admin
            .from('tournament_matches')
            .update(
              mine === 'a'
                ? { score_a: score, submitted_a: new Date().toISOString() }
                : { score_b: score, submitted_b: new Date().toISOString() }
            )
            .eq('tournament_id', tournamentId)
            .eq('round', row.round)
            .eq('idx', row.idx);
        }
      }
    }

    await settle(admin, tournamentId);
    return json(await readState(admin, tournamentId, user.id));
  }

  return json({ error: 'unknown action' }, 400);
});
