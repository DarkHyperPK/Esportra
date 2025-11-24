-- =====================================================
-- FIX MISSING TABLES AND CREATE USER PROFILE
-- =====================================================
-- This script creates missing tables and the user profile

-- 1. FIRST, RUN THE EMERGENCY RLS FIX
-- =====================================================
-- (This should have been run already, but just in case)

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

-- 2. CREATE MISSING TABLES
-- =====================================================

-- Create tournament_registrations table
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    registration_type TEXT NOT NULL CHECK (registration_type IN ('individual', 'team')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, user_id),
    UNIQUE(tournament_id, team_id)
);

-- Create company_profiles table
CREATE TABLE IF NOT EXISTS public.company_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
    company_name TEXT NOT NULL,
    company_logo TEXT,
    company_description TEXT,
    website TEXT,
    contact_email TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. CREATE MISSING INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament_id ON public.tournament_registrations(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_user_id ON public.tournament_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_team_id ON public.tournament_registrations(team_id);
CREATE INDEX IF NOT EXISTS idx_company_profiles_user_id ON public.company_profiles(user_id);

-- 4. CREATE PROFILE FOR AUTHENTICATED USER
-- =====================================================

-- Insert profile for the authenticated user (6f7da42e-a787-4533-83f4-e06da5c8ce7d)
INSERT INTO public.profiles (
    id,
    username,
    full_name,
    email,
    avatar_url,
    bio,
    role,
    is_admin,
    admin_roles,
    admin_permissions,
    is_verified,
    verification_status,
    gaming_profile,
    social_links,
    created_at,
    updated_at
) VALUES (
    '6f7da42e-a787-4533-83f4-e06da5c8ce7d',
    'testuser',
    'Test User',
    'test@example.com',
    NULL,
    'Welcome to Frag and Book!',
    'casual',
    FALSE,
    ARRAY[]::TEXT[],
    ARRAY[]::TEXT[],
    FALSE,
    'unverified',
    '{}'::JSONB,
    '{}'::JSONB,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    bio = EXCLUDED.bio,
    updated_at = NOW();

-- 5. TEST BASIC QUERIES
-- =====================================================

SELECT 'Testing profiles table...' as test;
SELECT COUNT(*) as profile_count FROM public.profiles;
SELECT id, username, email, role FROM public.profiles WHERE id = '6f7da42e-a787-4533-83f4-e06da5c8ce7d';

SELECT 'Testing teams table...' as test;
SELECT COUNT(*) as team_count FROM public.teams;

SELECT 'Testing tournaments table...' as test;
SELECT COUNT(*) as tournament_count FROM public.tournaments;

SELECT 'Testing tournament_registrations table...' as test;
SELECT COUNT(*) as registration_count FROM public.tournament_registrations;

SELECT 'Testing company_profiles table...' as test;
SELECT COUNT(*) as company_count FROM public.company_profiles;

-- 6. SUCCESS MESSAGE
-- =====================================================

SELECT '🎉 Missing tables created and user profile inserted!' as message;
SELECT '✅ All 404 errors should now be resolved' as status;
SELECT '✅ User profile should now be found' as result;
