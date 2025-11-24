import { Toaster } from "@/components/ui/toaster";
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
import { IdentityProvider } from "@/contexts/IdentityContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import React from 'react';
import Navbar from "@/components/Navbar";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import AdminLayout from "@/components/admin/AdminLayout";

// Import all route components directly (no lazy loading)
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import SignUp from "./pages/auth/SignUp";
import SignIn from "./pages/auth/SignIn";
import Profile from "./pages/auth/Profile";
import Callback from "./pages/auth/Callback";
import AdminPortal from "./pages/admin/AdminPortal";

// User 
import UserDashboard from "./pages/user/Dashboard";
import PlayerDashboard from "./pages/player/Dashboard";
import StaffInvitesPage from "./pages/user/StaffInvites";
import RaiseDispute from "./pages/user/RaiseDispute";
import MyDisputes from "./pages/user/MyDisputes";
import StaffDashboard from "./pages/staff/StaffDashboard";
import TeamsPage from "./pages/player/Teams";

// Admin
import AdminDashboard from "./pages/admin/Dashboard";
import AdminManagement from "./pages/admin/AdminManagement";
import AdminAccess from "./pages/admin/AdminAccess";
import AdminRoleManagement from "./pages/admin/tools/AdminManagement";
import DisputeCenter from "./pages/admin/DisputeCenter";
import SystemSettings from "./pages/admin/SystemSettings";
import VerificationSystemTool from "./pages/admin/tools/VerificationSystem";
import AuditLogsTool from "./pages/admin/tools/AuditLogs";
import UserManagementTool from "./pages/admin/tools/UserManagement";
import TournamentManagementTool from "./pages/admin/tools/TournamentManagement";
import VenueManagementTool from "./pages/admin/tools/VenueManagement";
import AnalyticsTool from "./pages/admin/tools/Analytics";

// Venue Owner
import VenueOwnerDashboard from "./pages/venue-owner/Dashboard";

// Tournament Organizer
import OrganizerDashboard from "./pages/organizer/Dashboard";
import TournamentList from "./pages/organizer/TournamentList";
import ManageTournaments from "./pages/organizer/ManageTournaments";
import TournamentManage from "./pages/organizer/TournamentManage";
import EditTournament from "./pages/tournaments/Edit";
import TournamentBrackets from "./pages/tournaments/Brackets";
import TournamentDetailsUser from "./pages/tournaments/Details";
import TournamentDetails from "./pages/admin/TournamentDetails";

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
import VenueSearch from "./pages/venues/Search";
import FeaturedVenues from "./pages/venues/Featured";
import VenueDetails from "./pages/venues/Details";
import ListVenue from "./pages/venues/ListVenue";

// Tournaments
import UpcomingTournaments from "./pages/tournaments/Upcoming";
import OngoingTournaments from "./pages/tournaments/Ongoing";
import CreateTournament from "./pages/tournaments/Create";

// About
import AboutCompany from "./pages/about/Company";
import ContactPage from "./pages/about/Contact";
import FAQPage from "./pages/about/FAQ";
import AboutPage from "./pages/About";
import PrivacyPage from "./pages/Privacy";
import CareersPage from "./pages/Careers";
import ContactStandalone from "./pages/Contact";

// App Download
import AppDownloadPage from "./pages/AppDownload";

// Notifications
import NotificationsPage from "./pages/notifications/Notifications";

import TournamentHistoryPage from './pages/TournamentHistory';
import VerificationStatus from './pages/VerificationStatus';
import OrganizerDisputesPage from './pages/organizer/Disputes';
import MapVetoToken from './pages/tournaments/MapVetoToken';

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
      <Toaster />
      <Sonner />
      <Navbar />
      <div style={{ paddingTop: '10px' }}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Index /></PageTransition>} />
          
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
            <ProtectedRoute>
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
          <Route path="/organizer/disputes" element={
            <ProtectedRoute allowedRoles={['organizer']}>
              <OrganizerDisputesPage />
            </ProtectedRoute>
          } />
          <Route path="/tournaments" element={<TournamentList />} />
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
          <Route path="/map-veto/:token" element={<MapVetoToken />} />
          
          {/* Company Pages */}
          <Route path="/about" element={<AboutPage />} />
          <Route path="/about/company" element={<AboutCompany />} />
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
        </Routes>
        </AnimatePresence>
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
            <IdentityProvider>
              <TooltipProvider>
                <NotificationProvider>
                  <AdminProvider>
                    <AppContent />
                  </AdminProvider>
                </NotificationProvider>
              </TooltipProvider>
            </IdentityProvider>
          </RoleProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
