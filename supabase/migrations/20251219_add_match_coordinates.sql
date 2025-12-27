-- Add x and y coordinates to tournament_matches for fixed layout
alter table if exists public.tournament_matches
  add column if not exists x double precision,
  add column if not exists y double precision;
