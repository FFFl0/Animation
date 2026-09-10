-- Run this in the Supabase SQL editor (Dashboard -> SQL Editor -> New query
-- -> paste -> Run). Every statement here is safe to re-run any number of
-- times on the same project, in any partially-applied state — tables,
-- columns, functions and views use IF NOT EXISTS / CREATE OR REPLACE, and
-- policies and publication memberships are dropped/guarded first since
-- Postgres has no IF NOT EXISTS for those.

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

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
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
-- Wrapped so re-running this file is safe even once the table is already a
-- publication member (plain ALTER PUBLICATION ... ADD TABLE errors then).
do $$ begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;

-- ============================================================
-- MIGRATIONS — everything below is also safe to re-run in full at
-- any time (see the note at the top of this file). Newest at the
-- bottom.
-- ============================================================

-- Adds daily-challenge tracking to an existing profiles table.
alter table public.profiles add column if not exists daily_challenge jsonb;

-- Public leaderboard was first added here, exposing only
-- username/avatar/aggregate score for every player without loosening the
-- profiles RLS policies above. Superseded a few migrations down by a wider
-- version of the same view (adds id/streak/achievements/stats for the
-- Friends feature) — that's the definition that actually takes effect, this
-- comment is kept only as a record of when the view was first added.

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

drop policy if exists "See own friendships" on public.friendships;
create policy "See own friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

drop policy if exists "Send friend requests as yourself" on public.friendships;
create policy "Send friend requests as yourself"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

drop policy if exists "Only the addressee can accept a request" on public.friendships;
create policy "Only the addressee can accept a request"
  on public.friendships for update
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id);

drop policy if exists "Either side can remove a friendship" on public.friendships;
create policy "Either side can remove a friendship"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- The friends screen needs a friend's id (to add/compare), streak,
-- achievements, and the raw per-category/mode stats breakdown (to show
-- favorite categories the same way the Statistics screen derives them for
-- your own profile) alongside what the leaderboard already showed —
-- extending the same safe view rather than adding a near-duplicate one.
-- Still no email or other sensitive column, still authenticated-only.
-- Dropped first: CREATE OR REPLACE VIEW can't change a view's column list
-- (add/remove/reorder), only append columns at the end, so a plain REPLACE
-- here fails once the narrower version above has already been created.
drop view if exists public.leaderboard cascade;
create view public.leaderboard as
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

drop policy if exists "See own battle invites" on public.battle_invites;
create policy "See own battle invites"
  on public.battle_invites for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

drop policy if exists "Send battle invites as yourself" on public.battle_invites;
create policy "Send battle invites as yourself"
  on public.battle_invites for insert
  with check (auth.uid() = from_user_id);

drop policy if exists "Only the invitee can accept or decline" on public.battle_invites;
create policy "Only the invitee can accept or decline"
  on public.battle_invites for update
  using (auth.uid() = to_user_id)
  with check (auth.uid() = to_user_id);

drop policy if exists "Either side can remove an invite" on public.battle_invites;
create policy "Either side can remove an invite"
  on public.battle_invites for delete
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

do $$ begin
  alter publication supabase_realtime add table public.battle_invites;
exception when duplicate_object then null;
end $$;

-- Friend requests are already rows in `friendships` (status starts
-- 'pending'), so the same Realtime publication used for cross-device
-- profile sync also carries the INSERT the notifications feature listens
-- for — no separate table needed for that half of it.
do $$ begin
  alter publication supabase_realtime add table public.friendships;
exception when duplicate_object then null;
end $$;

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

drop policy if exists "See messages you sent or received" on public.messages;
create policy "See messages you sent or received"
  on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

drop policy if exists "Send messages as yourself" on public.messages;
create policy "Send messages as yourself"
  on public.messages for insert
  with check (auth.uid() = sender_id);

drop policy if exists "Only the recipient can mark a message read" on public.messages;
create policy "Only the recipient can mark a message read"
  on public.messages for update
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

create index if not exists messages_sender_idx on public.messages (sender_id, created_at);
create index if not exists messages_recipient_idx on public.messages (recipient_id, created_at);

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

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

