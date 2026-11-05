import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { FEATURES, usePlatformFeatures } from '@/hooks/usePlatformFeatures';
import {
  useEndQueue, useQueueCards, useQueueMatches, useQueuePresence, useQueueStats, useQueueSwipe, useStartQueue,
} from '@/hooks/competitive/useLfgQueue';
import { LfgWorkspace } from '@/components/competitive/LfgWorkspace';
import { QueueDeck } from '@/components/competitive/queue/QueueDeck';
import { QueueMatchDialog } from '@/components/competitive/queue/QueueMatchDialog';
import { QueueMatches } from '@/components/competitive/queue/QueueMatches';
import { QueueStartPanel } from '@/components/competitive/queue/QueueStartPanel';
import { QueueSummary } from '@/components/competitive/queue/QueueSummary';
import { queueStartErrorMessage, queueSwipeErrorMessage } from '@/lib/lfgQueueErrors';
import type { QueueCard, QueueMatch, QueueStats } from '@/schemas/lfgQueue';
import '@/components/competitive/queue/queue.css';

interface MatchPrompt { match: QueueMatch; sessionEnded: boolean }

export default function LfgQueuePage() {
  const { user } = useAuth();
  const features = usePlatformFeatures();
  const enabled = !features.isLoading && features.isEnabled(FEATURES.lfgQueue);
  const presence = useQueuePresence(!!user && enabled);
  const active = presence.data?.active === true;
  const [wasActive, setWasActive] = useState(false);
  if (active && !wasActive) setWasActive(true);
  const ended = wasActive && presence.data?.active === false;

  const start = useStartQueue();
  const end = useEndQueue();
  const swipe = useQueueSwipe();
  const cards = useQueueCards(active);
  const matches = useQueueMatches(!!user && enabled);
  const savedStats = useQueueStats(ended);
  const [prompt, setPrompt] = useState<MatchPrompt | null>(null);
  const [leftStats, setLeftStats] = useState<QueueStats | null>(null);
  const [swipeError, setSwipeError] = useState('');

  function onSwipe(card: QueueCard, direction: 'right' | 'left') {
    setSwipeError('');
    swipe.mutate({ card, direction }, {
      onSuccess: (result) => { if (result?.matched && result.match) setPrompt({ match: result.match, sessionEnded: result.sessionEnded }); },
      onError: (error) => setSwipeError(queueSwipeErrorMessage(error)),
    });
  }

  function leave() {
    end.mutate(undefined, { onSuccess: (stats) => setLeftStats(stats) });
  }

  function restart() { setWasActive(false); setLeftStats(null); start.reset(); }

  function body() {
    if (!enabled) {
      return <div className="lfg-panel lfg-empty"><strong>Queue Now isn&apos;t available yet.</strong>Browse listings in the meantime.<Link className="lfg-button" to="/competitive/lfg">Browse listings</Link></div>;
    }
    if (presence.isLoading) return <div className="lfg-panel lfg-empty" aria-live="polite">Checking your queue status…</div>;
    if (ended) return <QueueSummary stats={leftStats ?? savedStats.data} onRestart={restart} />;
    if (!active) {
      return <QueueStartPanel pending={start.isPending} error={start.isError ? queueStartErrorMessage(start.error) : undefined}
        notice={presence.isError ? 'We could not check your queue status. You can still join.' : undefined} onStart={(input) => start.mutate(input)} />;
    }
    return <DeckView cards={cards.data} loading={cards.isLoading} error={cards.isError} busy={swipe.isPending} swipeError={swipeError}
      pendingLikes={presence.data?.pendingLikes ?? 0} leaving={end.isPending} onSwipe={onSwipe} onLeave={leave} onRetry={() => void cards.refetch()} />;
  }

  return (
    <LfgWorkspace>
      <header className="lfg-heading"><div><div className="lfg-eyebrow">Esportra / Queue now</div><h1>Find a duo right now.</h1><p>Swipe on ranked Valorant players in your region and rank. Match, then queue.</p></div></header>
      <div className="queue-shell">
        <div className="queue-layout">
          <div>{body()}</div>
          <QueueMatches matches={matches.data ?? []} />
        </div>
      </div>
      <QueueMatchDialog match={prompt?.match ?? null} sessionEnded={prompt?.sessionEnded ?? false} onClose={() => setPrompt(null)} />
    </LfgWorkspace>
  );
}

interface DeckViewProps {
  cards: QueueCard[] | undefined; loading: boolean; error: boolean; busy: boolean; swipeError: string;
  pendingLikes: number; leaving: boolean;
  onSwipe: (card: QueueCard, direction: 'right' | 'left') => void; onLeave: () => void; onRetry: () => void;
}

function DeckView({ cards, loading, error, busy, swipeError, pendingLikes, leaving, onSwipe, onLeave, onRetry }: DeckViewProps) {
  const top = cards?.[0];
  return (
    <section className="queue-deck-view" aria-label="Queue deck" style={{ display: 'grid', gap: 16 }}>
      <div className="queue-status">
        <span className="queue-muted" role="status">
          {pendingLikes > 0 ? `${pendingLikes} ${pendingLikes === 1 ? 'player liked' : 'players liked'} you` : 'You are in the queue'}
        </span>
        <button type="button" className="lfg-button" disabled={leaving} onClick={onLeave}>{leaving ? 'Leaving…' : 'Leave queue'}</button>
      </div>
      {swipeError && <p className="queue-error" role="alert">{swipeError}</p>}
      {loading && !top && <div className="lfg-panel lfg-empty" aria-live="polite">Finding players…</div>}
      {error && !top && <div className="lfg-panel lfg-empty"><strong>Players could not load.</strong><button type="button" className="lfg-button" onClick={onRetry}>Try again</button></div>}
      {!loading && !error && !top && <div className="lfg-panel lfg-empty" aria-live="polite"><strong>No one new right now.</strong>Stay on this page. We check for new players every few seconds.</div>}
      {top && <QueueDeck card={top} onSwipe={onSwipe} disabled={busy} />}
    </section>
  );
}
