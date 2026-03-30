import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationProvider } from "@/components/NotificationContext";
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { AdminProvider } from "@/contexts/AdminContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { SignalRProvider } from "@/contexts/SignalRContext";
import { BackgroundRotator } from "@/components/effects/BackgroundRotator";

import { AnimatedLiquidBackground } from "@/components/effects/AnimatedLiquidBackground";
import { TransitionLayout } from "@/components/TransitionLayout";
import { LoadingSpinner } from "@/components/effects/LoadingSpinner";
import { SuspensionGuard } from "@/components/auth/SuspensionGuard";
import { SeamlessVideoLoop } from "@/components/effects/SeamlessVideoLoop";
import { PremiumLoadingScreen } from "@/components/ui/PremiumLoadingScreen";


import ProtectedRoute from "@/components/ProtectedRoute";
import React from 'react';
import Navbar from "@/components/Navbar";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
// import AdminLayout from "@/components/admin/AdminLayout";
const AdminLayout = React.lazy(() => import("@/components/admin/AdminLayout"));

// Lazy Load Pages
const Index = React.lazy(() => import("./pages/Index"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Unauthorized = React.lazy(() => import("./pages/Unauthorized"));
const SignUp = React.lazy(() => import("./pages/auth/SignUp"));
const SignIn = React.lazy(() => import("./pages/auth/SignIn"));
// Profile removed
const Callback = React.lazy(() => import("./pages/auth/Callback"));
const SetPassword = React.lazy(() => import("./pages/auth/SetPassword"));
const ForgotPassword = React.lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = React.lazy(() => import("./pages/auth/ResetPassword"));
const VerifyEmail = React.lazy(() => import("./pages/auth/VerifyEmail"));
const Suspended = React.lazy(() => import("./pages/auth/Suspended"));


// User 
// UserDashboard removed - redundant with PlayerDashboard
const PlayerProfile = React.lazy(() => import("./pages/player/Profile"));
const StaffInvitesPage = React.lazy(() => import("./pages/user/StaffInvites"));
const RaiseDispute = React.lazy(() => import("./pages/user/RaiseDispute"));
const MyDisputes = React.lazy(() => import("./pages/user/MyDisputes"));
const StaffDashboard = React.lazy(() => import("./pages/staff/StaffDashboard"));
const TeamsPage = React.lazy(() => import("./pages/player/Teams"));

// Admin
const AdminManagement = React.lazy(() => import("./pages/admin/AdminManagement"));
const AdminAccess = React.lazy(() => import("./pages/admin/AdminAccess"));
const AdminRoleManagement = React.lazy(() => import("./pages/admin/tools/AdminManagement"));
const DisputeCenter = React.lazy(() => import("./pages/admin/DisputeCenter"));
const SystemSettings = React.lazy(() => import("./pages/admin/SystemSettings"));
const VerificationSystemTool = React.lazy(() => import("./pages/admin/tools/VerificationSystem"));
const AuditLogsTool = React.lazy(() => import("./pages/admin/tools/AuditLogs"));
const UserManagementTool = React.lazy(() => import("./pages/admin/tools/UserManagement"));
const TournamentManagementTool = React.lazy(() => import("./pages/admin/tools/TournamentManagement"));
const VenueManagementTool = React.lazy(() => import("./pages/admin/tools/VenueManagement"));
const AnalyticsTool = React.lazy(() => import("./pages/admin/tools/Analytics"));
const SponsorManagementTool = React.lazy(() => import("./pages/admin/tools/SponsorManagement"));
const LicenseManagementTool = React.lazy(() => import("./pages/admin/tools/LicenseManagement"));


// Venue Owner
const VenueOwnerDashboard = React.lazy(() => import("./pages/venue-owner/Dashboard"));

// Tournament Organizer
const OrganizerDashboard = React.lazy(() => import("./pages/organizer/Dashboard"));
const TournamentList = React.lazy(() => import("./pages/organizer/TournamentList"));
const ManageTournaments = React.lazy(() => import("./pages/organizer/ManageTournaments"));
const TournamentManage = React.lazy(() => import("./pages/organizer/TournamentManage"));
const EditTournament = React.lazy(() => import("./pages/tournaments/Edit"));
const TournamentBrackets = React.lazy(() => import("./pages/tournaments/Brackets"));
const TournamentDetailsUser = React.lazy(() => import("./pages/tournaments/Details"));
const TournamentDetails = React.lazy(() => import("./pages/admin/TournamentDetails"));
const CaptainMatchPage = React.lazy(() => import("./pages/tournaments/CaptainMatchPage"));
const BRGameRoom = React.lazy(() => import("./pages/tournaments/BRGameRoom"));
const ManageBracketPage = React.lazy(() => import("./pages/organizer/ManageBracketPage"));
const FullscreenBracketPage = React.lazy(() => import("./pages/tournaments/brackets/FullscreenBracketPage"));
const OrganizationPublicProfile = React.lazy(() => import("./pages/org/PublicProfile"));
const OrganizationWizard = React.lazy(() => import("./pages/organizer/OrganizationWizard"));

const ADMIN_ROLE_SETS = {
  anyAdmin: ['super_admin', 'ops_admin', 'finance_admin', 'moderator', 'support_admin'],
  userManagement: ['super_admin', 'ops_admin', 'finance_admin', 'moderator', 'support_admin'],
  tournamentManagement: ['super_admin', 'ops_admin', 'moderator'],
  venueManagement: ['super_admin', 'ops_admin', 'support_admin'],
  verification: ['super_admin', 'ops_admin', 'support_admin'],
  auditAccess: ['super_admin', 'ops_admin', 'finance_admin', 'moderator', 'support_admin'],
  analytics: ['super_admin', 'ops_admin', 'finance_admin'],
  systemSettings: ['super_admin', 'ops_admin', 'finance_admin'],
  disputes: ['super_admin', 'moderator', 'ops_admin'],
};

// Venues
const VenueSearch = React.lazy(() => import("./pages/venues/Search"));
const FeaturedVenues = React.lazy(() => import("./pages/venues/Featured"));
const VenueDetails = React.lazy(() => import("./pages/venues/VenueDetails"));
const ManageVenues = React.lazy(() => import("./pages/venues/ManageVenues"));
const ListVenue = React.lazy(() => import("./pages/venues/ListVenue"));

// Tournaments
const BrowseTournaments = React.lazy(() => import("./pages/tournaments/List"));
const CreateTournament = React.lazy(() => import("./pages/tournaments/Create"));

// About
const ContactPage = React.lazy(() => import("./pages/about/Contact"));
const FAQPage = React.lazy(() => import("./pages/about/FAQ"));
const AboutPage = React.lazy(() => import("./pages/About"));
const PrivacyPage = React.lazy(() => import("./pages/Privacy"));
const TermsPage = React.lazy(() => import("./pages/Terms"));
const ContactStandalone = React.lazy(() => import("./pages/Contact"));
const Partners = React.lazy(() => import("./pages/Partners"));

// Guides
const HelpCenter = React.lazy(() => import("./pages/guides/HelpCenter"));
const OrganizerGuide = React.lazy(() => import("./pages/guides/OrganizerGuide"));

// App Download removed

// Notifications
const NotificationsPage = React.lazy(() => import("./pages/notifications/Notifications"));

// Account Settings
const AccountSettings = React.lazy(() => import("./pages/account/Settings"));

const TournamentHistoryPage = React.lazy(() => import('./pages/TournamentHistory'));
const Leaderboards = React.lazy(() => import('./pages/Leaderboards'));
const PlayerHistory = React.lazy(() => import('./pages/player/History'));
const VerificationStatus = React.lazy(() => import('./pages/VerificationStatus'));
const OrganizerDisputesPage = React.lazy(() => import('./pages/organizer/Disputes'));
const MapVetoToken = React.lazy(() => import('./pages/tournaments/MapVetoToken'));
const RiotTest = React.lazy(() => import("./pages/debug/RiotTest"));
const FaceitTest = React.lazy(() => import("./pages/debug/FaceitTest"));
const FaceitOAuthCallback = React.lazy(() => import("./pages/auth/FaceitOAuthCallback"));
const RiotOAuthCallback   = React.lazy(() => import("./pages/auth/RiotOAuthCallback"));

import { getWebsiteAssetUrl } from "@/lib/storage";

const AppContent = React.memo(() => {
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const isHome = location.pathname === '/';
  const BG_VIDEO_URL = getWebsiteAssetUrl("Tournament-dashboard-background-animation/background.mp4");

  return (
    <>
      {/* Global Background - Video Only (Seamless Loop) */}
      <div className="fixed inset-0 w-full h-full z-0">
        <SeamlessVideoLoop
          src={BG_VIDEO_URL}
          className="mix-blend-screen opacity-40"
          style={{ filter: 'contrast(1.2) saturation(1.1)' }}

        />
      </div>

      <Toaster />
      <Sonner />
      <Navbar />
      <EmailVerificationBanner />
      <div className="relative z-10">
        <React.Suspense fallback={<PremiumLoadingScreen />}>
          <SuspensionGuard>
            <Routes location={location}>
              <Route element={<TransitionLayout />}>
                <Route path="/" element={<Index />} />

                {/* Auth Routes */}
                <Route path="/auth/signup" element={<SignUp />} />
                <Route path="/auth/signin" element={<SignIn />} />
                <Route path="/auth/callback" element={<Callback />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/verify-email" element={<VerifyEmail />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
                <Route path="/set-password" element={<SetPassword />} />
                <Route path="/suspended" element={<Suspended />} />

                {/* Admin Routes */}
                <Route path="/admin" element={
                  <AdminProtectedRoute>
                    <AdminLayout>
                      <Navigate to="/admin/dashboard" replace />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />

                {/* Unauthorized Route */}
                <Route path="/unauthorized" element={<Unauthorized />} />

                {/* Fallback dashboard route */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Navigate to="/user/profile" replace />
                  </ProtectedRoute>
                } />

                {/* User Routes */}
                <Route path="/user/profile" element={
                  <ProtectedRoute>
                    <PlayerProfile />
                  </ProtectedRoute>
                } />
                <Route path="/user/staff-invites" element={
                  <ProtectedRoute>
                    <StaffInvitesPage />
                  </ProtectedRoute>
                } />
                <Route path="/user/raise-dispute" element={
                  <ProtectedRoute>
                    <RaiseDispute />
                  </ProtectedRoute>
                } />
                <Route path="/user/my-disputes" element={
                  <ProtectedRoute>
                    <MyDisputes />
                  </ProtectedRoute>
                } />
                <Route path="/staff" element={
                  <ProtectedRoute>
                    <StaffDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/staff/dashboard" element={
                  <ProtectedRoute>
                    <StaffDashboard />
                  </ProtectedRoute>
                } />

                {/* Player Routes */}
                <Route path="/player/profile" element={
                  <ProtectedRoute>
                    <PlayerProfile />
                  </ProtectedRoute>
                } />
                <Route path="/player/teams" element={
                  <ProtectedRoute>
                    <TeamsPage />
                  </ProtectedRoute>
                } />
                <Route path="/player/history" element={
                  <ProtectedRoute>
                    <PlayerHistory />
                  </ProtectedRoute>
                } />

                {/* Admin Tool Routes removed - all tools disabled */}
                {/* System Status removed for now */}

                {/* Admin Dashboard Routes */}
                <Route path="/admin/dashboard" element={
                  <AdminProtectedRoute requiredRoles={ADMIN_ROLE_SETS.anyAdmin}>
                    <AdminLayout>
                      <AdminManagement />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />

                {/* Admin Tool Routes */}
                <Route path="/admin/tools/user-management" element={
                  <AdminProtectedRoute
                    requiredPermission="user:view"
                    requiredRoles={ADMIN_ROLE_SETS.userManagement}
                  >
                    <AdminLayout>
                      <UserManagementTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/tools/tournament-management" element={
                  <AdminProtectedRoute
                    requiredPermission="tournament:view"
                    requiredRoles={ADMIN_ROLE_SETS.tournamentManagement}
                  >
                    <AdminLayout>
                      <TournamentManagementTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/tools/venue-management" element={
                  <AdminProtectedRoute
                    requiredPermission="venue:view"
                    requiredRoles={ADMIN_ROLE_SETS.venueManagement}
                  >
                    <AdminLayout>
                      <VenueManagementTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/tools/verification-system" element={
                  <AdminProtectedRoute
                    requiredPermission="verification:view"
                    requiredRoles={ADMIN_ROLE_SETS.verification}
                  >
                    <AdminLayout>
                      <VerificationSystemTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/tools/audit-logs" element={
                  <AdminProtectedRoute
                    requiredPermission="audit:view"
                    requiredRoles={ADMIN_ROLE_SETS.auditAccess}
                  >
                    <AdminLayout>
                      <AuditLogsTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/tools/analytics" element={
                  <AdminProtectedRoute
                    requiredPermission="audit:view"
                    requiredRoles={ADMIN_ROLE_SETS.analytics}
                  >
                    <AdminLayout>
                      <AnalyticsTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/tools/sponsor-management" element={
                  <AdminProtectedRoute
                    requiredPermission="settings:view"
                    requiredRoles={ADMIN_ROLE_SETS.systemSettings}
                  >
                    <AdminLayout>
                      <SponsorManagementTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/tools/license-management" element={
                  <AdminProtectedRoute
                    requiredPermission="verification:review"
                    requiredRoles={ADMIN_ROLE_SETS.anyAdmin}
                  >
                    <AdminLayout>
                      <LicenseManagementTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/tools/system-settings" element={
                  <AdminProtectedRoute
                    requiredPermission="settings:view"
                    requiredRoles={ADMIN_ROLE_SETS.systemSettings}
                  >
                    <AdminLayout>
                      <SystemSettings />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />

                {/* Admin Management - Super Admin Only */}
                <Route path="/admin/tools/admin-management" element={
                  <AdminProtectedRoute
                    requiredPermission="admin:assign_roles"
                    requiredRoles={['super_admin']}
                  >
                    <AdminLayout>
                      <AdminRoleManagement />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />

                {/* Legacy Admin Routes (for backward compatibility) */}
                <Route path="/admin/access" element={
                  <AdminProtectedRoute
                    requiredPermission="admin:assign_roles"
                    requiredRoles={['super_admin']}
                  >
                    <AdminLayout>
                      <AdminAccess />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/disputes" element={
                  <AdminProtectedRoute
                    requiredPermission="dispute:resolve"
                    requiredRoles={ADMIN_ROLE_SETS.disputes}
                  >
                    <DisputeCenter />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/settings" element={
                  <AdminProtectedRoute
                    requiredPermission="settings:edit"
                    requiredRoles={ADMIN_ROLE_SETS.systemSettings}
                  >
                    <AdminLayout>
                      <SystemSettings />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/verification" element={
                  <AdminProtectedRoute
                    requiredPermission="verification:view"
                    requiredRoles={ADMIN_ROLE_SETS.verification}
                  >
                    <AdminLayout>
                      <VerificationSystemTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/audit" element={
                  <AdminProtectedRoute
                    requiredPermission="audit:view"
                    requiredRoles={ADMIN_ROLE_SETS.auditAccess}
                  >
                    <AdminLayout>
                      <AuditLogsTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <AdminProtectedRoute
                    requiredPermission="user:view"
                    requiredRoles={ADMIN_ROLE_SETS.userManagement}
                  >
                    <AdminLayout>
                      <UserManagementTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />

                {/* Venue Owner Routes */}
                <Route path="/venue-owner/dashboard" element={
                  <ProtectedRoute allowedRoles={['venue_owner']}>
                    <VenueOwnerDashboard />
                  </ProtectedRoute>
                } />

                {/* Tournament Organizer Routes */}
                <Route path="/organizer/dashboard" element={
                  <ProtectedRoute allowedRoles={['organizer']}>
                    <OrganizerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/organizer/setup-organization" element={
                  <ProtectedRoute allowedRoles={['organizer']}>
                    <OrganizationWizard />
                  </ProtectedRoute>
                } />
                <Route path="/organizer/tournaments" element={
                  <ProtectedRoute allowedRoles={['organizer']}>
                    <ManageTournaments />
                  </ProtectedRoute>
                } />
                <Route path="/organizer/tournament/:slug" element={
                  <ProtectedRoute>
                    <TournamentManage />
                  </ProtectedRoute>
                } />
                <Route path="/organizer/tournament/:slug/edit" element={
                  <ProtectedRoute>
                    <EditTournament />
                  </ProtectedRoute>
                } />
                <Route path="/organizer/tournament/:slug/brackets" element={
                  <ProtectedRoute>
                    <TournamentBrackets />
                  </ProtectedRoute>
                } />
                <Route path="/organizer/tournament/:slug/manage-bracket/:stageId" element={
                  <ProtectedRoute>
                    <ManageBracketPage />
                  </ProtectedRoute>
                } />
                <Route path="/organizer/disputes" element={
                  <ProtectedRoute allowedRoles={['organizer']}>
                    <OrganizerDisputesPage />
                  </ProtectedRoute>
                } />
                <Route path="/tournaments" element={<BrowseTournaments />} />
                <Route path="/org/:slug" element={<OrganizationPublicProfile />} />
                <Route path="/tournaments/:slug" element={<TournamentDetailsUser />} />
                <Route path="/player/:username" element={<PlayerProfile />} />

                {/* Venues Routes */}
                <Route path="/venues" element={<VenueSearch />} />
                <Route path="/venues/search" element={<VenueSearch />} />
                <Route path="/venues/featured" element={<FeaturedVenues />} />
                <Route path="/venues/:slug" element={<VenueDetails />} />
                <Route path="/venues/list-venue" element={
                  <ProtectedRoute allowedRoles={['venue_owner']}>
                    <ListVenue />
                  </ProtectedRoute>
                } />
                <Route path="/venues/manage" element={
                  <ProtectedRoute allowedRoles={['venue_owner']}>
                    <ManageVenues />
                  </ProtectedRoute>
                } />

                {/* Tournaments Routes */}
                <Route path="/tournaments/upcoming" element={<Navigate to="/tournaments?tab=upcoming" replace />} />
                <Route path="/tournaments/ongoing" element={<Navigate to="/tournaments?tab=ongoing" replace />} />
                <Route path="/tournaments/create" element={
                  <ProtectedRoute allowedRoles={['organizer']}>
                    <CreateTournament />
                  </ProtectedRoute>
                } />
                <Route path="/tournaments/edit/:slug" element={<EditTournament />} />
                <Route path="/tournaments/:slug/brackets" element={<TournamentBrackets />} />
                <Route path="/tournaments/:slug/brackets/fullscreen" element={<FullscreenBracketPage />} />
                <Route path="/tournaments/:slug/captain-match/:matchId?" element={
                  <ProtectedRoute>
                    <CaptainMatchPage />
                  </ProtectedRoute>
                } />
                <Route path="/tournaments/:slug/br-lobby" element={
                  <ProtectedRoute>
                    <BRGameRoom />
                  </ProtectedRoute>
                } />
                <Route path="/map-veto/:token" element={<MapVetoToken />} />

                {/* Company Pages */}
                <Route path="/about" element={<AboutPage />} />
                <Route path="/about/company" element={<AboutPage />} />
                <Route path="/about/contact" element={<ContactPage />} />
                <Route path="/about/faq" element={<FAQPage />} />
                <Route path="/guides/organizer" element={<OrganizerGuide />} />
                <Route path="/help" element={<HelpCenter />} />
                <Route path="/contact" element={<ContactStandalone />} />
                <Route path="/partners" element={<Partners />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />

                {/* Notification List Route */}
                <Route path="/notifications" element={<NotificationsPage />} />

                {/* Account Settings Route */}
                <Route path="/account/settings" element={
                  <ProtectedRoute>
                    <AccountSettings />
                  </ProtectedRoute>
                } />

                {/* Admin Protected Route for TournamentDetails */}
                <Route path="/admin/tournaments/:id" element={<AdminProtectedRoute><TournamentDetails /></AdminProtectedRoute>} />

                {/* Tournament History Route */}
                <Route path="/tournament-history" element={<TournamentHistoryPage />} />

                {/* Leaderboard Route */}
                <Route path="/leaderboards" element={<Leaderboards />} />

                {/* Verification Status Route */}
                <Route path="/verification" element={<VerificationStatus />} />

                {/* OAuth callbacks — relay code to Settings for token exchange with .NET backend */}
                <Route path="/functions/v1/faceit-oauth" element={<FaceitOAuthCallback />} />
                <Route path="/auth/riot/callback"        element={<RiotOAuthCallback />} />

                {/* Debug Routes */}
                <Route path="/debug/riot" element={<RiotTest />} />
                <Route path="/debug/faceit" element={<FaceitTest />} />

                {/* Catch-all route */}
                <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
              </Route >
            </Routes >
          </SuspensionGuard>
        </React.Suspense >
      </div >
    </>
  );
});

AppContent.displayName = 'AppContent';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SignalRProvider>
          <RoleProvider>

            <TooltipProvider>
              <NotificationProvider>
                <AdminProvider>
                  <AppContent />
                </AdminProvider>
              </NotificationProvider>
            </TooltipProvider>

          </RoleProvider>
        </SignalRProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
