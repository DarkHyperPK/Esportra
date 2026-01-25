import { Toaster } from "@/components/ui/toaster";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationProvider } from "@/components/NotificationContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/PageTransition";
import { AdminProvider } from "@/contexts/AdminContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { BackgroundRotator } from "@/components/effects/BackgroundRotator";

import { AnimatedLiquidBackground } from "@/components/effects/AnimatedLiquidBackground";
import { TransitionLayout } from "@/components/TransitionLayout";
import { LoadingSpinner } from "@/components/effects/LoadingSpinner";
import { SeamlessVideoLoop } from "@/components/effects/SeamlessVideoLoop";


import ProtectedRoute from "@/components/ProtectedRoute";
import React from 'react';
import Navbar from "@/components/Navbar";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
// import AdminLayout from "@/components/admin/AdminLayout";
const AdminLayout = React.lazy(() => import("@/components/admin/AdminLayout"));

// Lazy Load Pages
const Index = React.lazy(() => import("./pages/Index"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
const Unauthorized = React.lazy(() => import("./pages/Unauthorized"));
const SignUp = React.lazy(() => import("./pages/auth/SignUp"));
const SignIn = React.lazy(() => import("./pages/auth/SignIn"));
const Profile = React.lazy(() => import("./pages/auth/Profile"));
const Callback = React.lazy(() => import("./pages/auth/Callback"));
const AdminPortal = React.lazy(() => import("./pages/admin/AdminPortal"));

// User 
const UserDashboard = React.lazy(() => import("./pages/user/Dashboard"));
const PlayerDashboard = React.lazy(() => import("./pages/player/Dashboard"));
const StaffInvitesPage = React.lazy(() => import("./pages/user/StaffInvites"));
const RaiseDispute = React.lazy(() => import("./pages/user/RaiseDispute"));
const MyDisputes = React.lazy(() => import("./pages/user/MyDisputes"));
const StaffDashboard = React.lazy(() => import("./pages/staff/StaffDashboard"));
const TeamsPage = React.lazy(() => import("./pages/player/Teams"));

// Admin
const AdminDashboard = React.lazy(() => import("./pages/admin/Dashboard"));
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
const ManageBracketPage = React.lazy(() => import("./pages/organizer/ManageBracketPage"));
const FullscreenBracketPage = React.lazy(() => import("./pages/tournaments/brackets/FullscreenBracketPage"));
const OrganizerPublicProfile = React.lazy(() => import("./pages/organizer/PublicProfile"));

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
const VenueDetails = React.lazy(() => import("./pages/venues/Details"));
const ListVenue = React.lazy(() => import("./pages/venues/ListVenue"));

// Tournaments
const UpcomingTournaments = React.lazy(() => import("./pages/tournaments/Upcoming"));
const OngoingTournaments = React.lazy(() => import("./pages/tournaments/Ongoing"));
const CreateTournament = React.lazy(() => import("./pages/tournaments/Create"));

// About
const ContactPage = React.lazy(() => import("./pages/about/Contact"));
const FAQPage = React.lazy(() => import("./pages/about/FAQ"));
const AboutPage = React.lazy(() => import("./pages/About"));
const PrivacyPage = React.lazy(() => import("./pages/Privacy"));
const CareersPage = React.lazy(() => import("./pages/Careers"));
const ContactStandalone = React.lazy(() => import("./pages/Contact"));

// App Download
const AppDownloadPage = React.lazy(() => import("./pages/AppDownload"));

// Notifications
const NotificationsPage = React.lazy(() => import("./pages/notifications/Notifications"));

const TournamentHistoryPage = React.lazy(() => import('./pages/TournamentHistory'));
const VerificationStatus = React.lazy(() => import('./pages/VerificationStatus'));
const OrganizerDisputesPage = React.lazy(() => import('./pages/organizer/Disputes'));
const MapVetoToken = React.lazy(() => import('./pages/tournaments/MapVetoToken'));

// Test Supabase connection on app start
import './utils/testSupabase';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppContent = React.memo(() => {
  const location = useLocation();
  const isHome = location.pathname === '/';


  return (
    <>


      {/* Global Background - Video Only (Seamless Loop) */}
      <div className="fixed inset-0 w-full h-full -z-10">
        <SeamlessVideoLoop
          src="https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/Tournament%20dashboard%20background%20animation/background.mp4"
          className="mix-blend-screen opacity-40"
          style={{ filter: 'contrast(1.2) saturation(1.1)' }}
          fadeDuration={0.9} // 900ms fade in/out
        />
      </div>

      <Toaster />
      <Sonner />
      <Navbar />
      <div className="relative z-10">
        <React.Suspense fallback={
          <div className="flex items-center justify-center min-h-screen bg-transparent">
            <LoadingSpinner size={80} text="Loading..." />
          </div>
        }>
          <Routes location={location}>
            <Route element={<TransitionLayout />}>
              <Route path="/" element={<Index />} />

              {/* Auth Routes */}
              <Route path="/auth/signup" element={<SignUp />} />
              <Route path="/auth/signin" element={<SignIn />} />
              <Route path="/auth/callback" element={<Callback />} />
              <Route path="/auth/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />

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
                  <Navigate to="/user/dashboard" replace />
                </ProtectedRoute>
              } />

              {/* User Routes */}
              <Route path="/user/dashboard" element={
                <ProtectedRoute>
                  <UserDashboard />
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

              {/* Player Routes */}
              <Route path="/player/dashboard" element={
                <ProtectedRoute>
                  <PlayerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/player/teams" element={
                <ProtectedRoute>
                  <TeamsPage />
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
              <Route path="/organizer/tournaments" element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <ManageTournaments />
                </ProtectedRoute>
              } />
              <Route path="/organizer/tournament/:slug" element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <TournamentManage />
                </ProtectedRoute>
              } />
              <Route path="/organizer/tournament/:slug/edit" element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <EditTournament />
                </ProtectedRoute>
              } />
              <Route path="/organizer/tournament/:slug/brackets" element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <TournamentBrackets />
                </ProtectedRoute>
              } />
              <Route path="/organizer/tournament/:slug/manage-bracket/:stageId" element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <ManageBracketPage />
                </ProtectedRoute>
              } />
              <Route path="/organizer/disputes" element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <OrganizerDisputesPage />
                </ProtectedRoute>
              } />
              <Route path="/tournaments" element={<TournamentList />} />
              <Route path="/organizer/profile/:userId" element={<OrganizerPublicProfile />} />
              <Route path="/tournaments/:slug" element={<TournamentDetailsUser />} />

              {/* Venues Routes */}
              <Route path="/venues" element={<VenueSearch />} />
              <Route path="/venues/search" element={<VenueSearch />} />
              <Route path="/venues/featured" element={<FeaturedVenues />} />
              <Route path="/venues/details/:id" element={<VenueDetails />} />
              <Route path="/venues/list-venue" element={
                <ProtectedRoute allowedRoles={['venue_owner']}>
                  <ListVenue />
                </ProtectedRoute>
              } />

              {/* Tournaments Routes */}
              <Route path="/tournaments/upcoming" element={<UpcomingTournaments />} />
              <Route path="/tournaments/ongoing" element={<OngoingTournaments />} />
              <Route path="/tournaments/create" element={
                <ProtectedRoute allowedRoles={['organizer']}>
                  <CreateTournament />
                </ProtectedRoute>
              } />
              <Route path="/tournaments/edit/:slug" element={<EditTournament />} />
              <Route path="/tournaments/:slug/brackets" element={<TournamentBrackets />} />
              <Route path="/tournaments/:slug/brackets/fullscreen" element={<FullscreenBracketPage />} />
              <Route path="/tournaments/:slug/captain-match" element={
                <ProtectedRoute>
                  <CaptainMatchPage />
                </ProtectedRoute>
              } />
              <Route path="/map-veto/:token" element={<MapVetoToken />} />

              {/* Company Pages */}
              <Route path="/about" element={<AboutPage />} />
              <Route path="/about/company" element={<AboutPage />} />
              <Route path="/about/contact" element={<ContactPage />} />
              <Route path="/about/faq" element={<FAQPage />} />
              <Route path="/careers" element={<CareersPage />} />
              <Route path="/contact" element={<ContactStandalone />} />
              <Route path="/privacy" element={<PrivacyPage />} />

              {/* App Download Route */}
              <Route path="/app" element={<AppDownloadPage />} />

              {/* Notification List Route */}
              <Route path="/notifications" element={<NotificationsPage />} />

              {/* Admin Protected Route for TournamentDetails */}
              <Route path="/admin/tournaments/:id" element={<AdminProtectedRoute><TournamentDetails /></AdminProtectedRoute>} />

              {/* Tournament History Route */}
              <Route path="/tournament-history" element={<TournamentHistoryPage />} />

              {/* Verification Status Route */}
              <Route path="/verification" element={<VerificationStatus />} />

              {/* Catch-all route */}
              <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
            </Route>
          </Routes>
        </React.Suspense>
      </div>
    </>
  );
});

AppContent.displayName = 'AppContent';

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <RoleProvider>

            <TooltipProvider>
              <NotificationProvider>
                <AdminProvider>
                  <AppContent />
                </AdminProvider>
              </NotificationProvider>
            </TooltipProvider>

          </RoleProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
