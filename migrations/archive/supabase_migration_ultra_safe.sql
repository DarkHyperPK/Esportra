-- =====================================================
-- ULTRA SAFE SUPABASE MIGRATION FOR FRAG AND BOOK PLATFORM
-- =====================================================
-- This migration safely handles existing types, tables, and triggers

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. CREATE TYPES (WITH SAFE HANDLING)
-- =====================================================

-- Create custom types only if they don't exist
DO $$ 
BEGIN
    -- Create app_role enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('casual', 'organizer', 'venue_owner', 'admin');
    END IF;
    
    -- Create verification_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
        CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified');
    END IF;
    
    -- Create tournament_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tournament_status') THEN
        CREATE TYPE tournament_status AS ENUM ('draft', 'open', 'closed', 'check_in', 'ongoing', 'completed', 'cancelled');
    END IF;
    
    -- Create tournament_format enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tournament_format') THEN
        CREATE TYPE tournament_format AS ENUM ('single_elimination', 'double_elimination', 'round_robin', 'swiss', 'custom');
    END IF;
    
    -- Create team_member_role enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_member_role') THEN
        CREATE TYPE team_member_role AS ENUM ('owner', 'captain', 'member');
    END IF;
    
    -- Create invite_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invite_status') THEN
        CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
    END IF;
    
    -- Create match_status enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_status') THEN
        CREATE TYPE match_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
    END IF;
    
    -- Create notification_type enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');
    END IF;
END $$;

-- =====================================================
-- 2. CREATE PROFILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    bio TEXT,
    email TEXT NOT NULL,
    
    -- Role system
    role app_role DEFAULT 'casual',
    is_admin BOOLEAN DEFAULT FALSE,
    admin_roles TEXT[] DEFAULT '{}',
    admin_permissions TEXT[] DEFAULT '{}',
    
    -- User management
    is_suspended BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT,
    suspension_until TIMESTAMP WITH TIME ZONE,
    ban_reason TEXT,
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status verification_status DEFAULT 'unverified',
    
    -- Gaming profile
    gaming_profile JSONB DEFAULT '{}',
    social_links JSONB DEFAULT '{}',
    
    -- Timestamps
    last_login TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token TEXT,
    password_reset_token TEXT,
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE TEAMS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    tag TEXT UNIQUE NOT NULL,
    description TEXT,
    
    -- Gaming info
    game TEXT NOT NULL,
    games TEXT[] DEFAULT '{}',
    game_format TEXT DEFAULT 'squad',
    
    -- Visual
    logo_url TEXT,
    banner_url TEXT,
    
    -- Contact & Social
    website_url TEXT,
    social_media JSONB DEFAULT '{}',
    
    -- Team stats
    achievements JSONB DEFAULT '{}',
    
    -- Settings
    is_public BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    max_members INTEGER DEFAULT 5,
    
    -- Ownership
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- Stats
    stats JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 4. CREATE TEAM MEMBERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role team_member_role DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(team_id, user_id)
);

-- =====================================================
-- 5. CREATE TEAM INVITES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.team_invites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status invite_status DEFAULT 'pending',
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- =====================================================
-- 6. CREATE VENUES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.venues (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    country TEXT NOT NULL,
    postal_code TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    capacity INTEGER,
    amenities TEXT[] DEFAULT '{}',
    equipment TEXT[] DEFAULT '{}',
    operating_hours JSONB DEFAULT '{}',
    contact_phone TEXT,
    contact_email TEXT,
    website_url TEXT,
    social_media JSONB DEFAULT '{}',
    images TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 7. CREATE VENUE PROFILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.venue_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
    business_name TEXT NOT NULL,
    business_type TEXT,
    verified BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 8. CREATE TOURNAMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    
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
-- 9. CREATE TOURNAMENT PARTICIPANTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tournament_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'checked_in', 'eliminated', 'disqualified')),
    seed INTEGER,
    final_position INTEGER,
    UNIQUE(tournament_id, team_id)
);

