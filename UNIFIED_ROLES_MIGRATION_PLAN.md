# Unified User Roles System - Migration Plan

## Overview

This migration consolidates multiple role-related tables into a single unified `user_roles_unified` table, simplifying role management and eliminating redundancy.

## Current Structure (Before Migration)

### Tables:
1. **`user_roles`** - Basic role assignments (casual, organizer, venue_owner, admin)
2. **`admin_user_roles`** - Links users to admin role definitions
3. **`admin_roles`** - Defines admin role types (super_admin, moderator, etc.)
4. **`verified_roles`** - Tracks verification status for business roles
5. **`profiles`** - Base user profile with `is_admin` flag and `admin_roles` array
6. **`user_role_summary`** - View aggregating roles

### Problems:
- **Redundancy**: Same information stored in multiple places
- **Complexity**: Multiple tables to query for a user's roles
- **Inconsistency**: Different verification systems for different role types
- **Maintenance**: Changes require updates across multiple tables

## New Structure (After Migration)

### Single Table: `user_roles_unified`

**Columns:**
- `id` - Primary key
- `user_id` - Foreign key to profiles
- `role_type` - The actual role (casual, organizer, venue_owner, super_admin, etc.)
- `role_category` - Computed column (base, business, admin)
- `is_active` - Whether the role is currently active
- `verification_status` - pending/approved/rejected (for business roles)
- `assigned_by` - Who assigned the role
- `assigned_at` - When the role was assigned
- `verified_by` - Who verified the role (for business roles)
- `verified_at` - When the role was verified
- `verification_request_id` - Link to verification request
- `expires_at` - Optional expiration date
- `notes` - Admin notes
- `metadata` - JSONB for flexible role-specific data
- `created_at`, `updated_at` - Timestamps

### Role Categories:

1. **Base** (`casual`)
   - Auto-approved
   - Cannot be removed
   - All users have this by default

2. **Business** (`organizer`, `venue_owner`)
   - Requires verification
   - Must go through verification process
   - Can be approved/rejected

3. **Admin** (`super_admin`, `ops_admin`, `finance_admin`, `moderator`, `support_admin`)
   - Auto-approved when assigned
   - Assigned by super_admin only
   - No verification required

## Migration Steps

### Phase 1: Preparation (Before Running Migration)

1. **Backup Database**
   ```sql
   -- Export current role data
   COPY (SELECT * FROM user_roles) TO '/tmp/user_roles_backup.csv' CSV HEADER;
   COPY (SELECT * FROM admin_user_roles) TO '/tmp/admin_user_roles_backup.csv' CSV HEADER;
   COPY (SELECT * FROM verified_roles) TO '/tmp/verified_roles_backup.csv' CSV HEADER;
   ```

2. **Review Current Data**
   - Check for any orphaned records
   - Verify all users have at least a 'casual' role
   - Check for duplicate role assignments

### Phase 2: Run Migration

1. **Run the migration script**
   ```sql
   -- Run: supabase/migrations/20250129_unified_user_roles_system.sql
   ```

2. **Verify Migration**
   - Check that all roles were migrated
   - Verify counts match between old and new tables
   - Test helper functions

### Phase 3: Update Application Code

1. **Update Role Queries**
   - Replace `user_roles` queries with `user_roles_unified`
   - Replace `admin_user_roles` queries with filtered `user_roles_unified`
   - Replace `verified_roles` queries with filtered `user_roles_unified`

2. **Update Helper Functions**
   - Use new helper functions: `get_user_active_roles()`, `user_has_role()`, etc.
   - Update `RoleContext.tsx` to use unified table
   - Update `RoleSwitcher.tsx` to use unified table
   - Update `AdminContext.tsx` to use unified table

3. **Update Verification System**
   - Update `VerificationSystem.tsx` to use unified table
   - Update verification approval/rejection logic

### Phase 4: Testing

1. **Test Role Switching**
   - Switch between casual/organizer/venue_owner
   - Verify admin roles work correctly

2. **Test Verification**
   - Submit verification request
   - Approve/reject verification
   - Verify status updates correctly

3. **Test Admin Functions**
   - Assign admin roles
   - Remove admin roles
   - Verify permissions work

### Phase 5: Cleanup (After Verification)

1. **Deprecate Old Tables** (Optional - keep for rollback)
   ```sql
   -- Rename old tables for safety
   ALTER TABLE user_roles RENAME TO user_roles_old;
   ALTER TABLE admin_user_roles RENAME TO admin_user_roles_old;
   ALTER TABLE verified_roles RENAME TO verified_roles_old;
   ```

2. **Update Views**
   - Update `user_role_summary` view to use new table
   - Remove old view if exists

## Rollback Plan

If issues occur, rollback steps:

1. **Restore from Backup**
   ```sql
   -- Restore old tables
   COPY user_roles FROM '/tmp/user_roles_backup.csv' CSV HEADER;
   COPY admin_user_roles FROM '/tmp/admin_user_roles_backup.csv' CSV HEADER;
   COPY verified_roles FROM '/tmp/verified_roles_backup.csv' CSV HEADER;
   ```

2. **Revert Code Changes**
   - Revert to previous commit
   - Restore old queries

## Benefits

1. **Simplified Queries**: Single table to query for all roles
2. **Consistency**: Unified verification system
3. **Performance**: Fewer joins needed
4. **Maintainability**: Single source of truth
5. **Flexibility**: JSONB metadata for future extensions
6. **Type Safety**: Computed `role_category` for easier filtering

## Migration Checklist

- [ ] Backup database
- [ ] Review current data
- [ ] Run migration script
- [ ] Verify data migration
- [ ] Update `RoleContext.tsx`
- [ ] Update `RoleSwitcher.tsx`
- [ ] Update `AdminContext.tsx`
- [ ] Update `VerificationSystem.tsx`
- [ ] Update all role queries in codebase
- [ ] Test role switching
- [ ] Test verification flow
- [ ] Test admin functions
- [ ] Update documentation
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Cleanup old tables (after 30 days)

## Notes

- The migration preserves all existing data
- Old tables are kept for rollback safety
- The `profiles.is_admin` and `profiles.admin_roles` columns are kept for backward compatibility
- All helper functions are backward compatible where possible

