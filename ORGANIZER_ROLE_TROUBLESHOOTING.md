# Organizer Role Troubleshooting Guide

## Problem
Your organizer role has vanished and shows "not verified" status.

## Root Cause
The system uses a **multi-role verification system** that requires:
1. **`user_roles` table**: Must have an entry with `role = 'organizer'` and `is_active = true`
2. **`verified_roles` table**: Must have an entry with `role = 'organizer'`, `status = 'approved'`, and `is_active = true`

If either of these entries is missing, inactive, or not approved, the organizer role will not be available.

## Diagnostic Steps

### Step 1: Check Your Current Status
Run this query in Supabase SQL Editor (replace `YOUR_USER_ID` with your actual user ID):

```sql
-- Check user_roles
SELECT 'user_roles' as table_name, user_id, role, is_active, assigned_at
FROM public.user_roles
WHERE user_id = 'YOUR_USER_ID'::uuid AND role = 'organizer';

-- Check verified_roles
SELECT 'verified_roles' as table_name, user_id, role, status, is_active, verified_at
FROM public.verified_roles
WHERE user_id = 'YOUR_USER_ID'::uuid AND role = 'organizer';

-- Check verification_requests
SELECT 'verification_requests' as table_name, user_id, requested_role, status, submitted_at, reviewed_at
FROM public.verification_requests
WHERE user_id = 'YOUR_USER_ID'::uuid AND requested_role = 'organizer'
ORDER BY submitted_at DESC;
```

### Step 2: Identify the Issue

**Scenario A: Missing `user_roles` entry**
- The `user_roles` query returns no rows
- **Fix**: Run the restore script (see below)

**Scenario B: `user_roles` exists but `is_active = false`**
- The `user_roles` query returns a row with `is_active = false`
- **Fix**: Update the entry to set `is_active = true`

**Scenario C: Missing `verified_roles` entry**
- The `verified_roles` query returns no rows
- **Fix**: Run the restore script (see below)

**Scenario D: `verified_roles` exists but `status != 'approved'` or `is_active = false`**
- The `verified_roles` query returns a row with wrong status or inactive
- **Fix**: Update the entry to set `status = 'approved'` and `is_active = true`

## Quick Fix: Restore Organizer Role

### Option 1: Use the Restore Script

1. Open `scripts/restore_organizer_role.sql` in your editor
2. Replace `'USER_ID_HERE'` with your actual user ID (found in Supabase Auth > Users)
3. Run the script in Supabase SQL Editor

### Option 2: Manual Fix

If you prefer to fix manually:

```sql
BEGIN;

-- Step 1: Ensure user_roles entry is active
INSERT INTO public.user_roles (user_id, role, is_active, assigned_at, updated_at)
VALUES (
  'YOUR_USER_ID'::uuid,
  'organizer',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (user_id, role) 
DO UPDATE SET
  is_active = true,
  updated_at = NOW();

-- Step 2: Ensure verified_roles entry is approved and active
-- First, check if you have a verification_request_id
-- If not, you may need to create one or use an existing one

-- Update or insert verified_roles
INSERT INTO public.verified_roles (
  user_id,
  role,
  status,
  is_active,
  verified_at,
  updated_at
)
VALUES (
  'YOUR_USER_ID'::uuid,
  'organizer',
  'approved',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (user_id, role) 
DO UPDATE SET
  status = 'approved',
  is_active = true,
  updated_at = NOW();

COMMIT;
```

## Prevention

To prevent this from happening again:

1. **Don't manually delete entries** from `user_roles` or `verified_roles` tables
2. **Use the admin verification system** to approve/reject organizer roles
3. **Check before running migrations** that might affect these tables

## Still Having Issues?

If the restore script doesn't work:

1. Check the browser console for any errors
2. Clear your browser's localStorage: `localStorage.removeItem('sessionRole')`
3. Refresh the page
4. Check if you're logged in with the correct account
5. Verify your user ID matches in all queries

## Contact Admin

If you're unable to restore your role, contact an admin who can:
1. Check your verification status in the admin panel
2. Re-approve your organizer verification
3. Manually restore your role using the admin tools

