import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationProvider } from "@/components/NotificationContext";
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom";
import { PageTransition } from "@/components/PageTransition";
import { AdminProvider } from "@/contexts/AdminContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { GhostModeProvider } from "@/contexts/GhostModeProvider";
import { GhostModeBanner } from "@/components/admin/GhostModeBanner";
import { RoleProvider } from "@/contexts/RoleContext";
import { GameCatalogProvider } from "@/contexts/GameCatalogContext";
import { useGameCatalogContext } from "@/hooks/useGameCatalogContext";
import { SignalRProvider } from "@/contexts/SignalRContext";
import { TransitionLayout } from "@/components/TransitionLayout";
import { SuspensionGuard } from "@/components/auth/SuspensionGuard";
import { ProfileCompletionPrompt } from "@/components/profile/ProfileCompletionPrompt";
import { TournamentInvitePrompt } from "@/components/tournament/TournamentInvitePrompt";
import { AvatarFeatureAnnouncement } from "@/components/announcements/AvatarFeatureAnnouncement";
import { useGlobalSmoothScroll } from "@/hooks/useGlobalSmoothScroll";
import { ProfilePeekSheet } from "@/components/profile/peek/ProfilePeekSheet";

import { PremiumLoadingScreen } from "@/components/ui/PremiumLoadingScreen";

import ProtectedRoute from "@/components/ProtectedRoute";
import React from 'react';
import Navbar from "@/components/Navbar";
import EmailVerificationBanner from "@/components/EmailVerificationBanner";
import BetaNoticeBanner from "@/components/BetaNoticeBanner";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { lazyWithRetry } from "@/utils/lazyWithRetry";
import SignIn from "./pages/auth/SignIn";
import SignUp from "./pages/auth/SignUp";
import Callback from "./pages/auth/Callback";
import Suspended from "./pages/auth/Suspended";
import ForgotPassword from "./pages/auth/ForgotPassword";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ResetPassword from "./pages/auth/ResetPassword";
import SetPassword from "./pages/auth/SetPassword";

import AdminLayout from "@/components/admin/AdminLayout";

