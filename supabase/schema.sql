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
