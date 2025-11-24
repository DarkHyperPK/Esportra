-- =====================================================
-- COMPLETE SUPABASE MIGRATION FOR FRAG AND BOOK PLATFORM
-- =====================================================
-- This migration creates all tables, functions, policies, and data
-- needed for the complete Frag and Book esports platform functionality

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. CORE USER SYSTEM
-- =====================================================

-- Create custom types
CREATE TYPE app_role AS ENUM ('casual', 'organizer', 'venue_owner', 'admin');
CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'verified');
CREATE TYPE tournament_status AS ENUM ('draft', 'open', 'closed', 'check_in', 'ongoing', 'completed', 'cancelled');
CREATE TYPE tournament_format AS ENUM ('single_elimination', 'double_elimination', 'round_robin', 'swiss', 'custom');
CREATE TYPE team_member_role AS ENUM ('owner', 'captain', 'member');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE match_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');
CREATE TYPE notification_type AS ENUM ('info', 'success', 'warning', 'error');

-- Create profiles table (extends auth.users)
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
-- 2. TEAM SYSTEM
-- =====================================================

-- Create teams table
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

-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role team_member_role DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(team_id, user_id)
);

-- Create team_invites table
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
-- 3. VENUE SYSTEM (MOVED BEFORE TOURNAMENTS)
-- =====================================================

-- Create venues table
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

-- Create venue_profiles table
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
-- 4. TOURNAMENT SYSTEM
-- =====================================================

-- Create tournaments table
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

-- Create tournament_participants table
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

-- Create tournament_matches table
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

-- Create venue_bookings table
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
-- 5. VERIFICATION SYSTEM
-- =====================================================

-- Create verification_requests table
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

-- Create verified_roles table
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
-- 6. NOTIFICATION SYSTEM
-- =====================================================

-- Create notifications table
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
-- 7. ADMIN SYSTEM
-- =====================================================

-- Create admin_roles table
CREATE TABLE IF NOT EXISTS public.admin_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_permissions table
CREATE TABLE IF NOT EXISTS public.admin_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    resource TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_role_permissions table
CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    role_id UUID REFERENCES public.admin_roles(id) ON DELETE CASCADE NOT NULL,
    permission_id UUID REFERENCES public.admin_permissions(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- Create admin_user_roles table
CREATE TABLE IF NOT EXISTS public.admin_user_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role_id UUID REFERENCES public.admin_roles(id) ON DELETE CASCADE NOT NULL,
    assigned_by UUID REFERENCES public.profiles(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

-- =====================================================
-- 8. SYSTEM SETTINGS & AUDIT
-- =====================================================

-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES public.profiles(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create audit_logs table
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
-- 9. INDEXES FOR PERFORMANCE
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
-- 10. ROW LEVEL SECURITY (RLS)
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
-- 11. RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

CREATE POLICY "Admins can update all profiles" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

-- Teams policies
CREATE POLICY "Users can view active teams" ON public.teams
    FOR SELECT USING (is_active = true);

CREATE POLICY "Team owners can manage their teams" ON public.teams
    FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Admins can manage all teams" ON public.teams
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

-- Team members policies
CREATE POLICY "Users can view team members" ON public.team_members
    FOR SELECT USING (true);

CREATE POLICY "Team members can manage their membership" ON public.team_members
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Team owners can manage team members" ON public.team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.teams t 
            WHERE t.id = team_id AND t.owner_id = auth.uid()
        )
    );

-- Team invites policies
CREATE POLICY "Users can view their invites" ON public.team_invites
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their invites" ON public.team_invites
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Team owners can manage team invites" ON public.team_invites
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.teams t 
            WHERE t.id = team_id AND t.owner_id = auth.uid()
        )
    );

-- Tournaments policies
CREATE POLICY "Users can view public tournaments" ON public.tournaments
    FOR SELECT USING (is_public = true AND status != 'draft');

CREATE POLICY "Organizers can manage their tournaments" ON public.tournaments
    FOR ALL USING (auth.uid() = organizer_id);

CREATE POLICY "Admins can manage all tournaments" ON public.tournaments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

