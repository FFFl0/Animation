-- Run this once in the Supabase SQL editor after creating a new project
-- (Dashboard -> SQL Editor -> New query -> paste -> Run).

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar jsonb not null,
  favorite_character_id text,
  stats jsonb not null default '{}'::jsonb,
  streak jsonb not null default '{"count":0,"lastPlayedDate":null}'::jsonb,
  achievements text[] not null default '{}',
  daily_challenge jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Lets the client check "is this username taken?" before signup without
-- exposing everyone's profile rows (RLS above only allows reading your own).
create or replace function public.is_username_taken(check_username text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where lower(username) = lower(check_username)
  );
$$;

grant execute on function public.is_username_taken(text) to anon, authenticated;

-- Enables the realtime subscription the app uses for cross-device sync.
-- If this errors because the publication already includes the table (or
-- doesn't exist under this name on your project), enable it instead via
-- Dashboard -> Database -> Replication -> supabase_realtime -> profiles.
alter publication supabase_realtime add table public.profiles;

-- ============================================================
-- MIGRATIONS — if you already ran the block above on an earlier
-- version of this file, only run the new snippets added below it,
-- each one is safe to run once. Newest at the bottom.
-- ============================================================

-- Adds daily-challenge tracking to an existing profiles table.
alter table public.profiles add column if not exists daily_challenge jsonb;

-- Public leaderboard: exposes only username/avatar/aggregate score for every
-- player, without loosening the profiles RLS policies above (this view is
-- owned by the migration-running role, which bypasses RLS, by design — the
-- standard Supabase pattern for a public leaderboard over a private table).
create or replace view public.leaderboard as
select
  username,
  avatar,
  coalesce((select sum((value->>'bestScore')::int) from jsonb_each(stats)), 0) as total_score,
  coalesce((select sum((value->>'totalCorrect')::int) from jsonb_each(stats)), 0) as total_correct,
  coalesce((select sum((value->>'totalQuestions')::int) from jsonb_each(stats)), 0) as total_questions
from public.profiles;

grant select on public.leaderboard to authenticated;

-- get_auth_email (added above in an earlier version of this file, since
-- removed) let any anonymous caller resolve a username straight to its
-- Supabase Auth email — including a real address a player supplied for
-- password recovery, not just the synthesized "username@animequiz.local"
-- one. That's a PII-disclosure oracle: username -> real email needs no
-- session at all. Username<->email resolution now happens server-side in
-- the auth-helper Edge Function (supabase/functions/auth-helper) instead,
-- which never returns the email to the client. Run this once to remove the
-- old function from any project that already has it:
drop function if exists public.get_auth_email(text);

-- Friends feature: who's friends with whom. A row starts "pending" (sent by
-- requester_id) and becomes "accepted" once addressee_id approves it —
-- declining or unfriending is just deleting the row, no separate state.
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

create policy "See own friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Send friend requests as yourself"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

create policy "Only the addressee can accept a request"
  on public.friendships for update
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id);

create policy "Either side can remove a friendship"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- The friends screen needs a friend's id (to add/compare), streak,
-- achievements, and the raw per-category/mode stats breakdown (to show
-- favorite categories the same way the Statistics screen derives them for
-- your own profile) alongside what the leaderboard already showed —
-- extending the same safe view rather than adding a near-duplicate one.
-- Still no email or other sensitive column, still authenticated-only.
create or replace view public.leaderboard as
select
  id,
  username,
  avatar,
  streak,
  achievements,
  stats,
  coalesce((select sum((value->>'bestScore')::int) from jsonb_each(stats)), 0) as total_score,
  coalesce((select sum((value->>'totalCorrect')::int) from jsonb_each(stats)), 0) as total_correct,
  coalesce((select sum((value->>'totalQuestions')::int) from jsonb_each(stats)), 0) as total_questions,
  coalesce((select sum((value->>'gamesPlayed')::int) from jsonb_each(stats)), 0) as total_games
