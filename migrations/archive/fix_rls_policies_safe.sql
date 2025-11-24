-- =====================================================
-- SAFE RLS POLICIES FIX - HANDLES EXISTING POLICIES
-- =====================================================

-- Drop all existing policies first
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "teams_select_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_insert_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_update_policy" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_policy" ON public.teams;
DROP POLICY IF EXISTS "team_members_select_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_update_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON public.team_members;
DROP POLICY IF EXISTS "team_invites_select_policy" ON public.team_invites;
DROP POLICY IF EXISTS "team_invites_insert_policy" ON public.team_invites;
DROP POLICY IF EXISTS "team_invites_update_policy" ON public.team_invites;
DROP POLICY IF EXISTS "tournaments_select_policy" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_insert_policy" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_update_policy" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_delete_policy" ON public.tournaments;
DROP POLICY IF EXISTS "tournament_participants_select_policy" ON public.tournament_participants;
DROP POLICY IF EXISTS "tournament_participants_insert_policy" ON public.tournament_participants;
DROP POLICY IF EXISTS "tournament_participants_update_policy" ON public.tournament_participants;
DROP POLICY IF EXISTS "tournament_participants_delete_policy" ON public.tournament_participants;
DROP POLICY IF EXISTS "tournament_matches_select_policy" ON public.tournament_matches;
DROP POLICY IF EXISTS "tournament_matches_insert_policy" ON public.tournament_matches;
DROP POLICY IF EXISTS "tournament_matches_update_policy" ON public.tournament_matches;
DROP POLICY IF EXISTS "tournament_matches_delete_policy" ON public.tournament_matches;
DROP POLICY IF EXISTS "venues_select_policy" ON public.venues;
DROP POLICY IF EXISTS "venues_insert_policy" ON public.venues;
DROP POLICY IF EXISTS "venues_update_policy" ON public.venues;
DROP POLICY IF EXISTS "venues_delete_policy" ON public.venues;
DROP POLICY IF EXISTS "venue_profiles_select_policy" ON public.venue_profiles;
DROP POLICY IF EXISTS "venue_profiles_insert_policy" ON public.venue_profiles;
DROP POLICY IF EXISTS "venue_profiles_update_policy" ON public.venue_profiles;
DROP POLICY IF EXISTS "venue_profiles_delete_policy" ON public.venue_profiles;
DROP POLICY IF EXISTS "venue_bookings_select_policy" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_insert_policy" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_update_policy" ON public.venue_bookings;
DROP POLICY IF EXISTS "venue_bookings_delete_policy" ON public.venue_bookings;
DROP POLICY IF EXISTS "verification_requests_select_policy" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_requests_insert_policy" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_requests_update_policy" ON public.verification_requests;
DROP POLICY IF EXISTS "verification_requests_delete_policy" ON public.verification_requests;
DROP POLICY IF EXISTS "verified_roles_select_policy" ON public.verified_roles;
DROP POLICY IF EXISTS "verified_roles_insert_policy" ON public.verified_roles;
DROP POLICY IF EXISTS "verified_roles_update_policy" ON public.verified_roles;
DROP POLICY IF EXISTS "verified_roles_delete_policy" ON public.verified_roles;
DROP POLICY IF EXISTS "notifications_select_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_policy" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_policy" ON public.notifications;
DROP POLICY IF EXISTS "admin_roles_select_policy" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_roles_insert_policy" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_roles_update_policy" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_roles_delete_policy" ON public.admin_roles;
DROP POLICY IF EXISTS "admin_permissions_select_policy" ON public.admin_permissions;
DROP POLICY IF EXISTS "admin_permissions_insert_policy" ON public.admin_permissions;
DROP POLICY IF EXISTS "admin_permissions_update_policy" ON public.admin_permissions;
DROP POLICY IF EXISTS "admin_permissions_delete_policy" ON public.admin_permissions;
DROP POLICY IF EXISTS "admin_role_permissions_select_policy" ON public.admin_role_permissions;
DROP POLICY IF EXISTS "admin_role_permissions_insert_policy" ON public.admin_role_permissions;
DROP POLICY IF EXISTS "admin_role_permissions_update_policy" ON public.admin_role_permissions;
DROP POLICY IF EXISTS "admin_role_permissions_delete_policy" ON public.admin_role_permissions;
DROP POLICY IF EXISTS "admin_user_roles_select_policy" ON public.admin_user_roles;
DROP POLICY IF EXISTS "admin_user_roles_insert_policy" ON public.admin_user_roles;
DROP POLICY IF EXISTS "admin_user_roles_update_policy" ON public.admin_user_roles;
DROP POLICY IF EXISTS "admin_user_roles_delete_policy" ON public.admin_user_roles;
DROP POLICY IF EXISTS "system_settings_select_policy" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_insert_policy" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_update_policy" ON public.system_settings;
DROP POLICY IF EXISTS "system_settings_delete_policy" ON public.system_settings;
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_update_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete_policy" ON public.audit_logs;