drop policy if exists "See your own round results" on public.round_results;
create policy "See your own round results"
  on public.round_results for select
  using (auth.uid() = user_id);

drop policy if exists "Log your own round results" on public.round_results;
create policy "Log your own round results"
  on public.round_results for insert
  with check (auth.uid() = user_id);

create index if not exists round_results_user_created_idx on public.round_results (user_id, created_at);

-- Weekly and seasonal (calendar-month) leaderboards, aggregated from
-- round_results the same "safe view over a private table" way as
-- public.leaderboard above — no per-row access to round_results is granted,
-- only these pre-aggregated totals.
drop view if exists public.leaderboard_weekly cascade;
create view public.leaderboard_weekly as
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

drop view if exists public.leaderboard_season cascade;
create view public.leaderboard_season as
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

-- Chat: replies, reactions and deleting your own messages.

-- A reply points at the message it answers. `on delete set null` keeps the
-- reply itself when the quoted message is deleted — it just stops showing
-- the quote, rather than cascading the deletion into unrelated messages.
alter table public.messages add column if not exists reply_to_id uuid references public.messages(id) on delete set null;

-- One reaction per person per message (tapping a different emoji replaces
-- it, tapping the same one removes it — enforced by the unique constraint
-- plus an upsert on the client side).
create table if not exists public.message_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  constraint message_reactions_one_per_user unique (message_id, user_id)
);

alter table public.message_reactions enable row level security;

-- Reactions are visible to exactly the two people who can see the message
-- they belong to, mirroring the messages policies above.
drop policy if exists "See reactions in your conversations" on public.message_reactions;
create policy "See reactions in your conversations"
  on public.message_reactions for select
  using (exists (
    select 1 from public.messages m
    where m.id = message_id and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
  ));

drop policy if exists "React as yourself" on public.message_reactions;
create policy "React as yourself"
  on public.message_reactions for insert
  with check (user_id = auth.uid() and exists (
    select 1 from public.messages m
    where m.id = message_id and (m.sender_id = auth.uid() or m.recipient_id = auth.uid())
  ));

drop policy if exists "Change your own reaction" on public.message_reactions;
create policy "Change your own reaction"
  on public.message_reactions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Remove your own reaction" on public.message_reactions;
create policy "Remove your own reaction"
  on public.message_reactions for delete
  using (user_id = auth.uid());

create index if not exists message_reactions_message_idx on public.message_reactions (message_id);

-- Deleting is sender-only: you can take back what you said, not what the
-- other person did.
drop policy if exists "Delete your own messages" on public.messages;
create policy "Delete your own messages"
  on public.messages for delete
  using (auth.uid() = sender_id);

-- Realtime DELETE events only carry the primary key under the default
-- replica identity, which isn't enough for RLS to decide who may see the
-- event — so the other side would never learn a message was deleted.
alter table public.messages replica identity full;

do $$ begin
  alter publication supabase_realtime add table public.message_reactions;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Avatars: player-uploaded profile pictures live in Storage, not in a table.
-- `profiles.avatar` keeps only the public URL, so a leaderboard page carries
-- fifty short strings instead of fifty inlined images.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may read: avatars show up next to friends, in chat and in the
-- global leaderboard, including for players who aren't signed in yet.
drop policy if exists "Avatars are readable by everyone" on storage.objects;
create policy "Avatars are readable by everyone"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Writing is confined to a folder named after the player's own user id, so
-- nobody can overwrite or delete somebody else's picture.
drop policy if exists "Upload your own avatar" on storage.objects;
create policy "Upload your own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Replace your own avatar" on storage.objects;
create policy "Replace your own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Delete your own avatar" on storage.objects;
create policy "Delete your own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------------
-- Group chats. Separate tables rather than nullable columns on `messages`:
-- a direct message is addressed to a person and a group message to a room,
-- and squeezing both into one row makes every policy on it harder to read.
-- ---------------------------------------------------------------------------

