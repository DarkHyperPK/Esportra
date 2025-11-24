-- =====================================================
-- FIX TOURNAMENT SCHEMA FOR FRAG AND BOOK PLATFORM
-- =====================================================
-- This script ensures the tournaments table exists with the correct schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. CREATE TOURNAMENT ENUMS (IF NOT EXISTS)
-- =====================================================

DO $$ 
BEGIN
    -- Create tournament_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tournament_status') THEN
        CREATE TYPE tournament_status AS ENUM ('draft', 'open', 'closed', 'check_in', 'ongoing', 'completed', 'cancelled');
    END IF;
    
    -- Create tournament_format enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tournament_format') THEN
        CREATE TYPE tournament_format AS ENUM ('single_elimination', 'double_elimination', 'round_robin', 'swiss', 'custom');
    END IF;
END $$;

-- =====================================================
-- 2. DROP EXISTING TOURNAMENTS TABLE IF IT EXISTS
-- =====================================================

DROP TABLE IF EXISTS public.tournament_participants CASCADE;
DROP TABLE IF EXISTS public.tournaments CASCADE;

-- =====================================================
-- 3. CREATE TOURNAMENTS TABLE WITH CORRECT SCHEMA
-- =====================================================

CREATE TABLE public.tournaments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    slug TEXT UNIQUE,
    
    -- Game info
    game TEXT NOT NULL,
    format tournament_format NOT NULL,
    
    -- Tournament settings
    max_teams INTEGER NOT NULL,
    min_teams INTEGER DEFAULT 2,
    entry_fee DECIMAL(10,2) DEFAULT 0,
    prize_pool DECIMAL(10,2) DEFAULT 0,
    prize_distribution JSONB DEFAULT '[]',
    
    -- Schedule
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE,
    
    -- Status
    status tournament_status DEFAULT 'draft',
    
    -- Rules & Requirements
    rules TEXT,
    requirements TEXT,
    age_restriction JSONB DEFAULT '{}',
    skill_level TEXT DEFAULT 'all',
    
    -- Visual
    banner_url TEXT,
    logo_url TEXT,
    
    -- Organization
    organizer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    
    -- Settings
    is_public BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    allow_spectators BOOLEAN DEFAULT TRUE,
    stream_url TEXT,
    
    -- Stats
    stats JSONB DEFAULT '{}',
    
    -- Admin
    approved_by UUID REFERENCES public.profiles(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. COMPANY_PROFILES TABLE REMOVED
-- =====================================================
-- Company profiles are no longer needed for this application

-- =====================================================
-- 5. CREATE VENUE_PROFILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.venue_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
    business_name TEXT NOT NULL,
    business_type TEXT,
    description TEXT,
    website TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    country TEXT,
    postal_code TEXT,
    tax_id TEXT,
    business_license TEXT,
    verification_documents JSONB DEFAULT '[]',
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(owner_id, venue_id)
);

-- =====================================================
-- 6. CREATE TOURNAMENT_PARTICIPANTS TABLE
-- =====================================================

CREATE TABLE public.tournament_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'checked_in', 'eliminated', 'disqualified')),
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    check_in_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure either team_id or user_id is provided, but not both
    CONSTRAINT check_participant_type CHECK (
        (team_id IS NOT NULL AND user_id IS NULL) OR 
        (team_id IS NULL AND user_id IS NOT NULL)
    )
);

-- =====================================================
-- 7. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tournaments_organizer_id ON public.tournaments(organizer_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_venue_id ON public.tournaments(venue_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON public.tournaments(start_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_game ON public.tournaments(game);
CREATE INDEX IF NOT EXISTS idx_tournaments_slug ON public.tournaments(slug);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON public.tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_team_id ON public.tournament_participants(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id ON public.tournament_participants(user_id);
-- Company profiles indexes removed
CREATE INDEX IF NOT EXISTS idx_venue_profiles_owner_id ON public.venue_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_venue_profiles_venue_id ON public.venue_profiles(venue_id);

-- =====================================================
-- 8. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
-- Company profiles RLS removed
ALTER TABLE public.venue_profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. CREATE RLS POLICIES
-- =====================================================

-- Tournaments policies
CREATE POLICY "Anyone can view public tournaments" ON public.tournaments
    FOR SELECT USING (is_public = true);

CREATE POLICY "Organizers can view their own tournaments" ON public.tournaments
    FOR SELECT USING (organizer_id = auth.uid());

CREATE POLICY "Organizers can create tournaments" ON public.tournaments
    FOR INSERT WITH CHECK (organizer_id = auth.uid());

CREATE POLICY "Organizers can update their own tournaments" ON public.tournaments
    FOR UPDATE USING (organizer_id = auth.uid());

CREATE POLICY "Organizers can delete their own tournaments" ON public.tournaments
    FOR DELETE USING (organizer_id = auth.uid());

-- Tournament participants policies
CREATE POLICY "Anyone can view tournament participants" ON public.tournament_participants
    FOR SELECT USING (true);

CREATE POLICY "Users can register for tournaments" ON public.tournament_participants
    FOR INSERT WITH CHECK (user_id = auth.uid() OR team_id IN (
        SELECT id FROM public.teams WHERE owner_id = auth.uid()
    ));

CREATE POLICY "Users can update their own participation" ON public.tournament_participants
    FOR UPDATE USING (user_id = auth.uid() OR team_id IN (
        SELECT id FROM public.teams WHERE owner_id = auth.uid()
    ));

-- Company profiles policies removed

-- Venue profiles policies
CREATE POLICY "Users can view their own venue profiles" ON public.venue_profiles
    FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create their own venue profiles" ON public.venue_profiles
    FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own venue profiles" ON public.venue_profiles
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own venue profiles" ON public.venue_profiles
    FOR DELETE USING (owner_id = auth.uid());

-- =====================================================
-- 8. CREATE TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tournaments_updated_at ON public.tournaments;
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON public.tournaments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tournament_participants_updated_at ON public.tournament_participants;
CREATE TRIGGER update_tournament_participants_updated_at BEFORE UPDATE ON public.tournament_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Company profiles trigger removed

DROP TRIGGER IF EXISTS update_venue_profiles_updated_at ON public.venue_profiles;
CREATE TRIGGER update_venue_profiles_updated_at BEFORE UPDATE ON public.venue_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. INSERT SAMPLE DATA (OPTIONAL)
-- =====================================================

-- Insert a sample tournament for testing
INSERT INTO public.tournaments (
    name, 
    description, 
    slug,
    game, 
    format, 
    max_teams, 
    start_date, 
    end_date, 
    registration_deadline, 
    organizer_id,
    status
) VALUES (
    'Sample Tournament',
    'A sample tournament for testing',
    'sample-tournament',
    'Counter-Strike 2',
    'single_elimination',
    16,
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '8 days',
    NOW() + INTERVAL '6 days',
    (SELECT id FROM public.profiles LIMIT 1),
    'draft'
) ON CONFLICT DO NOTHING;
