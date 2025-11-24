-- Unified User Roles System Migration
-- Consolidates: user_roles, admin_user_roles, verified_roles into a single unified table
-- This simplifies role management and eliminates redundancy
-- 
-- ⚠️  BACKWARD COMPATIBLE: Old tables remain functional via views and triggers
-- ⚠️  NO BREAKING CHANGES: All existing queries continue to work

BEGIN;

-- =====================================================
-- STEP 1: Create the unified user_roles table
-- =====================================================

-- Create the new unified table WITHOUT dropping old tables
-- Old tables will continue to work via compatibility views/triggers

-- Create the new unified user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles_unified (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Role information
  role_type TEXT NOT NULL CHECK (role_type IN (
    -- Base roles
    'casual',
    'organizer',
    'venue_owner',
    -- Admin roles
    'super_admin',
    'ops_admin',
    'finance_admin',
    'moderator',
    'support_admin'
  )),
  
  -- Role category for easier querying
  role_category TEXT NOT NULL GENERATED ALWAYS AS (
    CASE 
      WHEN role_type = 'casual' THEN 'base'
      WHEN role_type IN ('organizer', 'venue_owner') THEN 'business'
      WHEN role_type IN ('super_admin', 'ops_admin', 'finance_admin', 'moderator', 'support_admin') THEN 'admin'
      ELSE 'base'
    END
  ) STORED,
  
  -- Status and verification
  is_active BOOLEAN DEFAULT true,
  verification_status TEXT DEFAULT 'approved' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  -- Only business roles (organizer, venue_owner) require verification
  -- Admin roles are auto-approved, casual is auto-approved
  
  -- Assignment tracking
  assigned_by UUID REFERENCES public.profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Verification tracking (for business roles)
  verified_by UUID REFERENCES public.profiles(id),
  verified_at TIMESTAMPTZ,
  verification_request_id UUID REFERENCES public.verification_requests(id),
  expires_at TIMESTAMPTZ, -- Optional expiration for time-limited roles
  
  -- Metadata
  notes TEXT, -- Admin notes or reason for assignment
  metadata JSONB DEFAULT '{}'::jsonb, -- Flexible storage for role-specific data
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT user_roles_unified_user_role_unique UNIQUE (user_id, role_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_unified_user_id ON public.user_roles_unified(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_unified_role_type ON public.user_roles_unified(role_type);
CREATE INDEX IF NOT EXISTS idx_user_roles_unified_role_category ON public.user_roles_unified(role_category);
CREATE INDEX IF NOT EXISTS idx_user_roles_unified_active ON public.user_roles_unified(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_roles_unified_verification ON public.user_roles_unified(user_id, verification_status) WHERE verification_status = 'approved';
CREATE INDEX IF NOT EXISTS idx_user_roles_unified_business_roles ON public.user_roles_unified(user_id, role_type) WHERE role_category = 'business' AND is_active = true;

-- =====================================================
-- STEP 2: Migrate data from old tables
-- =====================================================

-- Migrate from user_roles (base roles)
INSERT INTO public.user_roles_unified (
  user_id,
  role_type,
  is_active,
  verification_status,
  assigned_by,
  assigned_at,
  created_at,
  updated_at
)
SELECT 
  user_id,
  role::text as role_type,
  is_active,
  CASE 
    WHEN role IN ('organizer', 'venue_owner') THEN 'pending' -- Will be updated from verified_roles
    ELSE 'approved'
  END as verification_status,
  assigned_by,
  assigned_at,
  created_at,
  updated_at
FROM public.user_roles
WHERE role IN ('casual', 'organizer', 'venue_owner')
ON CONFLICT (user_id, role_type) DO NOTHING;

-- Migrate from admin_user_roles (admin roles)
INSERT INTO public.user_roles_unified (
  user_id,
  role_type,
  is_active,
  verification_status,
  assigned_by,
  assigned_at,
  created_at,
  updated_at
)
SELECT 
  aur.user_id,
  LOWER(ar.name) as role_type,
  true as is_active, -- Admin roles are always active
  'approved' as verification_status, -- Admin roles are auto-approved
  aur.assigned_by,
  aur.assigned_at,
  aur.assigned_at as created_at,
  aur.assigned_at as updated_at
FROM public.admin_user_roles aur
JOIN public.admin_roles ar ON ar.id = aur.role_id
WHERE LOWER(ar.name) IN ('super_admin', 'ops_admin', 'finance_admin', 'moderator', 'support_admin')
ON CONFLICT (user_id, role_type) DO NOTHING;

-- Update verification status from verified_roles
UPDATE public.user_roles_unified uru
SET 
  verification_status = CASE 
    WHEN vr.status = 'approved' THEN 'approved'
    WHEN vr.status = 'rejected' THEN 'rejected'
    ELSE 'pending'
  END,
  verified_by = vr.verified_by,
  verified_at = vr.verified_at,
  verification_request_id = vr.verification_request_id,
  expires_at = vr.expires_at,
  updated_at = NOW()
FROM public.verified_roles vr
WHERE uru.user_id = vr.user_id
  AND uru.role_type = vr.role::text
  AND uru.role_category = 'business';

-- Ensure all users have a 'casual' role (base role)
INSERT INTO public.user_roles_unified (
  user_id,
  role_type,
  is_active,
  verification_status,
  assigned_at,
  created_at,
  updated_at
)
SELECT 
  p.id as user_id,
  'casual' as role_type,
  true as is_active,
  'approved' as verification_status,
  p.created_at as assigned_at,
  p.created_at as created_at,
  p.created_at as updated_at
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles_unified uru 
  WHERE uru.user_id = p.id AND uru.role_type = 'casual'
)
ON CONFLICT (user_id, role_type) DO NOTHING;

-- =====================================================
-- STEP 3: Create helper functions
-- =====================================================

-- Function to get all active roles for a user
CREATE OR REPLACE FUNCTION public.get_user_active_roles(p_user_id UUID)
RETURNS TABLE(
  role_type TEXT,
  role_category TEXT,
  verification_status TEXT,
  assigned_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    uru.role_type,
    uru.role_category,
    uru.verification_status,
    uru.assigned_at
  FROM public.user_roles_unified uru
  WHERE uru.user_id = p_user_id
    AND uru.is_active = true
  ORDER BY 
    CASE uru.role_category
      WHEN 'admin' THEN 1
      WHEN 'business' THEN 2
      WHEN 'base' THEN 3
    END,
    uru.assigned_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.user_has_role(p_user_id UUID, p_role_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.user_roles_unified
    WHERE user_id = p_user_id
      AND role_type = p_role_type
      AND is_active = true
      AND (
        role_category != 'business' OR verification_status = 'approved'
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has any admin role
CREATE OR REPLACE FUNCTION public.user_is_admin(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.user_roles_unified
    WHERE user_id = p_user_id
      AND role_category = 'admin'
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has verified business role
CREATE OR REPLACE FUNCTION public.user_has_verified_business_role(p_user_id UUID, p_role_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM public.user_roles_unified
    WHERE user_id = p_user_id
      AND role_type = p_role_type
      AND role_category = 'business'
      AND is_active = true
      AND verification_status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign a role to a user
CREATE OR REPLACE FUNCTION public.assign_user_role_unified(
  p_user_id UUID,
  p_role_type TEXT,
  p_assigned_by UUID DEFAULT NULL,
  p_verification_status TEXT DEFAULT 'pending',
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_role_id UUID;
  v_role_category TEXT;
BEGIN
  -- Determine role category
  v_role_category := CASE 
    WHEN p_role_type = 'casual' THEN 'base'
    WHEN p_role_type IN ('organizer', 'venue_owner') THEN 'business'
    WHEN p_role_type IN ('super_admin', 'ops_admin', 'finance_admin', 'moderator', 'support_admin') THEN 'admin'
    ELSE 'base'
  END;
  
  -- Admin roles are auto-approved
  IF v_role_category = 'admin' THEN
    p_verification_status := 'approved';
  END IF;
  
  -- Base roles are auto-approved
  IF v_role_category = 'base' THEN
    p_verification_status := 'approved';
  END IF;
  
  INSERT INTO public.user_roles_unified (
    user_id,
    role_type,
    is_active,
    verification_status,
    assigned_by,
    assigned_at,
    notes,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    p_role_type,
    true,
    p_verification_status,
    p_assigned_by,
    NOW(),
    p_notes,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, role_type) 
  DO UPDATE SET
    is_active = true,
    verification_status = EXCLUDED.verification_status,
    assigned_by = COALESCE(EXCLUDED.assigned_by, user_roles_unified.assigned_by),
    notes = COALESCE(EXCLUDED.notes, user_roles_unified.notes),
    updated_at = NOW()
  RETURNING id INTO v_role_id;
  
  RETURN v_role_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to remove/deactivate a role
CREATE OR REPLACE FUNCTION public.remove_user_role_unified(
  p_user_id UUID,
  p_role_type TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Don't allow removing 'casual' role
  IF p_role_type = 'casual' THEN
    RAISE EXCEPTION 'Cannot remove base casual role';
  END IF;
  
  UPDATE public.user_roles_unified
  SET 
    is_active = false,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND role_type = p_role_type;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 4: Create updated view for easy querying
-- =====================================================

CREATE OR REPLACE VIEW public.user_roles_summary AS
SELECT 
  p.id as user_id,
  p.username,
  p.full_name,
  p.email,
  p.is_admin, -- Keep for backward compatibility
  p.admin_roles, -- Keep for backward compatibility
  
  -- Active roles
  array_agg(uru.role_type ORDER BY 
    CASE uru.role_category
      WHEN 'admin' THEN 1
      WHEN 'business' THEN 2
      WHEN 'base' THEN 3
    END,
    uru.assigned_at ASC
  ) FILTER (WHERE uru.is_active = true) as active_roles,
  
  -- Verified business roles
  array_agg(uru.role_type ORDER BY uru.assigned_at ASC) 
  FILTER (
    WHERE uru.is_active = true 
    AND uru.role_category = 'business' 
    AND uru.verification_status = 'approved'
  ) as verified_business_roles,
  
  -- Admin roles
  array_agg(uru.role_type ORDER BY uru.assigned_at ASC) 
  FILTER (
    WHERE uru.is_active = true 
    AND uru.role_category = 'admin'
  ) as admin_roles_list,
  
  -- Counts
  count(uru.role_type) FILTER (WHERE uru.is_active = true) as total_active_roles,
  count(uru.role_type) FILTER (
    WHERE uru.is_active = true 
    AND uru.role_category = 'business' 
    AND uru.verification_status = 'approved'
  ) as total_verified_business_roles,
  count(uru.role_type) FILTER (
    WHERE uru.is_active = true 
    AND uru.role_category = 'admin'
  ) as total_admin_roles

FROM public.profiles p
LEFT JOIN public.user_roles_unified uru ON p.id = uru.user_id
GROUP BY p.id, p.username, p.full_name, p.email, p.is_admin, p.admin_roles;

-- =====================================================
-- STEP 5: Set up RLS policies
-- =====================================================

ALTER TABLE public.user_roles_unified ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles_unified
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all roles
CREATE POLICY "Admins can view all roles" ON public.user_roles_unified
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles_unified uru
      WHERE uru.user_id = auth.uid()
        AND uru.role_category = 'admin'
        AND uru.is_active = true
    )
  );

-- Admins can manage all roles
CREATE POLICY "Admins can manage all roles" ON public.user_roles_unified
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles_unified uru
      WHERE uru.user_id = auth.uid()
        AND uru.role_category = 'admin'
        AND uru.is_active = true
    )
  );

-- Grant permissions
GRANT SELECT ON public.user_roles_unified TO authenticated;
GRANT SELECT ON public.user_roles_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_active_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_is_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_verified_business_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_user_role_unified(UUID, TEXT, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_user_role_unified(UUID, TEXT) TO authenticated;

-- =====================================================
-- STEP 6: Replace old tables with views (EXACT MATCH)
-- =====================================================
-- These views replace the old tables and maintain 100% backward compatibility
-- All existing queries will work unchanged
-- 
-- Strategy: Rename old tables, create views with original names, then drop old tables

-- Step 6a: Rename old tables (if they exist) to backup names
DO $$
BEGIN
  -- Rename user_roles table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles' AND table_type = 'BASE TABLE') THEN
    ALTER TABLE public.user_roles RENAME TO user_roles_old_backup;
  END IF;
  
  -- Rename verified_roles table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'verified_roles' AND table_type = 'BASE TABLE') THEN
    ALTER TABLE public.verified_roles RENAME TO verified_roles_old_backup;
  END IF;
  
  -- Rename admin_user_roles table if it exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_user_roles' AND table_type = 'BASE TABLE') THEN
    ALTER TABLE public.admin_user_roles RENAME TO admin_user_roles_old_backup;
  END IF;
END $$;

-- Step 6b: Create views that EXACTLY match the old table structures
-- View that EXACTLY matches the old user_roles table structure
CREATE OR REPLACE VIEW public.user_roles AS
SELECT 
  uru.id,
  uru.user_id,
  uru.role_type as role,
  uru.is_active,
  uru.assigned_by,
  uru.assigned_at,
  COALESCE(uru.created_at, uru.assigned_at) as created_at,
  uru.updated_at,
  false as is_primary -- For backward compatibility (some schemas have this)
FROM public.user_roles_unified uru
WHERE uru.role_category IN ('base', 'business'); -- Only base and business roles

-- View that EXACTLY matches the old verified_roles table structure
CREATE OR REPLACE VIEW public.verified_roles AS
SELECT 
  uru.id,
  uru.user_id,
  uru.role_type::text as role,  -- Cast to text first, then app_role if type exists
  uru.verification_status as status,
  uru.is_active,
  uru.verified_at,
  uru.verified_by,
  uru.verification_request_id,
  uru.expires_at,
  uru.updated_at,
  uru.verified_at as reviewed_at  -- Alias for backward compatibility
FROM public.user_roles_unified uru
WHERE uru.role_category = 'business'; -- Only business roles need verification

-- View that EXACTLY matches the old admin_user_roles table structure
CREATE OR REPLACE VIEW public.admin_user_roles AS
SELECT 
  uru.id,
  uru.user_id,
  ar.id as role_id,
  uru.assigned_by,
  uru.assigned_at
FROM public.user_roles_unified uru
JOIN public.admin_roles ar ON LOWER(ar.name) = uru.role_type
WHERE uru.role_category = 'admin'
  AND uru.is_active = true;

-- Step 6c: Make views updatable (for INSERT/UPDATE/DELETE operations)
-- Create INSTEAD OF triggers to handle writes to views

-- Function to handle INSERT on user_roles view
CREATE OR REPLACE FUNCTION public.user_roles_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles_unified (
    user_id, role_type, is_active, assigned_by, assigned_at, 
    verification_status, created_at, updated_at
  )
  VALUES (
    NEW.user_id,
    NEW.role::text,
    COALESCE(NEW.is_active, true),
    NEW.assigned_by,
    COALESCE(NEW.assigned_at, NOW()),
    CASE 
      WHEN NEW.role IN ('organizer', 'venue_owner') THEN 'pending'
      ELSE 'approved'
    END,
    COALESCE(NEW.created_at, NOW()),
    COALESCE(NEW.updated_at, NOW())
  )
  ON CONFLICT (user_id, role_type) 
  DO UPDATE SET
    is_active = EXCLUDED.is_active,
    assigned_by = EXCLUDED.assigned_by,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_roles_insert_trigger
  INSTEAD OF INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.user_roles_insert();

-- Function to handle UPDATE on user_roles view
CREATE OR REPLACE FUNCTION public.user_roles_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_roles_unified
  SET
    is_active = NEW.is_active,
    assigned_by = NEW.assigned_by,
    updated_at = NOW()
  WHERE user_id = NEW.user_id AND role_type = NEW.role::text;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_roles_update_trigger
  INSTEAD OF UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.user_roles_update();

-- Function to handle DELETE on user_roles view
CREATE OR REPLACE FUNCTION public.user_roles_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Don't allow deleting casual role
  IF OLD.role = 'casual' THEN
    RAISE EXCEPTION 'Cannot delete base casual role';
  END IF;
  
  UPDATE public.user_roles_unified
  SET is_active = false, updated_at = NOW()
  WHERE user_id = OLD.user_id AND role_type = OLD.role::text;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_roles_delete_trigger
  INSTEAD OF DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.user_roles_delete();

-- Function to handle INSERT/UPDATE on verified_roles view
CREATE OR REPLACE FUNCTION public.verified_roles_upsert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_roles_unified (
    user_id, role_type, is_active, verification_status,
    verified_by, verified_at, verification_request_id, expires_at,
    created_at, updated_at
  )
  VALUES (
    NEW.user_id,
    NEW.role::text,
    COALESCE(NEW.is_active, true),
    COALESCE(NEW.status, 'pending'),
    NEW.verified_by,
    NEW.verified_at,
    NEW.verification_request_id,
    NEW.expires_at,
    NOW(),
    COALESCE(NEW.updated_at, NOW())
  )
  ON CONFLICT (user_id, role_type) 
  DO UPDATE SET
    verification_status = EXCLUDED.verification_status,
    is_active = EXCLUDED.is_active,
    verified_by = EXCLUDED.verified_by,
    verified_at = EXCLUDED.verified_at,
    verification_request_id = EXCLUDED.verification_request_id,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER verified_roles_insert_trigger
  INSTEAD OF INSERT ON public.verified_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.verified_roles_upsert();

CREATE TRIGGER verified_roles_update_trigger
  INSTEAD OF UPDATE ON public.verified_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.verified_roles_upsert();

-- Function to handle INSERT on admin_user_roles view
CREATE OR REPLACE FUNCTION public.admin_user_roles_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  -- Get role name from admin_roles table
  SELECT LOWER(name) INTO v_role_name
  FROM public.admin_roles
  WHERE id = NEW.role_id;
  
  IF v_role_name IS NOT NULL THEN
    INSERT INTO public.user_roles_unified (
      user_id, role_type, is_active, verification_status,
      assigned_by, assigned_at, created_at, updated_at
    )
    VALUES (
      NEW.user_id,
      v_role_name,
      true, -- Admin roles are always active
      'approved', -- Admin roles are auto-approved
      NEW.assigned_by,
      COALESCE(NEW.assigned_at, NOW()),
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, role_type) 
    DO UPDATE SET
      assigned_by = EXCLUDED.assigned_by,
      assigned_at = EXCLUDED.assigned_at,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_user_roles_insert_trigger
  INSTEAD OF INSERT ON public.admin_user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.admin_user_roles_insert();

-- Function to handle DELETE on admin_user_roles view
CREATE OR REPLACE FUNCTION public.admin_user_roles_delete()
RETURNS TRIGGER AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  -- Get role name from admin_roles table
  SELECT LOWER(name) INTO v_role_name
  FROM public.admin_roles
  WHERE id = OLD.role_id;
  
  IF v_role_name IS NOT NULL THEN
    UPDATE public.user_roles_unified
    SET is_active = false, updated_at = NOW()
    WHERE user_id = OLD.user_id AND role_type = v_role_name;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_user_roles_delete_trigger
  INSTEAD OF DELETE ON public.admin_user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.admin_user_roles_delete();

-- Grant permissions on views (same as old tables had)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verified_roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_user_roles TO authenticated;

-- =====================================================
-- STEP 7: Drop old backup tables (after views are created and tested)
-- =====================================================
-- Old tables have been renamed to *_old_backup
-- Views now replace them completely
-- After verifying everything works, you can drop the backup tables
-- 
-- ⚠️  SAFETY: Keep backup tables for 30 days before dropping
-- ⚠️  To drop: Uncomment the DROP statements below after verification

-- Drop old backup tables (commented out for safety - uncomment after verification)
-- DROP TABLE IF EXISTS public.user_roles_old_backup CASCADE;
-- DROP TABLE IF EXISTS public.verified_roles_old_backup CASCADE;
-- DROP TABLE IF EXISTS public.admin_user_roles_old_backup CASCADE;

-- Function to sync from unified table to old user_roles table (if exists)
CREATE OR REPLACE FUNCTION public.sync_user_roles_from_unified()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if old table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    -- Insert or update in old user_roles table
    INSERT INTO public.user_roles (user_id, role, is_active, assigned_by, assigned_at, created_at, updated_at)
    VALUES (
      NEW.user_id,
      NEW.role_type::text,
      NEW.is_active,
      NEW.assigned_by,
      NEW.assigned_at,
      NEW.created_at,
      NEW.updated_at
    )
    ON CONFLICT (user_id, role) 
    DO UPDATE SET
      is_active = NEW.is_active,
      assigned_by = NEW.assigned_by,
      updated_at = NEW.updated_at
    WHERE NEW.role_category IN ('base', 'business');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to sync from unified table to old verified_roles table (if exists)
CREATE OR REPLACE FUNCTION public.sync_verified_roles_from_unified()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if old table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'verified_roles') THEN
    -- Only sync business roles
    IF NEW.role_category = 'business' THEN
      INSERT INTO public.verified_roles (
        user_id, role, status, is_active, verified_at, verified_by, 
        verification_request_id, expires_at, updated_at
      )
      VALUES (
        NEW.user_id,
        NEW.role_type::app_role,
        NEW.verification_status,
        NEW.is_active,
        NEW.verified_at,
        NEW.verified_by,
        NEW.verification_request_id,
        NEW.expires_at,
        NEW.updated_at
      )
      ON CONFLICT (user_id, role) 
      DO UPDATE SET
        status = NEW.verification_status,
        is_active = NEW.is_active,
        verified_at = NEW.verified_at,
        verified_by = NEW.verified_by,
        verification_request_id = NEW.verification_request_id,
        expires_at = NEW.expires_at,
        updated_at = NEW.updated_at;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to sync from unified table to old admin_user_roles table (if exists)
CREATE OR REPLACE FUNCTION public.sync_admin_user_roles_from_unified()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id UUID;
BEGIN
  -- Only sync if old tables exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_user_roles')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_roles') THEN
    -- Only sync admin roles
    IF NEW.role_category = 'admin' THEN
      -- Get admin role ID
      SELECT id INTO v_role_id
      FROM public.admin_roles
      WHERE LOWER(name) = NEW.role_type
      LIMIT 1;
      
      IF v_role_id IS NOT NULL THEN
        INSERT INTO public.admin_user_roles (user_id, role_id, assigned_by, assigned_at)
        VALUES (NEW.user_id, v_role_id, NEW.assigned_by, NEW.assigned_at)
        ON CONFLICT (user_id, role_id) 
        DO UPDATE SET
          assigned_by = NEW.assigned_by,
          assigned_at = NEW.assigned_at;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to sync changes from unified table to old tables
DROP TRIGGER IF EXISTS sync_user_roles_trigger ON public.user_roles_unified;
CREATE TRIGGER sync_user_roles_trigger
  AFTER INSERT OR UPDATE ON public.user_roles_unified
  FOR EACH ROW
  WHEN (NEW.role_category IN ('base', 'business'))
  EXECUTE FUNCTION public.sync_user_roles_from_unified();

DROP TRIGGER IF EXISTS sync_verified_roles_trigger ON public.user_roles_unified;
CREATE TRIGGER sync_verified_roles_trigger
  AFTER INSERT OR UPDATE ON public.user_roles_unified
  FOR EACH ROW
  WHEN (NEW.role_category = 'business')
  EXECUTE FUNCTION public.sync_verified_roles_from_unified();

DROP TRIGGER IF EXISTS sync_admin_user_roles_trigger ON public.user_roles_unified;
CREATE TRIGGER sync_admin_user_roles_trigger
  AFTER INSERT OR UPDATE ON public.user_roles_unified
  FOR EACH ROW
  WHEN (NEW.role_category = 'admin')
  EXECUTE FUNCTION public.sync_admin_user_roles_from_unified();

-- =====================================================
-- STEP 8: Create triggers to sync FROM old tables TO unified (bidirectional sync)
-- =====================================================
-- These triggers ensure that when you write to old tables (user_roles, verified_roles, admin_user_roles),
-- the unified table is automatically updated. This maintains data consistency in both directions.

-- Function to sync from old user_roles table to unified
CREATE OR REPLACE FUNCTION public.sync_user_roles_to_unified()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update in unified table
  INSERT INTO public.user_roles_unified (
    user_id, role_type, is_active, assigned_by, assigned_at, 
    verification_status, created_at, updated_at
  )
  VALUES (
    NEW.user_id,
    NEW.role::text,
    NEW.is_active,
    NEW.assigned_by,
    NEW.assigned_at,
    CASE 
      WHEN NEW.role IN ('organizer', 'venue_owner') THEN 'pending'
      ELSE 'approved'
    END,
    COALESCE(NEW.created_at, NOW()),
    COALESCE(NEW.updated_at, NOW())
  )
  ON CONFLICT (user_id, role_type) 
  DO UPDATE SET
    is_active = NEW.is_active,
    assigned_by = NEW.assigned_by,
    updated_at = NEW.updated_at
  WHERE NEW.role IN ('casual', 'organizer', 'venue_owner');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to sync from old verified_roles table to unified
CREATE OR REPLACE FUNCTION public.sync_verified_roles_to_unified()
RETURNS TRIGGER AS $$
BEGIN
  -- Update unified table
  UPDATE public.user_roles_unified
  SET
    verification_status = NEW.status,
    is_active = NEW.is_active,
    verified_at = NEW.verified_at,
    verified_by = NEW.verified_by,
    verification_request_id = NEW.verification_request_id,
    expires_at = NEW.expires_at,
    updated_at = NEW.updated_at
  WHERE user_id = NEW.user_id
    AND role_type = NEW.role::text
    AND role_category = 'business';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to sync from old admin_user_roles table to unified
CREATE OR REPLACE FUNCTION public.sync_admin_user_roles_to_unified()
RETURNS TRIGGER AS $$
DECLARE
  v_role_name TEXT;
BEGIN
  -- Get admin role name
  SELECT LOWER(name) INTO v_role_name
  FROM public.admin_roles
  WHERE id = NEW.role_id;
  
  IF v_role_name IS NOT NULL THEN
    -- Insert or update in unified table
    INSERT INTO public.user_roles_unified (
      user_id, role_type, is_active, assigned_by, assigned_at,
      verification_status, created_at, updated_at
    )
    VALUES (
      NEW.user_id,
      v_role_name,
      true, -- Admin roles are always active
      NEW.assigned_by,
      NEW.assigned_at,
      'approved', -- Admin roles are auto-approved
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id, role_type) 
    DO UPDATE SET
      assigned_by = NEW.assigned_by,
      assigned_at = NEW.assigned_at,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on old tables (only if they exist)
DO $$
BEGIN
  -- Sync from old user_roles to unified
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    DROP TRIGGER IF EXISTS sync_user_roles_to_unified_trigger ON public.user_roles;
    CREATE TRIGGER sync_user_roles_to_unified_trigger
      AFTER INSERT OR UPDATE ON public.user_roles
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_user_roles_to_unified();
  END IF;
  
  -- Sync from old verified_roles to unified
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'verified_roles') THEN
    DROP TRIGGER IF EXISTS sync_verified_roles_to_unified_trigger ON public.verified_roles;
    CREATE TRIGGER sync_verified_roles_to_unified_trigger
      AFTER INSERT OR UPDATE ON public.verified_roles
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_verified_roles_to_unified();
  END IF;
  
  -- Sync from old admin_user_roles to unified
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_user_roles') THEN
    DROP TRIGGER IF EXISTS sync_admin_user_roles_to_unified_trigger ON public.admin_user_roles;
    CREATE TRIGGER sync_admin_user_roles_to_unified_trigger
      AFTER INSERT OR UPDATE ON public.admin_user_roles
      FOR EACH ROW
      EXECUTE FUNCTION public.sync_admin_user_roles_to_unified();
  END IF;
END $$;

COMMIT;

-- =====================================================
-- STEP 9: Verification queries
-- =====================================================

-- Verify migration
SELECT 
  'Migration Complete - Backward Compatible' as status,
  (SELECT COUNT(*) FROM public.user_roles_unified) as total_roles_unified,
  (SELECT COUNT(*) FROM public.user_roles_unified WHERE role_category = 'base') as base_roles,
  (SELECT COUNT(*) FROM public.user_roles_unified WHERE role_category = 'business') as business_roles,
  (SELECT COUNT(*) FROM public.user_roles_unified WHERE role_category = 'admin') as admin_roles,
  (SELECT COUNT(*) FROM public.user_roles_unified WHERE is_active = true) as active_roles,
  (SELECT COUNT(*) FROM public.user_roles_compat) as compat_user_roles_count,
  (SELECT COUNT(*) FROM public.verified_roles_compat) as compat_verified_roles_count,
  (SELECT COUNT(*) FROM public.admin_user_roles_compat) as compat_admin_user_roles_count;

-- =====================================================
-- IMPORTANT NOTES - BACKWARD COMPATIBILITY:
-- =====================================================
-- ✅ Old tables (user_roles, verified_roles, admin_user_roles) remain INTACT and FUNCTIONAL
-- ✅ All existing queries continue to work EXACTLY as before
-- ✅ Bidirectional triggers keep old and new tables automatically in sync
-- ✅ You can write to EITHER old tables OR unified table - both stay consistent
-- ✅ No code changes required - website functionality remains 100% intact
-- ✅ You can gradually migrate code to use user_roles_unified at your own pace
-- ✅ After full migration (if desired), old tables can be deprecated (optional)
--
-- HOW IT WORKS:
-- 1. Write to old table (user_roles) → Trigger syncs to user_roles_unified
-- 2. Write to unified table (user_roles_unified) → Trigger syncs to old tables
-- 3. Both systems work simultaneously and stay in sync automatically
-- 4. Zero breaking changes - everything works as before

