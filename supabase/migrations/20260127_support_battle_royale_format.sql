-- Migration: support_battle_royale_format
-- Description: Adds scoring configuration and Battle Royale match tables

-- 1. Add scoring_config to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS scoring_config JSONB DEFAULT NULL;

-- 2. Create tournament_br_matches table (Tracks each match in a BR stage)
CREATE TABLE IF NOT EXISTS public.tournament_br_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES public.tournament_stages(id) ON DELETE CASCADE,
    match_number INTEGER NOT NULL,
    status TEXT CHECK (status IN ('pending', 'in_progress', 'completed')) DEFAULT 'pending',
    map_name TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(stage_id, match_number)
);

-- 3. Create tournament_br_match_results table (Tracks performance per team per match)
CREATE TABLE IF NOT EXISTS public.tournament_br_match_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID REFERENCES public.tournament_br_matches(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    kills INTEGER DEFAULT 0,
    placement INTEGER DEFAULT 0,
    placement_points INTEGER DEFAULT 0, -- Calculated based on scoring_config
    kill_points INTEGER DEFAULT 0,      -- Calculated based on scoring_config
    total_points INTEGER DEFAULT 0,     -- placement_points + kill_points
    evidence_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(match_id, team_id)
);

-- 4. Enable RLS
ALTER TABLE public.tournament_br_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_br_match_results ENABLE ROW LEVEL SECURITY;

-- 5. Policies for tournament_br_matches
-- Public read access
CREATE POLICY "Public can view BR matches" ON public.tournament_br_matches
    FOR SELECT USING (true);

-- Organizer/Admin write access
CREATE POLICY "Organizers can manage BR matches" ON public.tournament_br_matches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tournaments t
            WHERE t.id = tournament_br_matches.tournament_id
            AND t.organizer_id = auth.uid()
        )
    );

-- 6. Policies for tournament_br_match_results
-- Public read access
CREATE POLICY "Public can view BR results" ON public.tournament_br_match_results
    FOR SELECT USING (true);

-- Organizer/Admin write access
CREATE POLICY "Organizers can manage BR results" ON public.tournament_br_match_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tournament_br_matches m
            JOIN public.tournaments t ON t.id = m.tournament_id
            WHERE m.id = tournament_br_match_results.match_id
            AND t.organizer_id = auth.uid()
        )
    );
