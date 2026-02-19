-- 20260214_add_match_result_reports.sql
-- Match Result Reports: propose → accept/dispute verification flow

begin;

-- =====================================================
-- 1. MATCH RESULT REPORTS TABLE
-- Stores reported results that require opponent verification
-- =====================================================
create table if not exists public.match_result_reports (
  id uuid default gen_random_uuid() primary key,
  match_id uuid not null references public.brkt_matches(id) on delete cascade,
  game_number integer not null default 1,

  -- Reporter info
  reported_by uuid not null references auth.users(id),
  reported_by_team_id uuid not null references public.teams(id),

  -- Riot match data
  riot_match_id text not null,
  map_id uuid references public.game_maps(id) on delete set null,
  map_name text, -- denormalized for display

  -- Scores (round scores like 13-5)
  team1_score integer not null default 0,
  team2_score integer not null default 0,
  winner_team_id uuid references public.teams(id),

  -- Snapshot of match data (KDA, agents, etc.)
  match_data jsonb,

  -- Verification status
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'disputed')),

  -- Response from opposing captain
  responded_by uuid references auth.users(id),
  responded_at timestamptz,
  dispute_reason text,

  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  -- One pending/accepted report per game per match
  unique(match_id, game_number, riot_match_id)
);

-- Indexes
create index if not exists idx_match_result_reports_match on public.match_result_reports(match_id);
create index if not exists idx_match_result_reports_status on public.match_result_reports(match_id, status);

-- Enable RLS
alter table public.match_result_reports enable row level security;

-- Policies: Public read for match participants
create policy match_result_reports_select on public.match_result_reports
  for select using (true);

-- Insert: Authenticated users who are team captains in the match
create policy match_result_reports_insert on public.match_result_reports
  for insert with check (auth.uid() = reported_by);

-- Update: Opposing team captain (for accept/dispute) or service role
create policy match_result_reports_update on public.match_result_reports
  for update using (
    auth.role() = 'service_role'
    or auth.uid() != reported_by  -- opposing captain responds
  );

-- Enable realtime for live updates
alter publication supabase_realtime add table public.match_result_reports;

-- =====================================================
-- 2. ADD REGION TO RIOT_ACCOUNTS
-- Store the player's active Valorant shard for correct API routing
-- =====================================================
alter table public.riot_accounts
  add column if not exists region text;

commit;
