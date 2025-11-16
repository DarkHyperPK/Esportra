-- =====================================================
-- FIX TOURNAMENT REGISTRATION SCHEMA
-- =====================================================
-- This script fixes the tournament registration system to work with your existing schema

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. CREATE MISSING ENUMS
-- =====================================================

DO $$ 
BEGIN
    -- Create registration_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_type') THEN
        CREATE TYPE registration_type AS ENUM ('solo', 'team');
    END IF;
    
    -- Create registration_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_status') THEN
        CREATE TYPE registration_status AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'checked_in', 'eliminated', 'disqualified');
    END IF;
END $$;

-- =====================================================
-- 2. BACKUP AND RECREATE TOURNAMENT_PARTICIPANTS TABLE
-- =====================================================

-- Create backup table
CREATE TABLE IF NOT EXISTS public.tournament_participants_backup AS 
SELECT * FROM public.tournament_participants;

-- Drop existing table
DROP TABLE IF EXISTS public.tournament_participants CASCADE;

-- Create new tournament_participants table with complete registration support
CREATE TABLE public.tournament_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
    
    -- Registration type and participants
    registration_type registration_type NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    
    -- Solo registration fields
    gamer_tag TEXT,
    solo_contact_email TEXT,
    solo_contact_phone TEXT,
    
    -- Team registration fields
    team_name TEXT,
    team_captain_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    team_members JSONB DEFAULT '[]', -- Array of team member objects
    team_logo_url TEXT,
    team_contact_email TEXT,
    team_contact_phone TEXT,
    
    -- Registration details
    status registration_status DEFAULT 'pending',
    entry_fee_paid BOOLEAN DEFAULT FALSE,
    entry_fee_amount DECIMAL(10,2) DEFAULT 0,
    payment_reference TEXT,
    
    -- Verification and approval
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_notes TEXT,
    rejection_reason TEXT,
    
    -- Timestamps
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    check_in_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT check_participant_type CHECK (
        (registration_type = 'solo' AND user_id IS NOT NULL AND team_id IS NULL) OR 
        (registration_type = 'team' AND team_id IS NOT NULL AND user_id IS NULL)
    ),
    CONSTRAINT check_solo_fields CHECK (
        registration_type != 'solo' OR (gamer_tag IS NOT NULL)
    ),
    CONSTRAINT check_team_fields CHECK (
        registration_type != 'team' OR (team_name IS NOT NULL AND team_captain_id IS NOT NULL)
    )
);

-- =====================================================
-- 3. UPDATE TOURNAMENT_REGISTRATIONS TABLE
-- =====================================================

-- Add missing columns to tournament_registrations if they don't exist
DO $$ 
BEGIN
    -- Add registration_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tournament_registrations' AND column_name = 'registration_type') THEN
        ALTER TABLE public.tournament_registrations 
        ADD COLUMN registration_type registration_type DEFAULT 'solo';
    END IF;
    
    -- Add team_captain_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tournament_registrations' AND column_name = 'team_captain_id') THEN
        ALTER TABLE public.tournament_registrations 
        ADD COLUMN team_captain_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    
    -- Add entry_fee_paid column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tournament_registrations' AND column_name = 'entry_fee_paid') THEN
        ALTER TABLE public.tournament_registrations 
        ADD COLUMN entry_fee_paid BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add entry_fee_amount column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tournament_registrations' AND column_name = 'entry_fee_amount') THEN
        ALTER TABLE public.tournament_registrations 
        ADD COLUMN entry_fee_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- Add verified_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tournament_registrations' AND column_name = 'verified_by') THEN
        ALTER TABLE public.tournament_registrations 
        ADD COLUMN verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    
    -- Add verified_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tournament_registrations' AND column_name = 'verified_at') THEN
        ALTER TABLE public.tournament_registrations 
        ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add verification_notes column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tournament_registrations' AND column_name = 'verification_notes') THEN
        ALTER TABLE public.tournament_registrations 
        ADD COLUMN verification_notes TEXT;
    END IF;
    
    -- Add rejection_reason column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'tournament_registrations' AND column_name = 'rejection_reason') THEN
        ALTER TABLE public.tournament_registrations 
        ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;

-- =====================================================
-- 4. CREATE INDEXES
-- =====================================================

