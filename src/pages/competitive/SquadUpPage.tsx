import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FEATURES, usePlatformFeatures } from '@/hooks/usePlatformFeatures';
import {
  useEndSquadUp, useSquadUpPresence, useSquadUpStats, useSquadUpStillHere, useStartSquadUp,
} from '@/hooks/competitive/useSquadUp';
import { useSquadUpPublicStats } from '@/hooks/competitive/useSquadUpPublicStats';
import { useSquadUpFilters } from '@/hooks/competitive/useSquadUpFilters';
import { useSquadUpIdle } from '@/hooks/competitive/useSquadUpIdle';
import { CommandButton } from '@/components/management/CommandSurface';
import { SquadUpLanding } from '@/components/squad-up/landing/SquadUpLanding';
import { SquadUpApp } from '@/components/squad-up/app/SquadUpApp';
import { SquadUpSetupSheet, type SetupValues } from '@/components/squad-up/app/SquadUpSetupSheet';
import { StillLookingDialog } from '@/components/squad-up/app/StillLookingDialog';
import { SquadUpSummary } from '@/components/competitive/squad-up/SquadUpSummary';
import { squadUpStartErrorMessage } from '@/lib/squadUpErrors';
import type { SquadUpStats } from '@/schemas/squadUp';

const SIGN_IN = `/auth/signin?redirect=${encodeURIComponent('/competitive/squad-up')}`;

/**
 * Squad Up. Everyone sees the public page and can try the demo. Signed-in players go live through the setup
 * sheet; while they're live (a Duo session or a hosted lobby) the page becomes the app.
 */
export default function SquadUpPage() {
  const { user, profile } = useAuth();
  const features = usePlatformFeatures();
  const enabled = !features.isLoading && features.isEnabled(FEATURES.squadUp);
  const ownCountry = profile?.country_code?.toUpperCase() ?? null;
  const { setup: lastSetup, filters, remember } = useSquadUpFilters(ownCountry);
  const stats = useSquadUpPublicStats(enabled);
  const presence = useSquadUpPresence(!!user && enabled);
  const inDuo = presence.data?.active === true;
  const live = inDuo || presence.data?.hostingLobby === true;
  const [wasInDuo, setWasInDuo] = useState(false);
  if (inDuo && !wasInDuo) setWasInDuo(true);
  const duoEnded = wasInDuo && !inDuo;

  const start = useStartSquadUp();
  const end = useEndSquadUp();
  const stillHere = useSquadUpStillHere();
  const endedStats = useSquadUpStats(duoEnded);
  const [setupOpen, setSetupOpen] = useState(false);
  const [leftStats, setLeftStats] = useState<SquadUpStats | null>(null);

  const ping = useCallback(() => { stillHere.mutate(); }, [stillHere]);
  const idle = useSquadUpIdle(live, ping);

  function goLive(values: SetupValues) {
    start.mutate({ ...values, note: values.note || undefined }, {
      onSuccess: () => { remember(values); setSetupOpen(false); setLeftStats(null); setWasInDuo(false); idle.markActive(true); },
    });
  }

  function leave() {
    end.mutate(undefined, { onSuccess: (summary) => { setLeftStats(summary); } });
  }

  const setup = (
    <SquadUpSetupSheet key={setupOpen ? 'open' : 'closed'} open={setupOpen} onOpenChange={setSetupOpen} initial={lastSetup}
      pending={start.isPending} error={start.isError ? squadUpStartErrorMessage(start.error) : undefined}
      submitLabel={inDuo ? 'Update and keep looking' : 'Go live'} onSubmit={goLive} />
  );

  if (user && enabled && (live || duoEnded)) {
    return (
      <>
        <SquadUpApp myId={user.id} filters={filters} inDuo={inDuo} pendingLikes={presence.data?.pendingLikes ?? 0}
          leaving={end.isPending} onEditFilters={() => setSetupOpen(true)} onLeave={leave} onActivity={() => idle.markActive(true)}
          duoEnded={<SquadUpSummary stats={leftStats ?? endedStats.data} onRestart={() => setSetupOpen(true)} />} />
        <StillLookingDialog open={idle.prompt && live} onStay={() => { stillHere.mutate(); idle.markActive(true); }} onLeave={leave} />
        {setup}
      </>
    );
  }

  const action = !enabled && !features.isLoading
    ? <CommandButton variant="primary" size="lg" disabled>Opening soon</CommandButton>
    : !user
      ? <CommandButton asChild variant="primary" size="lg" slide><Link to={SIGN_IN}>Sign in to start</Link></CommandButton>
      : <CommandButton variant="primary" size="lg" slide onClick={() => setSetupOpen(true)}>Start Squad Up</CommandButton>;

  return (
    <>
      <SquadUpLanding stats={stats.data} action={action} />
      {user && setup}
    </>
  );
}