-- Tournament participants policies
CREATE POLICY "Users can view tournament participants" ON public.tournament_participants
    FOR SELECT USING (true);

CREATE POLICY "Team members can register for tournaments" ON public.tournament_participants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.team_members tm 
            WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.is_active = true
        )
    );

-- Tournament matches policies
CREATE POLICY "Users can view tournament matches" ON public.tournament_matches
    FOR SELECT USING (true);

CREATE POLICY "Tournament organizers can manage matches" ON public.tournament_matches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tournaments t 
            WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
        )
    );

-- Venues policies
CREATE POLICY "Users can view active venues" ON public.venues
    FOR SELECT USING (is_active = true);

CREATE POLICY "Venue owners can manage their venues" ON public.venues
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.venue_profiles vp 
            WHERE vp.venue_id = id AND vp.owner_id = auth.uid()
        )
    );

-- Venue profiles policies
CREATE POLICY "Users can view venue profiles" ON public.venue_profiles
    FOR SELECT USING (true);

CREATE POLICY "Venue owners can manage their profiles" ON public.venue_profiles
    FOR ALL USING (auth.uid() = owner_id);

-- Venue bookings policies
CREATE POLICY "Users can view their bookings" ON public.venue_bookings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings" ON public.venue_bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Venue owners can view venue bookings" ON public.venue_bookings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.venue_profiles vp 
            WHERE vp.venue_id = venue_id AND vp.owner_id = auth.uid()
        )
    );

-- Verification requests policies
CREATE POLICY "Users can view their own verification requests" ON public.verification_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create verification requests" ON public.verification_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their pending requests" ON public.verification_requests
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can view all verification requests" ON public.verification_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

CREATE POLICY "Admins can update verification requests" ON public.verification_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

-- Verified roles policies
CREATE POLICY "Users can view their verified roles" ON public.verified_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage verified roles" ON public.verified_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

-- Notifications policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Admin tables policies
CREATE POLICY "Admins can manage admin roles" ON public.admin_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

CREATE POLICY "Admins can manage admin permissions" ON public.admin_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

CREATE POLICY "Admins can manage admin role permissions" ON public.admin_role_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

CREATE POLICY "Admins can manage admin user roles" ON public.admin_user_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

-- System settings policies
CREATE POLICY "Admins can view system settings" ON public.system_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

CREATE POLICY "Admins can update system settings" ON public.system_settings
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

-- Audit logs policies
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

-- =====================================================
-- 12. FUNCTIONS
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

