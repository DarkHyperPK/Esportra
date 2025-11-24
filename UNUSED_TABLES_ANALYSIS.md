# Unused Database Tables Analysis

## Summary
This document lists database tables that are defined in migrations but are NOT used in the codebase.

## Unused Tables (Safe to Remove)

### 1. **user_reviews**
- **Location**: `src/database/unified-profile-migration.sql`
- **Status**: Only defined in migration, never referenced in code
- **Action**: Can be safely dropped

### 2. **user_activity**
- **Location**: `src/database/unified-profile-migration.sql`
- **Status**: Only defined in migration, never referenced in code
- **Action**: Can be safely dropped

### 3. **role_switch_history**
- **Location**: `src/database/role-system-migration.sql`
- **Status**: Only defined in migration, never referenced in code
- **Action**: Can be safely dropped

### 4. **verification_history**
- **Location**: `src/database/verification-system-migration.sql`
- **Status**: Only defined in migration, never referenced in code
- **Action**: Can be safely dropped

### 5. **finance_settings**
- **Location**: `src/database/payments-system-migration.sql`
- **Status**: Only defined in migration, never referenced in code
- **Action**: Can be safely dropped

### 6. **wallets**
- **Location**: `src/database/payments-system-migration.sql`
- **Status**: Only defined in migration, never referenced in code
- **Action**: Can be safely dropped

### 7. **ledger_entries**
- **Location**: `src/database/payments-system-migration.sql`
- **Status**: Only defined in migration, never referenced in code
- **Action**: Can be safely dropped

### 8. **refunds**
- **Location**: `src/database/payments-system-migration.sql`
- **Status**: Only defined in migration, never referenced in code
- **Action**: Can be safely dropped

### 9. **webhook_events**
- **Location**: `src/database/payments-system-migration.sql`
- **Status**: Only defined in migration, never referenced in code
- **Action**: Can be safely dropped

### 10. **user_reports**
- **Location**: `src/database/admin-tools-migration.sql`
- **Status**: Only defined in migration, never referenced in code
- **Action**: Can be safely dropped

### 11. **content_moderation**
- **Location**: `src/database/admin-tools-migration.sql`
- **Status**: Only defined in migration, never referenced in code
- **Action**: Can be safely dropped

### 12. **system_notifications**
- **Location**: `src/database/admin-tools-migration.sql`
- **Status**: Only defined in migration, never referenced in code
- **Note**: Different from `notifications` table which IS used
- **Action**: Can be safely dropped

### 13. **admin_actions**
- **Location**: `src/database/admin-tools-migration.sql`
- **Status**: Only defined in migration, never referenced in code
- **Note**: `audit_logs` is used instead
- **Action**: Can be safely dropped

### 14. **system_metrics**
- **Location**: `src/database/admin-tools-migration.sql`
- **Status**: Only defined in migration, never referenced in code
- **Action**: Can be safely dropped

### 15. **admin_permissions**
- **Location**: `src/database/admin-rbac-migration.sql`, `src/database/complete-database-setup.sql`
- **Status**: Defined but never directly queried in code
- **Note**: May be used indirectly through admin system, but no direct `.from()` calls found
- **Action**: Verify with admin system usage before dropping

### 16. **admin_role_permissions**
- **Location**: `src/database/admin-rbac-migration.sql`, `src/database/complete-database-setup.sql`
- **Status**: Defined but never directly queried in code
- **Note**: May be used indirectly through admin system, but no direct `.from()` calls found
- **Action**: Verify with admin system usage before dropping

## Tables That ARE Used (Do NOT Remove)

- profiles
- teams
- team_members
- team_invites (legacy, but still used in some places)
- team_invitations (newer replacement)
- tournaments
- tournament_participants
- tournament_matches
- tournament_match_results
- tournament_disputes
- venues
- venue_profiles
- venue_bookings
- verification_requests
- verified_roles
- notifications
- team_rosters
- team_roster_members
- match_map_vetos
- match_map_veto_actions
- game_maps
- tournament_map_pools
- tournament_bans
- payments
- match_results
- disputes
- company_profiles
- player_stats
- user_reputation
- user_financials
- audit_logs
- system_settings
- admin_roles
- admin_user_roles

## Recommended SQL Script to Drop Unused Tables

```sql
-- Drop unused tables (run with caution, backup first!)

-- Unified Profile System (unused)
DROP TABLE IF EXISTS public.user_reviews CASCADE;
DROP TABLE IF EXISTS public.user_activity CASCADE;

-- Role System (unused)
DROP TABLE IF EXISTS public.role_switch_history CASCADE;

-- Verification System (unused)
DROP TABLE IF EXISTS public.verification_history CASCADE;

-- Payments System (unused)
DROP TABLE IF EXISTS public.finance_settings CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TABLE IF EXISTS public.ledger_entries CASCADE;
DROP TABLE IF EXISTS public.refunds CASCADE;
DROP TABLE IF EXISTS public.webhook_events CASCADE;

-- Admin Tools (unused)
DROP TABLE IF EXISTS public.user_reports CASCADE;
DROP TABLE IF EXISTS public.content_moderation CASCADE;
DROP TABLE IF EXISTS public.system_notifications CASCADE;
DROP TABLE IF EXISTS public.admin_actions CASCADE;
DROP TABLE IF EXISTS public.system_metrics CASCADE;

-- Admin RBAC (verify before dropping)
-- DROP TABLE IF EXISTS public.admin_permissions CASCADE;
-- DROP TABLE IF EXISTS public.admin_role_permissions CASCADE;
```

## Notes

1. **Backup First**: Always backup your database before dropping tables
2. **Verify Dependencies**: Check for foreign key constraints before dropping
3. **Admin Tables**: `admin_permissions` and `admin_role_permissions` may be used indirectly - verify admin system functionality before dropping
4. **Legacy Tables**: `team_invites` is still used in some places, but `team_invitations` is the newer table. Consider migrating fully to `team_invitations` before dropping `team_invites`

