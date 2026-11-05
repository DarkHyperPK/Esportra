import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { announceSquadUpMatch } from '@/hooks/competitive/squadUpPopups';
import { FEATURES, usePlatformFeatures } from '@/hooks/usePlatformFeatures';
import {
  useEndSquadUp, useSquadUpCards, useSquadUpMatches, useSquadUpPresence, useSquadUpStats, useSquadUpSwipe, useStartSquadUp,
} from '@/hooks/competitive/useSquadUp';
import { LfgWorkspace } from '@/components/competitive/LfgWorkspace';
import { SquadUpDeck } from '@/components/competitive/squad-up/SquadUpDeck';
import { SquadUpMatches } from '@/components/competitive/squad-up/SquadUpMatches';
import { SquadUpStartPanel } from '@/components/competitive/squad-up/SquadUpStartPanel';
import { SquadUpSummary } from '@/components/competitive/squad-up/SquadUpSummary';
import { squadUpStartErrorMessage, squadUpSwipeErrorMessage } from '@/lib/squadUpErrors';
import type { SquadUpCard, SquadUpStats } from '@/schemas/squadUp';
import '@/components/competitive/squad-up/squad-up.css';

export default function SquadUpPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const features = usePlatformFeatures();
  const enabled = !features.isLoading && features.isEnabled(FEATURES.squadUp);
  const presence = useSquadUpPresence(!!user && enabled);
  const active = presence.data?.active === true;
  const [wasActive, setWasActive] = useState(false);
  if (active && !wasActive) setWasActive(true);
  const ended = wasActive && presence.data?.active === false;

  const start = useStartSquadUp();
  const end = useEndSquadUp();
  const swipe = useSquadUpSwipe();
  const cards = useSquadUpCards(active);
  const matches = useSquadUpMatches(!!user && enabled);
  const savedStats = useSquadUpStats(ended);
  const [leftStats, setLeftStats] = useState<SquadUpStats | null>(null);
  const [swipeError, setSwipeError] = useState('');

  function onSwipe(card: SquadUpCard, direction: 'right' | 'left') {
    setSwipeError('');
    swipe.mutate({ card, direction }, {
      onSuccess: (result) => {
        if (!result?.matched || !result.match) return;
        announceSquadUpMatch(qc, {
          matchId: result.match.matchId, conversationId: result.match.conversationId ?? null, title: "It's a match!",
          message: `You and ${result.match.matchedUsername} want to squad up.`, sessionEnded: result.sessionEnded, details: result.match,
        });
      },
      onError: (error) => setSwipeError(squadUpSwipeErrorMessage(error)),
    });
  }

  function leave() {
    end.mutate(undefined, { onSuccess: (stats) => setLeftStats(stats) });
  }

  function restart() { setWasActive(false); setLeftStats(null); start.reset(); }

  function body() {
    if (!enabled) {
      return <div className="lfg-panel lfg-empty"><strong>Squad Up isn&apos;t available yet.</strong>Browse listings in the meantime.<Link className="lfg-button" to="/competitive/lfg">Browse listings</Link></div>;
    }
    if (presence.isLoading) return <div className="lfg-panel lfg-empty" aria-live="polite">Checking your Squad Up status…</div>;
    if (ended) return <SquadUpSummary stats={leftStats ?? savedStats.data} onRestart={restart} />;
    if (!active) {
      return <SquadUpStartPanel pending={start.isPending} error={start.isError ? squadUpStartErrorMessage(start.error) : undefined}
        notice={presence.isError ? 'We could not check your Squad Up status. You can still start.' : undefined} onStart={(input) => start.mutate(input)} />;
    }
    return <DeckView cards={cards.data} loading={cards.isLoading} error={cards.isError} busy={swipe.isPending} swipeError={swipeError}
      pendingLikes={presence.data?.pendingLikes ?? 0} leaving={end.isPending} onSwipe={onSwipe} onLeave={leave} onRetry={() => void cards.refetch()} />;
  }

  return (
    <LfgWorkspace>
      <header className="lfg-heading"><div><div className="lfg-eyebrow">Esportra / Squad Up</div><h1>Find teammates right now.</h1><p>Swipe on ranked Valorant players in your region and rank. Match, then squadUp.</p></div></header>
      <div className="squad-shell">
        <div className="squad-layout">
          <div>{body()}</div>
          <SquadUpMatches matches={matches.data ?? []} />
        </div>
      </div>
    </LfgWorkspace>
  );
}

interface DeckViewProps {
  cards: SquadUpCard[] | undefined; loading: boolean; error: boolean; busy: boolean; swipeError: string;
  pendingLikes: number; leaving: boolean;
  onSwipe: (card: SquadUpCard, direction: 'right' | 'left') => void; onLeave: () => void; onRetry: () => void;
}

function DeckView({ cards, loading, error, busy, swipeError, pendingLikes, leaving, onSwipe, onLeave, onRetry }: DeckViewProps) {
  const top = cards?.[0];
  return (
    <section className="squad-deck-view" aria-label="Squad Up deck" style={{ display: 'grid', gap: 16 }}>
      <div className="squad-status">
        <span className="squad-muted" role="status">
          {pendingLikes > 0 ? `${pendingLikes} ${pendingLikes === 1 ? 'player liked' : 'players liked'} you` : 'You are live in Squad Up'}
        </span>
        <button type="button" className="lfg-button" disabled={leaving} onClick={onLeave}>{leaving ? 'Leaving…' : 'Leave Squad Up'}</button>
      </div>
      {swipeError && <p className="squad-error" role="alert">{swipeError}</p>}
      {loading && !top && <div className="lfg-panel lfg-empty" aria-live="polite">Finding players…</div>}
      {error && !top && <div className="lfg-panel lfg-empty"><strong>Players could not load.</strong><button type="button" className="lfg-button" onClick={onRetry}>Try again</button></div>}
      {!loading && !error && !top && <div className="lfg-panel lfg-empty" aria-live="polite"><strong>No one new right now.</strong>Stay on this page. We check for new players every few seconds.</div>}
      {top && <SquadUpDeck card={top} onSwipe={onSwipe} disabled={busy} />}
    </section>
  );
}
