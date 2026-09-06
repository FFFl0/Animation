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