-- =====================================================
-- 10. CREATE TOURNAMENT MATCHES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.tournament_matches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE NOT NULL,
    match_id TEXT NOT NULL,
    round INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    team1_id UUID REFERENCES public.teams(id),
    team2_id UUID REFERENCES public.teams(id),
    winner_id UUID REFERENCES public.teams(id),
    score1 INTEGER,
    score2 INTEGER,
    status match_status DEFAULT 'scheduled',
    scheduled_time TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    stream_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 11. CREATE VENUE BOOKINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.venue_bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    total_cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 12. CREATE VERIFICATION REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.verification_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    requested_role app_role NOT NULL CHECK (requested_role IN ('organizer', 'venue_owner')),
    
    -- Business Information
    business_name TEXT NOT NULL,
    business_type TEXT NOT NULL,
    business_description TEXT NOT NULL,
    experience_description TEXT NOT NULL,
    
    -- Personal Information
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    date_of_birth DATE NOT NULL,
    
    -- Contact Information
    website_url TEXT,
    social_media_links JSONB DEFAULT '{}',
    
    -- Document Uploads
    cnic_front_url TEXT NOT NULL,
    cnic_back_url TEXT NOT NULL,
    additional_documents JSONB DEFAULT '[]',
    
    -- Status & Review
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    verification_notes TEXT,
    
    -- Admin Comments
    admin_comments JSONB DEFAULT '[]',
    
    -- Timestamps
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 13. CREATE VERIFIED ROLES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.verified_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL CHECK (role IN ('organizer', 'venue_owner')),
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_by UUID REFERENCES public.profiles(id) NOT NULL,
    verification_request_id UUID REFERENCES public.verification_requests(id) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- 14. CREATE NOTIFICATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 15. CREATE ADMIN TABLES
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    role_id UUID REFERENCES public.admin_roles(id) ON DELETE CASCADE NOT NULL,
    permission_id UUID REFERENCES public.admin_permissions(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS public.admin_user_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role_id UUID REFERENCES public.admin_roles(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES public.profiles(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- =====================================================
-- 16. CREATE SYSTEM SETTINGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 17. CREATE AUDIT LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 18. CREATE INDEXES
-- =====================================================

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status);

-- Teams indexes
CREATE INDEX IF NOT EXISTS idx_teams_game ON public.teams(game);
CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON public.teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON public.teams(is_active);
CREATE INDEX IF NOT EXISTS idx_teams_tag ON public.teams(tag);

-- Team members indexes
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON public.team_members(team_id, is_active);

-- Team invites indexes
CREATE INDEX IF NOT EXISTS idx_team_invites_user_id ON public.team_invites(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_team_id ON public.team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_status ON public.team_invites(status);

-- Tournaments indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_game ON public.tournaments(game);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_organizer_id ON public.tournaments(organizer_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON public.tournaments(start_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_is_public ON public.tournaments(is_public);
CREATE INDEX IF NOT EXISTS idx_tournaments_is_featured ON public.tournaments(is_featured);

-- Tournament participants indexes
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON public.tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_team_id ON public.tournament_participants(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_status ON public.tournament_participants(status);

-- Tournament matches indexes
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id ON public.tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON public.tournament_matches(round);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_status ON public.tournament_matches(status);

-- Venues indexes
CREATE INDEX IF NOT EXISTS idx_venues_city ON public.venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_is_active ON public.venues(is_active);
CREATE INDEX IF NOT EXISTS idx_venues_location ON public.venues(latitude, longitude);

-- Venue profiles indexes
CREATE INDEX IF NOT EXISTS idx_venue_profiles_owner_id ON public.venue_profiles(owner_id);
CREATE INDEX IF NOT EXISTS idx_venue_profiles_venue_id ON public.venue_profiles(venue_id);

-- Venue bookings indexes
CREATE INDEX IF NOT EXISTS idx_venue_bookings_venue_id ON public.venue_bookings(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_user_id ON public.venue_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_start_time ON public.venue_bookings(start_time);

-- Verification requests indexes
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON public.verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON public.verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_requested_role ON public.verification_requests(requested_role);
CREATE INDEX IF NOT EXISTS idx_verification_requests_submitted_at ON public.verification_requests(submitted_at);

-- Verified roles indexes
CREATE INDEX IF NOT EXISTS idx_verified_roles_user_id ON public.verified_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_verified_roles_role ON public.verified_roles(role);
CREATE INDEX IF NOT EXISTS idx_verified_roles_active ON public.verified_roles(user_id, role) WHERE is_active = true;

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);

-- =====================================================
-- 19. ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 20. CREATE BASIC RLS POLICIES
-- =====================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Teams policies
DROP POLICY IF EXISTS "Users can view active teams" ON public.teams;
CREATE POLICY "Users can view active teams" ON public.teams
    FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Team owners can manage their teams" ON public.teams;
CREATE POLICY "Team owners can manage their teams" ON public.teams
    FOR ALL USING (auth.uid() = owner_id);

-- Tournaments policies
DROP POLICY IF EXISTS "Users can view public tournaments" ON public.tournaments;
CREATE POLICY "Users can view public tournaments" ON public.tournaments
    FOR SELECT USING (is_public = true AND status != 'draft');

DROP POLICY IF EXISTS "Organizers can manage their tournaments" ON public.tournaments;
CREATE POLICY "Organizers can manage their tournaments" ON public.tournaments
    FOR ALL USING (auth.uid() = organizer_id);

-- Venues policies
DROP POLICY IF EXISTS "Users can view active venues" ON public.venues;
CREATE POLICY "Users can view active venues" ON public.venues
    FOR SELECT USING (is_active = true);

-- Notifications policies
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- 21. CREATE FUNCTIONS
-- =====================================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 22. CREATE TRIGGERS (WITH SAFE HANDLING)
-- =====================================================

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create triggers for updated_at (only if they don't exist)
DO $$
BEGIN
    -- Check and create profiles trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_profiles_updated_at') THEN
        CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    -- Check and create teams trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_teams_updated_at') THEN
        CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    -- Check and create tournaments trigger
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tournaments_updated_at') THEN
        CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON public.tournaments
            FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- =====================================================
-- 23. INSERT DEFAULT DATA
-- =====================================================

-- Insert default admin roles
INSERT INTO public.admin_roles (name, description) VALUES
    ('super_admin', 'Full system access and control'),
    ('ops_admin', 'Tournament and venue management'),
    ('finance_admin', 'Payment and financial management'),
    ('moderator', 'Community and content moderation'),
    ('support_admin', 'User support and verification')
ON CONFLICT (name) DO NOTHING;

-- Insert default admin permissions
INSERT INTO public.admin_permissions (name, description, resource, action) VALUES
    ('user:view', 'View user profiles', 'users', 'read'),
    ('user:edit', 'Edit user profiles', 'users', 'update'),
    ('user:ban', 'Ban users', 'users', 'update'),
    ('user:suspend', 'Suspend users', 'users', 'update'),
    ('tournament:view', 'View tournaments', 'tournaments', 'read'),
    ('tournament:approve', 'Approve tournaments', 'tournaments', 'update'),
    ('tournament:feature', 'Feature tournaments', 'tournaments', 'update'),
    ('tournament:delete', 'Delete tournaments', 'tournaments', 'delete'),
    ('venue:view', 'View venues', 'venues', 'read'),
    ('venue:approve', 'Approve venues', 'venues', 'update'),
    ('venue:verify', 'Verify venues', 'venues', 'update'),
    ('verification:view', 'View verification requests', 'verification', 'read'),
    ('verification:approve', 'Approve verification requests', 'verification', 'update'),
    ('verification:reject', 'Reject verification requests', 'verification', 'update'),
    ('audit:view', 'View audit logs', 'audit', 'read'),
    ('settings:view', 'View system settings', 'settings', 'read'),
    ('settings:edit', 'Edit system settings', 'settings', 'update'),
    ('admin:manage', 'Manage admin roles', 'admin', 'manage')
ON CONFLICT (name) DO NOTHING;

-- Insert default system settings (using proper JSON format)
INSERT INTO public.system_settings (key, value, description) VALUES
    ('maintenance_mode', 'false', 'Enable/disable maintenance mode'),
    ('contact_email', '"support@fragandbook.com"', 'Platform contact email'),
    ('support_url', '"https://fragandbook.com/support"', 'Support page URL'),
    ('max_team_size', '5', 'Maximum team size for tournaments'),
    ('min_team_size', '1', 'Minimum team size for tournaments'),
    ('default_entry_fee', '0', 'Default entry fee for tournaments'),
    ('platform_fee_percentage', '5', 'Platform fee percentage'),
    ('verification_required', 'true', 'Require verification for organizers and venue owners'),
    ('max_tournament_duration_days', '7', 'Maximum tournament duration in days'),
    ('registration_deadline_hours', '24', 'Registration deadline hours before tournament start')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 24. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- This ultra-safe migration creates all tables and functions needed
-- for the Frag and Book platform, handling existing types, tables, and triggers gracefully.

COMMIT;
