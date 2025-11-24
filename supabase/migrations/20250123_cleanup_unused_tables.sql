-- =====================================================
-- CLEANUP UNUSED DATABASE TABLES
-- =====================================================
-- This migration removes unused tables that are not referenced in the codebase
-- Run with caution - backup your database first!

BEGIN;

-- =====================================================
-- 1. REMOVE USER REVIEWS (might be used later for organizer/venue reviews)
-- =====================================================
DROP TABLE IF EXISTS public.user_reviews CASCADE;

-- =====================================================
-- 2. REMOVE USER ACTIVITY (unused tracking table)
-- =====================================================
DROP TABLE IF EXISTS public.user_activity CASCADE;

-- =====================================================
-- 3. REMOVE ROLE SWITCH HISTORY (doesn't affect RBAC control system)
-- =====================================================
-- Note: This only tracks history of role switches, doesn't affect current RBAC
DROP TABLE IF EXISTS public.role_switch_history CASCADE;

-- =====================================================
-- 4. KEEP verification_history (needed for admin verification tracking)
-- =====================================================
-- verification_history is KEPT - it's important for admin audit trail

-- =====================================================
-- 5. REMOVE FINANCE-RELATED TABLES (will be added back later when needed)
-- =====================================================
DROP TABLE IF EXISTS public.finance_settings CASCADE;
DROP TABLE IF EXISTS public.wallets CASCADE;
DROP TABLE IF EXISTS public.ledger_entries CASCADE;
DROP TABLE IF EXISTS public.refunds CASCADE;

-- =====================================================
-- 6. WEBHOOK EVENTS EXPLANATION:
-- =====================================================
-- webhook_events is used for payment provider webhooks (Stripe, PayPal, etc.)
-- It stores webhook events with idempotency keys to prevent duplicate processing
-- Example: When Stripe sends a payment confirmation webhook, it's stored here
-- to ensure we don't process the same event twice
-- 
-- DECISION: Remove for now, will be added back when payment system is implemented
DROP TABLE IF EXISTS public.webhook_events CASCADE;

-- =====================================================
-- 7. REMOVE USER REPORTS (unused reporting system)
-- =====================================================
DROP TABLE IF EXISTS public.user_reports CASCADE;

-- =====================================================
-- 8. CONTENT MODERATION EXPLANATION:
-- =====================================================
-- content_moderation is for tracking moderation actions on user-generated content
-- Example: If an admin removes a tournament description, bans a team name, etc.
-- It stores what was moderated, by whom, and why
--
-- DECISION: Remove for now, can be added back when content moderation is needed
DROP TABLE IF EXISTS public.content_moderation CASCADE;

-- =====================================================
-- 9. SYSTEM NOTIFICATIONS EXPLANATION:
-- =====================================================
-- system_notifications is for admin-created broadcast notifications to all users
-- Different from 'notifications' table which is for user-specific notifications
-- Example: "Platform maintenance scheduled for Sunday" or "New feature announcement"
-- Can target specific audiences (all users, organizers only, etc.)
--
-- DECISION: Remove for now, can use 'notifications' table for broadcasts if needed
DROP TABLE IF EXISTS public.system_notifications CASCADE;

-- =====================================================
-- 10. ADMIN ACTIONS EXPLANATION:
-- =====================================================
-- admin_actions is for tracking sensitive admin operations that require approval
-- Example: Deleting a tournament with 100+ participants might require approval
-- It's different from audit_logs which tracks all admin actions
-- admin_actions is for actions that need a second admin to approve
--
-- DECISION: Remove for now, audit_logs is sufficient for current needs
DROP TABLE IF EXISTS public.admin_actions CASCADE;

-- =====================================================
-- 11. SYSTEM METRICS EXPLANATION:
-- =====================================================
-- system_metrics is for storing platform analytics/metrics over time
-- Example: Daily active users, tournament completion rate, revenue metrics
-- Can be used for admin dashboards and reporting
--
-- DECISION: Remove for now, can be added back when analytics are needed
DROP TABLE IF EXISTS public.system_metrics CASCADE;

-- =====================================================
-- 12. ADMIN RBAC TABLES EXPLANATION:
-- =====================================================
-- admin_permissions: Defines what permissions exist (e.g., "tournament:approve", "user:ban")
-- admin_role_permissions: Links roles to permissions (e.g., "ops_admin" has "tournament:approve")
-- admin_user_roles: Assigns roles to users (e.g., user X has "ops_admin" role)
--
-- These are PART OF THE RBAC SYSTEM and are used by:
-- - admin_user_has_permission() function
-- - get_admin_permissions_for_user() function
-- - AdminAccess.tsx for role assignment
--
-- DECISION: KEEP - These are essential for the admin RBAC system
-- (No DROP statements for these tables)

-- =====================================================
-- CLEANUP COMPLETE
-- =====================================================

COMMIT;

-- Summary of removed tables:
-- ✅ user_reviews (can be re-added later)
-- ✅ user_activity
-- ✅ role_switch_history (doesn't affect RBAC)
-- ✅ finance_settings, wallets, ledger_entries, refunds (finance system)
-- ✅ webhook_events (payment webhooks)
-- ✅ user_reports
-- ✅ content_moderation
-- ✅ system_notifications
-- ✅ admin_actions
-- ✅ system_metrics
--
-- Kept tables:
-- ✅ verification_history (needed for admin audit)
-- ✅ admin_permissions, admin_role_permissions, admin_user_roles (RBAC system)

