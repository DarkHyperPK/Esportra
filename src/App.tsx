import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationProvider } from "@/components/NotificationContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AdminProvider } from "@/contexts/AdminContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { RoleProvider } from "@/contexts/RoleContext";
import { IdentityProvider } from "@/contexts/IdentityContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import React from 'react';
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import SignUp from "./pages/auth/SignUp";
import SignIn from "./pages/auth/SignIn";
import Profile from "./pages/auth/Profile";
import Callback from "./pages/auth/Callback";
import AdminPortal from "./pages/admin/AdminPortal";
import Navbar from "@/components/Navbar";
import TestNavbar from "@/components/TestNavbar";
import SimpleNavbar from "@/components/SimpleNavbar";

// User 
import UserDashboard from "./pages/user/Dashboard";
import PlayerDashboard from "./pages/player/Dashboard";
import TeamsPage from "./pages/player/Teams";

// Admin
import AdminDashboard from "./pages/admin/Dashboard";
import AdminManagement from "./pages/admin/AdminManagement";
import AdminAccess from "./pages/admin/AdminAccess";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import AdminLayout from "@/components/admin/AdminLayout";
import DisputeCenter from "./pages/admin/DisputeCenter";
import SystemSettings from "./pages/admin/SystemSettings";
import VerificationSystemTool from "./pages/admin/tools/VerificationSystem";
import AuditLogsTool from "./pages/admin/tools/AuditLogs";
import UserManagementTool from "./pages/admin/tools/UserManagement";
import TournamentManagementTool from "./pages/admin/tools/TournamentManagement";
import VenueManagementTool from "./pages/admin/tools/VenueManagement";
import AnalyticsTool from "./pages/admin/tools/Analytics";
// Removed SystemStatusTool per request

// Venue Owner
import VenueOwnerDashboard from "./pages/venue-owner/Dashboard";

// Tournament Organizer
import OrganizerDashboard from "./pages/organizer/Dashboard";
import TournamentList from "./pages/organizer/TournamentList";
import ManageTournaments from "./pages/organizer/ManageTournaments";
import TournamentManage from "./pages/organizer/TournamentManage";
import EditTournament from "./pages/tournaments/Edit";
import TournamentBrackets from "./pages/tournaments/Brackets";
// Tournament Details
import TournamentDetailsUser from "./pages/tournaments/Details";
import TournamentDetails from "./pages/admin/TournamentDetails";


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

const AppContent = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <>
      <Toaster />
      <Sonner />
      <Navbar />
      <div style={{ paddingTop: isHome ? '0px' : '80px' }}>
        <Routes>
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
            <AdminProtectedRoute>
              <AdminLayout>
                <AdminManagement />
              </AdminLayout>
            </AdminProtectedRoute>
          } />
          
          {/* Admin Tool Routes */}
          <Route path="/admin/tools/user-management" element={
            <AdminProtectedRoute requiredPermission="user:view">
              <AdminLayout>
                <UserManagementTool />
              </AdminLayout>
            </AdminProtectedRoute>
          } />
          <Route path="/admin/tools/tournament-management" element={
            <AdminProtectedRoute requiredPermission="tournament:view">
              <AdminLayout>
                <TournamentManagementTool />
              </AdminLayout>
            </AdminProtectedRoute>
          } />
          <Route path="/admin/tools/venue-management" element={
            <AdminProtectedRoute requiredPermission="venue:view">
              <AdminLayout>
                <VenueManagementTool />
              </AdminLayout>
            </AdminProtectedRoute>
          } />
          <Route path="/admin/tools/verification-system" element={
            <AdminProtectedRoute requiredPermission="verification:view">
              <AdminLayout>
                <VerificationSystemTool />
              </AdminLayout>
            </AdminProtectedRoute>
          } />
          <Route path="/admin/tools/audit-logs" element={
            <AdminProtectedRoute requiredPermission="audit:view">
              <AdminLayout>
                <AuditLogsTool />
              </AdminLayout>
            </AdminProtectedRoute>
          } />
          <Route path="/admin/tools/analytics" element={
            <AdminProtectedRoute requiredPermission="audit:view">
              <AdminLayout>
                <AnalyticsTool />
              </AdminLayout>
            </AdminProtectedRoute>
          } />
          <Route path="/admin/tools/system-settings" element={
            <AdminProtectedRoute requiredPermission="settings:view">
              <AdminLayout>
                <SystemSettings />
              </AdminLayout>
            </AdminProtectedRoute>
          } />
          
          {/* Legacy Admin Routes (for backward compatibility) */}
          <Route path="/admin/access" element={
            <AdminProtectedRoute requiredPermission="admin:assign_roles">
              <AdminLayout>
                <AdminAccess />
              </AdminLayout>
            </AdminProtectedRoute>
          } />
          <Route path="/admin/disputes" element={
            <AdminProtectedRoute requiredPermission="dispute:resolve">
              <AdminLayout>
                <DisputeCenter />
              </AdminLayout>
            </AdminProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <AdminProtectedRoute requiredPermission="settings:edit">
              <AdminLayout>
                <SystemSettings />
              </AdminLayout>
            </AdminProtectedRoute>
          } />
          <Route path="/admin/verification" element={
            <AdminProtectedRoute requiredPermission="verification:view">
              <AdminLayout>
                <VerificationSystemTool />
              </AdminLayout>
            </AdminProtectedRoute>
          } />
          <Route path="/admin/audit" element={
            <AdminProtectedRoute requiredPermission="audit:view">
              <AdminLayout>
                <AuditLogsTool />
              </AdminLayout>
            </AdminProtectedRoute>
          } />
          <Route path="/admin/users" element={
            <AdminProtectedRoute requiredPermission="user:view">
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </>
  );
};

const App = () => {
  return (
    <React.StrictMode>
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
    </React.StrictMode>
  );
};

export default App;
