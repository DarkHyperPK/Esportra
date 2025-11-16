-- Add party_code column to tournament_matches for live match party codes
-- Idempotent: safe to run multiple times

begin;

alter table if exists public.tournament_matches
  add column if not exists party_code text;

-- Create index for party code lookups
create index if not exists idx_tournament_matches_party_code on public.tournament_matches(party_code) where party_code is not null;

comment on column public.tournament_matches.party_code is 'Unique party code for live matches, visible only to team captains';

commit;

