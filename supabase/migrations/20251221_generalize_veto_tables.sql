-- Migration to generalize map veto tables and remove game-specific tables

-- 1. Ensure generic tables exist (idempotent checks)

-- match_map_vetos
CREATE TABLE IF NOT EXISTS public.match_map_vetos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    team1_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    team2_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    veto_format TEXT, -- 'BO1', 'BO3', etc.
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
    current_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    current_action TEXT, -- 'ban', 'pick', 'side_pick'
    current_action_number INTEGER DEFAULT 0,
    turn_started_at TIMESTAMPTZ,
    turn_duration_seconds INTEGER DEFAULT 60,
    team1_banned_maps TEXT[] DEFAULT '{}',
    team2_banned_maps TEXT[] DEFAULT '{}',
    selected_map_id UUID REFERENCES public.game_maps(id) ON DELETE SET NULL, -- For BO1
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    best_of INTEGER DEFAULT 1,
    team1_picked_maps JSONB DEFAULT '[]', -- Array of map IDs
    team2_picked_maps JSONB DEFAULT '[]', -- Array of map IDs
    team1_link_token TEXT,
    team2_link_token TEXT
);

-- match_map_veto_actions
CREATE TABLE IF NOT EXISTS public.match_map_veto_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    veto_id UUID NOT NULL REFERENCES public.match_map_vetos(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'ban', 'pick', 'side_pick'
    map_id UUID REFERENCES public.game_maps(id) ON DELETE SET NULL,
    action_number INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    side TEXT -- 'attack', 'defense' (if action_type is side_pick)
);

-- tournament_map_pools
CREATE TABLE IF NOT EXISTS public.tournament_map_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    map_id UUID NOT NULL REFERENCES public.game_maps(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tournament_id, map_id)
);

-- 2. Migrate Data from valorant_* tables

-- Migrate valorant_match_map_vetos -> match_map_vetos
-- Migrate valorant_match_map_vetos -> match_map_vetos
INSERT INTO public.match_map_vetos (
    id, match_id, tournament_id, team1_id, team2_id, 
    team1_link_token, team2_link_token, status, 
    selected_map_id, created_at, updated_at,
    current_team_id, current_action, current_action_number,
    turn_started_at, turn_duration_seconds,
    team1_banned_maps, team2_banned_maps,
    team1_picked_maps, team2_picked_maps,
    best_of
)
SELECT 
    v.id, v.match_id, v.tournament_id, v.team1_id, v.team2_id,
    v.team1_link_token, v.team2_link_token, v.status,
    v.selected_map_id, -- Direct copy as it is already a UUID
    v.created_at, v.updated_at,
    v.current_team_id, v.current_action, v.current_action_number,
    v.turn_started_at, v.turn_duration_seconds,
    v.team1_banned_maps, v.team2_banned_maps,
    v.team1_picked_maps, v.team2_picked_maps,
    v.best_of
FROM public.valorant_match_map_vetos v
ON CONFLICT (id) DO NOTHING;

-- Migrate valorant_match_map_veto_actions -> match_map_veto_actions
INSERT INTO public.match_map_veto_actions (
    id, veto_id, match_id, team_id, action_type, 
    map_id, action_number, created_at, side
)
SELECT 
    va.id, va.veto_id, v.match_id, va.team_id, va.action_type,
    va.map_id, -- Direct copy as confirmed by schema inspection
    va.action_number, -- Correct column name is action_number, not action_order
    va.created_at,
    va.side
FROM public.valorant_match_map_veto_actions va
JOIN public.valorant_match_map_vetos v ON v.id = va.veto_id
ON CONFLICT (id) DO NOTHING;

-- Migrate valorant_tournament_map_pools -> tournament_map_pools
-- Schema inspection confirmed map_id exists in valorant_tournament_map_pools
INSERT INTO public.tournament_map_pools (tournament_id, map_id, created_at)
SELECT 
    tp.tournament_id, 
    tp.map_id, 
    tp.created_at
FROM public.valorant_tournament_map_pools tp
ON CONFLICT (tournament_id, map_id) DO NOTHING;


-- 3. Drop old tables
DROP TABLE IF EXISTS public.valorant_match_map_veto_actions CASCADE;
DROP TABLE IF EXISTS public.valorant_match_map_vetos CASCADE;
DROP TABLE IF EXISTS public.valorant_tournament_map_pools CASCADE;

-- 4. Enable RLS on new tables (if not already)
ALTER TABLE public.match_map_vetos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_map_veto_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_map_pools ENABLE ROW LEVEL SECURITY;

-- Add policies (simplified for now, mirroring typical setup)
CREATE POLICY "Public read access" ON public.match_map_vetos FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.match_map_veto_actions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.tournament_map_pools FOR SELECT USING (true);

-- Organizer/Participant write policies would need to be added based on specific requirements
