-- =====================================================
-- FIXED COMPLETE DATABASE SETUP
-- =====================================================
-- This fixes the column name issues in the original complete-database-setup.sql

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (core user data)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
    email TEXT,
    avatar_url TEXT,
    bio TEXT,
    role TEXT DEFAULT 'casual' CHECK (role IN ('casual', 'organizer', 'venue_owner', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Admin fields
    is_admin BOOLEAN DEFAULT FALSE,
    admin_roles TEXT[] DEFAULT '{}',
    admin_permissions TEXT[] DEFAULT '{}',
    -- User management fields
    is_suspended BOOLEAN DEFAULT FALSE,
    is_banned BOOLEAN DEFAULT FALSE,
    suspension_reason TEXT,
    suspension_until TIMESTAMP WITH TIME ZONE,
    ban_reason TEXT,
    -- Verification fields
    is_verified BOOLEAN DEFAULT FALSE,
    verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified')),
    -- Gaming profile
    gaming_profile JSONB DEFAULT '{}',
    social_links JSONB DEFAULT '{}'
);

-- Create teams table (using owner_id instead of created_by)
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    tag TEXT UNIQUE,
    game TEXT NOT NULL,
    games TEXT[] DEFAULT '{}',
    game_format TEXT,
    logo_url TEXT,
    description TEXT,
    website_url TEXT,
    social_media JSONB DEFAULT '{}',
    achievements JSONB DEFAULT '{}',
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('captain', 'member', 'substitute')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(team_id, user_id)
);

-- Create team_invites table
CREATE TABLE IF NOT EXISTS public.team_invites (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(team_id, user_id)
);

-- Create tournaments table (using owner_id instead of created_by)
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    game TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin', 'swiss', 'custom')),
    max_teams INTEGER NOT NULL CHECK (max_teams >= 2 AND max_teams <= 1000),
    team_size INTEGER DEFAULT 1 CHECK (team_size >= 1 AND team_size <= 10),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'check_in', 'ongoing', 'completed', 'cancelled')),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES public.venues(id) ON DELETE SET NULL,
    prize_pool DECIMAL(10,2) DEFAULT 0,
    entry_fee DECIMAL(10,2) DEFAULT 0,
    rules TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_featured BOOLEAN DEFAULT FALSE,
    is_online BOOLEAN DEFAULT FALSE,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0
);

-- Create tournament_participants table
CREATE TABLE IF NOT EXISTS public.tournament_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    registration_type TEXT NOT NULL CHECK (registration_type IN ('individual', 'team')),
    status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'checked_in', 'eliminated', 'disqualified')),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    checked_in_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(tournament_id, team_id),
    UNIQUE(tournament_id, user_id)
);

-- Create tournament_matches table
CREATE TABLE IF NOT EXISTS public.tournament_matches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    team1_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    team2_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    winner_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    scheduled_time TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    score1 INTEGER DEFAULT 0,
    score2 INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
    amenities TEXT[],
    contact_phone TEXT,
    contact_email TEXT,
    website TEXT,
    images TEXT[],
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create venue_bookings table
CREATE TABLE IF NOT EXISTS public.venue_bookings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    duration_hours INTEGER DEFAULT 4,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    amount DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create verification_requests table
CREATE TABLE IF NOT EXISTS public.verification_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    requested_role TEXT NOT NULL CHECK (requested_role IN ('organizer', 'venue_owner')),
    business_name TEXT NOT NULL,
    business_type TEXT,
    business_address TEXT,
    contact_phone TEXT,
    contact_email TEXT,
    cnic_front TEXT NOT NULL,
    cnic_back TEXT NOT NULL,
    business_license TEXT,
    additional_documents TEXT[],
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT FALSE,
    action_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
    role_id UUID REFERENCES public.admin_roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.admin_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

-- Create admin_user_roles table
CREATE TABLE IF NOT EXISTS public.admin_user_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.admin_roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.profiles(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, role_id)
);

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
    target_type TEXT,
    target_id TEXT,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes (using correct column names)
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);

CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON public.teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_teams_game ON public.teams(game);
CREATE INDEX IF NOT EXISTS idx_teams_is_active ON public.teams(is_active);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);

