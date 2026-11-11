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
  -- Только ключи 'cat:%'. Раунд, сыгранный в режиме, записывается дважды —
  -- под своей категорией и под самим режимом, — и сумма по всем ключам
  -- засчитывала бы его два раза. Под категорией лежит каждый раунд, и
  -- режимный тоже, так что это полный список и ровно по одному разу.
  coalesce((select sum((value->>'bestScore')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_score,
  coalesce((select sum((value->>'totalCorrect')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_correct,
  coalesce((select sum((value->>'totalQuestions')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_questions,
  coalesce((select sum((value->>'gamesPlayed')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_games
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

-- The group's picture: a public URL into the same `avatars` bucket as
-- profile photos. It lives under the owner's own folder (named `group-<id>-…`
-- so removing a profile photo doesn't take it along), which is why the
-- existing storage policies already cover it — only the owner can put one
-- there, and only the owner may change a group anyway.
alter table public.chat_groups add column if not exists avatar_url text;

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

-- The owner clause is not redundant with membership: a group is created
-- before anybody, the owner included, is a member of it. Without it the
-- INSERT ... RETURNING that creates a group reads back nothing, and so does
-- the subquery in "Owner adds members" below — so creating a group failed
-- outright.
drop policy if exists "See groups you belong to" on public.chat_groups;
create policy "See groups you belong to"
  on public.chat_groups for select
  using (owner_id = auth.uid() or public.is_group_member(id, auth.uid()));

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

-- Only the owner adds people. Their own first row passes this too — but only
-- because the select policy above lets an owner see a group they are not yet
-- a member of; this subquery is subject to that policy.
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

-- ---------------------------------------------------------------------------
-- Push notifications. A row per device rather than a column on `profiles`:
-- one account can be signed in on a phone and a tablet, and both should be
-- reachable. The device's language rides along because the server composes
-- the notification text and has no other way to know it.
-- ---------------------------------------------------------------------------

create table if not exists public.push_tokens (
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null check (platform in ('ios', 'android')),
  language text not null default 'ru' check (language in ('ru', 'en')),
  updated_at timestamptz not null default now(),
  primary key (user_id, token)
);

alter table public.push_tokens enable row level security;

-- Only ever your own: nobody needs to read where somebody else is signed in,
-- and the function that actually sends uses the service role.
drop policy if exists "See your own push tokens" on public.push_tokens;
create policy "See your own push tokens"
  on public.push_tokens for select
  using (auth.uid() = user_id);

drop policy if exists "Register your own push token" on public.push_tokens;
create policy "Register your own push token"
  on public.push_tokens for insert
  with check (auth.uid() = user_id);

drop policy if exists "Refresh your own push token" on public.push_tokens;
create policy "Refresh your own push token"
  on public.push_tokens for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Drop your own push token" on public.push_tokens;
create policy "Drop your own push token"
  on public.push_tokens for delete
  using (auth.uid() = user_id);

create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

-- What this device has asked not to be told about. The app's notification
-- switches are per device, so they live on the device's own row: the send
-- functions read `muted` in the same query that finds the token, and a
-- device that has muted a category is never handed to the push service.
--
-- The list of categories is the one in supabase/functions/_shared/push.ts
-- and src/notifications/notificationSettings.ts; a test keeps all three
-- the same.
alter table public.push_tokens
  add column if not exists muted text[] not null default '{}';

alter table public.push_tokens drop constraint if exists push_tokens_muted_known;
alter table public.push_tokens
  add constraint push_tokens_muted_known
  check (muted <@ array['friends', 'battles', 'tournament']::text[]);

-- ============================================================
-- Weekly tournament: 16 players, double elimination, matches best of three.
--
-- Registration runs all week and closes when the tournament starts at the
-- weekend. If more than 16 have signed up, the highest rated get in —
-- rating being the same leaderboard score the app already shows. Seats
-- nobody claimed are filled with bots so a small week still runs.
--
-- Reads go through RLS; every write is done by the `tournament` Edge
-- Function with the service role. The tables carry no insert or update
-- policy at all, deliberately: seeds, pairings and game results decide who
-- advances, so a client able to write them could seat itself into the final.
--
-- Replaces the earlier instant 32-seat lobby, which is now a practice mode
-- played against bots on the device with no server state at all. Dropped
-- rather than left behind: they never held a finished tournament, and a dead
-- table with live policies is worse than no table.
-- ============================================================

drop table if exists public.tournament_matches cascade;
drop table if exists public.tournament_seats cascade;
drop table if exists public.tournaments cascade;
drop function if exists public.is_tournament_entrant(uuid, uuid);

create table if not exists public.weekly_tournaments (
  id uuid primary key default gen_random_uuid(),
  -- the Monday registration opened on: one tournament per week, and a
  -- natural key that makes a duplicate impossible
  week_start date not null unique,
  -- registration -> running -> finished
  status text not null default 'registration',
  starts_at timestamptz not null,
  champion_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create table if not exists public.tournament_registrations (
  tournament_id uuid not null references public.weekly_tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  registered_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

-- The bracket's 16 seats, fixed once the tournament starts. Rating is the
-- snapshot it was seeded on, so the bracket does not reshuffle when somebody
-- plays a quiz mid-tournament.
create table if not exists public.tournament_entrants (
  tournament_id uuid not null references public.weekly_tournaments(id) on delete cascade,
  seed int not null,
  user_id uuid references auth.users(id) on delete set null,
  name text not null,
  rating int not null default 0,
  primary key (tournament_id, seed)
);

-- One row per game of a match. The row appears when the first player hands a
-- score in and is decided once both have, or once the deadline passes.
-- match_id is the bracket's own id: wb0-0, lb3-1, gf.
create table if not exists public.tournament_games (
  tournament_id uuid not null references public.weekly_tournaments(id) on delete cascade,
  match_id text not null,
  game_no int not null,
  score_a int,
  score_b int,
  submitted_a timestamptz,
  submitted_b timestamptz,
  -- 'a' or 'b'; null while the game is still open
  winner text,
  deadline timestamptz,
  primary key (tournament_id, match_id, game_no)
);

alter table public.weekly_tournaments enable row level security;
alter table public.tournament_registrations enable row level security;
alter table public.tournament_entrants enable row level security;
alter table public.tournament_games enable row level security;

-- A tournament is public reading: the bracket is worth watching even if you
-- are not in it, and it holds nothing but usernames and scores.
drop policy if exists "Anyone signed in can watch a tournament" on public.weekly_tournaments;
create policy "Anyone signed in can watch a tournament"
  on public.weekly_tournaments for select
  using (auth.uid() is not null);

drop policy if exists "Anyone signed in can see the entrants" on public.tournament_entrants;
create policy "Anyone signed in can see the entrants"
  on public.tournament_entrants for select
  using (auth.uid() is not null);

drop policy if exists "Anyone signed in can see the games" on public.tournament_games;
create policy "Anyone signed in can see the games"
  on public.tournament_games for select
  using (auth.uid() is not null);

-- Registrations are a headcount, so the count is public but who signed up is
-- only ever your own row.
drop policy if exists "See your own registration" on public.tournament_registrations;
create policy "See your own registration"
  on public.tournament_registrations for select
  using (auth.uid() = user_id);

create index if not exists weekly_tournaments_status_idx on public.weekly_tournaments (status, starts_at);
create index if not exists tournament_registrations_user_idx on public.tournament_registrations (user_id);
create index if not exists tournament_entrants_user_idx on public.tournament_entrants (user_id);

-- Lets the bracket update itself while somebody is watching it.
do $$ begin
  alter publication supabase_realtime add table public.weekly_tournaments;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.tournament_games;
exception when duplicate_object then null;
end $$;

-- The achievements screen shows the date each one was earned, keyed by
-- achievement id. Older profiles simply start empty and fill in as they play.
alter table public.profiles add column if not exists achievement_dates jsonb not null default '{}'::jsonb;

-- ============================================================
-- КОШЕЛЁК И МАГАЗИН
--
-- Медали, очки и покупки переехали с телефона на сервер. Ни одна из
-- таблиц ниже не имеет политик insert/update/delete — писать в них может
-- только Edge Function `shop` (и `tournament`, которая начисляет медали)
-- под service role. Клиент может лишь читать свои строки.
-- ============================================================

-- Что человек выиграл. Одна строка на турнир на игрока, поэтому повторный
-- вызов расчёта не начислит медаль дважды.
create table if not exists public.tournament_medals (
  tournament_id uuid not null references public.weekly_tournaments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  place int not null,
  -- gold / silver / bronze, или null за место ниже третьего
  medal text,
  -- Сколько очков это принесло. Заморожено в момент начисления: если курс
  -- когда-нибудь поменяется, уже заработанное не пересчитается.
  points int not null default 0,
  awarded_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

alter table public.tournament_medals enable row level security;

drop policy if exists "See your own medals" on public.tournament_medals;
create policy "See your own medals"
  on public.tournament_medals for select
  using (auth.uid() = user_id);

create index if not exists tournament_medals_user_idx on public.tournament_medals (user_id);

-- Что куплено. Цифровой предмет — одна строка; расходник — тоже строка,
-- а его остаток лежит рядом в shop_inventory.
create table if not exists public.shop_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  paid_with text not null check (paid_with in ('points', 'rub')),
  points_spent int not null default 0,
  rub_amount int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.shop_purchases enable row level security;

drop policy if exists "See your own purchases" on public.shop_purchases;
create policy "See your own purchases"
  on public.shop_purchases for select
  using (auth.uid() = user_id);

create index if not exists shop_purchases_user_idx on public.shop_purchases (user_id);

-- Сколько расходников осталось.
create table if not exists public.shop_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  consumable text not null,
  count int not null default 0 check (count >= 0),
  primary key (user_id, consumable)
);

alter table public.shop_inventory enable row level security;

drop policy if exists "See your own inventory" on public.shop_inventory;
create policy "See your own inventory"
  on public.shop_inventory for select
  using (auth.uid() = user_id);

-- Заказы на физические товары. Адрес лежит здесь, а не на телефоне, иначе
-- заказ просто некуда отправлять.
create table if not exists public.shop_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lines jsonb not null,
  total_rub int not null default 0,
  total_points int not null default 0,
  paid_with text not null check (paid_with in ('points', 'rub')),
  delivery jsonb not null,
  status text not null default 'awaitingPayment',
  created_at timestamptz not null default now()
);

alter table public.shop_orders enable row level security;

drop policy if exists "See your own orders" on public.shop_orders;
create policy "See your own orders"
  on public.shop_orders for select
  using (auth.uid() = user_id);

create index if not exists shop_orders_user_idx on public.shop_orders (user_id, created_at desc);

-- Баланс — производная величина, а не хранимое число: заработанное минус
-- потраченное. Второго счётчика, который может разъехаться с первым, нет.
create or replace function public.shop_balance(p_user uuid)
returns int
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce((select sum(points) from public.tournament_medals where user_id = p_user), 0)
    - coalesce((select sum(points_spent) from public.shop_purchases where user_id = p_user), 0)
    - coalesce((select sum(total_points) from public.shop_orders where user_id = p_user), 0);
$$;

revoke execute on function public.shop_balance(uuid) from anon, authenticated;

/*
 * Покупка цифрового предмета. Цену передаёт Edge Function — она одна знает
 * каталог, клиент цену не присылает никогда.
 *
 * Проверка баланса и списание происходят в одном операторе под блокировкой
 * строк пользователя, иначе два быстрых нажатия подряд оба прошли бы
 * проверку и увели баланс в минус.
 */
create or replace function public.shop_buy(
  p_user uuid,
  p_item text,
  p_points int,
  p_rub int,
  p_paid text,
  p_consumable text default null,
  p_amount int default 0
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
begin
  if p_paid = 'points' then
    -- Блокируем медали игрока на время проверки: пока идёт эта транзакция,
    -- параллельная покупка ждёт, а не считает тот же баланс второй раз.
    perform 1 from public.tournament_medals where user_id = p_user for update;
    v_balance := public.shop_balance(p_user);
    if v_balance < p_points then
      raise exception 'not enough points' using errcode = 'P0001';
    end if;
  end if;

  insert into public.shop_purchases (user_id, item_id, paid_with, points_spent, rub_amount)
  values (p_user, p_item, p_paid, case when p_paid = 'points' then p_points else 0 end,
          case when p_paid = 'rub' then p_rub else 0 end);

  if p_consumable is not null and p_amount > 0 then
    insert into public.shop_inventory (user_id, consumable, count)
    values (p_user, p_consumable, p_amount)
    on conflict (user_id, consumable) do update set count = public.shop_inventory.count + excluded.count;
  end if;

  return public.shop_balance(p_user);
end;
$$;

revoke execute on function public.shop_buy(uuid, text, int, int, text, text, int) from anon, authenticated;

/* Заказ физических товаров. Те же правила, плюс адрес доставки. */
create or replace function public.shop_place_order(
  p_user uuid,
  p_lines jsonb,
  p_delivery jsonb,
  p_points int,
  p_rub int,
  p_paid text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
  v_id uuid;
begin
  if p_paid = 'points' then
    perform 1 from public.tournament_medals where user_id = p_user for update;
    v_balance := public.shop_balance(p_user);
    if v_balance < p_points then
      raise exception 'not enough points' using errcode = 'P0001';
    end if;
  end if;

  insert into public.shop_orders (user_id, lines, delivery, total_points, total_rub, paid_with, status)
  values (
    p_user, p_lines, p_delivery,
    case when p_paid = 'points' then p_points else 0 end,
    case when p_paid = 'rub' then p_rub else 0 end,
    p_paid,
    case when p_paid = 'points' then 'paid' else 'awaitingPayment' end
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.shop_place_order(uuid, jsonb, jsonb, int, int, text) from anon, authenticated;

/*
 * Расход одной штуки. Условие в самом UPDATE, поэтому два одновременных
 * списания не могут увести остаток ниже нуля.
 */
create or replace function public.shop_spend(p_user uuid, p_consumable text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_left int;
begin
  update public.shop_inventory
     set count = count - 1
   where user_id = p_user and consumable = p_consumable and count > 0
  returning count into v_left;

  return v_left is not null;
end;
$$;

revoke execute on function public.shop_spend(uuid, text) from anon, authenticated;

-- Оплата мерча картой. Заказ живёт в статусе awaitingPayment, пока ЮKassa
-- не подтвердит платёж своим вебхуком; id платежа хранится здесь, чтобы
-- вебхук нашёл заказ, а расхождения можно было свести с выпиской.
alter table public.shop_orders add column if not exists payment_id text;
alter table public.shop_orders add column if not exists paid_at timestamptz;

create index if not exists shop_orders_payment_idx on public.shop_orders (payment_id);

-- ============================================================
-- МЕССЕНДЖЕР: правка, пересылка, непрочитанное в группах,
-- «был(а) в сети».
--
-- Всё ниже — добавки к уже существующим `messages`, `group_messages`
-- и `profiles`; таблицы и политики выше не меняются.
-- ============================================================

-- Когда сообщение правили. null — его не правили ни разу, и тогда клиент
-- не рисует пометку «изм.». Храним момент правки, а не просто флаг: по нему
-- видно, что изменилось позже прочтения.
alter table public.messages add column if not exists edited_at timestamptz;
alter table public.group_messages add column if not exists edited_at timestamptz;

-- Имя автора пересланного сообщения. Берём имя, а не id: пересылка — это
-- копия текста, она должна подписываться даже если исходное сообщение
-- удалили или автора больше нет среди друзей, а на внешний id у клиента в
-- этот момент может не быть прав по RLS.
alter table public.messages add column if not exists forwarded_from text;
alter table public.group_messages add column if not exists forwarded_from text;

-- Правка идёт через функцию, а не через политику UPDATE.
--
-- У `messages` уже есть политика «обновлять может получатель» — она нужна,
-- чтобы отметить сообщение прочитанным. Если добавить рядом вторую,
-- «обновлять может отправитель», Postgres сложит их через OR, и отправитель
-- получит доступ ко всей строке целиком, включая `read` — то есть сможет
-- проставить галочку прочтения на своём же сообщении. Функция сужает право
-- до ровно двух колонок и проверяет авторство сама.
create or replace function public.edit_message(p_id uuid, p_body text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  update public.messages
     set body = p_body, edited_at = v_now
   where id = p_id and sender_id = auth.uid();

  if not found then return null; end if;
  return v_now;
end;
$$;

grant execute on function public.edit_message(uuid, text) to authenticated;

create or replace function public.edit_group_message(p_id uuid, p_body text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  update public.group_messages
     set body = p_body, edited_at = v_now
   where id = p_id and sender_id = auth.uid();

  if not found then return null; end if;
  return v_now;
end;
$$;

grant execute on function public.edit_group_message(uuid, text) to authenticated;

-- Непрочитанное в группах. В личной переписке за это отвечает
-- `messages.read`, но у группового сообщения нет одного получателя, который
-- мог бы его прочитать: читают его по-разному десять человек. Поэтому здесь
-- не флаг на сообщении, а засечка на участнике — до какого момента он
-- дочитал. Непрочитанное считается как «сообщений в группе новее засечки».
create table if not exists public.group_reads (
  group_id uuid not null references public.chat_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.group_reads enable row level security;

-- Засечка — вещь личная: её видит и двигает только сам участник.
drop policy if exists "See your own read marks" on public.group_reads;
create policy "See your own read marks"
  on public.group_reads for select
  using (auth.uid() = user_id);

drop policy if exists "Set your own read mark" on public.group_reads;
create policy "Set your own read mark"
  on public.group_reads for insert
  with check (auth.uid() = user_id and public.is_group_member(group_id, auth.uid()));

drop policy if exists "Move your own read mark" on public.group_reads;
create policy "Move your own read mark"
  on public.group_reads for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Список чатов берёт по одному последнему сообщению на собеседника и на
-- группу, то есть читает хвост обеих таблиц по времени. Индексы на
-- (кто, когда) уже есть у `messages`; группам такой нужен свой.
create index if not exists group_messages_group_time_idx
  on public.group_messages (group_id, created_at desc);

-- «Был(а) в сети». Одна отметка на профиль, которую приложение двигает, пока
-- оно открыто. Клиенту этого достаточно и для «онлайн» (отметка свежее
-- минуты), и для «был(а) в сети в 14:30».
alter table public.profiles add column if not exists last_seen_at timestamptz;

-- Отметку надо видеть не только у себя: статус собеседника показывается в
-- шапке переписки и в списке чатов. Политики `profiles` открывают только
-- свою строку, поэтому колонка добавляется в `leaderboard` — то же
-- «безопасное представление над закрытой таблицей», через которое уже
-- ходят имя и аватар. Представление пересоздаётся целиком: CREATE OR
-- REPLACE VIEW умеет только дописывать колонки в конец, а `last_seen_at`
-- встаёт рядом с остальными полями профиля.
drop view if exists public.leaderboard cascade;
create view public.leaderboard as
select
  id,
  username,
  avatar,
  streak,
  achievements,
  stats,
  last_seen_at,
  -- Только ключи 'cat:%'. Раунд, сыгранный в режиме, записывается дважды —
  -- под своей категорией и под самим режимом, — и сумма по всем ключам
  -- засчитывала бы его два раза. Под категорией лежит каждый раунд, и
  -- режимный тоже, так что это полный список и ровно по одному разу.
  coalesce((select sum((value->>'bestScore')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_score,
  coalesce((select sum((value->>'totalCorrect')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_correct,
  coalesce((select sum((value->>'totalQuestions')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_questions,
  coalesce((select sum((value->>'gamesPlayed')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_games
from public.profiles;

grant select on public.leaderboard to authenticated;

-- ============================================================
-- ВЛОЖЕНИЯ В ПЕРЕПИСКЕ: фото и файлы.
--
-- Сами файлы лежат в Storage, в строке сообщения — только путь к ним.
-- Ведро закрытое: ссылки на скачивание подписанные и живут час, так что
-- чужую переписку нельзя прочитать, даже зная путь.
-- ============================================================

alter table public.messages add column if not exists attachment_path text;
alter table public.messages add column if not exists attachment_kind text;
alter table public.messages add column if not exists attachment_name text;
alter table public.messages add column if not exists attachment_size integer;
alter table public.messages add column if not exists attachment_width integer;
alter table public.messages add column if not exists attachment_height integer;

alter table public.group_messages add column if not exists attachment_path text;
alter table public.group_messages add column if not exists attachment_kind text;
alter table public.group_messages add column if not exists attachment_name text;
alter table public.group_messages add column if not exists attachment_size integer;
alter table public.group_messages add column if not exists attachment_width integer;
alter table public.group_messages add column if not exists attachment_height integer;

do $$ begin
  alter table public.messages add constraint messages_attachment_kind_check
    check (attachment_kind is null or attachment_kind in ('image', 'file'));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.group_messages add constraint group_messages_attachment_kind_check
    check (attachment_kind is null or attachment_kind in ('image', 'file'));
exception when duplicate_object then null;
end $$;

-- Текст перестаёт быть обязательным, когда к сообщению приложен файл:
-- фото без подписи — это нормальное сообщение, а не пустое.
--
-- Старое ограничение ставил сам Postgres при создании таблицы, поэтому
-- оно ищется по каталогу, а не по угаданному имени: на базе, созданной
-- другой версией файла, оно могло называться иначе.
do $$
declare c record;
begin
  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.messages'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%char_length(body)%'
  loop
    execute format('alter table public.messages drop constraint %I', c.conname);
  end loop;

  for c in
    select conname
      from pg_constraint
     where conrelid = 'public.group_messages'::regclass
       and contype = 'c'
       and pg_get_constraintdef(oid) ilike '%char_length(body)%'
  loop
    execute format('alter table public.group_messages drop constraint %I', c.conname);
  end loop;
end $$;

do $$ begin
  alter table public.messages add constraint messages_body_check
    check (char_length(body) <= 1000 and (char_length(body) > 0 or attachment_path is not null));
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.group_messages add constraint group_messages_body_check
    check (char_length(body) <= 2000 and (char_length(body) > 0 or attachment_path is not null));
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Ведро для вложений.
--
-- В отличие от `avatars` оно закрытое: аватар видит кто угодно, а фото из
-- личной переписки — только её участники. Читается оно подписанными
-- ссылками, которые выдаёт сервер, проверив политику ниже.
--
-- Разрешены только картинки и `application/octet-stream`. Это не
-- случайность: любой файл, кроме картинки, кладётся как octet-stream, даже
-- если на самом деле это PDF или HTML. Иначе браузер, открыв подписанную
-- ссылку, отрисовал бы присланный HTML прямо на домене хранилища — то есть
-- чужой скрипт выполнился бы там, где лежат файлы всех переписок. Тип
-- нужен клиенту только для картинок (их рисует <Image>), остальное он
-- отдаёт системе по имени файла.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media', 'chat-media', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/octet-stream']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

/**
 * Кому можно трогать файл — решает его путь.
 *
 * `dm/<id1>_<id2>/<файл>` — личная переписка: доступ есть, если твой id
 * один из двух в имени папки. Порядок id не проверяется, важно только
 * попадание; одинаковый порядок с обеих сторон — забота клиента, он
 * сортирует их, чтобы оба нашли одну и ту же папку.
 *
 * `group/<id группы>/<файл>` — группа: доступ есть у её участников.
 *
 * Функция, а не выражение прямо в политике, по двум причинам: членство в
 * группе читается через `is_group_member` (она SECURITY DEFINER, иначе
 * политики на самой таблице участников зациклились бы), и приведение
 * имени папки к uuid нужно сначала проверить — иначе путь с мусором вместо
 * id роняет запрос ошибкой приведения типа вместо тихого отказа.
 */
create or replace function public.can_use_chat_media(object_name text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  parts text[] := storage.foldername(object_name);
  scope text;
  key text;
begin
  if auth.uid() is null or coalesce(array_length(parts, 1), 0) < 2 then
    return false;
  end if;

  scope := parts[1];
  key := parts[2];

  if scope = 'dm' then
    return auth.uid()::text = any (string_to_array(key, '_'));
  elsif scope = 'group' then
    if key !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      return false;
    end if;
    return public.is_group_member(key::uuid, auth.uid());
  end if;

  return false;
end;
$$;

grant execute on function public.can_use_chat_media(text) to authenticated;

drop policy if exists "Read attachments from your own chats" on storage.objects;
create policy "Read attachments from your own chats"
  on storage.objects for select
  using (bucket_id = 'chat-media' and public.can_use_chat_media(name));

drop policy if exists "Attach files to your own chats" on storage.objects;
create policy "Attach files to your own chats"
  on storage.objects for insert
  with check (bucket_id = 'chat-media' and public.can_use_chat_media(name));

-- Удалять — только своё: вложение уходит вместе с сообщением, а удалить
-- сообщение может лишь тот, кто его написал. Без проверки владельца
-- собеседник смог бы стереть присланный ему файл из чужого сообщения.
drop policy if exists "Delete attachments you uploaded" on storage.objects;
create policy "Delete attachments you uploaded"
  on storage.objects for delete
  using (bucket_id = 'chat-media' and owner = auth.uid() and public.can_use_chat_media(name));

-- ============================================================
-- ГОЛОСОВЫЕ СООБЩЕНИЯ.
--
-- Это третий вид вложения рядом с фото и файлом: те же колонки, то же
-- ведро, те же политики — добавляется только длительность и разрешение
-- на звуковые типы.
-- ============================================================

-- Длительность записи. Нужна в строке, а не вычисляется при открытии: пузырь
-- рисует «0:07» и дорожку сразу, не дожидаясь, пока файл скачается.
alter table public.messages add column if not exists attachment_duration_ms integer;
alter table public.group_messages add column if not exists attachment_duration_ms integer;

-- Ограничение пересоздаётся, а не добавляется: на базе, где файл уже
-- прогоняли, оно существует и разрешает только 'image' и 'file', а
-- `add constraint` в блоке с перехватом duplicate_object такую строку
-- молча оставил бы как есть — и голосовые не вставлялись бы.
alter table public.messages drop constraint if exists messages_attachment_kind_check;
alter table public.messages add constraint messages_attachment_kind_check
  check (attachment_kind is null or attachment_kind in ('image', 'file', 'voice'));

alter table public.group_messages drop constraint if exists group_messages_attachment_kind_check;
alter table public.group_messages add constraint group_messages_attachment_kind_check
  check (attachment_kind is null or attachment_kind in ('image', 'file', 'voice'));

-- Звуковые типы к разрешённым.
--
-- Голосовое, в отличие от остальных файлов, хранится под своим настоящим
-- типом, а не как octet-stream — плееру он нужен, чтобы запись вообще
-- заиграла. Это безопасно по той же причине, что и у картинок: браузер,
-- открыв подписанную ссылку на аудио, его проигрывает, а не исполняет.
-- Опасен был бы только тип, который на домене хранилища превращается в
-- код, — поэтому список закрытый, а не `audio/*`.
--
-- Записывается m4a на телефоне и webm в вебе, отсюда два типа.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-media', 'chat-media', false, 10485760,
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/mp4', 'audio/mpeg', 'audio/webm', 'audio/aac',
    'application/octet-stream'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ============================================================
-- РЕЙТИНГ ИГРОКА.
--
-- Очки = пройдено вопросов × множитель скорости. «Пройдено вопросов» —
-- это лучший результат на каждой ступени каждой категории, сложенный
-- вместе: число ограничено сверху, поэтому рейтинг нельзя нагриндить
-- долгой игрой без новых рекордов. Множитель (от 0.5 до 2.0) зависит от
-- среднего времени ответа.
--
-- Считает приложение и кладёт сюда вместе со статистикой: посчитать это
-- в представлении нельзя — нужна длина раунда каждой ступени, а она живёт
-- в коде. Число здесь — копия для ранжирования, правда — в stats.
-- ============================================================

alter table public.profiles add column if not exists rating integer not null default 0;

drop view if exists public.leaderboard cascade;
create view public.leaderboard as
select
  id,
  username,
  avatar,
  streak,
  achievements,
  stats,
  last_seen_at,
  rating,
  -- Только ключи 'cat:%'. Раунд, сыгранный в режиме, записывается дважды —
  -- под своей категорией и под самим режимом, — и сумма по всем ключам
  -- засчитывала бы его два раза. Под категорией лежит каждый раунд, и
  -- режимный тоже, так что это полный список и ровно по одному разу.
  coalesce((select sum((value->>'bestScore')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_score,
  coalesce((select sum((value->>'totalCorrect')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_correct,
  coalesce((select sum((value->>'totalQuestions')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_questions,
  coalesce((select sum((value->>'gamesPlayed')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_games
from public.profiles;

grant select on public.leaderboard to authenticated;

-- ============================================================
-- ПОБЕДЫ НАД ЖИВЫМИ ИГРОКАМИ: турниры.
--
-- Вторая половина рейтинга. Пройденные вопросы говорят, сколько игрок
-- взял у самой игры; это — сколько он взял у других людей.
--
--   турнир: золото 30, серебро 20, бронза 12, просто доигранный 5
--
-- Только турнир: его сервер проводит раз в неделю, гриндить нечего. Битву
-- фанатов можно играть с кем угодно и сколько угодно, поэтому очков она
-- не даёт — иначе рейтинг достался бы тому, у кого терпеливее друг.
--
-- Медали в магазине — тот же турнир с другой стороны, и остаются на
-- устройстве: здесь лежит только то, что нужно рейтингу.
-- ============================================================

alter table public.profiles add column if not exists victories jsonb;

drop view if exists public.leaderboard cascade;
create view public.leaderboard as
select
  id,
  username,
  avatar,
  streak,
  achievements,
  stats,
  last_seen_at,
  rating,
  -- Только ключи 'cat:%'. Раунд, сыгранный в режиме, записывается дважды —
  -- под своей категорией и под самим режимом, — и сумма по всем ключам
  -- засчитывала бы его два раза. Под категорией лежит каждый раунд, и
  -- режимный тоже, так что это полный список и ровно по одному разу.
  coalesce((select sum((value->>'bestScore')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_score,
  coalesce((select sum((value->>'totalCorrect')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_correct,
  coalesce((select sum((value->>'totalQuestions')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_questions,
  coalesce((select sum((value->>'gamesPlayed')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_games
from public.profiles;

grant select on public.leaderboard to authenticated;

-- ============================================================
-- РЕЙТИНГ В НЕДЕЛЬНОЙ И СЕЗОННОЙ ТАБЛИЦАХ.
--
-- Эти две ранжируются по ответам внутри периода, но профиль игрока,
-- открытый из любой таблицы, показывает его рейтинг — а это другое
-- число. Поэтому оно едет вместе со строкой.
-- ============================================================

drop view if exists public.leaderboard_weekly cascade;
create view public.leaderboard_weekly as
select
  p.id,
  p.username,
  p.avatar,
  p.rating,
  coalesce(sum(r.score) filter (where r.created_at >= date_trunc('week', now())), 0) as period_score,
  coalesce(sum(r.total) filter (where r.created_at >= date_trunc('week', now())), 0) as period_questions
from public.profiles p
left join public.round_results r on r.user_id = p.id
group by p.id, p.username, p.avatar, p.rating;

grant select on public.leaderboard_weekly to authenticated;

drop view if exists public.leaderboard_season cascade;
create view public.leaderboard_season as
select
  p.id,
  p.username,
  p.avatar,
  p.rating,
  coalesce(sum(r.score) filter (where r.created_at >= date_trunc('month', now())), 0) as period_score,
  coalesce(sum(r.total) filter (where r.created_at >= date_trunc('month', now())), 0) as period_questions
from public.profiles p
left join public.round_results r on r.user_id = p.id
group by p.id, p.username, p.avatar, p.rating;

grant select on public.leaderboard_season to authenticated;

-- ============================================================
-- РЕЙТИНГ СЧИТАЕТСЯ ИЗ СТАТИСТИКИ, А НЕ БЕРЁТСЯ ИЗ КОЛОНКИ.
--
-- В profiles.rating лежит копия — по ней сервер сортирует таблицу, больше
-- она ни для чего. Пишет её приложение самого игрока, поэтому она бывает
-- пустой (профиль не открывали с тех пор, как рейтинг появился) или на
-- раунд устаревшей. Статистика такой не бывает, так что число, которое
-- видят другие, выводится из неё — для этого представления и отдают stats
-- и victories.
--
-- Недельная и сезонная таблицы ранжируются ответами за период, но профиль,
-- открытый из любой из них, показывает рейтинг — значит, и им нужны те же
-- два поля.
-- ============================================================

drop view if exists public.leaderboard cascade;
create view public.leaderboard as
select
  id,
  username,
  avatar,
  streak,
  achievements,
  stats,
  victories,
  last_seen_at,
  rating,
  -- Только ключи 'cat:%'. Раунд, сыгранный в режиме, записывается дважды —
  -- под своей категорией и под самим режимом, — и сумма по всем ключам
  -- засчитывала бы его два раза.
  coalesce((select sum((value->>'bestScore')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_score,
  coalesce((select sum((value->>'totalCorrect')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_correct,
  coalesce((select sum((value->>'totalQuestions')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_questions,
  coalesce((select sum((value->>'gamesPlayed')::int) from jsonb_each(stats) where key like 'cat:%'), 0) as total_games
from public.profiles;

grant select on public.leaderboard to authenticated;

drop view if exists public.leaderboard_weekly cascade;
create view public.leaderboard_weekly as
select
  p.id,
  p.username,
  p.avatar,
  p.stats,
  p.victories,
  coalesce((
    select sum(r.score) from public.round_results r
    where r.user_id = p.id and r.created_at >= date_trunc('week', now())
  ), 0) as period_score,
  coalesce((
    select sum(r.total) from public.round_results r
    where r.user_id = p.id and r.created_at >= date_trunc('week', now())
  ), 0) as period_questions
from public.profiles p;

grant select on public.leaderboard_weekly to authenticated;

drop view if exists public.leaderboard_season cascade;
create view public.leaderboard_season as
select
  p.id,
  p.username,
  p.avatar,
  p.stats,
  p.victories,
  coalesce((
    select sum(r.score) from public.round_results r
    where r.user_id = p.id and r.created_at >= date_trunc('month', now())
  ), 0) as period_score,
  coalesce((
    select sum(r.total) from public.round_results r
    where r.user_id = p.id and r.created_at >= date_trunc('month', now())
  ), 0) as period_questions
from public.profiles p;

grant select on public.leaderboard_season to authenticated;

-- ============================================================
-- ПОКУПКА ЗА РЕАЛЬНЫЕ ДЕНЬГИ ЧЕРЕЗ БИЛЛИНГ МАГАЗИНА
-- (Google Play Billing / Apple StoreKit)
--
-- Мерч оплачивается картой через ЮKassa (выше), а косметика и расходники —
-- через биллинг самого магазина приложений: для цифровых товаров это не
-- выбор, а требование Google и Apple.
--
-- Всё ниже — добавка; таблицы выше не меняются, кроме одного расширенного
-- check: в paid_with у shop_purchases появляется третье значение.
-- ============================================================

-- Чем оплачено: медальными очками, картой через эквайринг или биллингом
-- магазина. Старый check пересоздаётся, потому что `create table if not
-- exists` на уже существующей базе его бы не тронул.
--
-- Только у shop_purchases: через биллинг магазина продаётся лишь цифровое,
-- а заказ (shop_orders) бывает только на мерч, и 'store' там означал бы
-- состояние, которого код не создаёт.
alter table public.shop_purchases drop constraint if exists shop_purchases_paid_with_check;
alter table public.shop_purchases
  add constraint shop_purchases_paid_with_check check (paid_with in ('points', 'rub', 'store'));

/*
 * Каждый платёж, пришедший из магазина приложений.
 *
 * Смысл таблицы — ровно в уникальности purchase_key. Клиент приносит чек
 * столько раз, сколько потребуется (приложение убили посреди оплаты, сеть
 * пропала после списания, медленный способ оплаты дошёл через три дня), и
 * повторная попытка обязана выдать предмет один раз, а не каждый раз.
 * Ключ — purchase token у Google и transaction id у Apple.
 *
 * Сумму не храним: покупатель платит в своей валюте по цене, которую
 * назначает магазин, и единственная достоверная выписка — у магазина.
 */
create table if not exists public.shop_store_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  store text not null check (store in ('play', 'apple')),
  purchase_key text not null unique,
  product_id text not null,
  store_order_id text,
  created_at timestamptz not null default now()
);

alter table public.shop_store_purchases enable row level security;

drop policy if exists "See your own store purchases" on public.shop_store_purchases;
create policy "See your own store purchases"
  on public.shop_store_purchases for select
  using (auth.uid() = user_id);

create index if not exists shop_store_purchases_user_idx on public.shop_store_purchases (user_id);

/*
 * Выдача предмета по подтверждённому чеку магазина.
 *
 * Функцию вызывает Edge Function и только после того, как сама спросила
 * Google или Apple, был ли платёж. Чек от клиента здесь не проверяется —
 * к этому моменту он уже проверен у магазина.
 *
 * Возвращает 'granted' или 'duplicate'. Второе — не ошибка: значит этот же
 * платёж уже выдан, и приложению остаётся лишь закрыть транзакцию.
 */
create or replace function public.shop_claim_store_purchase(
  p_user uuid,
  p_item text,
  p_store text,
  p_key text,
  p_product text,
  p_order text default null,
  p_consumable text default null,
  p_amount int default 0
)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Гонка решается не проверкой перед вставкой, а самим уникальным
  -- индексом: два одновременных запроса с одним ключом вставят строку
  -- один раз, второй уйдёт в do nothing.
  insert into public.shop_store_purchases (user_id, item_id, store, purchase_key, product_id, store_order_id)
  values (p_user, p_item, p_store, p_key, p_product, p_order)
  on conflict (purchase_key) do nothing;

  if not found then
    return 'duplicate';
  end if;

  insert into public.shop_purchases (user_id, item_id, paid_with, points_spent, rub_amount)
  values (p_user, p_item, 'store', 0, 0);

  if p_consumable is not null and p_amount > 0 then
    insert into public.shop_inventory (user_id, consumable, count)
    values (p_user, p_consumable, p_amount)
    on conflict (user_id, consumable) do update set count = public.shop_inventory.count + excluded.count;
  end if;

  return 'granted';
end;
$$;

revoke execute on function public.shop_claim_store_purchase(uuid, text, text, text, text, text, text, int)
  from anon, authenticated;

-- ============================================================
-- ТУРНИР: СЧЁТ СЧИТАЕТ СЕРВЕР
--
-- Раньше приложение само присылало счёт сыгранной партии, и функция ему
-- верила — любому целому от 0 до 7. Теперь партию сначала «сдают»: функция
-- выдаёт сид, приложение играет ровно ту викторину, что из него получается,
-- и присылает, какой вариант выбран в каждом вопросе. Счёт считает функция
-- по ключу ответов (supabase/functions/_shared/tournamentKey.ts).
-- ============================================================

/*
 * Что и когда было сдано игроку на конкретную партию.
 *
 * Строка одна на (партию, сторону) и перезаписывается при каждом новом
 * старте: засчитывается только последняя раздача. attempts считает старты —
 * без потолка можно было бы открывать партию, смотреть первый вопрос и
 * выходить, пока не выпадет лёгкий набор.
 *
 * Политик нет намеренно: читает и пишет таблицу только функция, сервисным
 * ключом. Сид игроку она отдаёт сама, а чужой сид никому не нужен.
 */
create table if not exists public.tournament_tickets (
  tournament_id uuid not null references public.weekly_tournaments(id) on delete cascade,
  match_id text not null,
  game_no int not null,
  side text not null check (side in ('a', 'b')),
  seed int not null,
  attempts int not null default 1,
  issued_at timestamptz not null default now(),
  primary key (tournament_id, match_id, game_no, side)
);

alter table public.tournament_tickets enable row level security;

-- ============================================================
-- РЕЗУЛЬТАТЫ РАУНДОВ: ГРАНИЦЫ
--
-- round_results пишет приложение игрока, и проверить обычный раунд сервер
-- не может — он играется на телефоне. Сделать эти строки правдой нельзя,
-- но можно сделать их правдоподобными: счёт не больше длины раунда, раунд
-- не длиннее самого длинного режима, время ставит сервер, и строк не
-- больше, чем человек успевает сыграть.
--
-- До этого сюда принималось что угодно: score = 1 000 000, дата из
-- прошлого сезона, тысяча строк в секунду — и недельная с сезонной
-- таблицы показывали бы это как есть.
-- ============================================================

-- 30 — самый длинный раунд в игре (режим с жизнями, src/data/modes.ts);
-- тест сверяет число с режимами. NOT VALID: правило действует на новые
-- строки, а уже лежащие не перепроверяются — иначе одна старая кривая
-- строка не дала бы прогнать схему.
alter table public.round_results drop constraint if exists round_results_bounds;
alter table public.round_results
  add constraint round_results_bounds check (total between 1 and 30 and score between 0 and total) not valid;

create or replace function public.round_results_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last timestamptz;
  v_day int;
begin
  -- Время ставит сервер. Иначе раунд можно «сыграть» задним числом — в
  -- прошлую неделю или в сезон, который уже подведён.
  new.created_at := now();

  select max(created_at) into v_last from public.round_results where user_id = new.user_id;
  -- Самый короткий раунд — шесть вопросов; за пять секунд его не сыграть.
  if v_last is not null and v_last > now() - interval '5 seconds' then
    raise exception 'round logged too soon after the last one' using errcode = 'P0001';
  end if;

  select count(*) into v_day
    from public.round_results
   where user_id = new.user_id and created_at > now() - interval '24 hours';
  -- Шестьсот раундов в сутки — это больше шести часов игры без пауз.
  if v_day >= 600 then
    raise exception 'daily round limit reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists round_results_guard on public.round_results;
create trigger round_results_guard
  before insert on public.round_results
  for each row execute function public.round_results_guard();

-- ============================================================
-- МОДЕРАЦИЯ: БЛОКИРОВКА И ЖАЛОБЫ
--
-- В приложении есть личные сообщения, группы, фото и голосовые — то есть
-- пользовательский контент. И Google, и Apple требуют для такого двух
-- вещей: возможности заблокировать человека и возможности пожаловаться на
-- сообщение или на автора. Здесь обе.
--
-- Блокировка действует на сервере, а не «скрывает в приложении»: правила
-- вставки ниже не дадут заблокированному написать, позвать в друзья, в
-- битву или в группу, каким бы клиентом он ни пользовался.
-- ============================================================

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;

-- Видит блокировку только тот, кто её поставил. Заблокированному таблица
-- не скажет ничего — узнать, кто тебя заблокировал, отсюда нельзя.
-- Вставки и удаления идут через функции ниже, поэтому политик на них нет.
drop policy if exists "See who you have blocked" on public.user_blocks;
create policy "See who you have blocked"
  on public.user_blocks for select
  using (auth.uid() = blocker_id);

create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);

/*
 * Стоит ли между двумя людьми блокировка — в любую сторону.
 *
 * security definer, потому что спрашивать приходится и заблокированному:
 * его вставку проверяет политика, а строку блокировки он читать не вправе.
 * Чтобы функцией нельзя было выведывать чужие отношения, она отвечает
 * только тому, кто сам один из двоих; про любую другую пару — всегда «нет».
 */
create or replace function public.blocked_between(p_a uuid, p_b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() in (p_a, p_b) and exists (
    select 1 from public.user_blocks
     where (blocker_id = p_a and blocked_id = p_b)
        or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

revoke all on function public.blocked_between(uuid, uuid) from public;
grant execute on function public.blocked_between(uuid, uuid) to authenticated;

/*
 * Заблокировать. Одной транзакцией ставит блокировку и рвёт всё, что этих
 * двоих связывало: дружбу (или заявку) в любую сторону и неотвеченные
 * приглашения в битву. Иначе заблокированный оставался бы в друзьях — с
 * чатом в списке и правом вызвать на бой.
 */
create or replace function public.block_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'not signed in' using errcode = 'P0001';
  end if;
  if p_user = v_me then
    raise exception 'cannot block yourself' using errcode = 'P0001';
  end if;

  insert into public.user_blocks (blocker_id, blocked_id)
  values (v_me, p_user)
  on conflict do nothing;

  delete from public.friendships
   where (requester_id = v_me and addressee_id = p_user)
      or (requester_id = p_user and addressee_id = v_me);

  delete from public.battle_invites
   where status = 'pending'
     and ((from_user_id = v_me and to_user_id = p_user)
       or (from_user_id = p_user and to_user_id = v_me));
end;
$$;

revoke all on function public.block_user(uuid) from public;
grant execute on function public.block_user(uuid) to authenticated;

-- Разблокировать. Дружбу не возвращает: это решение обеих сторон заново.
create or replace function public.unblock_user(p_user uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.user_blocks where blocker_id = auth.uid() and blocked_id = p_user;
$$;

revoke all on function public.unblock_user(uuid) from public;
grant execute on function public.unblock_user(uuid) to authenticated;

-- Правила вставки: всё то же, что было, плюс «между вами нет блокировки».
-- Имена политик прежние, поэтому определения выше по файлу заменяются.

drop policy if exists "Send messages as yourself" on public.messages;
create policy "Send messages as yourself"
  on public.messages for insert
  with check (auth.uid() = sender_id and not public.blocked_between(sender_id, recipient_id));

drop policy if exists "Send friend requests as yourself" on public.friendships;
create policy "Send friend requests as yourself"
  on public.friendships for insert
  with check (auth.uid() = requester_id and not public.blocked_between(requester_id, addressee_id));

drop policy if exists "Send battle invites as yourself" on public.battle_invites;
create policy "Send battle invites as yourself"
  on public.battle_invites for insert
  with check (auth.uid() = from_user_id and not public.blocked_between(from_user_id, to_user_id));

-- В группу нельзя добавить того, с кем стоит блокировка: иначе её обходили
-- бы, создав «группу на двоих».
drop policy if exists "Owner adds members" on public.chat_group_members;
create policy "Owner adds members"
  on public.chat_group_members for insert
  with check (
    exists (select 1 from public.chat_groups g where g.id = group_id and g.owner_id = auth.uid())
    and not public.blocked_between(auth.uid(), user_id)
  );

/*
 * Жалобы.
 *
 * В строке лежит снимок того, на что пожаловались: текст и путь вложения
 * на момент жалобы. Сообщение после этого можно отредактировать или
 * удалить — разбирать тогда было бы нечего, а именно так и поступит тот,
 * на кого пожаловались.
 *
 * Политик нет вовсе: приложение сюда не читает и напрямую не пишет. Пишет
 * функция report_content, читает разработчик — представлением
 * moderation_queue из панели Supabase.
 */
create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('direct_message', 'group_message', 'user')),
  -- Без внешнего ключа намеренно: жалоба должна пережить удаление сообщения.
  message_id uuid,
  group_id uuid,
  reason text not null check (reason in ('spam', 'abuse', 'inappropriate', 'other')),
  comment text check (comment is null or char_length(comment) <= 500),
  body_snapshot text,
  attachment_snapshot text,
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);

alter table public.content_reports enable row level security;

-- Одно сообщение один человек обжалует один раз.
create unique index if not exists content_reports_once
  on public.content_reports (reporter_id, message_id) where message_id is not null;
create index if not exists content_reports_open_idx on public.content_reports (status, created_at desc);
create index if not exists content_reports_target_idx on public.content_reports (target_user_id);

/*
 * Пожаловаться на сообщение или на человека.
 *
 * Функция сама находит сообщение и сама решает, на кого жалоба: клиент
 * присылает только id. Пожаловаться можно лишь на то, что видишь — на
 * личное сообщение из своей переписки или на сообщение группы, в которой
 * состоишь, — и нельзя на самого себя.
 */
create or replace function public.report_content(
  p_kind text,
  p_message uuid,
  p_user uuid,
  p_reason text,
  p_comment text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_target uuid;
  v_body text;
  v_attachment text;
  v_group uuid;
begin
  if v_me is null then
    raise exception 'not signed in' using errcode = 'P0001';
  end if;
  if p_reason not in ('spam', 'abuse', 'inappropriate', 'other') then
    raise exception 'unknown reason' using errcode = 'P0001';
  end if;

  -- Жалоба — не оружие: тридцать в сутки хватит любому добросовестному
  -- человеку и не даст завалить очередь одному недобросовестному.
  if (select count(*) from public.content_reports
       where reporter_id = v_me and created_at > now() - interval '24 hours') >= 30 then
    raise exception 'too many reports' using errcode = 'P0001';
  end if;

  if p_kind = 'direct_message' then
    select sender_id, body, attachment_path into v_target, v_body, v_attachment
      from public.messages
     where id = p_message and (sender_id = v_me or recipient_id = v_me);
    if not found then
      raise exception 'message not found' using errcode = 'P0001';
    end if;
  elsif p_kind = 'group_message' then
    select m.sender_id, m.body, m.attachment_path, m.group_id into v_target, v_body, v_attachment, v_group
      from public.group_messages m
     where m.id = p_message and public.is_group_member(m.group_id, v_me);
    if not found then
      raise exception 'message not found' using errcode = 'P0001';
    end if;
  elsif p_kind = 'user' then
    select id into v_target from public.profiles where id = p_user;
    if not found then
      raise exception 'user not found' using errcode = 'P0001';
    end if;
    p_message := null;
  else
    raise exception 'unknown kind' using errcode = 'P0001';
  end if;

  if v_target = v_me then
    raise exception 'cannot report yourself' using errcode = 'P0001';
  end if;

  insert into public.content_reports
    (reporter_id, target_user_id, kind, message_id, group_id, reason, comment, body_snapshot, attachment_snapshot)
  values
    (v_me, v_target, p_kind, p_message, v_group, p_reason, nullif(left(btrim(coalesce(p_comment, '')), 500), ''), v_body, v_attachment)
  on conflict (reporter_id, message_id) where message_id is not null do nothing;
end;
$$;

revoke all on function public.report_content(text, uuid, uuid, text, text) from public;
grant execute on function public.report_content(text, uuid, uuid, text, text) to authenticated;

/*
 * Очередь разбора — для панели Supabase, не для приложения.
 *
 * security_invoker: представление читает с правами смотрящего, а у
 * игроков политик на content_reports нет, так что даже при случайно
 * выданном праве оно вернуло бы им пустоту. Права всё равно отозваны.
 */
drop view if exists public.moderation_queue;
create view public.moderation_queue with (security_invoker = true) as
select
  r.id,
  r.created_at,
  r.status,
  r.kind,
  r.reason,
  r.comment,
  reporter.username as reporter,
  target.username as target,
  r.target_user_id,
  r.body_snapshot,
  r.attachment_snapshot,
  r.message_id,
  r.group_id,
  (select count(*) from public.content_reports x where x.target_user_id = r.target_user_id) as reports_on_target
from public.content_reports r
left join public.profiles reporter on reporter.id = r.reporter_id
left join public.profiles target on target.id = r.target_user_id
order by r.created_at desc;

revoke all on public.moderation_queue from anon, authenticated;

-- ============================================================
-- ЕЖЕДНЕВНЫЕ ЗАДАНИЯ: НАГРАДА
--
-- Три задания в день выбирает само приложение по дате, прогресс по ним
-- оно же и считает — раунды играются на телефоне, и проверить их сервер
-- не может. Поэтому сервер не проверяет, а ограничивает: награда одна в
-- день, и какая именно — решает он сам, по дате. Худшее, чего добьётся
-- нечестный клиент, — один расходник в сутки, который ему и так полагался
-- бы за три сыгранных раунда.
-- ============================================================

create table if not exists public.daily_rewards (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  consumable text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

-- Политик нет: таблицу читает и пишет только функция shop.
alter table public.daily_rewards enable row level security;

/*
 * Выдать награду дня. Возвращает false, если за этот день она уже выдана:
 * первичный ключ (игрок, день) и есть вся защита от повторной выдачи, в
 * том числе от двух одновременных запросов.
 */
create or replace function public.shop_claim_daily(p_user uuid, p_day date, p_consumable text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.daily_rewards (user_id, day, consumable)
  values (p_user, p_day, p_consumable)
  on conflict (user_id, day) do nothing;

  if not found then
    return false;
  end if;

  insert into public.shop_inventory (user_id, consumable, count)
  values (p_user, p_consumable, 1)
  on conflict (user_id, consumable) do update set count = public.shop_inventory.count + 1;

  return true;
end;
$$;

revoke execute on function public.shop_claim_daily(uuid, date, text) from anon, authenticated;

-- ============================================================
-- ОШИБКА В ВОПРОСЕ
--
-- Кнопка под ответом в квизе. Вопросы собираются на телефоне из каталога,
-- который меняется от версии к версии, поэтому жалоба несёт не только
-- ключ вопроса, но и сам вопрос, каким его видел игрок: текст, варианты и
-- тот, что приложение сочло верным. По ключу жалобы складываются, по
-- снимку видно, что именно было не так.
--
-- Политик нет: приложение сюда не читает и напрямую не пишет. Пишет
-- функция report_question, читает разработчик — представлением
-- question_report_queue из панели Supabase.
-- ============================================================

create table if not exists public.question_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  -- Предмет и тип вопроса, например naruto-guessQuote. Одинаков у всех,
  -- кому этот вопрос попался.
  question_key text not null check (char_length(question_key) between 3 and 120),
  language text not null check (language in ('ru', 'en')),
  reason text not null check (reason in ('wrongAnswer', 'ambiguous', 'typo', 'media', 'other')),
  comment text check (comment is null or char_length(comment) <= 500),
  prompt text check (prompt is null or char_length(prompt) <= 600),
  options jsonb,
  correct_index smallint,
  picked_index smallint,
  app_version text check (app_version is null or char_length(app_version) <= 40),
  status text not null default 'open' check (status in ('open', 'fixed', 'dismissed')),
  created_at timestamptz not null default now()
);

alter table public.question_reports enable row level security;

-- Один игрок — одна жалоба на вопрос на одном языке; повторная заменяет
-- прежнюю, а не добавляется к счёту.
create unique index if not exists question_reports_once
  on public.question_reports (reporter_id, question_key, language);
create index if not exists question_reports_open_idx
  on public.question_reports (status, question_key);

/*
 * Сообщить об ошибке в вопросе.
 *
 * Всё, что приходит от клиента, — текст для человека, который будет это
 * читать, и ни на что в игре не влияет. Поэтому проверяется только то,
 * что это текст разумного размера: вариантов не больше шести и не
 * длиннее двухсот знаков каждый.
 */
create or replace function public.report_question(
  p_key text,
  p_language text,
  p_reason text,
  p_comment text default null,
  p_prompt text default null,
  p_options jsonb default null,
  p_correct integer default null,
  p_picked integer default null,
  p_version text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'not signed in' using errcode = 'P0001';
  end if;
  if p_reason not in ('wrongAnswer', 'ambiguous', 'typo', 'media', 'other') then
    raise exception 'unknown reason' using errcode = 'P0001';
  end if;
  if p_language not in ('ru', 'en') then
    raise exception 'unknown language' using errcode = 'P0001';
  end if;
  if p_key is null or char_length(p_key) not between 3 and 120 then
    raise exception 'bad question' using errcode = 'P0001';
  end if;
  if p_options is not null and (
       jsonb_typeof(p_options) <> 'array'
       or jsonb_array_length(p_options) > 6
       or exists (
         select 1 from jsonb_array_elements(p_options) o
          where jsonb_typeof(o) <> 'string' or char_length(o #>> '{}') > 200
       )
     ) then
    raise exception 'bad options' using errcode = 'P0001';
  end if;

  -- Сорок в сутки: столько ошибок за день честно не найти, а завалить
  -- очередь одному человеку это не даст.
  if (select count(*) from public.question_reports
       where reporter_id = v_me and created_at > now() - interval '24 hours') >= 40 then
    raise exception 'too many reports' using errcode = 'P0001';
  end if;

  insert into public.question_reports
    (reporter_id, question_key, language, reason, comment, prompt, options, correct_index, picked_index, app_version)
  values
    (v_me, p_key, p_language, p_reason, nullif(left(btrim(coalesce(p_comment, '')), 500), ''),
     left(p_prompt, 600), p_options,
     case when p_correct between 0 and 5 then p_correct end,
     case when p_picked between -1 and 5 then p_picked end,
     left(p_version, 40))
  on conflict (reporter_id, question_key, language) do update
    set reason = excluded.reason,
        comment = excluded.comment,
        prompt = excluded.prompt,
        options = excluded.options,
        correct_index = excluded.correct_index,
        picked_index = excluded.picked_index,
        app_version = excluded.app_version;
end;
$$;

revoke all on function public.report_question(text, text, text, text, text, jsonb, integer, integer, text) from public;
grant execute on function public.report_question(text, text, text, text, text, jsonb, integer, integer, text) to authenticated;

/*
 * Очередь разбора — для панели Supabase, не для приложения. Одна строка
 * на вопрос и язык: сколько человек пожаловалось, на что, и последний
 * снимок вопроса. Наверху те, на кого жалоб больше.
 *
 * Разобрав вопрос, закройте его жалобы:
 *   update public.question_reports set status = 'fixed'
 *    where question_key = '…' and language = 'ru';
 */
drop view if exists public.question_report_queue;
create view public.question_report_queue with (security_invoker = true) as
select
  r.question_key,
  r.language,
  count(*) as reports,
  count(*) filter (where r.reason = 'wrongAnswer') as wrong_answer,
  count(*) filter (where r.reason = 'ambiguous') as ambiguous,
  count(*) filter (where r.reason = 'typo') as typo,
  count(*) filter (where r.reason = 'media') as media,
  count(*) filter (where r.reason = 'other') as other,
  max(r.created_at) as last_reported,
  (array_agg(r.prompt order by r.created_at desc))[1] as prompt,
  (array_agg(r.options order by r.created_at desc))[1] as options,
  (array_agg(r.correct_index order by r.created_at desc))[1] as correct_index,
  (array_agg(r.app_version order by r.created_at desc))[1] as app_version,
  array_remove(array_agg(r.comment order by r.created_at desc), null) as comments
from public.question_reports r
where r.status = 'open'
group by r.question_key, r.language
order by count(*) desc, max(r.created_at) desc;

revoke all on public.question_report_queue from anon, authenticated;
