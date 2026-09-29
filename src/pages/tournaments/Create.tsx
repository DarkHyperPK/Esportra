import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useAdmin } from '@/hooks/useAdmin';
import { deriveHasOrganization, fetchMeRoles } from '@/lib/meRoles';
import Footer from '@/components/Footer';
import { Building2, LogIn, Repeat } from 'lucide-react';
import { WizardContainer } from '@/components/tournament/wizard';
import { QuickCreateFlow } from '@/components/tournament/quick-create';
import { CreateGateScreen } from '@/components/tournament/quick-create/CreateGateScreen';

const CreateTournament = () => {
  const { user } = useAuth();
  const { canCreateTournaments, currentRole } = useRole();
  const admin = useAdmin();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [hasOrganization, setHasOrganization] = useState(false);

  const canCreate = canCreateTournaments || admin.hasPermission('tournaments:create');
  const mode = searchParams.get('mode');

  // Check if user has an organization
  useEffect(() => {
    const checkOrganization = async () => {
      if (!user?.id || (currentRole !== 'organizer' && !admin.hasPermission('tournaments:create'))) {
        setLoading(false);
        return;
      }
      try {
        const roles = await fetchMeRoles();
        setHasOrganization(deriveHasOrganization(roles));
      } catch {
        setHasOrganization(false);
      } finally {
        setLoading(false);
      }
    };
    checkOrganization();
  }, [user?.id, currentRole, admin]);

  const gate = (content: React.ReactNode) => (
    <div className="flex min-h-screen flex-col bg-transparent text-white">
      <main className="flex-grow">{content}</main>
      <Footer />
    </div>
  );

  if (!user) {
    return gate(
      <CreateGateScreen
        icon={<LogIn className="h-6 w-6" aria-hidden />}
        eyebrow="New tournament"
        title="Sign in to create a tournament"
        description="Tournaments belong to an organizer account, so we know who runs them and who gets paid."
        actionLabel="Sign in"
        onAction={() => navigate('/auth/signin')}
      />,
    );
  }

  if (!canCreate) {
    return gate(
      <CreateGateScreen
        icon={<Repeat className="h-6 w-6" aria-hidden />}
        eyebrow="Player mode"
        title="Switch to organizer mode"
        description="You're browsing as a player. Players join teams and tournaments; organizers create and run them. Switch roles from the account menu in the top bar."
      />,
    );
  }

  if (loading) {
    return gate(
      <div className="mx-auto w-full max-w-5xl px-4 py-16" aria-busy="true" aria-label="Loading">
        <div className="h-3 w-32 animate-pulse bg-white/[0.04]" />
        <div className="mt-4 h-10 w-2/3 animate-pulse bg-white/[0.04]" />
        <div className="mt-10 grid gap-3 md:grid-cols-2">
          <div className="h-72 animate-pulse bg-white/[0.04]" />
          <div className="h-72 animate-pulse bg-white/[0.04]" />
        </div>
      </div>,
    );
  }

  if (!hasOrganization && !admin.hasPermission('tournaments:create')) {
    return gate(
      <CreateGateScreen
        icon={<Building2 className="h-6 w-6" aria-hidden />}
        eyebrow="One step first"
        title="Set up your organization"
        description="Every tournament runs under an organization. It's the name players see on your events and your public profile."
        points={['Your name and logo on every tournament', 'A public page players can follow', 'Staff you add can help run every event']}
        actionLabel="Set up organization"
        onAction={() => navigate('/organizer/setup-organization')}
        footnote="Takes about 2 minutes."
      />,
    );
  }

  // ── Advanced mode → existing wizard (unchanged) ────────────────────────────
  if (mode === 'advanced') {
    return (
      <div className="min-h-screen bg-transparent text-white flex flex-col">
        <main className="flex-grow">
          <WizardContainer />
        </main>
        <Footer />
      </div>
    );
  }

  // ── Quick Create flow (entry → game-select → quick-form) ──────────────────
  return (
    <div className="min-h-screen bg-transparent text-white flex flex-col">
      <main className="flex-grow w-full">
        <QuickCreateFlow />
      </main>
      <Footer />
    </div>
  );
};

export default CreateTournament;