CREATE INDEX IF NOT EXISTS idx_team_invites_team_id ON public.team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_user_id ON public.team_invites(user_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_status ON public.team_invites(status);

CREATE INDEX IF NOT EXISTS idx_tournaments_owner_id ON public.tournaments(owner_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_venue_id ON public.tournaments(venue_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_start_date ON public.tournaments(start_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_is_featured ON public.tournaments(is_featured);

CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON public.tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_team_id ON public.tournament_participants(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id ON public.tournament_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id ON public.tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_round_number ON public.tournament_matches(round_number);

CREATE INDEX IF NOT EXISTS idx_venues_owner_id ON public.venues(owner_id);
CREATE INDEX IF NOT EXISTS idx_venues_city ON public.venues(city);
CREATE INDEX IF NOT EXISTS idx_venues_is_verified ON public.venues(is_verified);
CREATE INDEX IF NOT EXISTS idx_venues_is_active ON public.venues(is_active);

CREATE INDEX IF NOT EXISTS idx_venue_bookings_venue_id ON public.venue_bookings(venue_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_user_id ON public.venue_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_venue_bookings_tournament_id ON public.venue_bookings(tournament_id);

CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON public.verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON public.verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_requests_requested_role ON public.verification_requests(requested_role);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

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
    ('user:delete', 'Delete users', 'users', 'delete'),
    ('tournament:view', 'View tournaments', 'tournaments', 'read'),
    ('tournament:create', 'Create tournaments', 'tournaments', 'create'),
    ('tournament:edit', 'Edit tournaments', 'tournaments', 'update'),
    ('tournament:approve', 'Approve tournaments', 'tournaments', 'update'),
    ('tournament:feature', 'Feature tournaments', 'tournaments', 'update'),
    ('tournament:delete', 'Delete tournaments', 'tournaments', 'delete'),
    ('venue:view', 'View venues', 'venues', 'read'),
    ('venue:create', 'Create venues', 'venues', 'create'),
    ('venue:edit', 'Edit venues', 'venues', 'update'),
    ('venue:approve', 'Approve venues', 'venues', 'update'),
    ('venue:verify', 'Verify venues', 'venues', 'update'),
    ('venue:delete', 'Delete venues', 'venues', 'delete'),
    ('verification:view', 'View verification requests', 'verification', 'read'),
    ('verification:approve', 'Approve verification requests', 'verification', 'update'),
    ('verification:reject', 'Reject verification requests', 'verification', 'update'),
    ('team:view', 'View teams', 'teams', 'read'),
    ('team:edit', 'Edit teams', 'teams', 'update'),
    ('team:delete', 'Delete teams', 'teams', 'delete'),
    ('audit:view', 'View audit logs', 'audit', 'read'),
    ('settings:view', 'View system settings', 'settings', 'read'),
    ('settings:edit', 'Edit system settings', 'settings', 'update'),
    ('admin:manage', 'Manage admin roles', 'admin', 'manage'),
    ('admin:assign_roles', 'Assign admin roles to users', 'admin', 'manage')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
-- Super admin gets all permissions
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r, public.admin_permissions p
WHERE r.name = 'super_admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Ops admin permissions
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r, public.admin_permissions p
WHERE r.name = 'ops_admin' AND p.name IN (
    'user:view', 'user:edit', 'user:ban', 'user:suspend',
    'tournament:view', 'tournament:create', 'tournament:edit', 'tournament:approve', 'tournament:feature', 'tournament:delete',
    'venue:view', 'venue:create', 'venue:edit', 'venue:approve', 'venue:verify', 'venue:delete',
    'verification:view', 'verification:approve', 'verification:reject',
    'team:view', 'team:edit', 'team:delete',
    'audit:view', 'settings:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Finance admin permissions
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r, public.admin_permissions p
WHERE r.name = 'finance_admin' AND p.name IN (
    'user:view', 'user:edit',
    'tournament:view',
    'venue:view',
    'audit:view', 'settings:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Moderator permissions
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r, public.admin_permissions p
WHERE r.name = 'moderator' AND p.name IN (
    'user:view', 'user:edit', 'user:ban', 'user:suspend',
    'tournament:view', 'tournament:edit',
    'team:view', 'team:edit',
    'audit:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Support admin permissions
INSERT INTO public.admin_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.admin_roles r, public.admin_permissions p
WHERE r.name = 'support_admin' AND p.name IN (
    'user:view', 'user:edit',
    'verification:view', 'verification:approve', 'verification:reject',
    'tournament:view',
    'venue:view',
    'team:view',
    'audit:view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Insert default system settings
INSERT INTO public.system_settings (key, value, description) VALUES
    ('maintenance_mode', 'false', 'Enable/disable maintenance mode'),
    ('contact_email', '"admin@fragandbook.com"', 'Platform contact email'),
    ('support_url', '"https://fragandbook.com/support"', 'Support page URL'),
    ('max_team_size', '5', 'Maximum team size for tournaments'),
    ('min_team_size', '1', 'Minimum team size for tournaments'),
    ('default_entry_fee', '0', 'Default entry fee for tournaments'),
    ('platform_fee_percentage', '5', 'Platform fee percentage'),
    ('verification_required', 'true', 'Require verification for organizers and venue owners'),
    ('max_tournament_duration_days', '7', 'Maximum tournament duration in days'),
    ('registration_deadline_hours', '24', 'Registration deadline hours before tournament start')
ON CONFLICT (key) DO NOTHING;

-- Success message
SELECT '🎉 Complete database setup completed successfully!' as message;
SELECT '✅ All tables, indexes, and admin system created' as status;
SELECT '✅ Ready to use the admin system' as result;
