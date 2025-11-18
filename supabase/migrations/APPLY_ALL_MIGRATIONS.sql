-- =====================================================
-- COMPLETE DATABASE SYNC - Apply All Migrations
-- =====================================================
-- This script applies all migrations in the correct order
-- Run this in Supabase SQL Editor
-- 
-- Note: Some migrations are idempotent (safe to run multiple times)
-- If you see "already exists" errors, that's usually fine
-- =====================================================

-- IMPORTANT: Read each migration file from supabase/migrations/ folder
-- and apply them in this order:

-- =====================================================
-- PHASE 1: Core Tables (Apply these first)
-- =====================================================
-- 1. 20240608_add_verified_to_profiles.sql
-- 2. 20240609_add_game_to_teams.sql
-- 3. 20240610_create_team_invites.sql
-- 4. 20240729_enhance_teams_and_members_tables.sql
-- 5. 20250101000000_enhance_teams_table.sql
-- 6. 20250503143236_add_all_relevant_columns_to_registrations.sql
-- 7. 20250503143237_add_status_to_tournaments.sql

-- =====================================================
-- PHASE 2: Tournament System
-- =====================================================
-- 8. 20251104_add_results_and_disputes.sql
-- 9. 20251105_bracket_match_extensions.sql
-- 10. 20251105_get_team_roster_rpc.sql
-- 11. 20251105_profiles_backfill_and_trigger.sql

-- =====================================================
-- PHASE 3: Roster System
-- =====================================================
-- 12. 20251114_team_rosters.sql
-- 13. 20251114_team_invitations.sql
-- 14. 20251114_get_roster_members_rpc.sql
-- 15. 20251114_roster_member_limits.sql
-- 16. 20251114_team_rosters_invitee_select.sql

-- =====================================================
-- PHASE 4: RLS and Permissions
-- =====================================================
-- 17. 20251114_teams_visibility.sql
-- 18. 20251114_team_members_teammate_visibility.sql
-- 19. 20251114_team_members_select_fix.sql
-- 20. 20251114_team_members_select_reset.sql
-- 21. 20251114_get_team_members_rpc.sql
-- 22. 20251114_get_team_members_rpc_fix.sql
-- 23. 20251114_get_team_members_include_roster.sql
-- 24. 20251114_current_user_team_ids_fix.sql
-- 25. 20251114_rls_recursion_fix.sql
-- 26. 20251114_notifications_invite_policy.sql
-- 27. 20251114_team_invitations_owner_modify.sql
-- 28. 20251114_participants_cascade.sql

-- =====================================================
-- PHASE 5: Data Backfill and Organization
-- =====================================================
-- 29. 20251116_backfill_participants_team_ids.sql
-- 30. 20251116_roster_organization_model.sql

-- =====================================================
-- PHASE 6: Tournament Management
-- =====================================================
-- 31. 20251117_tournament_bans_table.sql
-- 32. 20251118_remove_legacy_tournament_registrations.sql
-- 33. 20251119_add_party_code_to_matches.sql
-- 34. 20251120_fix_match_status_column.sql

-- =====================================================
-- INSTRUCTIONS:
-- =====================================================
-- 1. Open each migration file from supabase/migrations/ folder
-- 2. Copy its contents
-- 3. Paste into Supabase SQL Editor
-- 4. Run it
-- 5. Check for errors (some "already exists" errors are OK)
-- 6. Move to next migration
-- 
-- OR use Supabase CLI (see Method 2 below)
-- =====================================================

