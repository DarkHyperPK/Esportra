import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Login from './pages/Login';
import SetPassword from './pages/SetPassword';
import InviteAcceptance from './pages/InviteAcceptance';
import Recovery from './pages/Recovery';
import InvitePasswordSetup from './pages/InvitePasswordSetup';
import Dashboard from './pages/Dashboard';
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Toaster from './components/Toaster';
import InvitationCallbackHandoff from './components/InvitationCallbackHandoff';

const Analytics = lazy(() => import('./pages/Analytics'));
const Assets = lazy(() => import('./pages/Assets'));
const Account = lazy(() => import('./pages/Account'));
const OnboardingWizard = lazy(() => import('./pages/OnboardingWizard'));

const PageLoader = () => (
  <div className="min-h-screen bg-[#050505] flex items-center justify-center">
    <div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
  </div>
);

function App() {
  return (
    <Router>
      <InvitationCallbackHandoff />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/invite/accept" element={<InviteAcceptance />} />
          <Route path="/invite/setup-password" element={<InvitePasswordSetup />} />
          <Route path="/auth/recovery" element={<Recovery />} />
          {/* Auth Routes */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/set-password" element={<SetPassword />} />
          </Route>

          {/* Onboarding — Protected but no sidebar chrome */}
          <Route path="/onboarding" element={<ProtectedRoute><OnboardingWizard /></ProtectedRoute>} />

          {/* Protected Dashboard Routes */}
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/account" element={<Account />} />
          </Route>
        </Routes>
      </Suspense>
      <Toaster />
    </Router>
  );
}

export default App;
