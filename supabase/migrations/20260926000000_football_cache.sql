-- Cache for the `football` Edge Function. football-data.org's free plan allows 10 calls per
-- minute for the whole app, so teams and recent results are stored here and shared by everyone.
-- Row level security is on with no policies: only the function (service role) can read or write.

create table if not exists public.football_teams (
  id integer primary key,
  name text not null,
  short_name text,
  tla text,
  crest text,
  competition text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.football_sync (
  competition text primary key,
  synced_at timestamptz not null
);

create table if not exists public.football_cache (
  key text primary key,
  body jsonb not null,
  fetched_at timestamptz not null default now()
);

alter table public.football_teams enable row level security;
alter table public.football_sync enable row level security;
alter table public.football_cache enable row level security;