/** Legacy `/tournaments/edit/:slug` redirects to the protected organizer edit route. */
function OrganizerEditLegacyRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/organizer/tournament/${slug}/edit`} replace />;
}

/** Legacy `/br-lobby` URLs redirect to the canonical game room route. */
function BRGameRoomLegacyRedirect() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={`/tournaments/${slug}/br-game-room`} replace />;
}

// Lazy Load Pages
const ProfilePage = lazyWithRetry(() => import("./pages/profile/ProfilePage"));
const Index = lazyWithRetry(() => import("./pages/Index"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const Unauthorized = lazyWithRetry(() => import("./pages/Unauthorized"));

// User
const PlayerProfile = lazyWithRetry(() => import("./pages/player/Profile"));
const StaffInvitesPage = lazyWithRetry(() => import("./pages/user/StaffInvites"));
const RaiseDispute = lazyWithRetry(() => import("./pages/user/RaiseDispute"));
const MyDisputes = lazyWithRetry(() => import("./pages/user/MyDisputes"));
const StaffDashboard = lazyWithRetry(() => import("./pages/staff/StaffDashboard"));
const TeamsPage = lazyWithRetry(() => import("./pages/player/Teams"));
const RedeemInvitePage = lazyWithRetry(() => import("./pages/invitations/RedeemInvite"));

// Admin
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
const SponsorsHub = lazyWithRetry(() => import("./pages/admin/partners/SponsorsHub"));
const SponsorsOverviewSection = lazyWithRetry(() => import("./pages/admin/partners/sections/Overview"));
const SponsorsPipelineSection = lazyWithRetry(() => import("./pages/admin/partners/sections/Pipeline"));
const SponsorsPartnersSection = lazyWithRetry(() => import("./pages/admin/partners/sections/Partners"));
const SponsorsPlacementsSection = lazyWithRetry(() => import("./pages/admin/partners/sections/Placements"));
const SponsorsAuditSection = lazyWithRetry(() => import("./pages/admin/partners/sections/Audit"));
const LicenseManagementTool = lazyWithRetry(() => import("./pages/admin/tools/LicenseManagement"));
const TeamManagementTool = lazyWithRetry(() => import("./pages/admin/tools/TeamManagement"));
const AlertsManagementTool = lazyWithRetry(() => import("./pages/admin/tools/AlertsManagement"));
const RoleBuilderTool = lazyWithRetry(() => import("./pages/admin/tools/RoleBuilder"));
const ContentModerationTool = lazyWithRetry(() => import("./pages/admin/tools/ContentModeration"));
const SessionManagementTool = lazyWithRetry(() => import("./pages/admin/tools/SessionManagement"));
const KillSwitchConfig = lazyWithRetry(() => import("./pages/admin/tools/KillSwitchConfig"));
const IpAllowlistTool = lazyWithRetry(() => import("./pages/admin/tools/IpAllowlist"));
const ScheduledReports = lazyWithRetry(() => import("./pages/admin/tools/ScheduledReports"));
const GdprCompliance = lazyWithRetry(() => import("./pages/admin/tools/GdprCompliance"));
const AnomalyDetection = lazyWithRetry(() => import("./pages/admin/tools/AnomalyDetection"));
const GameCatalogManagement = lazyWithRetry(() => import("./pages/admin/tools/GameCatalogManagement"));
const MapManagement = lazyWithRetry(() => import("./pages/admin/tools/MapManagement"));
const AvatarPoolManagement = lazyWithRetry(() => import("./pages/admin/tools/AvatarPoolManagement"));

// New admin pages
const FeatureFlags = lazyWithRetry(() => import("./pages/admin/system/FeatureFlags"));
const Broadcasts = lazyWithRetry(() => import("./pages/admin/operations/Broadcasts"));
const GhostMode = lazyWithRetry(() => import("./pages/admin/security/GhostMode"));
const CommandCentre = lazyWithRetry(() => import("./pages/admin/CommandCentre"));

// Venue Owner
const VenueOwnerDashboard = lazyWithRetry(() => import("./pages/venue-owner/Dashboard"));

// Tournament Organizer
const OrganizerDashboard = lazyWithRetry(() => import("./pages/organizer/Dashboard"));
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

// Notifications
const NotificationsPage = lazyWithRetry(() => import("./pages/notifications/Notifications"));

// Account Settings
const AccountSettings = lazyWithRetry(() => import("./pages/account/Settings"));

const TournamentHistoryPage = lazyWithRetry(() => import('./pages/TournamentHistory'));
const Leaderboards = lazyWithRetry(() => import('./pages/Leaderboards'));
const PlayerHistory = lazyWithRetry(() => import('./pages/player/History'));
const VerificationStatus = lazyWithRetry(() => import('./pages/VerificationStatus'));
const OrganizerDisputesPage = lazyWithRetry(() => import('./pages/organizer/Disputes'));
const TournamentDisputesPage = lazyWithRetry(() => import('./pages/organizer/TournamentDisputesPage'));
const MapVetoToken = lazyWithRetry(() => import('./pages/tournaments/MapVetoToken'));
const PublicBracketList = lazyWithRetry(() => import('./pages/tools/PublicBracketList'));
const PublicBracketBuilder = lazyWithRetry(() => import('./pages/tools/PublicBracketBuilder'));
const PublicBracketRunner = lazyWithRetry(() => import('./pages/tools/PublicBracketRunner'));
const PublicBracketShare = lazyWithRetry(() => import('./pages/tools/PublicBracketShare'));
const PublicBracketEmbed = lazyWithRetry(() => import('./pages/tools/PublicBracketEmbed'));
const PublicMapVetoCreate = lazyWithRetry(() => import('./pages/tools/PublicMapVetoCreate'));
const PublicMapVetoRoom = lazyWithRetry(() => import('./pages/tools/PublicMapVetoRoom'));
const PublicMapVetoOverlay = lazyWithRetry(() => import('./pages/tools/PublicMapVetoOverlay'));
const RiotTest = lazyWithRetry(() => import("./pages/debug/RiotTest"));
const RiotPostMatchOverlay = lazyWithRetry(() => import("./pages/debug/RiotPostMatchOverlay"));
const IgdbTest = lazyWithRetry(() => import("./pages/debug/IgdbTest"));
const RiotOAuthCallback   = lazyWithRetry(() => import("./pages/auth/RiotOAuthCallback"));
const SteamCallback       = lazyWithRetry(() => import("./pages/auth/SteamCallback"));

const isChromelessPath = (pathname: string) =>
  pathname.endsWith('/brackets/fullscreen')
  || pathname.startsWith('/tools/brackets/embed/')
  || pathname.startsWith('/tools/map-veto/overlay/')
  || pathname.startsWith('/debug/riot/overlay');

const SettingsRedirect = () => {
  const location = useLocation();
  return <Navigate to={`/account/settings${location.search}`} replace />;
};

const DisputeIdToQueryRedirect = () => {
  const { slug, disputeId } = useParams<{ slug: string; disputeId: string }>();
  if (!slug || !disputeId) {
    return <Navigate to="/organizer/tournaments" replace />;
  }
  return (
    <Navigate
      to={`/organizer/tournament/${encodeURIComponent(slug)}/disputes?dispute=${encodeURIComponent(disputeId)}`}
      replace
    />
  );
};

const AppContent = React.memo(() => {
  const location = useLocation();
  const { scrollTo } = useGlobalSmoothScroll();

  // Scroll to top on route change
  useEffect(() => {
    scrollTo(0, { immediate: true });
  }, [location.pathname, scrollTo]);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const isChromelessRoute = isChromelessPath(location.pathname);

  return (
    <>
      {/* Global Background */}
      {!isChromelessRoute && !isAdminRoute && (
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

      {/* ProfilePeekSheet: global overlay, mounted once at app root, outside all routes */}
      <ProfilePeekSheet />
      <Toaster />
      <Sonner />
      <GhostModeBanner />
      <ProfileCompletionPrompt />
      <TournamentInvitePrompt />
      <AvatarFeatureAnnouncement />
      {!isChromelessRoute && !isAdminRoute && (
        <>
          <Navbar />
          <BetaNoticeBanner />
          <EmailVerificationBanner />
        </>
      )}
      <div className="relative z-10">
        <React.Suspense fallback={isChromelessRoute ? <div className="h-dvh w-dvw bg-transparent" /> : <PremiumLoadingScreen />}>
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
                <Route path="/auth/recovery" element={<ResetPassword />} />
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

                {/* Admin Routes - Nested under single AdminLayout for smooth navigation */}
                <Route path="/admin" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                  <Route index element={<Navigate to="dashboard" replace />} />

                  {/* Dashboard */}
                  <Route path="dashboard" element={<AdminRouteGuard requiredPermission="dashboard:view"><CommandCentre /></AdminRouteGuard>} />

                  {/* Tools */}
                  <Route path="tools/user-management" element={<AdminRouteGuard requiredPermission="users:view" requiredRoles={ADMIN_ROLE_SETS.userManagement}><UserManagementTool /></AdminRouteGuard>} />
                  <Route path="tools/tournament-management" element={<AdminRouteGuard requiredPermission="tournaments:view" requiredRoles={ADMIN_ROLE_SETS.tournamentManagement}><TournamentManagementTool /></AdminRouteGuard>} />
                  <Route path="tools/team-management" element={<AdminRouteGuard requiredPermission="teams:view" requiredRoles={ADMIN_ROLE_SETS.superAdmin}><TeamManagementTool /></AdminRouteGuard>} />
                  <Route path="tools/alerts" element={<AdminRouteGuard requiredPermission="alerts:view" requiredRoles={ADMIN_ROLE_SETS.auditAccess}><AlertsManagementTool /></AdminRouteGuard>} />
                  <Route path="tools/venue-management" element={<AdminRouteGuard requiredPermission="venues:view" requiredRoles={ADMIN_ROLE_SETS.venueManagement}><VenueManagementTool /></AdminRouteGuard>} />
                  <Route path="tools/verification-system" element={<AdminRouteGuard requiredPermission="verification:view" requiredRoles={ADMIN_ROLE_SETS.verification}><VerificationSystemTool /></AdminRouteGuard>} />
                  <Route path="tools/audit-logs" element={<AdminRouteGuard requiredPermission="audit:view" requiredRoles={ADMIN_ROLE_SETS.auditAccess}><AuditLogsTool /></AdminRouteGuard>} />
                  <Route path="tools/analytics" element={<AdminRouteGuard requiredPermission="analytics:view" requiredRoles={ADMIN_ROLE_SETS.analytics}><AnalyticsTool /></AdminRouteGuard>} />
                  <Route path="tools/sponsor-management" element={<Navigate to="/admin/partners/sponsors/overview" replace />} />
                  <Route path="tools/sponsor-ad-manager" element={<Navigate to="/admin/partners/sponsors/placements" replace />} />
                  <Route path="tools/game-catalog" element={<AdminRouteGuard requiredPermission="games:manage" requiredRoles={ADMIN_ROLE_SETS.gamesCatalog}><GameCatalogManagement /></AdminRouteGuard>} />
                  <Route path="tools/map-management" element={<AdminRouteGuard requiredPermission="games:manage" requiredRoles={ADMIN_ROLE_SETS.gamesCatalog}><MapManagement /></AdminRouteGuard>} />
                  <Route path="tools/license-management" element={<AdminRouteGuard requiredPermission="licenses:view" requiredRoles={ADMIN_ROLE_SETS.anyAdmin}><LicenseManagementTool /></AdminRouteGuard>} />
                  <Route path="tools/system-settings" element={<AdminRouteGuard requiredPermission="system:settings" requiredRoles={ADMIN_ROLE_SETS.systemSettings}><SystemSettings /></AdminRouteGuard>} />
                  <Route path="tools/admin-management" element={<AdminRouteGuard requiredPermission="system:settings" requiredRoles={['super_admin']}><AdminRoleManagement /></AdminRouteGuard>} />
                  <Route path="tools/role-builder" element={<AdminRouteGuard requiredPermission="rbac:view" requiredRoles={['super_admin']}><RoleBuilderTool /></AdminRouteGuard>} />
                  <Route path="tools/moderation" element={<AdminRouteGuard requiredPermission="moderation:view" requiredRoles={ADMIN_ROLE_SETS.anyAdmin}><ContentModerationTool /></AdminRouteGuard>} />
                  <Route path="tools/sessions" element={<AdminRouteGuard requiredPermission="security:view_sessions"><SessionManagementTool /></AdminRouteGuard>} />
                  <Route path="tools/kill-switches" element={<AdminRouteGuard requiredPermission="system:config_view" requiredRoles={ADMIN_ROLE_SETS.systemSettings}><KillSwitchConfig /></AdminRouteGuard>} />
                  <Route path="tools/ip-allowlist" element={<AdminRouteGuard requiredPermission="security:manage_ip_allowlist" requiredRoles={ADMIN_ROLE_SETS.superAdmin}><IpAllowlistTool /></AdminRouteGuard>} />
                  <Route path="tools/scheduled-reports" element={<AdminRouteGuard requiredPermission="reports:view" requiredRoles={ADMIN_ROLE_SETS.superAdmin}><ScheduledReports /></AdminRouteGuard>} />
                  <Route path="tools/gdpr" element={<AdminRouteGuard requiredPermission="gdpr:view" requiredRoles={ADMIN_ROLE_SETS.superAdmin}><GdprCompliance /></AdminRouteGuard>} />
                  <Route path="tools/anomaly-detection" element={<AdminRouteGuard requiredPermission="system:audit" requiredRoles={ADMIN_ROLE_SETS.superAdmin}><AnomalyDetection /></AdminRouteGuard>} />
                  <Route path="tools/avatar-pool" element={<AdminRouteGuard requiredPermission="system:config_view" requiredRoles={ADMIN_ROLE_SETS.superAdmin}><AvatarPoolManagement /></AdminRouteGuard>} />

                  {/* System */}
                  <Route path="system/feature-flags" element={<AdminRouteGuard requiredPermission="feature_flags:view"><FeatureFlags /></AdminRouteGuard>} />

                  {/* Operations */}
                  <Route path="operations/broadcasts" element={<AdminRouteGuard requiredPermission="broadcasts:view"><Broadcasts /></AdminRouteGuard>} />

                  {/* Security */}
                  <Route path="security/ghost" element={<AdminRouteGuard requiredPermission="users:impersonate" requiredRoles={ADMIN_ROLE_SETS.superAdmin}><GhostMode /></AdminRouteGuard>} />

                  {/* Legacy routes (kept for backward compatibility) */}
                  <Route path="access" element={<AdminRouteGuard requiredPermission="admin_users:view" requiredRoles={['super_admin']}><AdminAccess /></AdminRouteGuard>} />
                  <Route path="disputes" element={<AdminRouteGuard requiredPermission="disputes:view" requiredRoles={ADMIN_ROLE_SETS.disputes}><DisputeCenter /></AdminRouteGuard>} />
                  <Route path="settings" element={<AdminRouteGuard requiredPermission="system:settings" requiredRoles={ADMIN_ROLE_SETS.systemSettings}><SystemSettings /></AdminRouteGuard>} />
                  <Route path="verification" element={<AdminRouteGuard requiredPermission="verification:view" requiredRoles={ADMIN_ROLE_SETS.verification}><VerificationSystemTool /></AdminRouteGuard>} />
                  <Route path="audit" element={<AdminRouteGuard requiredPermission="audit:view" requiredRoles={ADMIN_ROLE_SETS.auditAccess}><AuditLogsTool /></AdminRouteGuard>} />
                  <Route path="users" element={<AdminRouteGuard requiredPermission="users:view" requiredRoles={ADMIN_ROLE_SETS.userManagement}><UserManagementTool /></AdminRouteGuard>} />

                  {/* URL redirects for new structure */}
                  <Route path="users/verifications" element={<Navigate to="/admin/tools/verification-system" replace />} />
                  <Route path="users/licenses" element={<Navigate to="/admin/tools/license-management" replace />} />
                  <Route path="users/sessions" element={<Navigate to="/admin/tools/sessions" replace />} />
                  <Route path="content/tournaments" element={<Navigate to="/admin/tools/tournament-management" replace />} />
                  <Route path="content/teams" element={<Navigate to="/admin/tools/team-management" replace />} />
                  <Route path="content/venues" element={<Navigate to="/admin/tools/venue-management" replace />} />
                  <Route path="content/games" element={<Navigate to="/admin/tools/game-catalog" replace />} />
                  <Route path="content/moderation" element={<Navigate to="/admin/tools/moderation" replace />} />
                  <Route path="partners/sponsors" element={<AdminRouteGuard requiredPermission="sponsors:view" requiredRoles={ADMIN_ROLE_SETS.systemSettings}><SponsorsHub /></AdminRouteGuard>}>
                  <Route index element={<Navigate to="/admin/partners/sponsors/overview" replace />} />
                  <Route path="overview" element={<SponsorsOverviewSection />} />
                  <Route path="pipeline" element={<SponsorsPipelineSection />} />
                  <Route path="partners" element={<SponsorsPartnersSection />} />
                  <Route path="placements" element={
                    <AdminRouteGuard requiredPermission="sponsors:edit" requiredRoles={ADMIN_ROLE_SETS.systemSettings}>
                      <SponsorsPlacementsSection />
                    </AdminRouteGuard>
                  } />
                  <Route path="audit" element={<SponsorsAuditSection />} />
                </Route>
                  <Route path="operations/disputes" element={<Navigate to="/admin/disputes" replace />} />
                  <Route path="operations/alerts" element={<Navigate to="/admin/tools/alerts" replace />} />
                  <Route path="operations/reports" element={<Navigate to="/admin/tools/scheduled-reports" replace />} />
                  <Route path="system/settings" element={<Navigate to="/admin/tools/system-settings" replace />} />
                  <Route path="system/kill-switches" element={<Navigate to="/admin/tools/kill-switches" replace />} />
                  <Route path="system/anomalies" element={<Navigate to="/admin/tools/anomaly-detection" replace />} />
                  <Route path="security/roles" element={<Navigate to="/admin/tools/role-builder" replace />} />
                  <Route path="security/admins" element={<Navigate to="/admin/access" replace />} />
                  <Route path="security/ip-allowlist" element={<Navigate to="/admin/tools/ip-allowlist" replace />} />
                  <Route path="security/audit-logs" element={<Navigate to="/admin/tools/audit-logs" replace />} />
                  <Route path="security/gdpr" element={<Navigate to="/admin/tools/gdpr" replace />} />
                  <Route path="analytics" element={<Navigate to="/admin/tools/analytics" replace />} />
                </Route>

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
                  <ProtectedRoute allowedRoles={['organizer']} allowOrganizationStaff>
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
                  <ProtectedRoute allowedRoles={['organizer']} allowStaffForTournamentParam="slug">
                    <TournamentManage />
                  </ProtectedRoute>
                } />
                <Route path="/organizer/tournament/:slug/edit" element={
                  <ProtectedRoute allowedRoles={['organizer']} allowStaffForTournamentParam="slug">
                    <EditTournament />
                  </ProtectedRoute>
                } />
                <Route path="/organizer/tournament/:slug/brackets" element={
                  <ProtectedRoute allowedRoles={['organizer']} allowStaffForTournamentParam="slug">
                    <TournamentBrackets />
                  </ProtectedRoute>
                } />
                <Route path="/organizer/tournament/:slug/manage-bracket/:stageId" element={
                  <ProtectedRoute allowedRoles={['organizer']} allowStaffForTournamentParam="slug">
                    <ManageBracketPage />
                  </ProtectedRoute>
                } />
                <Route
                  path="/organizer/tournament/:slug/disputes/:disputeId"
                  element={<DisputeIdToQueryRedirect />}
                />
                <Route path="/organizer/tournament/:slug/disputes" element={
                  <ProtectedRoute allowedRoles={['organizer']} allowStaffForTournamentParam="slug">
                    <TournamentDisputesPage />
                  </ProtectedRoute>
                } />
                <Route path="/organizer/disputes" element={
                  <ProtectedRoute allowedRoles={['organizer']}>
                    <OrganizerDisputesPage />
                  </ProtectedRoute>
                } />
                <Route path="/tournaments" element={<BrowseTournaments />} />
                {/* Public player profile — no auth required */}
                <Route path="/profile/:username" element={<ProfilePage />} />
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
                <Route path="/tournaments/edit/:slug" element={<OrganizerEditLegacyRedirect />} />
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

                {/* Public Tools */}
                <Route path="/tools/brackets" element={<PublicBracketList />} />
                <Route path="/tools/brackets/new" element={<PublicBracketBuilder />} />
                <Route path="/tools/brackets/:id" element={<PublicBracketRunner />} />
                <Route path="/tools/brackets/share/:token" element={<PublicBracketShare />} />
                <Route path="/tools/map-veto" element={<PublicMapVetoCreate />} />
                <Route path="/tools/map-veto/host/:token" element={<PublicMapVetoRoom />} />
                <Route path="/tools/map-veto/team/:token" element={<PublicMapVetoRoom />} />
                <Route path="/tools/map-veto/overlay/:token" element={<PublicMapVetoOverlay />} />

                {/* Company Pages */}
                <Route path="/about" element={<AboutPage />} />
                <Route path="/about/company" element={<AboutPage />} />
                <Route path="/about/contact" element={<ContactPage />} />
                <Route path="/about/faq" element={<FAQPage />} />
                <Route path="/guides/organizer" element={<Navigate to="/help?entry=organizer-guide" replace />} />
                <Route path="/guides/player" element={<Navigate to="/help" replace />} />
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
              <Route path="/tools/brackets/embed/share/:token" element={<PublicBracketEmbed />} />
              <Route path="/debug/riot/overlay" element={<RiotPostMatchOverlay />} />
              <Route path="/debug/riot/overlay/match" element={<RiotPostMatchOverlay />} />
              <Route path="/debug/riot/overlay/player" element={<RiotPostMatchOverlay />} />
              <Route path="/debug/riot/overlay/compare" element={<RiotPostMatchOverlay />} />
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
  const location = useLocation();

  if (
    isChromelessPath(location.pathname)
    || location.pathname.startsWith('/auth/')
    || location.pathname.startsWith('/invitations/')
  ) {
    return <>{children}</>;
  }

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
      <RecoveryRouteGate />
    </BrowserRouter>
  );
};

function RecoveryRouteGate() {
  const location = useLocation();

  if (
    location.pathname === '/auth/reset-password'
    || location.pathname === '/auth/recovery'
    || location.pathname === '/set-password'
  ) {
    return (
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {location.pathname === '/set-password' ? <SetPassword /> : <ResetPassword />}
      </TooltipProvider>
    );
  }

  return (
    <AuthProvider>
      <SignalRProvider>
        <RoleProvider>
          <GameCatalogProvider>
            <CatalogBootstrapGate>
              <TooltipProvider>
                <NotificationProvider>
                  <AdminProvider>
                    <GhostModeProvider>
                      <AppContent />
                    </GhostModeProvider>
                  </AdminProvider>
                </NotificationProvider>
              </TooltipProvider>
            </CatalogBootstrapGate>
          </GameCatalogProvider>
        </RoleProvider>
      </SignalRProvider>
    </AuthProvider>
  );
}

export default App;
