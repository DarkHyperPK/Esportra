-- Complete Database Setup for Frag and Book Platform
-- Run this in your Supabase SQL Editor to create all required tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (core user data)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE,
    full_name TEXT,
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
    ban_reason TEXT
);

-- Create teams table
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
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'captain', 'member')),
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
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);

-- Create tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    game TEXT NOT NULL,
    format TEXT NOT NULL,
    max_teams INTEGER NOT NULL,
    entry_fee DECIMAL(10,2) DEFAULT 0,
    prize_pool DECIMAL(10,2) DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    registration_deadline TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed', 'ongoing', 'completed', 'cancelled')),
    rules TEXT,
    requirements TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_featured BOOLEAN DEFAULT FALSE
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
    equipment TEXT[],
    operating_hours JSONB,
    contact_phone TEXT,
    contact_email TEXT,
    website_url TEXT,
    social_media JSONB DEFAULT '{}',
    images TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create venue_profiles table
CREATE TABLE IF NOT EXISTS public.venue_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    venue_id UUID REFERENCES public.venues(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_type TEXT,
    verified BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create company_profiles table
CREATE TABLE IF NOT EXISTS public.company_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    business_type TEXT,
    description TEXT,
    website_url TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create verification_requests table
CREATE TABLE IF NOT EXISTS public.verification_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    requested_role TEXT NOT NULL CHECK (requested_role IN ('organizer', 'venue_owner')),
    business_name TEXT NOT NULL,
    business_type TEXT NOT NULL,
    business_description TEXT,
    experience_description TEXT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    dob DATE,
    website_url TEXT,
    social_media_links JSONB DEFAULT '{}',
    cnic_image_path TEXT,
    cnic_front_path TEXT,
    cnic_back_path TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
    rejection_reason TEXT,
    verification_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES public.profiles(id)
);

-- Create verified_roles table
CREATE TABLE IF NOT EXISTS public.verified_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('organizer', 'venue_owner')),
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT FALSE,
    data JSONB DEFAULT '{}',
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
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_admin);
CREATE INDEX IF NOT EXISTS idx_teams_game ON public.teams(game);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON public.teams(created_by);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_game ON public.tournaments(game);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_created_by ON public.tournaments(created_by);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON public.verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON public.verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
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

-- Create RLS policies for teams
CREATE POLICY "Users can view active teams" ON public.teams
    FOR SELECT USING (is_active = true);

CREATE POLICY "Team owners can manage their teams" ON public.teams
    FOR ALL USING (auth.uid() = created_by);

-- Create RLS policies for team_members
CREATE POLICY "Users can view team members" ON public.team_members
    FOR SELECT USING (true);

CREATE POLICY "Team members can manage their membership" ON public.team_members
    FOR ALL USING (auth.uid() = user_id);

-- Create RLS policies for tournaments
CREATE POLICY "Users can view active tournaments" ON public.tournaments
    FOR SELECT USING (status != 'draft');

CREATE POLICY "Organizers can manage their tournaments" ON public.tournaments
    FOR ALL USING (auth.uid() = created_by);

-- Create RLS policies for verification_requests
CREATE POLICY "Users can view their own verification requests" ON public.verification_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create verification requests" ON public.verification_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all verification requests" ON public.verification_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Create RLS policies for admin tables
CREATE POLICY "Admins can manage admin roles" ON public.admin_roles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.is_admin = true
        )
    );

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
    ('contact_email', 'support@fragandbook.com', 'Platform contact email'),
    ('support_url', 'https://fragandbook.com/support', 'Support page URL'),
    ('max_team_size', '5', 'Maximum team size for tournaments'),
    ('min_team_size', '1', 'Minimum team size for tournaments')
ON CONFLICT (key) DO NOTHING;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, full_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON public.tournaments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venues_updated_at BEFORE UPDATE ON public.venues
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Create storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policy for KYC documents
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

COMMIT;
