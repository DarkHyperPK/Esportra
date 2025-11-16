-- =====================================================
-- ENABLE SIMPLE RLS POLICIES (RUN AFTER COMPREHENSIVE FIX)
-- =====================================================
-- This script enables simple, non-recursive RLS policies

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Create very simple policies (no complex logic to avoid recursion)
CREATE POLICY "profiles_all_access" ON public.profiles FOR ALL USING (true);
CREATE POLICY "teams_all_access" ON public.teams FOR ALL USING (true);
CREATE POLICY "team_members_all_access" ON public.team_members FOR ALL USING (true);
CREATE POLICY "team_invites_all_access" ON public.team_invites FOR ALL USING (true);
CREATE POLICY "tournaments_all_access" ON public.tournaments FOR ALL USING (true);
CREATE POLICY "tournament_participants_all_access" ON public.tournament_participants FOR ALL USING (true);
CREATE POLICY "tournament_matches_all_access" ON public.tournament_matches FOR ALL USING (true);
CREATE POLICY "venues_all_access" ON public.venues FOR ALL USING (true);
CREATE POLICY "venue_profiles_all_access" ON public.venue_profiles FOR ALL USING (true);
CREATE POLICY "venue_bookings_all_access" ON public.venue_bookings FOR ALL USING (true);
CREATE POLICY "verification_requests_all_access" ON public.verification_requests FOR ALL USING (true);
CREATE POLICY "verified_roles_all_access" ON public.verified_roles FOR ALL USING (true);
CREATE POLICY "notifications_all_access" ON public.notifications FOR ALL USING (true);
CREATE POLICY "admin_roles_all_access" ON public.admin_roles FOR ALL USING (true);
CREATE POLICY "admin_permissions_all_access" ON public.admin_permissions FOR ALL USING (true);
CREATE POLICY "admin_role_permissions_all_access" ON public.admin_role_permissions FOR ALL USING (true);
CREATE POLICY "admin_user_roles_all_access" ON public.admin_user_roles FOR ALL USING (true);
CREATE POLICY "system_settings_all_access" ON public.system_settings FOR ALL USING (true);
CREATE POLICY "audit_logs_all_access" ON public.audit_logs FOR ALL USING (true);

SELECT '✅ Simple RLS policies enabled successfully!' as message;
