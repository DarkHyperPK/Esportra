-- =====================================================
-- CREATE MISSING TOURNAMENT TABLES
-- =====================================================
-- This script creates the missing tables for tournament bracket functionality

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. CREATE MATCH_RESULTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.match_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    match_id UUID REFERENCES public.tournament_matches(id) ON DELETE CASCADE NOT NULL,
    reported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL NOT NULL,
    team1_score INTEGER NOT NULL,
    team2_score INTEGER NOT NULL,
    screenshots TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    verification_notes TEXT,
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_match_results_match_id ON public.match_results(match_id);
CREATE INDEX IF NOT EXISTS idx_match_results_reported_by ON public.match_results(reported_by);
CREATE INDEX IF NOT EXISTS idx_match_results_status ON public.match_results(status);
CREATE INDEX IF NOT EXISTS idx_match_results_created_at ON public.match_results(created_at);

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.match_results ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CREATE RLS POLICIES
-- =====================================================

-- Match results policies
DROP POLICY IF EXISTS "Anyone can view match results" ON public.match_results;
CREATE POLICY "Anyone can view match results" ON public.match_results
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can report match results" ON public.match_results;
CREATE POLICY "Users can report match results" ON public.match_results
    FOR INSERT WITH CHECK (reported_by = auth.uid());

DROP POLICY IF EXISTS "Users can update their own match results" ON public.match_results;
CREATE POLICY "Users can update their own match results" ON public.match_results
    FOR UPDATE USING (reported_by = auth.uid());

DROP POLICY IF EXISTS "Tournament organizers can manage match results" ON public.match_results;
CREATE POLICY "Tournament organizers can manage match results" ON public.match_results
    FOR ALL USING (
        match_id IN (
            SELECT tm.id FROM public.tournament_matches tm
            JOIN public.tournaments t ON tm.tournament_id = t.id
            WHERE t.organizer_id = auth.uid()
        )
    );

-- =====================================================
-- 5. CREATE TRIGGERS
-- =====================================================

-- Update timestamp trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Match results trigger
DROP TRIGGER IF EXISTS update_match_results_updated_at ON public.match_results;
CREATE TRIGGER update_match_results_updated_at BEFORE UPDATE ON public.match_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT ALL ON public.match_results TO authenticated;

-- =====================================================
-- 7. VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE 'Missing tournament tables created successfully!';
    RAISE NOTICE 'Table created: match_results';
    RAISE NOTICE 'RLS policies and triggers configured';
END $$;