-- Also drop any old policies that might exist
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view active teams" ON public.teams;
DROP POLICY IF EXISTS "Team owners can manage their teams" ON public.teams;
DROP POLICY IF EXISTS "Users can view public tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Organizers can manage their tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can view active venues" ON public.venues;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

-- Now create the new policies
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "teams_select_policy" ON public.teams
    FOR SELECT USING (true);

CREATE POLICY "teams_insert_policy" ON public.teams
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "teams_update_policy" ON public.teams
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "teams_delete_policy" ON public.teams
    FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "team_members_select_policy" ON public.team_members
    FOR SELECT USING (true);

CREATE POLICY "team_members_insert_policy" ON public.team_members
    FOR INSERT WITH CHECK (true);

CREATE POLICY "team_members_update_policy" ON public.team_members
    FOR UPDATE USING (true);

CREATE POLICY "team_members_delete_policy" ON public.team_members
    FOR DELETE USING (true);

CREATE POLICY "team_invites_select_policy" ON public.team_invites
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = invited_by);

CREATE POLICY "team_invites_insert_policy" ON public.team_invites
    FOR INSERT WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "team_invites_update_policy" ON public.team_invites
    FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = invited_by);

CREATE POLICY "tournaments_select_policy" ON public.tournaments
    FOR SELECT USING (true);

CREATE POLICY "tournaments_insert_policy" ON public.tournaments
    FOR INSERT WITH CHECK (auth.uid() = organizer_id);

CREATE POLICY "tournaments_update_policy" ON public.tournaments
    FOR UPDATE USING (auth.uid() = organizer_id);

CREATE POLICY "tournaments_delete_policy" ON public.tournaments
    FOR DELETE USING (auth.uid() = organizer_id);

CREATE POLICY "tournament_participants_select_policy" ON public.tournament_participants
    FOR SELECT USING (true);

CREATE POLICY "tournament_participants_insert_policy" ON public.tournament_participants
    FOR INSERT WITH CHECK (true);

CREATE POLICY "tournament_participants_update_policy" ON public.tournament_participants
    FOR UPDATE USING (true);

CREATE POLICY "tournament_participants_delete_policy" ON public.tournament_participants
    FOR DELETE USING (true);

CREATE POLICY "tournament_matches_select_policy" ON public.tournament_matches
    FOR SELECT USING (true);

CREATE POLICY "tournament_matches_insert_policy" ON public.tournament_matches
    FOR INSERT WITH CHECK (true);

CREATE POLICY "tournament_matches_update_policy" ON public.tournament_matches
    FOR UPDATE USING (true);

CREATE POLICY "tournament_matches_delete_policy" ON public.tournament_matches
    FOR DELETE USING (true);

CREATE POLICY "venues_select_policy" ON public.venues
    FOR SELECT USING (true);

CREATE POLICY "venues_insert_policy" ON public.venues
    FOR INSERT WITH CHECK (true);

