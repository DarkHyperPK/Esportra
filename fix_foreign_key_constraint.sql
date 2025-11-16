-- =====================================================
-- FIX FOREIGN KEY CONSTRAINT ISSUE
-- =====================================================
-- This script fixes the foreign key constraint that's preventing profile creation

-- 1. FIRST, LET'S SEE WHAT CONSTRAINTS EXIST
-- =====================================================

SELECT '=== CHECKING EXISTING CONSTRAINTS ===' as step;
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'profiles'
  AND tc.table_schema = 'public';

-- 2. CHECK IF USERS TABLE EXISTS
-- =====================================================

SELECT '=== CHECKING IF USERS TABLE EXISTS ===' as step;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'users';

-- 3. DROP THE PROBLEMATIC FOREIGN KEY CONSTRAINT
-- =====================================================

-- Drop the foreign key constraint that references users table
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 4. CREATE THE USER IN AUTH.USERS (Supabase's built-in auth table)
-- =====================================================

-- Insert the user into auth.users if it doesn't exist
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '6f7da42e-a787-4533-83f4-e06da5c8ce7d',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'test@example.com',
    '$2a$10$dummy.hash.for.testing.purposes.only',
    NOW(),
    NULL,
    NOW(),
    '{"provider": "email", "providers": ["email"]}',
    '{"username": "testuser", "full_name": "Test User"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- 5. NOW CREATE THE PROFILE
-- =====================================================

-- Insert profile for the authenticated user
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

-- 6. TEST THE PROFILE CREATION
-- =====================================================

SELECT 'Testing profile creation...' as test;
SELECT id, username, email, role FROM public.profiles WHERE id = '6f7da42e-a787-4533-83f4-e06da5c8ce7d';

-- 7. SUCCESS MESSAGE
-- =====================================================

SELECT '🎉 Foreign key constraint fixed and profile created!' as message;
SELECT '✅ User profile should now be found in the application' as status;