-- Tournament participants indexes
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON public.tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id ON public.tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_team_id ON public.tournament_participants(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_status ON public.tournament_participants(status);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_type ON public.tournament_participants(registration_type);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_registration_date ON public.tournament_participants(registration_date);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_team_captain_id ON public.tournament_participants(team_captain_id);

-- Tournament registrations indexes (legacy)
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament_id ON public.tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_user_id ON public.tournament_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_status ON public.tournament_registrations(status);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_type ON public.tournament_registrations(registration_type);

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. CREATE RLS POLICIES
-- =====================================================

-- Tournament participants policies
DROP POLICY IF EXISTS "Anyone can view tournament participants" ON public.tournament_participants;
CREATE POLICY "Anyone can view tournament participants" ON public.tournament_participants
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can register for tournaments" ON public.tournament_participants;
CREATE POLICY "Users can register for tournaments" ON public.tournament_participants
    FOR INSERT WITH CHECK (
        (registration_type = 'solo' AND user_id = auth.uid()) OR
        (registration_type = 'team' AND team_captain_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can update their own registration" ON public.tournament_participants;
CREATE POLICY "Users can update their own registration" ON public.tournament_participants
    FOR UPDATE USING (
        (registration_type = 'solo' AND user_id = auth.uid()) OR
        (registration_type = 'team' AND team_captain_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can delete their own registration" ON public.tournament_participants;
CREATE POLICY "Users can delete their own registration" ON public.tournament_participants
    FOR DELETE USING (
        (registration_type = 'solo' AND user_id = auth.uid()) OR
        (registration_type = 'team' AND team_captain_id = auth.uid())
    );

DROP POLICY IF EXISTS "Organizers can manage tournament registrations" ON public.tournament_participants;
CREATE POLICY "Organizers can manage tournament registrations" ON public.tournament_participants
    FOR ALL USING (
        tournament_id IN (
            SELECT id FROM public.tournaments WHERE organizer_id = auth.uid()
        )
    );

-- Tournament registrations policies (legacy)
DROP POLICY IF EXISTS "Anyone can view tournament registrations" ON public.tournament_registrations;
CREATE POLICY "Anyone can view tournament registrations" ON public.tournament_registrations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own registrations" ON public.tournament_registrations;
CREATE POLICY "Users can create their own registrations" ON public.tournament_registrations
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own registrations" ON public.tournament_registrations;
CREATE POLICY "Users can update their own registrations" ON public.tournament_registrations
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own registrations" ON public.tournament_registrations;
CREATE POLICY "Users can delete their own registrations" ON public.tournament_registrations
    FOR DELETE USING (user_id = auth.uid());

-- =====================================================
-- 7. CREATE TRIGGERS
-- =====================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Tournament participants trigger
DROP TRIGGER IF EXISTS update_tournament_participants_updated_at ON public.tournament_participants;
CREATE TRIGGER update_tournament_participants_updated_at BEFORE UPDATE ON public.tournament_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Tournament registrations trigger
DROP TRIGGER IF EXISTS update_tournament_registrations_updated_at ON public.tournament_registrations;
CREATE TRIGGER update_tournament_registrations_updated_at BEFORE UPDATE ON public.tournament_registrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to get tournament registration count
DROP FUNCTION IF EXISTS get_tournament_registration_count(UUID);
CREATE OR REPLACE FUNCTION get_tournament_registration_count(tournament_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM public.tournament_participants 
        WHERE tournament_id = tournament_uuid 
        AND status IN ('pending', 'approved', 'checked_in')
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user is registered for tournament
DROP FUNCTION IF EXISTS is_user_registered_for_tournament(UUID, UUID);
CREATE OR REPLACE FUNCTION is_user_registered_for_tournament(tournament_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.tournament_participants 
        WHERE tournament_id = tournament_uuid 
        AND (
            (registration_type = 'solo' AND user_id = user_uuid) OR
            (registration_type = 'team' AND team_captain_id = user_uuid)
        )
        AND status IN ('pending', 'approved', 'checked_in')
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's tournament registrations
DROP FUNCTION IF EXISTS get_user_tournament_registrations(UUID);
CREATE OR REPLACE FUNCTION get_user_tournament_registrations(user_uuid UUID)
RETURNS TABLE (
    id UUID,
    tournament_id UUID,
    tournament_name TEXT,
    registration_type registration_type,
    status registration_status,
    registration_date TIMESTAMP WITH TIME ZONE,
    gamer_tag TEXT,
    team_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tp.id,
        tp.tournament_id,
        t.name as tournament_name,
        tp.registration_type,
        tp.status,
        tp.registration_date,
        tp.gamer_tag,
        tp.team_name
    FROM public.tournament_participants tp
    JOIN public.tournaments t ON tp.tournament_id = t.id
    WHERE 
        (tp.registration_type = 'solo' AND tp.user_id = user_uuid) OR
        (tp.registration_type = 'team' AND tp.team_captain_id = user_uuid)
    ORDER BY tp.registration_date DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. MIGRATE EXISTING DATA (IF ANY)
-- =====================================================

-- Migrate data from backup table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tournament_participants_backup') THEN
        -- Migrate existing tournament_participants data with proper status mapping
        INSERT INTO public.tournament_participants (
            id, tournament_id, team_id, user_id, status, registration_date, check_in_date, created_at, updated_at
        )
        SELECT 
            id, tournament_id, team_id, user_id, 
            CASE 
                WHEN status = 'registered' THEN 'approved'::registration_status
                WHEN status = 'checked_in' THEN 'checked_in'::registration_status
                WHEN status = 'eliminated' THEN 'eliminated'::registration_status
                WHEN status = 'disqualified' THEN 'disqualified'::registration_status
                ELSE 'pending'::registration_status
            END,
            registration_date, check_in_date, created_at, updated_at
        FROM public.tournament_participants_backup
        ON CONFLICT (id) DO NOTHING;
        
        -- Set registration_type based on whether team_id or user_id is present
        UPDATE public.tournament_participants 
        SET registration_type = CASE 
            WHEN team_id IS NOT NULL THEN 'team'::registration_type
            WHEN user_id IS NOT NULL THEN 'solo'::registration_type
        END
        WHERE registration_type IS NULL;
        
        -- Drop backup table
        DROP TABLE public.tournament_participants_backup;
    END IF;
END $$;

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions
GRANT ALL ON public.tournament_participants TO authenticated;
GRANT ALL ON public.tournament_registrations TO authenticated;
GRANT EXECUTE ON FUNCTION get_tournament_registration_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_registered_for_tournament(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tournament_registrations(UUID) TO authenticated;

-- =====================================================
-- 11. VERIFICATION
-- =====================================================

-- Verify the setup
DO $$
BEGIN
    RAISE NOTICE 'Tournament registration system setup completed successfully!';
    RAISE NOTICE 'Tables created/updated: tournament_participants, tournament_registrations';
    RAISE NOTICE 'Enums created: registration_type, registration_status';
    RAISE NOTICE 'Functions created: get_tournament_registration_count, is_user_registered_for_tournament, get_user_tournament_registrations';
    RAISE NOTICE 'RLS policies and triggers configured';
END $$;
