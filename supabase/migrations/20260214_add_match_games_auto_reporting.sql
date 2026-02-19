-- 20260214_add_match_games_auto_reporting.sql

begin;

-- =====================================================
-- 1. BRKT MATCH GAMES TABLE
-- Stores individual game (map) results within a match series
-- =====================================================
create table if not exists public.brkt_match_games (
  id uuid default gen_random_uuid() primary key,
  match_id uuid not null references public.brkt_matches(id) on delete cascade,
  game_number integer not null, -- 1, 2, 3...
  map_id uuid references public.game_maps(id) on delete set null, -- The map played
  riot_match_id text unique, -- Linked Riot Match ID
  
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  
  winner_id uuid references public.teams(id) on delete set null,
  loser_id uuid references public.teams(id) on delete set null,
  
  -- Round scores for this map
  team1_score integer default 0,
  team2_score integer default 0,
  
  -- Detailed stats (snapshot)
  match_details jsonb, -- Snapshot of KDA, etc. if needed
  
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Constraints
  unique(match_id, game_number)
);

-- Indexes
create index if not exists idx_brkt_match_games_match on public.brkt_match_games(match_id);
create index if not exists idx_brkt_match_games_riot_id on public.brkt_match_games(riot_match_id);

-- Enable RLS
alter table public.brkt_match_games enable row level security;

-- Policies
-- Public Read
create policy brkt_match_games_select_public on public.brkt_match_games
  for select using (true);

-- Updates: Service Role (Edge Functions) or Organizer
create policy brkt_match_games_modify_service on public.brkt_match_games
  for all using (
    auth.role() = 'service_role' 
    or exists (
      select 1 from public.brkt_matches bm
      join public.brkt_versions bv on bv.id = bm.version_id
      join public.tournaments t on t.id = bv.tournament_id
      where bm.id = match_id and t.organizer_id = auth.uid()
    )
  );

-- =====================================================
-- 2. UPDATES TO BRKT_MATCHES
-- Add automated_report_status to the main match table
-- =====================================================
alter table public.brkt_matches 
add column if not exists automated_report_status text default 'idle' check (automated_report_status in ('idle', 'processing', 'verified', 'failed', 'partial'));

commit;
