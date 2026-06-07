import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationProvider } from "@/components/NotificationContext";
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { AdminProvider } from "@/contexts/AdminContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { GameCatalogProvider } from "@/contexts/GameCatalogContext";
import { useGameCatalogContext } from "@/hooks/useGameCatalogContext";
import { SignalRProvider } from "@/contexts/SignalRContext";
import { TransitionLayout } from "@/components/TransitionLayout";
import { SuspensionGuard } from "@/components/auth/SuspensionGuard";
import { useGlobalSmoothScroll } from "@/hooks/useGlobalSmoothScroll";

import { PremiumLoadingScreen } from "@/components/ui/PremiumLoadingScreen";

import ProtectedRoute from "@/components/ProtectedRoute";
import React from 'react';
import Navbar from "@/components/Navbar";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import BetaNoticeBanner from "@/components/BetaNoticeBanner";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import { lazyWithRetry } from "@/utils/lazyWithRetry";

const AdminLayout = lazyWithRetry(() => import("@/components/admin/AdminLayout"));

/** Legacy `/br-lobby` URLs redirect to the canonical game room route. */
function BRGameRoomLegacyRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/tournaments/${slug}/br-game-room`} replace />;
}

// Lazy Load Pages
const Index = lazyWithRetry(() => import("./pages/Index"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Unauthorized = lazyWithRetry(() => import("./pages/Unauthorized"));
const SignUp = lazyWithRetry(() => import("./pages/auth/SignUp"));
const SignIn = lazyWithRetry(() => import("./pages/auth/SignIn"));
const Callback = lazyWithRetry(() => import("./pages/auth/Callback"));
const SetPassword = lazyWithRetry(() => import("./pages/auth/SetPassword"));
const ForgotPassword = lazyWithRetry(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazyWithRetry(() => import("./pages/auth/ResetPassword"));
const VerifyEmail = lazyWithRetry(() => import("./pages/auth/VerifyEmail"));
const Suspended = lazyWithRetry(() => import("./pages/auth/Suspended"));

// User
const PlayerProfile = lazyWithRetry(() => import("./pages/player/Profile"));
const StaffInvitesPage = lazyWithRetry(() => import("./pages/user/StaffInvites"));
const RaiseDispute = lazyWithRetry(() => import("./pages/user/RaiseDispute"));
const MyDisputes = lazyWithRetry(() => import("./pages/user/MyDisputes"));
const StaffDashboard = lazyWithRetry(() => import("./pages/staff/StaffDashboard"));
const TeamsPage = lazyWithRetry(() => import("./pages/player/Teams"));
const RedeemInvitePage = lazyWithRetry(() => import("./pages/invitations/RedeemInvite"));

// Admin
const AdminManagement = lazyWithRetry(() => import("./pages/admin/AdminManagement"));
const AdminAccess = lazyWithRetry(() => import("./pages/admin/AdminAccess"));
const AdminRoleManagement = lazyWithRetry(() => import("./pages/admin/tools/AdminManagement"));
const DisputeCenter = lazyWithRetry(() => import("./pages/admin/DisputeCenter"));
const SystemSettings = lazyWithRetry(() => import("./pages/admin/SystemSettings"));
const VerificationSystemTool = lazyWithRetry(() => import("./pages/admin/tools/VerificationSystem"));
const AuditLogsTool = lazyWithRetry(() => import("./pages/admin/tools/AuditLogs"));
const UserManagementTool = lazyWithRetry(() => import("./pages/admin/tools/UserManagement"));
const TournamentManagementTool = lazyWithRetry(() => import("./pages/admin/tools/TournamentManagement"));
const VenueManagementTool = lazyWithRetry(() => import("./pages/admin/tools/VenueManagement"));
const AnalyticsTool = lazyWithRetry(() => import("./pages/admin/tools/Analytics"));
const SponsorManagementTool = lazyWithRetry(() => import("./pages/admin/tools/SponsorManagement"));
const LicenseManagementTool = lazyWithRetry(() => import("./pages/admin/tools/LicenseManagement"));
const TeamManagementTool = lazyWithRetry(() => import("./pages/admin/tools/TeamManagement"));
const AlertsManagementTool = lazyWithRetry(() => import("./pages/admin/tools/AlertsManagement"));
const RoleBuilderTool = lazyWithRetry(() => import("./pages/admin/tools/RoleBuilder"));
const ContentModerationTool = lazyWithRetry(() => import("./pages/admin/tools/ContentModeration"));
const SessionManagementTool = lazyWithRetry(() => import("./pages/admin/tools/SessionManagement"));
const IpAllowlistTool = lazyWithRetry(() => import("./pages/admin/tools/IpAllowlist"));
const ScheduledReports = lazyWithRetry(() => import("./pages/admin/tools/ScheduledReports"));
const GdprCompliance = lazyWithRetry(() => import("./pages/admin/tools/GdprCompliance"));
const AnomalyDetection = lazyWithRetry(() => import("./pages/admin/tools/AnomalyDetection"));
const GameCatalogManagement = lazyWithRetry(() => import("./pages/admin/tools/GameCatalogManagement"));

// Venue Owner
const VenueOwnerDashboard = lazyWithRetry(() => import("./pages/venue-owner/Dashboard"));

// Tournament Organizer
const OrganizerDashboard = lazyWithRetry(() => import("./pages/organizer/Dashboard"));
const _TournamentList = lazyWithRetry(() => import("./pages/organizer/TournamentList"));
const ManageTournaments = lazyWithRetry(() => import("./pages/organizer/ManageTournaments"));
const TournamentManage = lazyWithRetry(() => import("./pages/organizer/TournamentManage"));
const EditTournament = lazyWithRetry(() => import("./pages/tournaments/Edit"));
const TournamentBrackets = lazyWithRetry(() => import("./pages/tournaments/Brackets"));
const TournamentDetailsUser = lazyWithRetry(() => import("./pages/tournaments/Details"));
const TournamentDetails = lazyWithRetry(() => import("./pages/admin/TournamentDetails"));
const CaptainMatchPage = lazyWithRetry(() => import("./pages/tournaments/CaptainMatchPage"));
const BRGameRoom = lazyWithRetry(() => import("./pages/tournaments/BRGameRoom"));
const ManageBracketPage = lazyWithRetry(() => import("./pages/organizer/ManageBracketPage"));
const FullscreenBracketPage = lazyWithRetry(() => import("./pages/tournaments/brackets/FullscreenBracketPage"));
const OrganizationPublicProfile = lazyWithRetry(() => import("./pages/org/PublicProfile"));
const OrganizationWizard = lazyWithRetry(() => import("./pages/organizer/OrganizationWizard"));
const _OrganizationSettings = lazyWithRetry(() => import("./pages/organizer/OrganizationSettings"));
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
  superAdmin: ['super_admin'],
  gamesCatalog: ['super_admin', 'ops_admin'],
};

// Venues
const VenueSearch = lazyWithRetry(() => import("./pages/venues/VenueSearchV2"));
const FeaturedVenues = lazyWithRetry(() => import("./pages/venues/Featured"));
const VenueDetails = lazyWithRetry(() => import("./pages/venues/VenueDetailsV2"));
const _ManageVenues = lazyWithRetry(() => import("./pages/venues/ManageVenues"));
const ListVenue = lazyWithRetry(() => import("./pages/venues/ListVenue"));
const EditVenue = lazyWithRetry(() => import("./pages/venues/EditVenue"));

// Tournaments
const BrowseTournaments = lazyWithRetry(() => import("./pages/tournaments/List"));
const CreateTournament = lazyWithRetry(() => import("./pages/tournaments/Create"));
// About
const ContactPage = lazyWithRetry(() => import("./pages/about/Contact"));
const FAQPage = lazyWithRetry(() => import("./pages/about/FAQ"));
const AboutPage = lazyWithRetry(() => import("./pages/About"));
const PrivacyPage = lazyWithRetry(() => import("./pages/Privacy"));
const TermsPage = lazyWithRetry(() => import("./pages/Terms"));
const ContactStandalone = lazyWithRetry(() => import("./pages/Contact"));
const Partners = lazyWithRetry(() => import("./pages/Partners"));
const BeAPartner = lazyWithRetry(() => import("./pages/BeAPartner"));
const Brand = lazyWithRetry(() => import("./pages/Brand"));
const OrganizerLicenseTerms = lazyWithRetry(() => import("./pages/OrganizerLicenseTerms"));
const RefundPolicyPage = lazyWithRetry(() => import("./pages/RefundPolicy"));

// Guides
const HelpCenter = lazyWithRetry(() => import("./pages/guides/HelpCenter"));
const OrganizerGuide = lazyWithRetry(() => import("./pages/guides/OrganizerGuide"));

// Notifications
const NotificationsPage = lazyWithRetry(() => import("./pages/notifications/Notifications"));

// Account Settings
const AccountSettings = lazyWithRetry(() => import("./pages/account/Settings"));

const TournamentHistoryPage = lazyWithRetry(() => import('./pages/TournamentHistory'));
const Leaderboards = lazyWithRetry(() => import('./pages/Leaderboards'));
const PlayerHistory = lazyWithRetry(() => import('./pages/player/History'));
const VerificationStatus = lazyWithRetry(() => import('./pages/VerificationStatus'));
const OrganizerDisputesPage = lazyWithRetry(() => import('./pages/organizer/Disputes'));
const MapVetoToken = lazyWithRetry(() => import('./pages/tournaments/MapVetoToken'));
const RiotTest = lazyWithRetry(() => import("./pages/debug/RiotTest"));
const IgdbTest = lazyWithRetry(() => import("./pages/debug/IgdbTest"));
const RiotOAuthCallback   = lazyWithRetry(() => import("./pages/auth/RiotOAuthCallback"));
const SteamCallback       = lazyWithRetry(() => import("./pages/auth/SteamCallback"));

const SettingsRedirect = () => {
  const location = useLocation();
  return <Navigate to={`/account/settings${location.search}`} replace />;
};

const AppContent = React.memo(() => {
  const location = useLocation();
  const { scrollTo } = useGlobalSmoothScroll();

  // Scroll to top on route change
  useEffect(() => {
    scrollTo(0, { immediate: true });
  }, [location.pathname, scrollTo]);

  return (
    <>
      {/* Global Background */}
      {!location.pathname.endsWith('/brackets/fullscreen') && (
        <div
          className="fixed inset-0 w-full h-full z-0 bg-[#0a0a0c]"
          aria-hidden="true"
        >
          <div className="absolute inset-0 opacity-60">
            <div className="absolute -left-[10%] top-[-15%] h-[145%] w-[20%] rotate-[-17deg] bg-white/[0.075] [clip-path:polygon(44%_0,69%_0,53%_24%,76%_42%,49%_64%,67%_100%,23%_100%,35%_78%,12%_53%,38%_29%)]" />
            <div className="absolute left-[18%] top-[-9%] h-[132%] w-[13%] rotate-[-4deg] bg-white/[0.065] [clip-path:polygon(30%_0,84%_0,52%_19%,74%_46%,45%_69%,62%_100%,15%_100%,35%_76%,10%_51%,44%_26%)]" />
            <div className="absolute left-[38%] top-[-18%] h-[150%] w-[18%] rotate-[5deg] bg-white/[0.08] [clip-path:polygon(36%_0,75%_0,62%_18%,85%_35%,57%_58%,72%_100%,30%_100%,34%_80%,8%_56%,39%_31%)]" />
            <div className="absolute left-[68%] top-[-12%] h-[138%] w-[17%] rotate-[19deg] bg-white/[0.07] [clip-path:polygon(39%_0,88%_0,64%_21%,80%_46%,54%_67%,72%_100%,27%_100%,37%_78%,10%_54%,41%_28%)]" />
          </div>
        </div>
      )}

      <Toaster />
      <Sonner />
      {!location.pathname.endsWith('/brackets/fullscreen') && (
        <>
          <Navbar />
          <BetaNoticeBanner />
          <EmailVerificationBanner />
        </>
      )}
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
                  <AdminProtectedRoute>
                    <AdminLayout>
                      <AdminManagement />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />

                {/* Admin Tool Routes */}
                <Route path="/admin/tools/user-management" element={
                  <AdminProtectedRoute
                    requiredPermission="users:view"
                    requiredRoles={ADMIN_ROLE_SETS.userManagement}
                  >
                    <AdminLayout>
                      <UserManagementTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/tools/tournament-management" element={
                  <AdminProtectedRoute
                    requiredPermission="tournaments:view"
                    requiredRoles={ADMIN_ROLE_SETS.tournamentManagement}
                  >
                    <AdminLayout>
                      <TournamentManagementTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/tools/team-management" element={
                  <AdminProtectedRoute
                    requiredPermission="users:view"
                    requiredRoles={ADMIN_ROLE_SETS.superAdmin}
                  >
                    <AdminLayout>
                      <TeamManagementTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/tools/alerts" element={
                  <AdminProtectedRoute
                    requiredPermission="system:audit"
                    requiredRoles={ADMIN_ROLE_SETS.auditAccess}
                  >
                    <AdminLayout>
                      <AlertsManagementTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/tools/venue-management" element={
                  <AdminProtectedRoute
                    requiredPermission="venues:view"
                    requiredRoles={ADMIN_ROLE_SETS.venueManagement}
                  >
                    <AdminLayout>
                      <VenueManagementTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/tools/verification-system" element={
                  <AdminProtectedRoute
                    requiredPermission="users:view"
                    requiredRoles={ADMIN_ROLE_SETS.verification}
                  >
                    <AdminLayout>
                      <VerificationSystemTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/tools/audit-logs" element={
                  <AdminProtectedRoute
                    requiredPermission="system:audit"
                    requiredRoles={ADMIN_ROLE_SETS.auditAccess}
                  >
                    <AdminLayout>
                      <AuditLogsTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/tools/analytics" element={
                  <AdminProtectedRoute
                    requiredPermission="system:audit"
                    requiredRoles={ADMIN_ROLE_SETS.analytics}
                  >
                    <AdminLayout>
                      <AnalyticsTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/tools/sponsor-management" element={
                  <AdminProtectedRoute
                    requiredPermission="system:settings"
                    requiredRoles={ADMIN_ROLE_SETS.systemSettings}
                  >
                    <AdminLayout>
                      <SponsorManagementTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/tools/game-catalog" element={
                  <AdminProtectedRoute
                    requiredPermission="games:manage"
                    requiredRoles={ADMIN_ROLE_SETS.gamesCatalog}
                  >
                    <AdminLayout>
                      <GameCatalogManagement />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/tools/license-management" element={
                  <AdminProtectedRoute
                    requiredPermission="users:view"
                    requiredRoles={ADMIN_ROLE_SETS.anyAdmin}
                  >
                    <AdminLayout>
                      <LicenseManagementTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/tools/system-settings" element={
                  <AdminProtectedRoute
                    requiredPermission="system:settings"
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
                    requiredPermission="system:settings"
                    requiredRoles={['super_admin']}
                  >
                    <AdminLayout>
                      <AdminRoleManagement />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />

                {/* Role Builder - Super Admin Only */}
                <Route path="/admin/tools/role-builder" element={
                  <AdminProtectedRoute
                    requiredPermission="system:settings"
                    requiredRoles={['super_admin']}
                  >
                    <AdminLayout>
                      <RoleBuilderTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />

                {/* Content Moderation - Moderators + Admins */}
                <Route path="/admin/tools/moderation" element={
                  <AdminProtectedRoute
                    requiredPermission="users:view"
                    requiredRoles={ADMIN_ROLE_SETS.anyAdmin}
                  >
                    <AdminLayout>
                      <ContentModerationTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />

                {/* Session Management - Super Admin + Ops */}
                <Route path="/admin/tools/sessions" element={
                  <AdminProtectedRoute
                    requiredPermission="users:view"
                    requiredRoles={ADMIN_ROLE_SETS.superAdmin}
                  >
                    <AdminLayout>
                      <SessionManagementTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />

                {/* IP Allowlist - Super Admin */}
                <Route path="/admin/tools/ip-allowlist" element={
                  <AdminProtectedRoute
                    requiredPermission="users:view"
                    requiredRoles={ADMIN_ROLE_SETS.superAdmin}
                  >
                    <AdminLayout>
                      <IpAllowlistTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/tools/scheduled-reports" element={
                  <AdminProtectedRoute
                    requiredPermission="system:audit"
                    requiredRoles={ADMIN_ROLE_SETS.superAdmin}
                  >
                    <AdminLayout>
                      <ScheduledReports />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />

                <Route path="/admin/tools/gdpr" element={
                  <AdminProtectedRoute
                    requiredPermission="system:audit"
                    requiredRoles={ADMIN_ROLE_SETS.superAdmin}
                  >
                    <AdminLayout>
                      <GdprCompliance />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />

                {/* Anomaly Detection - Super Admin + Ops */}
                <Route path="/admin/tools/anomaly-detection" element={
                  <AdminProtectedRoute
                    requiredPermission="system:audit"
                    requiredRoles={ADMIN_ROLE_SETS.superAdmin}
                  >
                    <AdminLayout>
                      <AnomalyDetection />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />


                {/* Legacy Admin Routes (for backward compatibility) */}
                <Route path="/admin/access" element={
                  <AdminProtectedRoute
                    requiredPermission="system:settings"
                    requiredRoles={['super_admin']}
                  >
                    <AdminLayout>
                      <AdminAccess />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/disputes" element={
                  <AdminProtectedRoute
                    requiredPermission="disputes:resolve"
                    requiredRoles={ADMIN_ROLE_SETS.disputes}
                  >
                    <DisputeCenter />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/settings" element={
                  <AdminProtectedRoute
                    requiredPermission="system:settings"
                    requiredRoles={ADMIN_ROLE_SETS.systemSettings}
                  >
                    <AdminLayout>
                      <SystemSettings />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/verification" element={
                  <AdminProtectedRoute
                    requiredPermission="users:view"
                    requiredRoles={ADMIN_ROLE_SETS.verification}
                  >
                    <AdminLayout>
                      <VerificationSystemTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/audit" element={
                  <AdminProtectedRoute
                    requiredPermission="system:audit"
                    requiredRoles={ADMIN_ROLE_SETS.auditAccess}
                  >
                    <AdminLayout>
                      <AuditLogsTool />
                    </AdminLayout>
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/users" element={
                  <AdminProtectedRoute
                    requiredPermission="users:view"
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
                <Route path="/venues/dashboard" element={
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
                <Route path="/organizer/settings" element={
                  <ProtectedRoute allowedRoles={['organizer']}>
                    <OrganizerDashboard />
                  </ProtectedRoute>
                } />
                <Route path="/organizer/organization" element={
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
                <Route path="/invitations/redeem" element={<RedeemInvitePage />} />
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
                <Route path="/venues/manage" element={<Navigate to="/venues/dashboard" replace />} />
                <Route path="/venues/edit/:id" element={
                  <ProtectedRoute allowedRoles={['venue_owner']}>
                    <EditVenue />
                  </ProtectedRoute>
                } />

                {/* Tournaments Routes */}
                <Route path="/tournaments/upcoming" element={<Navigate to="/tournaments?tab=upcoming" replace />} />
                <Route path="/tournaments/ongoing" element={<Navigate to="/tournaments?tab=live" replace />} />
                <Route path="/tournaments/create" element={
                  <ProtectedRoute allowedRoles={['organizer']}>
                    <CreateTournament />
                  </ProtectedRoute>
                } />
                <Route path="/tournaments/edit/:slug" element={<EditTournament />} />
                <Route path="/tournaments/:slug/brackets" element={<TournamentBrackets />} />
                <Route path="/tournaments/:slug/captain-match/:matchId?" element={
                  <ProtectedRoute>
                    <CaptainMatchPage />
                  </ProtectedRoute>
                } />
                <Route path="/tournaments/:slug/br-game-room" element={
                  <ProtectedRoute>
                    <BRGameRoom />
                  </ProtectedRoute>
                } />
                <Route path="/tournaments/:slug/br-lobby" element={
                  <ProtectedRoute>
                    <BRGameRoomLegacyRedirect />
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
                <Route path="/be-a-partner" element={<BeAPartner />} />
                <Route path="/brand" element={<Brand />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/organizer-license-terms" element={<OrganizerLicenseTerms />} />
                <Route path="/refund-policy" element={<RefundPolicyPage />} />

                {/* Notification List Route */}
                <Route path="/notifications" element={<NotificationsPage />} />

                {/* Account Settings Route */}
                <Route path="/account/settings" element={
                  <ProtectedRoute>
                    <AccountSettings />
                  </ProtectedRoute>
                } />
                {/* Legacy /settings redirect preserving query params */}
                <Route path="/settings" element={<SettingsRedirect />} />

                {/* Admin Protected Route for TournamentDetails */}
                <Route path="/admin/tournaments/:id" element={<AdminProtectedRoute><TournamentDetails /></AdminProtectedRoute>} />

                {/* Tournament History Route */}
                <Route path="/tournament-history" element={<TournamentHistoryPage />} />

                {/* Leaderboard Route */}
                <Route path="/leaderboards" element={<Leaderboards />} />

                {/* Verification Status Route */}
                <Route path="/verification" element={<VerificationStatus />} />

                {/* OAuth callbacks — relay code to Settings for token exchange with .NET backend */}
                <Route path="/auth/steam/callback"       element={<SteamCallback />} />
                <Route path="/auth/riot/callback"        element={<RiotOAuthCallback />} />

                {/* Debug Routes */}
                <Route path="/debug/riot" element={<RiotTest />} />
                <Route path="/debug/igdb" element={<IgdbTest />} />

                {/* Catch-all route */}
                <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
              </Route >

              {/* Fullscreen bracket — outside layout to hide navbar/banners */}
              <Route path="/tournaments/:slug/brackets/fullscreen" element={<FullscreenBracketPage />} />
            </Routes >
          </SuspensionGuard>
        </React.Suspense >
      </div >
    </>
  );
});

AppContent.displayName = 'AppContent';

function CatalogBootstrapGate({ children }: { children: React.ReactNode }) {
  const { isReady, isLoading, isUnavailable } = useGameCatalogContext();

  if (isLoading && !isReady) return <PremiumLoadingScreen />;

  if (isUnavailable) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050507] text-white p-6">
        <div className="max-w-md text-center space-y-3">
          <h1 className="text-xl font-semibold">Game catalog unavailable</h1>
          <p className="text-zinc-400 text-sm">
            The platform could not load the authoritative game catalog from the backend.
            Tournament and game features require this data. Please retry once the API is reachable.
          </p>
        </div>
      </div>
    );
  }

  if (!isReady) return <PremiumLoadingScreen />;
  return <>{children}</>;
}

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SignalRProvider>
          <RoleProvider>
            <GameCatalogProvider>
              <CatalogBootstrapGate>
                <TooltipProvider>
                  <NotificationProvider>
                    <AdminProvider>
                      <AppContent />
                    </AdminProvider>
                  </NotificationProvider>
                </TooltipProvider>
              </CatalogBootstrapGate>
            </GameCatalogProvider>
          </RoleProvider>
        </SignalRProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
