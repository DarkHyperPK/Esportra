-- Extend tournament_matches to support proper bracket progression
-- Idempotent: safe to run multiple times

begin;

-- Basic columns
alter table if exists public.tournament_matches
  add column if not exists team1_id uuid,
  add column if not exists team2_id uuid,
  add column if not exists team1_score integer default 0,
  add column if not exists team2_score integer default 0,
  add column if not exists status text check (status in ('pending','in_progress','completed')) default 'pending',
  add column if not exists scheduled_at timestamptz,
  add column if not exists winner_team_id uuid,
  add column if not exists best_of integer default 1;

-- Uniqueness per bracket position
do $$ begin
  alter table public.tournament_matches
  add constraint tournament_matches_unique_slot unique (tournament_id, round, match_number);
exception when duplicate_object then null; end $$;

-- FKs (teams)
do $$ begin
  alter table public.tournament_matches
    add constraint tournament_matches_team1_fk foreign key (team1_id) references public.teams(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.tournament_matches
    add constraint tournament_matches_team2_fk foreign key (team2_id) references public.teams(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.tournament_matches
    add constraint tournament_matches_winner_fk foreign key (winner_team_id) references public.teams(id) on delete set null;
exception when duplicate_object then null; end $$;

-- Helpful index
do $$ begin
  create index tournament_matches_tournament_round_match_idx on public.tournament_matches(tournament_id, round, match_number);
exception when duplicate_table then null; end $$;

-- RLS policies: public read; only tournament organizer or service_role can write
-- Ensure RLS is enabled
alter table if exists public.tournament_matches enable row level security;

-- Public read
do $$ begin
  create policy tm_select_public on public.tournament_matches for select using (true);
exception when duplicate_object then null; end $$;

-- Organizer update/insert/delete for their tournament
do $$ begin
  create policy tm_modify_organizer on public.tournament_matches for update using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and (t.organizer_id = auth.uid())
    ) or auth.role() = 'service_role'
  ) with check (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and (t.organizer_id = auth.uid())
    ) or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy tm_insert_organizer on public.tournament_matches for insert with check (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and (t.organizer_id = auth.uid())
    ) or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy tm_delete_organizer on public.tournament_matches for delete using (
    exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and (t.organizer_id = auth.uid())
    ) or auth.role() = 'service_role'
  );
exception when duplicate_object then null; end $$;

-- Tighten result uploads to require team captain and match participation
-- Assumes tournament_match_results table exists
-- Update/Insert policies may already exist; add a stricter one for insert
do $$ begin
  create policy tmr_insert_captain_participant on public.tournament_match_results
  for insert
  with check (
    reporter_user_id = auth.uid()
    and team_id is not null
    and match_id is not null
    and exists (
      select 1 from public.team_members tm
      where tm.team_id = tournament_match_results.team_id
        and tm.user_id = auth.uid()
        and tm.is_active = true
        and (tm.role = 'captain'::team_member_role)
    )
    and exists (
      select 1 from public.tournament_matches m
      where m.id = tournament_match_results.match_id
        and (m.team1_id = tournament_match_results.team_id or m.team2_id = tournament_match_results.team_id)
    )
  );
exception when duplicate_object then null; end $$;

commit;