CREATE POLICY "venues_update_policy" ON public.venues
    FOR UPDATE USING (true);

CREATE POLICY "venues_delete_policy" ON public.venues
    FOR DELETE USING (true);

CREATE POLICY "venue_profiles_select_policy" ON public.venue_profiles
    FOR SELECT USING (true);

CREATE POLICY "venue_profiles_insert_policy" ON public.venue_profiles
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "venue_profiles_update_policy" ON public.venue_profiles
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "venue_profiles_delete_policy" ON public.venue_profiles
    FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "venue_bookings_select_policy" ON public.venue_bookings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "venue_bookings_insert_policy" ON public.venue_bookings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "venue_bookings_update_policy" ON public.venue_bookings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "venue_bookings_delete_policy" ON public.venue_bookings
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "verification_requests_select_policy" ON public.verification_requests
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "verification_requests_insert_policy" ON public.verification_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "verification_requests_update_policy" ON public.verification_requests
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "verification_requests_delete_policy" ON public.verification_requests
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "verified_roles_select_policy" ON public.verified_roles
    FOR SELECT USING (true);

CREATE POLICY "verified_roles_insert_policy" ON public.verified_roles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "verified_roles_update_policy" ON public.verified_roles
    FOR UPDATE USING (true);

CREATE POLICY "verified_roles_delete_policy" ON public.verified_roles
    FOR DELETE USING (true);

CREATE POLICY "notifications_select_policy" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_policy" ON public.notifications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "notifications_update_policy" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete_policy" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "admin_roles_select_policy" ON public.admin_roles
    FOR SELECT USING (true);

CREATE POLICY "admin_roles_insert_policy" ON public.admin_roles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "admin_roles_update_policy" ON public.admin_roles
    FOR UPDATE USING (true);

CREATE POLICY "admin_roles_delete_policy" ON public.admin_roles
    FOR DELETE USING (true);

CREATE POLICY "admin_permissions_select_policy" ON public.admin_permissions
    FOR SELECT USING (true);

CREATE POLICY "admin_permissions_insert_policy" ON public.admin_permissions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "admin_permissions_update_policy" ON public.admin_permissions
    FOR UPDATE USING (true);

CREATE POLICY "admin_permissions_delete_policy" ON public.admin_permissions
    FOR DELETE USING (true);

CREATE POLICY "admin_role_permissions_select_policy" ON public.admin_role_permissions
    FOR SELECT USING (true);

CREATE POLICY "admin_role_permissions_insert_policy" ON public.admin_role_permissions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "admin_role_permissions_update_policy" ON public.admin_role_permissions
    FOR UPDATE USING (true);

CREATE POLICY "admin_role_permissions_delete_policy" ON public.admin_role_permissions
    FOR DELETE USING (true);

CREATE POLICY "admin_user_roles_select_policy" ON public.admin_user_roles
    FOR SELECT USING (true);

CREATE POLICY "admin_user_roles_insert_policy" ON public.admin_user_roles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "admin_user_roles_update_policy" ON public.admin_user_roles
    FOR UPDATE USING (true);

CREATE POLICY "admin_user_roles_delete_policy" ON public.admin_user_roles
    FOR DELETE USING (true);

CREATE POLICY "system_settings_select_policy" ON public.system_settings
    FOR SELECT USING (true);

CREATE POLICY "system_settings_insert_policy" ON public.system_settings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "system_settings_update_policy" ON public.system_settings
    FOR UPDATE USING (true);

CREATE POLICY "system_settings_delete_policy" ON public.system_settings
    FOR DELETE USING (true);

CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
    FOR SELECT USING (true);

CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

CREATE POLICY "audit_logs_update_policy" ON public.audit_logs
    FOR UPDATE USING (true);

CREATE POLICY "audit_logs_delete_policy" ON public.audit_logs
    FOR DELETE USING (true);

-- Success message
SELECT 'RLS policies have been successfully updated!' as message;
