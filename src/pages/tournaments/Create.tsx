import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { useAdmin } from '@/contexts/AdminContext';
import { apiClient } from '@/lib/apiClient';
import CreationModeHub from '@/components/tournament/CreationModeHub';
import Footer from '@/components/Footer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, ArrowRight, Building2, Loader2, Trophy, Workflow } from 'lucide-react';
import { WizardContainer } from '@/components/tournament/wizard';
import { Button } from '@/components/ui/button';

const CreateTournament = () => {
  const { user } = useAuth();
  const { canCreateTournaments, currentRole } = useRole();
  const admin = useAdmin();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [hasOrganization, setHasOrganization] = useState(false);

  const canCreate = canCreateTournaments || admin.hasPermission('tournaments:create');
  const requestedMode = searchParams.get('mode');
  const creationMode = requestedMode === 'event' ? requestedMode : null;

  // Handle season selection - navigate to season creation page
  useEffect(() => {
    if (requestedMode === 'season') {
      navigate('/organizer/seasons/create');
    }
  }, [requestedMode, navigate]);

  // Check if user has an organization
  useEffect(() => {
    const checkOrganization = async () => {
      if (!user?.id || (currentRole !== 'organizer' && !admin.hasPermission('tournaments:create'))) {
        setLoading(false);
        return;
      }
      try {
        const roles = await apiClient.get<any>('/api/me/roles');
        setHasOrganization(!!roles?.organization_id);
      } catch {
        setHasOrganization(false);
      } finally {
        setLoading(false);
      }
    };
    checkOrganization();
  }, [user?.id, currentRole, admin]);

  if (!user) {
    return (
      <div className="min-h-screen bg-transparent text-white flex flex-col">
        <main className="flex-grow container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must be signed in to create tournaments.
            </AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="min-h-screen bg-transparent text-white flex flex-col">
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
              <Trophy className="h-8 w-8 text-white" />
            </div>
            <div className="text-esports-primary text-xl font-semibold mb-2">Player Mode</div>
            <div className="text-esports-secondary text-sm mb-4">
              You're currently in Player mode. Switch to Organizer mode to create tournaments.
            </div>
            <div className="text-xs text-gray-500">
              As a player, you can create teams and join tournaments but not create them. Switch roles to access organizer features.
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-esports-dark text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-esports-accent" />
          <span className="text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  // No organization - show gate (skip for admins with tournament permissions)
  if (!hasOrganization && !admin.hasPermission('tournaments:create')) {
    return (
      <div className="min-h-screen bg-esports-dark text-white flex flex-col">
        <main className="flex-grow container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-lg mx-auto text-center"
          >
            {/* Icon */}
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-8">
              <Building2 className="h-12 w-12 text-amber-400" />
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold font-heading mb-4">
              Setup Your Organization First
            </h1>

            {/* Description */}
            <p className="text-gray-400 text-lg mb-8 max-w-md mx-auto">
              Before you can host tournaments, you need to create your organization.
              This will be your public brand that players will see.
            </p>

            {/* Benefits */}
            <div className="grid grid-cols-1 gap-3 mb-10 text-left max-w-sm mx-auto">
              {[
                'Your organization name appears on all tournaments',
                'Build a recognizable esports brand',
                'Get a public profile page for your org',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-gray-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-esports-accent flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <Button
              onClick={() => navigate('/organizer/setup-organization')}
              className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-esports-purple to-esports-accent hover:from-esports-purple/90 hover:to-esports-accent/90 shadow-lg shadow-esports-purple/25 gap-2"
            >
              Setup Organization
              <ArrowRight className="h-5 w-5" />
            </Button>

            <p className="text-gray-500 text-sm mt-6">
              Takes less than 2 minutes to complete
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col">
      <main className="flex-grow">
        {!creationMode ? (
          <CreationModeHub onSelect={(mode) => setSearchParams({ mode })} />
        ) : (
          <>
            <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
              <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-[#0d0d10] p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
                    <Trophy className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-rose-400">Single event flow</p>
                    <h1 className="mt-1 text-2xl font-black tracking-tight">Create one tournament with multiple stages</h1>
                    <p className="mt-2 text-sm text-zinc-400">
                      Use the existing tournament wizard for one event with groups, playoffs, match settings, and registration.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => navigate('/organizer/seasons')}
                  >
                    <Workflow className="mr-2 h-4 w-4" />
                    Manage Seasons
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => navigate('/tournaments/create')}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to options
                  </Button>
                </div>
              </div>
            </div>
            <WizardContainer />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CreateTournament;
