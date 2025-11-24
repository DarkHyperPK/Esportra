# Unified Roles System - Complete Implementation Plan

## Overview

This plan consolidates `user_roles`, `admin_user_roles`, and `verified_roles` into a single `user_roles_unified` table while maintaining 100% backward compatibility through views that exactly match the old table structures.

## Functional Requirements Analysis

### 1. Base Role Management (user_roles)
- ✅ Store casual/organizer/venue_owner roles
- ✅ Track active/inactive status
- ✅ Track assignment (who, when)
- ✅ Query: Get all active roles for user
- ✅ Query: Check if user has specific role

### 2. Business Role Verification (verified_roles)
- ✅ Track verification status (pending/approved/rejected)
- ✅ Track verification details (who verified, when, request ID)
- ✅ Support expiration dates
- ✅ Query: Check if business role is verified
- ✅ Query: Get verification status for display

### 3. Admin Role Management (admin_user_roles + admin_roles)
- ✅ Link users to admin role definitions
- ✅ Track assignment (who, when)
- ✅ Query: Get user's admin roles
- ✅ Query: Check if user has admin role
- ✅ Resolve role_id to role name via admin_roles table

### 4. Role Switching Logic
- ✅ Check if user has role (user_roles)
- ✅ Check if business role is verified (verified_roles)
- ✅ Allow/deny role switch based on verification

### 5. Verification Approval Flow
- ✅ Create verified_roles entry on approval
- ✅ Create/update user_roles entry on approval
- ✅ Update profiles.role (legacy)

## Unified Table Schema

```sql
CREATE TABLE user_roles_unified (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Role identification
  role_type TEXT NOT NULL CHECK (role_type IN (
    'casual', 'organizer', 'venue_owner',
    'super_admin', 'ops_admin', 'finance_admin', 'moderator', 'support_admin'
  )),
  role_category TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN role_type = 'casual' THEN 'base'
      WHEN role_type IN ('organizer', 'venue_owner') THEN 'business'
      WHEN role_type IN ('super_admin', 'ops_admin', 'finance_admin', 'moderator', 'support_admin') THEN 'admin'
    END
  ) STORED,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  verification_status TEXT DEFAULT 'approved' CHECK (verification_status IN ('pending', 'approved', 'rejected')),
  
  -- Assignment tracking
  assigned_by UUID REFERENCES profiles(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Verification tracking (for business roles)
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  verification_request_id UUID REFERENCES verification_requests(id),
  expires_at TIMESTAMPTZ,
  
  -- Metadata
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, role_type)
);
```

## Compatibility Views (Exact Match)

### View: `user_roles` (replaces table)
```sql
CREATE VIEW user_roles AS
SELECT 
  id,
  user_id,
  role_type as role,
  is_active,
  assigned_by,
  assigned_at,
  created_at,
  updated_at,
  false as is_primary  -- For backward compatibility
FROM user_roles_unified
WHERE role_category IN ('base', 'business');
```

### View: `verified_roles` (replaces table)
```sql
CREATE VIEW verified_roles AS
SELECT 
  id,
  user_id,
  role_type::app_role as role,  -- Cast to app_role type if exists
  verification_status as status,
  is_active,
  verified_at,
  verified_by,
  verification_request_id,
  expires_at,
  updated_at,
  NULL::TIMESTAMPTZ as reviewed_at  -- For backward compatibility
FROM user_roles_unified
WHERE role_category = 'business';
```

### View: `admin_user_roles` (replaces table)
```sql
CREATE VIEW admin_user_roles AS
SELECT 
  uru.id,
  uru.user_id,
  ar.id as role_id,
  uru.assigned_by,
  uru.assigned_at
FROM user_roles_unified uru
JOIN admin_roles ar ON LOWER(ar.name) = uru.role_type
WHERE uru.role_category = 'admin'
  AND uru.is_active = true;
```

## Migration Steps

### Step 1: Create Unified Table
- Create `user_roles_unified` table
- Create all indexes
- Set up RLS policies

### Step 2: Migrate Data
- Migrate from `user_roles` → `user_roles_unified` (base/business roles)
- Migrate from `admin_user_roles` + `admin_roles` → `user_roles_unified` (admin roles)
- Migrate from `verified_roles` → update `user_roles_unified` verification fields

### Step 3: Create Compatibility Views
- Create views that exactly match old table structures
- Grant same permissions as old tables
- Ensure all queries work unchanged

### Step 4: Drop Old Tables
- Drop `user_roles` table (replaced by view)
- Drop `verified_roles` table (replaced by view)
- Drop `admin_user_roles` table (replaced by view)
- **Keep `admin_roles` table** (still needed for role definitions)

### Step 5: Test Everything
- Test role switching
- Test verification approval
- Test admin role assignment
- Test all existing queries

## Code Updates Required

### Minimal Changes Needed

1. **RoleContext.tsx** - No changes needed (uses views)
2. **AdminContext.tsx** - No changes needed (uses views)
3. **RoleSwitcher.tsx** - No changes needed (uses views)
4. **VerificationSystem.tsx** - No changes needed (uses views)
5. **AdminManagement.tsx** - No changes needed (uses views)

### Optional Optimizations (Future)

- Update queries to use `user_roles_unified` directly for better performance
- Use new helper functions for common operations
- Remove legacy `profiles.role` and `profiles.admin_roles` fields (optional)

## Safety Measures

1. ✅ Views exactly match old table structures
2. ✅ All existing queries work unchanged
3. ✅ RLS policies maintained
4. ✅ Indexes created for performance
5. ✅ Data migration preserves all information
6. ✅ Rollback plan available (keep old tables as backup)

## Testing Checklist

- [ ] All users have casual role
- [ ] Organizer roles work with verification
- [ ] Venue owner roles work with verification
- [ ] Admin roles work correctly
- [ ] Role switching works
- [ ] Verification approval works
- [ ] Admin role assignment works
- [ ] All existing queries return same results
- [ ] No errors in browser console
- [ ] Performance is acceptable