from public.profiles;

grant select on public.leaderboard to authenticated;

-- Battle invites: lets a challenge sent from a friend's profile reach the
-- target player even if they're not looking at the Battle screen right now
-- (the room itself still lives entirely in Realtime presence/broadcast —
-- this table only carries the "you've been invited" notification and its
-- room code, so the invite can be listed, accepted or declined later).
create table if not exists public.battle_invites (
  id uuid primary key default gen_random_uuid(),
  room_code text not null,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  constraint battle_invites_no_self check (from_user_id <> to_user_id)
);

alter table public.battle_invites enable row level security;

create policy "See own battle invites"
  on public.battle_invites for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "Send battle invites as yourself"
  on public.battle_invites for insert
  with check (auth.uid() = from_user_id);

create policy "Only the invitee can accept or decline"
  on public.battle_invites for update
  using (auth.uid() = to_user_id)
  with check (auth.uid() = to_user_id);

create policy "Either side can remove an invite"
  on public.battle_invites for delete
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

alter publication supabase_realtime add table public.battle_invites;

-- Friend requests are already rows in `friendships` (status starts
-- 'pending'), so the same Realtime publication used for cross-device
-- profile sync also carries the INSERT the notifications feature listens
-- for — no separate table needed for that half of it.
alter publication supabase_realtime add table public.friendships;

-- Direct messages between two friends. One row per message; a
-- conversation is just every row where the two user ids match, in
-- either direction. No group chats, no attachments — text only.
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read boolean not null default false,
  constraint messages_no_self check (sender_id <> recipient_id)
);

alter table public.messages enable row level security;

create policy "See messages you sent or received"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "Send messages as yourself"
  on public.messages for insert
  with check (auth.uid() = sender_id);

create policy "Only the recipient can mark a message read"
  on public.messages for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

create index if not exists messages_sender_idx on public.messages (sender_id, created_at);
create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at);

alter publication supabase_realtime add table public.messages;

-- One row per finished quiz round, purely so the leaderboard can be scoped
-- to a time window (this week / this season) — `profiles.stats` only ever
-- holds running totals, which can't be un-summed back into a period. Not
-- used for anything else; the per-category/mode stats you already see in
-- Statistics keep coming from `profiles.stats` as before.
create table if not exists public.round_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null,
  total integer not null,
  created_at timestamptz not null default now()
);

alter table public.round_results enable row level security;

create policy "See your own round results"
  on public.round_results for select
  using (auth.uid() = user_id);

create policy "Log your own round results"
  on public.round_results for insert
  with check (auth.uid() = user_id);

create index if not exists round_results_user_created_idx on public.round_results (user_id, created_at);

-- Weekly and seasonal (calendar-month) leaderboards, aggregated from
-- round_results the same "safe view over a private table" way as
-- public.leaderboard above — no per-row access to round_results is granted,
-- only these pre-aggregated totals.
create or replace view public.leaderboard_weekly as
select
  p.id,
  p.username,
  p.avatar,
  coalesce(sum(r.score) filter (where r.created_at >= date_trunc('week', now())), 0) as period_score,
  coalesce(sum(r.total) filter (where r.created_at >= date_trunc('week', now())), 0) as period_questions
from public.profiles p
left join public.round_results r on r.user_id = p.id
group by p.id, p.username, p.avatar;

grant select on public.leaderboard_weekly to authenticated;

create or replace view public.leaderboard_season as
select
  p.id,
  p.username,
  p.avatar,
  coalesce(sum(r.score) filter (where r.created_at >= date_trunc('month', now())), 0) as period_score,
  coalesce(sum(r.total) filter (where r.created_at >= date_trunc('month', now())), 0) as period_questions
from public.profiles p
left join public.round_results r on r.user_id = p.id
group by p.id, p.username, p.avatar;

grant select on public.leaderboard_season to authenticated;
