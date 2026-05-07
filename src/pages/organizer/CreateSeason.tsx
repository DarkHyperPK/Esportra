import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { useAdmin } from '@/contexts/AdminContext';
import { apiClient } from '@/lib/apiClient';
import SeasonWizard from '@/components/organizer/season/SeasonWizard';
import Footer from '@/components/Footer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, Building2, Loader2, Workflow } from 'lucide-react';
import { Button } from '@/components/ui/button';

const CreateSeason = () => {
  const { user } = useAuth();
  const { canCreateTournaments, currentRole } = useRole();
  const admin = useAdmin();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [hasOrganization, setHasOrganization] = useState(false);

  const canCreate = canCreateTournaments || admin.hasPermission('tournaments:create');
  const requestedMode = searchParams.get('mode');
  const creationMode = requestedMode === 'season' ? requestedMode : null;

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
              You must be signed in to create seasons.
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
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-emerald-600 to-emerald-800 rounded-xl flex items-center justify-center">
              <Workflow className="h-8 w-8 text-white" />
            </div>
            <div className="text-emerald-400 text-xl font-semibold mb-2">Player Mode</div>
            <div className="text-zinc-400 text-sm mb-4">
              You're currently in Player mode. Switch to Organizer mode to create seasons.
            </div>
            <div className="text-xs text-gray-500">
              As a player, you can join tournaments but not create seasons. Switch roles to access organizer features.
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
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
          <span className="text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  // No organization - show gate (skip for admins with tournament permissions)
  if (!hasOrganization && !admin.hasPermission('tournaments:create')) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col">
        {/* Background grid */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-15 brightness-100 contrast-150 mix-blend-overlay"></div>
        </div>

        <main className="relative z-10 flex-grow container mx-auto px-4 py-20">
          <div className="max-w-lg mx-auto text-center">
            {/* Icon */}
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-8">
              <Building2 className="h-12 w-12 text-amber-400" />
            </div>

            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Setup Your Organization First
            </h1>

            {/* Description */}
            <p className="text-zinc-400 text-lg mb-8 max-w-md mx-auto">
              Before you can host seasons, you need to create your organization.
              This will be your public brand that players will see.
            </p>

            {/* Benefits */}
            <div className="grid grid-cols-1 gap-3 mb-10 text-left max-w-sm mx-auto">
              {[
                'Your organization name appears on all seasons',
                'Build a recognizable esports brand',
                'Get a public profile page for your org',
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <Button
              onClick={() => navigate('/organizer/setup-organization')}
              className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-500/90 hover:to-rose-600/90 shadow-lg shadow-rose-500/25 gap-2"
            >
              Setup Organization
              <ArrowLeft className="h-5 w-5 rotate-180" />
            </Button>

            <p className="text-zinc-500 text-sm mt-6">
              Takes less than 2 minutes to complete
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* Background grid */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:80px_80px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-15 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      <main className="relative z-10 flex-grow">
        {!creationMode ? (
          <div className="flex min-h-screen flex-col bg-[#050505]">
            {/* Top strip */}
            <div className="flex items-center justify-center border-b border-white/[0.05] px-8 py-4">
              <p className="font-body text-[11px] font-medium uppercase tracking-[0.3em] text-zinc-400">
                Create season
              </p>
            </div>

            {/* Split panels */}
            <div className="flex flex-1 flex-col sm:flex-row">
              {/* Season Panel */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Create Season"
                onClick={() => setSearchParams({ mode: 'season' })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSearchParams({ mode: 'season' }); }
                }}
                className="relative flex flex-1 cursor-pointer flex-col items-center justify-center overflow-hidden border-r border-white/[0.04] last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                style={{
                  minHeight: 'calc(100dvh - 52px)',
                }}
              >
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-[#050505]/70" />
                <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/50 via-transparent to-[#050505]/80" />

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center px-8 py-16 text-center">
                  <div className="mb-7">
                    <Workflow className="h-7 w-7 text-emerald-400" />
                  </div>

                  <h2 className="font-heading text-[clamp(48px,6.5vw,84px)] font-bold leading-none tracking-[-0.045em] text-white">
                    Season
                  </h2>

                  <p className="font-body mt-5 max-w-[240px] text-[13px] leading-[1.7] text-zinc-400">
                    A series of connected tournaments with point standings.
                  </p>

                  {/* Reveal panel */}
                  <div className="mt-10 flex w-full max-w-[220px] flex-col items-center">
                    <ul className="w-full space-y-3 text-left">
                      {[
                        'Link multiple tournaments into a season',
                        'Track team standings across events',
                        'Set point rules and advancement criteria',
                      ].map((pt) => (
                        <li key={pt} className="flex items-start gap-2.5">
                          <span className="mt-[6px] h-[5px] w-[5px] shrink-0 rounded-full bg-emerald-400" />
                          <span className="font-body text-[12px] leading-[1.65] text-zinc-300">{pt}</span>
                        </li>
                      ))}
                    </ul>

                    <button className="mt-7 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-semibold transition-colors duration-150 bg-emerald-500 hover:bg-emerald-400 text-white">
                      Begin setup
                      <ArrowLeft className="h-3.5 w-3.5 rotate-180" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom strip */}
            <div className="border-t border-white/[0.05] px-8 py-3.5">
              <p className="font-body text-[11px] text-zinc-700">
                All game titles and participant formats supported.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
              <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-white/10 bg-[#0a0a0c] p-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
                    <Workflow className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-emerald-400">Season flow</p>
                    <h1 className="mt-1 text-2xl font-black tracking-tight">Create a season with tournaments</h1>
                    <p className="mt-2 text-sm text-zinc-400">
                      Set up a season to link multiple tournaments and track standings across events.
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  onClick={() => setSearchParams({})}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </div>
            </div>
            <SeasonWizard />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default CreateSeason;