-- Function to check if user has admin permission
CREATE OR REPLACE FUNCTION public.has_admin_permission(permission_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() 
        AND p.is_admin = true
        AND (
            'super_admin' = ANY(p.admin_roles) OR
            permission_name = ANY(p.admin_permissions)
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has verified role
CREATE OR REPLACE FUNCTION public.has_verified_role(role_name app_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.verified_roles vr
        WHERE vr.user_id = auth.uid() 
        AND vr.role = role_name 
        AND vr.is_active = true
        AND (vr.expires_at IS NULL OR vr.expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to approve verification request
CREATE OR REPLACE FUNCTION public.approve_verification_request(
    request_id UUID,
    admin_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    request_record RECORD;
    result JSON;
BEGIN
    -- Get the verification request
    SELECT * INTO request_record 
    FROM public.verification_requests 
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Verification request not found or not pending');
    END IF;
    
    -- Update the request status
    UPDATE public.verification_requests 
    SET 
        status = 'approved',
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        verification_notes = admin_notes
    WHERE id = request_id;
    
    -- Add to verified_roles
    INSERT INTO public.verified_roles (user_id, role, verified_by, verification_request_id)
    VALUES (request_record.user_id, request_record.requested_role, auth.uid(), request_id);
    
    -- Update user profile
    UPDATE public.profiles 
    SET 
        role = request_record.requested_role,
        is_verified = true,
        verification_status = 'verified'
    WHERE id = request_record.user_id;
    
    result := json_build_object(
        'success', true,
        'message', 'Verification request approved successfully'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject verification request
CREATE OR REPLACE FUNCTION public.reject_verification_request(
    request_id UUID,
    rejection_reason TEXT,
    admin_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Update the request status
    UPDATE public.verification_requests 
    SET 
        status = 'rejected',
        reviewed_by = auth.uid(),
        reviewed_at = NOW(),
        rejection_reason = rejection_reason,
        verification_notes = admin_notes
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Verification request not found or not pending');
    END IF;
    
    result := json_build_object(
        'success', true,
        'message', 'Verification request rejected'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION public.create_notification(
    user_id UUID,
    title TEXT,
    message TEXT,
    type notification_type DEFAULT 'info',
    data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type, data)
    VALUES (user_id, title, message, type, data)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 13. TRIGGERS
-- =====================================================

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON public.tournaments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tournament_matches_updated_at BEFORE UPDATE ON public.tournament_matches
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venue_profiles_updated_at BEFORE UPDATE ON public.venue_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venue_bookings_updated_at BEFORE UPDATE ON public.venue_bookings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_verification_requests_updated_at BEFORE UPDATE ON public.verification_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 14. DEFAULT DATA
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

-- Assign permissions to roles
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r, public.admin_permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r, public.admin_permissions p
WHERE r.name = 'ops_admin' AND p.name IN (
    'user:view', 'user:edit', 'user:ban', 'user:suspend',
    'tournament:view', 'tournament:approve', 'tournament:feature', 'tournament:delete',
    'venue:view', 'venue:approve', 'venue:verify',
    'verification:view', 'verification:approve', 'verification:reject',
    'audit:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r, public.admin_permissions p
WHERE r.name = 'moderator' AND p.name IN (
    'user:view', 'user:edit', 'user:ban', 'user:suspend',
    'tournament:view', 'verification:view', 'verification:approve', 'verification:reject',
    'audit:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r, public.admin_permissions p
WHERE r.name = 'support_admin' AND p.name IN (
    'user:view', 'user:edit',
    'verification:view', 'verification:approve', 'verification:reject',
    'audit:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Insert default system settings
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
-- 15. STORAGE BUCKETS
-- =====================================================

-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for team logos
INSERT INTO storage.buckets (id, name, public) VALUES ('team-logos', 'team-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for tournament banners
INSERT INTO storage.buckets (id, name, public) VALUES ('tournament-banners', 'tournament-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for venue images
INSERT INTO storage.buckets (id, name, public) VALUES ('venue-images', 'venue-images', true)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 16. STORAGE POLICIES
-- =====================================================

-- KYC documents policies
CREATE POLICY "Users can upload their own KYC documents" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'kyc-documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own KYC documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'kyc-documents' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Admins can view all KYC documents" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'kyc-documents' AND
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

-- Team logos policies
CREATE POLICY "Users can upload team logos" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'team-logos');

CREATE POLICY "Anyone can view team logos" ON storage.objects
    FOR SELECT USING (bucket_id = 'team-logos');

-- Tournament banners policies
CREATE POLICY "Users can upload tournament banners" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'tournament-banners');

CREATE POLICY "Anyone can view tournament banners" ON storage.objects
    FOR SELECT USING (bucket_id = 'tournament-banners');

-- Venue images policies
CREATE POLICY "Users can upload venue images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'venue-images');

CREATE POLICY "Anyone can view venue images" ON storage.objects
    FOR SELECT USING (bucket_id = 'venue-images');

-- =====================================================
-- 17. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.has_admin_permission(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_verified_role(app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_verification_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_verification_request(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, notification_type, JSONB) TO authenticated;

-- =====================================================
-- 18. UNIQUE CONSTRAINTS
-- =====================================================

-- Create unique constraints for data integrity
CREATE UNIQUE INDEX IF NOT EXISTS idx_verification_requests_unique_pending 
ON public.verification_requests (user_id, requested_role) 
WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_verified_roles_unique_active 
ON public.verified_roles (user_id, role) 
WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_unique_active 
ON public.team_members (team_id, user_id) 
WHERE is_active = true;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- This migration creates a complete database schema for the Frag and Book platform
-- including all tables, relationships, indexes, policies, and functions needed
-- for user management, tournaments, teams, venues, verification, and admin functionality.

COMMIT;
