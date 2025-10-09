import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NotificationProvider } from "@/components/NotificationContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminProvider } from "@/contexts/AdminContext";
import { MongoAuthProvider } from "@/contexts/MongoAuthContext";
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

// User 
import UserDashboard from "./pages/user/Dashboard";
import PlayerDashboard from "./pages/player/Dashboard";
import TeamsPage from "./pages/player/Teams";

// Admin
import AdminDashboard from "./pages/admin/Dashboard";
import AdminManagement from "./pages/admin/AdminManagement";
import AdminAccess from "./pages/admin/AdminAccess";
import AdminProtectedRoute from "@/components/AdminProtectedRoute";
import DisputeCenter from "./pages/admin/DisputeCenter";
import SystemSettings from "./pages/admin/SystemSettings";
import VerificationSystemTool from "./pages/admin/tools/VerificationSystem";
import AuditLogsTool from "./pages/admin/tools/AuditLogs";
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

// App Download
import AppDownloadPage from "./pages/AppDownload";

// Notifications
import NotificationsPage from "./pages/notifications/Notifications";

import TournamentHistoryPage from './pages/TournamentHistory';
import VerificationStatus from './pages/VerificationStatus';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <MongoAuthProvider>
            <RoleProvider>
              <IdentityProvider>
                <TooltipProvider>
                  <NotificationProvider>
                    <AdminProvider>
              <Toaster />
              <Sonner />
              <Navbar />
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
                    <Navigate to="/admin/dashboard" replace />
                  </AdminProtectedRoute>
                } />
                
                {/* Unauthorized Route */}
                <Route path="/unauthorized" element={<Unauthorized />} />
                
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
                
                {/* Legacy Admin Routes */}
                <Route path="/admin/dashboard" element={
                  <AdminProtectedRoute>
                    <AdminDashboard />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/access" element={
                  <AdminProtectedRoute permission="admin:assign_roles">
                    <AdminAccess />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/disputes" element={
                  <AdminProtectedRoute permission="dispute:resolve">
                    <DisputeCenter />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/settings" element={
                  <AdminProtectedRoute permission="settings:update">
                    <SystemSettings />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/verification" element={
                  <AdminProtectedRoute permission="verification:review">
                    <VerificationSystemTool />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/audit" element={
                  <AdminProtectedRoute permission="audit:view">
                    <AuditLogsTool />
                  </AdminProtectedRoute>
                } />
                <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><Navigate to="/admin/dashboard?tab=user-management" replace /></ProtectedRoute>} />
                
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
                <Route path="/tournaments" element={<TournamentList />} />
                <Route path="/tournaments/:slug" element={<TournamentDetailsUser />} />
                
                {/* Venues Routes */}
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
                <Route path="/tournaments/:slug/brackets" element={
                  <ProtectedRoute allowedRoles={['organizer']}>
                    <TournamentBrackets />
                  </ProtectedRoute>
                } />
                
                {/* About Routes */}
                <Route path="/about/company" element={<AboutCompany />} />
                <Route path="/about/contact" element={<ContactPage />} />
                <Route path="/about/faq" element={<FAQPage />} />
                
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
                    </AdminProvider>
                  </NotificationProvider>
                </TooltipProvider>
              </IdentityProvider>
            </RoleProvider>
          </MongoAuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;
