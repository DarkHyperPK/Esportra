-- Create Graph-Based Bracket Engine Tables

-- 1. Bracket Versions
-- Represents a specific instance of a bracket structure for a tournament.
-- Immutable once status is 'active'.
CREATE TABLE public.brkt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    activated_at TIMESTAMPTZ,
    
    -- Ensure unique version numbers per tournament
    UNIQUE(tournament_id, version_number)
);

-- 2. Matches (Nodes)
-- Represents a match node in the graph.
-- Does NOT store next_match_id (edges are separate).
CREATE TABLE public.brkt_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES public.brkt_versions(id) ON DELETE CASCADE,
    
    -- Structural Info
    round_index INTEGER NOT NULL, -- 0-indexed
    match_number INTEGER NOT NULL, -- 1-indexed within round
    bracket_type TEXT NOT NULL CHECK (bracket_type IN ('winners', 'losers', 'final')),
    
    -- Computed State (Denormalized for read performance, updated by triggers/events)
    team1_id UUID REFERENCES public.teams(id),
    team2_id UUID REFERENCES public.teams(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'disputed')),
    winner_id UUID REFERENCES public.teams(id),
    loser_id UUID REFERENCES public.teams(id),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Uniqueness: One match per position per version
    UNIQUE(version_id, bracket_type, round_index, match_number)
);

-- 3. Advancements (Edges)
-- Represents the directed edges of the graph.
-- Defines where the winner/loser of a match goes.
CREATE TABLE public.brkt_advancements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES public.brkt_versions(id) ON DELETE CASCADE,
    
    source_match_id UUID NOT NULL REFERENCES public.brkt_matches(id) ON DELETE CASCADE,
    target_match_id UUID NOT NULL REFERENCES public.brkt_matches(id) ON DELETE CASCADE,
    
    type TEXT NOT NULL CHECK (type IN ('winner', 'loser')),
    target_slot INTEGER NOT NULL CHECK (target_slot IN (1, 2)),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Constraints
    UNIQUE(source_match_id, type), -- A match can only have one winner destination and one loser destination
    UNIQUE(target_match_id, target_slot) -- A slot can only be filled by one source
);

-- 4. Match Events (Event Store)
-- Append-only log of all state changes.
-- Source of truth for match state.
CREATE TABLE public.brkt_match_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.brkt_matches(id) ON DELETE CASCADE,
    
    type TEXT NOT NULL CHECK (type IN (
        'participant_ready', -- Team assigned to slot
        'score_reported',    -- Score update
        'dispute_opened',    -- Dispute
        'match_finalized',   -- Winner declared
        'match_reset'        -- Admin reset
    )),
    
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Layout (Visuals)
-- Stores the calculated X/Y coordinates for the bracket.
-- Separated from logic to allow purely visual updates if needed.
CREATE TABLE public.brkt_layout (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID NOT NULL REFERENCES public.brkt_versions(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES public.brkt_matches(id) ON DELETE CASCADE,
    
    x INTEGER NOT NULL,
    y INTEGER NOT NULL,
    
    UNIQUE(version_id, match_id)
);

-- RLS Policies

-- Enable RLS
ALTER TABLE public.brkt_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brkt_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brkt_advancements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brkt_match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brkt_layout ENABLE ROW LEVEL SECURITY;

-- Read Policies (Public Read)
CREATE POLICY "Public read versions" ON public.brkt_versions FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON public.brkt_matches FOR SELECT USING (true);
CREATE POLICY "Public read advancements" ON public.brkt_advancements FOR SELECT USING (true);
CREATE POLICY "Public read events" ON public.brkt_match_events FOR SELECT USING (true);
CREATE POLICY "Public read layout" ON public.brkt_layout FOR SELECT USING (true);

-- Write Policies (Tournament Admins Only)
-- For now, we'll use a simplified check. In production, this should check tournament ownership.
-- Assuming 'authenticated' users can create drafts, but only owners can activate.

CREATE POLICY "Admins can manage versions" ON public.brkt_versions
    FOR ALL
    TO authenticated
    USING (true) -- TODO: Refine to tournament owner
    WITH CHECK (true);

CREATE POLICY "Admins can manage matches" ON public.brkt_matches
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admins can manage advancements" ON public.brkt_advancements
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admins can manage events" ON public.brkt_match_events
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Admins can manage layout" ON public.brkt_layout
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Indexes for Performance
CREATE INDEX idx_brkt_matches_version ON public.brkt_matches(version_id);
CREATE INDEX idx_brkt_advancements_version ON public.brkt_advancements(version_id);
CREATE INDEX idx_brkt_advancements_source ON public.brkt_advancements(source_match_id);
CREATE INDEX idx_brkt_advancements_target ON public.brkt_advancements(target_match_id);
CREATE INDEX idx_brkt_events_match ON public.brkt_match_events(match_id);
