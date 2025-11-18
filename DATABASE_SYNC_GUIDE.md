# Database Sync Guide - Apply All Migrations to Supabase

This guide will help you apply all database migrations to your Supabase project.

## 📋 Prerequisites

1. **Supabase Project**: You should already have one (based on your `.env.production`)
2. **Access**: Login to [supabase.com/dashboard](https://supabase.com/dashboard)
3. **SQL Editor**: Access to SQL Editor in Supabase dashboard

## 🚀 Method 1: Apply Migrations via Supabase Dashboard (Recommended)

### Step 1: Open SQL Editor

1. Go to your Supabase project dashboard
2. Click **"SQL Editor"** in the left sidebar
3. Click **"New query"**

### Step 2: Apply Migrations in Order

Apply migrations in chronological order (by date in filename):

#### **Phase 1: Core Tables (Early Migrations)**
1. `20240608_add_verified_to_profiles.sql`
2. `20240609_add_game_to_teams.sql`
3. `20240610_create_team_invites.sql`
4. `20240729_enhance_teams_and_members_tables.sql`
5. `20250101000000_enhance_teams_table.sql`
6. `20250503143236_add_all_relevant_columns_to_registrations.sql`
7. `20250503143237_add_status_to_tournaments.sql`

#### **Phase 2: Tournament System**
8. `20251104_add_results_and_disputes.sql`
9. `20251105_bracket_match_extensions.sql`
10. `20251105_get_team_roster_rpc.sql`
11. `20251105_profiles_backfill_and_trigger.sql`

#### **Phase 3: Roster System**
12. `20251114_team_rosters.sql`
13. `20251114_team_invitations.sql`
14. `20251114_get_roster_members_rpc.sql`
15. `20251114_roster_member_limits.sql`
16. `20251114_team_rosters_invitee_select.sql`

#### **Phase 4: RLS and Permissions**
17. `20251114_teams_visibility.sql`
18. `20251114_team_members_teammate_visibility.sql`
19. `20251114_team_members_select_fix.sql`
20. `20251114_team_members_select_reset.sql`
21. `20251114_get_team_members_rpc.sql`
22. `20251114_get_team_members_rpc_fix.sql`
23. `20251114_get_team_members_include_roster.sql`
24. `20251114_current_user_team_ids_fix.sql`
25. `20251114_rls_recursion_fix.sql`
26. `20251114_notifications_invite_policy.sql`
27. `20251114_team_invitations_owner_modify.sql`
28. `20251114_participants_cascade.sql`

#### **Phase 5: Data Backfill and Organization**
29. `20251116_backfill_participants_team_ids.sql`
30. `20251116_roster_organization_model.sql`

#### **Phase 6: Tournament Management**
31. `20251117_tournament_bans_table.sql`
32. `20251118_remove_legacy_tournament_registrations.sql`
33. `20251119_add_party_code_to_matches.sql`
34. `20251120_fix_match_status_column.sql`

### Step 3: How to Apply Each Migration

For each migration file:

1. **Open the migration file** from `supabase/migrations/` folder
2. **Copy the entire contents**
3. **Paste into SQL Editor** in Supabase
4. **Click "Run"** (or press `Ctrl+Enter`)
5. **Check for errors** - If you see "already exists" errors, that's usually fine (idempotent)
6. **Move to next migration**

### Step 4: Verify Migration Status

After applying migrations, verify in Supabase:

1. Go to **Table Editor** - Check if all tables exist:
   - `profiles`
   - `teams`
   - `team_members`
   - `team_rosters`
   - `team_roster_members`
   - `team_invitations`
   - `tournaments`
   - `tournament_participants`
   - `tournament_matches`
   - `tournament_match_results`
   - `tournament_disputes`
   - `tournament_bans`
   - `notifications`

2. Go to **Database → Functions** - Check if RPCs exist:
   - `get_roster_members`
   - `get_team_members`
   - `get_team_roster`
   - `current_user_team_ids`

## 🔧 Method 2: Apply All Migrations at Once (Advanced)

If you want to apply all migrations in one go:

1. **Create a combined migration file** (see below)
2. **Copy and paste into SQL Editor**
3. **Run it**

**⚠️ Warning**: This method may fail if some migrations conflict. Use Method 1 for safety.

## 📝 Quick Checklist

After syncing, verify:

- [ ] All tables exist in Table Editor
- [ ] RPC functions are created
- [ ] RLS policies are enabled
- [ ] Can create a test user
- [ ] Can create a test team
- [ ] Can create a test tournament

## 🐛 Troubleshooting

### Error: "relation already exists"
- **Solution**: This is usually fine - the migration is idempotent. Continue to next migration.

### Error: "function already exists"
- **Solution**: Some migrations use `CREATE OR REPLACE FUNCTION` - this is normal. Continue.

### Error: "permission denied"
- **Solution**: Make sure you're using the SQL Editor (has full permissions), not a restricted user.

### Error: "syntax error"
- **Solution**: Check if you copied the entire migration file. Some files have multiple statements.

## 🔄 After Syncing

1. **Test the website**: Visit `https://demo.esportra.com`
2. **Try signing up**: Create a test account
3. **Test features**: Create team, register for tournament, etc.
4. **Check console**: Look for any database errors in browser console (F12)

## 📚 Migration Files Reference

All migration files are in: `supabase/migrations/`

They are named with dates to indicate the order:
- `YYYYMMDD_description.sql` - Apply in chronological order

---

**Need help?** Check the individual migration files for comments explaining what each one does.

