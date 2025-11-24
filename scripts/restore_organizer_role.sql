-- Script to restore organizer role for a user
-- ⚠️  WARNING: Replace 'USER_ID_HERE' with the actual user ID
-- ⚠️  This script will:
-- 1. Ensure user_roles entry exists and is active
-- 2. Ensure verified_roles entry exists and is approved
-- 3. Create verification_request if needed

BEGIN;

-- Step 1: Ensure user_roles entry exists and is active
INSERT INTO public.user_roles (user_id, role, is_active, assigned_at, updated_at)
VALUES (
  'USER_ID_HERE'::uuid,
  'organizer',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (user_id, role) 
DO UPDATE SET
  is_active = true,
  updated_at = NOW();

-- Step 2: Check if there's an approved verification_request
-- If yes, use it to create verified_roles entry
DO $$
DECLARE
  v_request_id uuid;
  v_verified_by uuid;
BEGIN
  -- Find the most recent approved verification request
  SELECT id, reviewed_by INTO v_request_id, v_verified_by
  FROM public.verification_requests
  WHERE user_id = 'USER_ID_HERE'::uuid
    AND requested_role = 'organizer'
    AND status = 'approved'
  ORDER BY reviewed_at DESC
  LIMIT 1;

  -- If no approved request exists, create one
  IF v_request_id IS NULL THEN
    INSERT INTO public.verification_requests (
      user_id,
      requested_role,
      status,
      business_name,
      business_type,
      business_description,
      contact_email,
      submitted_at,
      reviewed_at,
      reviewed_by
    )
    VALUES (
      'USER_ID_HERE'::uuid,
      'organizer',
      'approved',
      'Restored Organizer Account',
      'esports_organization',
      'Organizer role restored via admin script',
      (SELECT email FROM auth.users WHERE id = 'USER_ID_HERE'::uuid),
      NOW(),
      NOW(),
      'USER_ID_HERE'::uuid  -- Self-verified (or replace with admin user ID)
    )
    RETURNING id INTO v_request_id;

    -- Set reviewed_by to the user themselves (or you can set it to an admin user ID)
    UPDATE public.verification_requests
    SET reviewed_by = 'USER_ID_HERE'::uuid
    WHERE id = v_request_id;
  END IF;

  -- Ensure verified_roles entry exists and is active
  INSERT INTO public.verified_roles (
    user_id,
    role,
    status,
    is_active,
    verified_at,
    verified_by,
    verification_request_id,
    updated_at
  )
  VALUES (
    'USER_ID_HERE'::uuid,
    'organizer',
    'approved',
    true,
    NOW(),
    COALESCE(v_verified_by, 'USER_ID_HERE'::uuid),
    v_request_id,
    NOW()
  )
  ON CONFLICT (user_id, role) 
  WHERE is_active = true
  DO UPDATE SET
    status = 'approved',
    is_active = true,
    updated_at = NOW();
END $$;

COMMIT;

-- Verification query: Check if everything is set correctly
SELECT 
  'Restoration Complete' as status,
  (SELECT COUNT(*) FROM public.user_roles WHERE user_id = 'USER_ID_HERE'::uuid AND role = 'organizer' AND is_active = true) as user_roles_active,
  (SELECT COUNT(*) FROM public.verified_roles WHERE user_id = 'USER_ID_HERE'::uuid AND role = 'organizer' AND status = 'approved' AND is_active = true) as verified_roles_approved;

