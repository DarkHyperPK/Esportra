-- Map Veto System for Esportra
-- Enables map banning/vetoing similar to mapban.gg

begin;

-- =====================================================
-- 1. GAME MAPS TABLE
-- Stores all available maps per game
-- =====================================================
create table if not exists public.game_maps (
  id uuid default gen_random_uuid() primary key,
  game text not null,
  map_name text not null,
  map_image_url text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Unique constraint: one map name per game
  unique(game, map_name)
);

-- Index for faster lookups
create index if not exists idx_game_maps_game on public.game_maps(game) where is_active = true;

-- =====================================================
-- 2. TOURNAMENT MAP POOLS TABLE
-- Organizers can configure which maps are available for their tournament
-- =====================================================
create table if not exists public.tournament_map_pools (
  id uuid default gen_random_uuid() primary key,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  map_id uuid not null references public.game_maps(id) on delete cascade,
  created_at timestamptz default now(),
  
  -- Unique constraint: one map per tournament pool
  unique(tournament_id, map_id)
);

-- Index for faster lookups
create index if not exists idx_tournament_map_pools_tournament on public.tournament_map_pools(tournament_id);

-- =====================================================
-- 3. MATCH MAP VETO PROCESS TABLE
-- Tracks the veto process state for each match
-- =====================================================
create table if not exists public.match_map_vetos (
  id uuid default gen_random_uuid() primary key,
  match_id uuid not null references public.tournament_matches(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team1_id uuid references public.teams(id) on delete set null,
  team2_id uuid references public.teams(id) on delete set null,
  
  -- Veto process state
  veto_format text default 'standard_7' check (veto_format in (
    'standard_7',      -- Ban-Ban-Pick-Pick-Ban-Ban-Pick (7 maps)
    'standard_5',      -- Ban-Ban-Pick-Pick-Ban (5 maps)
    'standard_9'       -- Ban-Ban-Pick-Pick-Ban-Ban-Pick-Pick-Ban (9 maps)
  )),
  
  -- Current state
  status text default 'pending' check (status in ('pending', 'in_progress', 'completed', 'cancelled')),
  current_team_id uuid references public.teams(id) on delete set null, -- Whose turn it is
  current_action text check (current_action in ('ban', 'pick')), -- Current action type
  current_action_number integer default 0, -- Which action in the sequence (1, 2, 3, etc.)
  
  -- Timer
  turn_started_at timestamptz,
  turn_duration_seconds integer default 120, -- 2 minutes default
  
  -- Results
  team1_banned_maps uuid[] default '{}', -- Array of map_ids
  team2_banned_maps uuid[] default '{}',
  selected_map_id uuid references public.game_maps(id) on delete set null, -- Final selected map
  
  -- Metadata
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Unique constraint: one veto process per match
  unique(match_id)
);

-- Indexes
create index if not exists idx_match_map_vetos_match on public.match_map_vetos(match_id);
create index if not exists idx_match_map_vetos_tournament on public.match_map_vetos(tournament_id);
create index if not exists idx_match_map_vetos_status on public.match_map_vetos(status);

-- =====================================================
-- 4. MATCH MAP VETO ACTIONS TABLE
-- Log of all veto actions taken
-- =====================================================
create table if not exists public.match_map_veto_actions (
  id uuid default gen_random_uuid() primary key,
  veto_id uuid not null references public.match_map_vetos(id) on delete cascade,
  match_id uuid not null references public.tournament_matches(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete set null,
  action_type text not null check (action_type in ('ban', 'pick', 'pick_side', 'auto_pick')),
  map_id uuid not null references public.game_maps(id) on delete cascade,
  action_number integer not null, -- Sequence number (1, 2, 3, etc.)
  created_at timestamptz default now(),
  
  -- Unique constraint: prevent duplicate actions
  unique(veto_id, action_number)
);

-- Indexes
create index if not exists idx_match_map_veto_actions_veto on public.match_map_veto_actions(veto_id);
create index if not exists idx_match_map_veto_actions_match on public.match_map_veto_actions(match_id);

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
alter table public.game_maps enable row level security;
alter table public.tournament_map_pools enable row level security;
alter table public.match_map_vetos enable row level security;
alter table public.match_map_veto_actions enable row level security;

-- Game Maps: Public read, service role write
do $$ begin
  create policy game_maps_select_public on public.game_maps
    for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy game_maps_modify_service on public.game_maps
    for all using (auth.role() = 'service_role');
exception when duplicate_object then null; end $$;

-- Tournament Map Pools: Public read, organizer write
do $$ begin
  create policy tournament_map_pools_select_public on public.tournament_map_pools
    for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy tournament_map_pools_modify_organizer on public.tournament_map_pools
    for all using (
      exists (
        select 1 from public.tournaments t
        where t.id = tournament_id and t.organizer_id = auth.uid()
      ) or auth.role() = 'service_role'
    );
exception when duplicate_object then null; end $$;

-- Match Map Vetos: Public read, captains/organizer write
do $$ begin
  create policy match_map_vetos_select_public on public.match_map_vetos
    for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy match_map_vetos_modify_captain on public.match_map_vetos
    for update using (
      -- Organizer can update
      exists (
        select 1 from public.tournaments t
        where t.id = tournament_id and t.organizer_id = auth.uid()
      )
      or
      -- Team captain of current team can update
      (
        current_team_id is not null and
        exists (
          select 1 from public.team_members tm
          where tm.team_id = current_team_id
            and tm.user_id = auth.uid()
            and tm.role = 'captain'
            and tm.is_active = true
        )
      )
      or auth.role() = 'service_role'
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy match_map_vetos_insert_organizer on public.match_map_vetos
    for insert with check (
      exists (
        select 1 from public.tournaments t
        where t.id = tournament_id and t.organizer_id = auth.uid()
      ) or auth.role() = 'service_role'
    );
exception when duplicate_object then null; end $$;

-- Match Map Veto Actions: Public read, captains/organizer insert
do $$ begin
  create policy match_map_veto_actions_select_public on public.match_map_veto_actions
    for select using (true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy match_map_veto_actions_insert_captain on public.match_map_veto_actions
    for insert with check (
      -- Organizer can insert
      exists (
        select 1 from public.match_map_vetos mmv
        join public.tournaments t on t.id = mmv.tournament_id
        where mmv.id = veto_id and t.organizer_id = auth.uid()
      )
      or
      -- Team captain can insert their own actions
      (
        team_id is not null and
        exists (
          select 1 from public.team_members tm
          where tm.team_id = team_id
            and tm.user_id = auth.uid()
            and tm.role = 'captain'
            and tm.is_active = true
        )
      )
      or auth.role() = 'service_role'
    );
exception when duplicate_object then null; end $$;

-- =====================================================
-- 6. HELPER FUNCTION: Initialize veto process
-- =====================================================
create or replace function public.initialize_match_veto(
  p_match_id uuid,
  p_veto_format text default 'standard_7'
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_veto_id uuid;
  v_match_record record;
  v_team1_id uuid;
  v_team2_id uuid;
begin
  -- Get match details
  select tournament_id, team1_id, team2_id
  into v_match_record
  from public.tournament_matches
  where id = p_match_id;
  
  if not found then
    raise exception 'Match not found';
  end if;
  
  -- Check if veto already exists
  select id into v_veto_id
  from public.match_map_vetos
  where match_id = p_match_id;
  
  if found then
    return v_veto_id; -- Return existing veto ID
  end if;
  
  -- Determine starting team (higher seed or random)
  v_team1_id := v_match_record.team1_id;
  v_team2_id := v_match_record.team2_id;
  
  -- Create new veto process
  insert into public.match_map_vetos (
    match_id,
    tournament_id,
    team1_id,
    team2_id,
    veto_format,
    status,
    current_team_id,
    current_action,
    current_action_number,
    turn_started_at,
    started_at
  ) values (
    p_match_id,
    v_match_record.tournament_id,
    v_team1_id,
    v_team2_id,
    p_veto_format,
    'in_progress',
    v_team1_id, -- Start with team1
    'ban', -- First action is always a ban
    1, -- First action
    now(),
    now()
  )
  returning id into v_veto_id;
  
  return v_veto_id;
end;
$$;

-- =====================================================
-- 7. COMMENTS
-- =====================================================
comment on table public.game_maps is 'Available maps for each game';
comment on table public.tournament_map_pools is 'Maps available for each tournament';
comment on table public.match_map_vetos is 'Map veto process state for each match';
comment on table public.match_map_veto_actions is 'Log of all veto actions taken';

commit;