create table if not exists public.chat_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 40),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_group_members (
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  reply_to_id uuid references public.group_messages(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.group_message_reactions (
  message_id uuid not null references public.group_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists group_messages_group_idx on public.group_messages (group_id, created_at);
create index if not exists chat_group_members_user_idx on public.chat_group_members (user_id);

-- Membership has to be checked from inside the policies ON the membership
-- table, which would recurse forever. A SECURITY DEFINER function reads the
-- table with RLS bypassed, breaking the cycle; it is deliberately narrow —
-- it answers one yes/no question and exposes no rows.
create or replace function public.is_group_member(gid uuid, uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.chat_group_members m where m.group_id = gid and m.user_id = uid);
$$;

revoke all on function public.is_group_member(uuid, uuid) from public;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;

alter table public.chat_groups enable row level security;
alter table public.chat_group_members enable row level security;
alter table public.group_messages enable row level security;
alter table public.group_message_reactions enable row level security;

drop policy if exists "See groups you belong to" on public.chat_groups;
create policy "See groups you belong to"
  on public.chat_groups for select
  using (public.is_group_member(id, auth.uid()));

drop policy if exists "Create your own group" on public.chat_groups;
create policy "Create your own group"
  on public.chat_groups for insert
  with check (owner_id = auth.uid());

drop policy if exists "Owner renames the group" on public.chat_groups;
create policy "Owner renames the group"
  on public.chat_groups for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Owner deletes the group" on public.chat_groups;
create policy "Owner deletes the group"
  on public.chat_groups for delete
  using (owner_id = auth.uid());

drop policy if exists "See members of your groups" on public.chat_group_members;
create policy "See members of your groups"
  on public.chat_group_members for select
  using (public.is_group_member(group_id, auth.uid()));

-- Only the owner adds people. Their own first row passes this too, because
-- the group they just created is one they own.
drop policy if exists "Owner adds members" on public.chat_group_members;
create policy "Owner adds members"
  on public.chat_group_members for insert
  with check (exists (select 1 from public.chat_groups g where g.id = group_id and g.owner_id = auth.uid()));

-- Leaving is always yours to do; the owner may also remove someone.
drop policy if exists "Leave or be removed by the owner" on public.chat_group_members;
create policy "Leave or be removed by the owner"
  on public.chat_group_members for delete
  using (
    user_id = auth.uid()
    or exists (select 1 from public.chat_groups g where g.id = group_id and g.owner_id = auth.uid())
  );

drop policy if exists "Read your groups' messages" on public.group_messages;
create policy "Read your groups' messages"
  on public.group_messages for select
  using (public.is_group_member(group_id, auth.uid()));

drop policy if exists "Write to your groups" on public.group_messages;
create policy "Write to your groups"
  on public.group_messages for insert
  with check (sender_id = auth.uid() and public.is_group_member(group_id, auth.uid()));

drop policy if exists "Delete your own group message" on public.group_messages;
create policy "Delete your own group message"
  on public.group_messages for delete
  using (sender_id = auth.uid());

drop policy if exists "Read your groups' reactions" on public.group_message_reactions;
create policy "Read your groups' reactions"
  on public.group_message_reactions for select
  using (exists (
    select 1 from public.group_messages m
    where m.id = message_id and public.is_group_member(m.group_id, auth.uid())
  ));

drop policy if exists "React in your groups" on public.group_message_reactions;
create policy "React in your groups"
  on public.group_message_reactions for insert
  with check (user_id = auth.uid() and exists (
    select 1 from public.group_messages m
    where m.id = message_id and public.is_group_member(m.group_id, auth.uid())
  ));

drop policy if exists "Change your own group reaction" on public.group_message_reactions;
create policy "Change your own group reaction"
  on public.group_message_reactions for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Remove your own group reaction" on public.group_message_reactions;
create policy "Remove your own group reaction"
  on public.group_message_reactions for delete
  using (user_id = auth.uid());

-- As with direct messages, a DELETE event has to carry enough of the old row
-- for RLS to work out who may see it.
alter table public.group_messages replica identity full;

do $$ begin
  alter publication supabase_realtime add table public.group_messages;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.group_message_reactions;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.chat_group_members;
exception when duplicate_object then null;
end $$;
