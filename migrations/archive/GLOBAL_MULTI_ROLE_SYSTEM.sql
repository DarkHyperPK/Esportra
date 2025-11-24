-- GLOBAL MULTI-ROLE SYSTEM SETUP
-- This script sets up the multi-role system for ALL users

-- STEP 1: Create tables if they don't exist
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS public.verified_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'approved',
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    UNIQUE(user_id, role)
);

-- STEP 2: Add missing columns to existing tables
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'base_role') THEN
        ALTER TABLE public.profiles ADD COLUMN base_role VARCHAR(20) DEFAULT 'casual';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verified_roles' AND column_name = 'status') THEN
        ALTER TABLE public.verified_roles ADD COLUMN status VARCHAR(20) DEFAULT 'approved';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verified_roles' AND column_name = 'verified_at') THEN
        ALTER TABLE public.verified_roles ADD COLUMN verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'verified_roles' AND column_name = 'verified_by') THEN
        ALTER TABLE public.verified_roles ADD COLUMN verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    
    -- Make verified_by column nullable if it has NOT NULL constraint
    ALTER TABLE public.verified_roles ALTER COLUMN verified_by DROP NOT NULL;
    
    -- Make verification_request_id column nullable if it has NOT NULL constraint
    ALTER TABLE public.verified_roles ALTER COLUMN verification_request_id DROP NOT NULL;
END
$$;

-- STEP 2.5: Add unique constraints if they don't exist
DO $$
BEGIN
    -- Add unique constraint to user_roles if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_roles_user_id_role_key' 
        AND table_name = 'user_roles'
    ) THEN
        ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
    END IF;
    
    -- Add unique constraint to verified_roles if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'verified_roles_user_id_role_key' 
        AND table_name = 'verified_roles'
    ) THEN
        ALTER TABLE public.verified_roles ADD CONSTRAINT verified_roles_user_id_role_key UNIQUE (user_id, role);
    END IF;
END
$$;

-- STEP 3: Migrate ALL existing users to the multi-role system
DO $$
DECLARE
    p_record RECORD;
BEGIN
    FOR p_record IN SELECT id, role, base_role FROM public.profiles WHERE id IS NOT NULL
    LOOP
        -- If user doesn't have base_role set, use their current role or 'casual'
        IF p_record.base_role IS NULL THEN
            UPDATE public.profiles 
            SET base_role = COALESCE(p_record.role, 'casual')
            WHERE id = p_record.id;
        END IF;
        
        -- Create user_roles entry for their current role if it exists
        IF p_record.role IS NOT NULL THEN
            INSERT INTO public.user_roles (user_id, role, is_active, assigned_at, assigned_by)
            VALUES (p_record.id, p_record.role, TRUE, NOW(), NULL)
            ON CONFLICT (user_id, role) DO NOTHING;
            
            -- If it's organizer or venue_owner, mark as verified
            IF p_record.role IN ('organizer', 'venue_owner') THEN
                INSERT INTO public.verified_roles (user_id, role, status, verified_at, verified_by)
                VALUES (p_record.id, p_record.role, 'approved', NOW(), NULL)
                ON CONFLICT (user_id, role) DO NOTHING;
            END IF;
        END IF;
    END LOOP;
END
$$;

-- STEP 4: Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_roles ENABLE ROW LEVEL SECURITY;

-- STEP 5: Create RLS policies
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;
CREATE POLICY "Admins can manage all user roles" ON public.user_roles
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

DROP POLICY IF EXISTS "Users can view their own verified roles" ON public.verified_roles;
CREATE POLICY "Users can view their own verified roles" ON public.verified_roles
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all verified roles" ON public.verified_roles;
CREATE POLICY "Admins can manage all verified roles" ON public.verified_roles
    FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE));

-- STEP 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON public.user_roles(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_verified_roles_user_id ON public.verified_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_verified_roles_status ON public.verified_roles(user_id, status);

-- STEP 7: Create helper functions
-- Drop existing functions first to avoid conflicts
DROP FUNCTION IF EXISTS public.get_user_roles(UUID);
DROP FUNCTION IF EXISTS public.get_verified_roles(UUID);

CREATE OR REPLACE FUNCTION public.get_user_roles(p_user_id UUID)
RETURNS TABLE(role VARCHAR, is_active BOOLEAN, assigned_at TIMESTAMP WITH TIME ZONE)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT ur.role, ur.is_active, ur.assigned_at
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id AND ur.is_active = TRUE
    ORDER BY ur.assigned_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_verified_roles(p_user_id UUID)
RETURNS TABLE(role VARCHAR, status VARCHAR, verified_at TIMESTAMP WITH TIME ZONE)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT vr.role, vr.status, vr.verified_at
    FROM public.verified_roles vr
    WHERE vr.user_id = p_user_id AND vr.status = 'approved'
    ORDER BY vr.verified_at DESC;
$$;

-- STEP 8: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verified_roles TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_verified_roles(UUID) TO authenticated;

-- STEP 9: Show summary of what was created
SELECT 'Multi-role system setup complete!' as status;
SELECT 'Total users migrated:' as info, COUNT(*) as count FROM profiles;
SELECT 'Total user roles created:' as info, COUNT(*) as count FROM user_roles;
SELECT 'Total verified roles created:' as info, COUNT(*) as count FROM verified_roles;
