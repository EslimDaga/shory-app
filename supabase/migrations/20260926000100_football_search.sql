-- Accent- and case-insensitive team search: "atletico" finds "Atlético". Filled by the function.
alter table public.football_teams add column if not exists search text not null default '';

create extension if not exists unaccent with schema extensions;

update public.football_teams
set search = lower(extensions.unaccent(concat_ws(' ', name, short_name, tla)));
