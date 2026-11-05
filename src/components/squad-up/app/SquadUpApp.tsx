import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { CommandButton } from '@/components/management/CommandSurface';
import { announceSquadUpMatch } from '@/hooks/competitive/squadUpPopups';
import { useSquadUpCards, useSquadUpMatches, useSquadUpSwipe } from '@/hooks/competitive/useSquadUp';
import type { ReportTarget } from '@/hooks/competitive/useSquadUpReport';
import { areaLabel } from '@/lib/countryAreas';
import { squadUpSwipeErrorMessage } from '@/lib/squadUpErrors';
import type { SquadUpCard, SquadUpFilters } from '@/schemas/squadUp';
import { SquadUpMatches } from '@/components/competitive/squad-up/SquadUpMatches';
import { SquadUpSafetyPanel } from '@/components/competitive/squad-up/SquadUpSafetyPanel';
import { SquadUpReportDialog } from '@/components/competitive/squad-up/SquadUpReportDialog';
import { LobbyPanel } from '../lobby/LobbyPanel';
import { DuoPanel } from './DuoPanel';
import '../shared/squad-up-shared.css';
import './app.css';

type Tab = 'duo' | 'lobby' | 'matches';

interface SquadUpAppProps {
  myId?: string | null;
  /** Null only if this browser forgot the setup while the player is live; lobby browsing then waits for Edit. */
  filters: SquadUpFilters | null;
  inDuo: boolean;
  pendingLikes: number;
  /** Shown in the Duo column when the Duo session has ended (for example when every slot filled). */
  duoEnded: React.ReactNode;
  leaving: boolean;
  onEditFilters: () => void;
  onLeave: () => void;
  onActivity: () => void;
}

/** Live Squad Up: Duo deck, lobbies and matches. Three columns on desktop; one tab at a time on phones. */
export function SquadUpApp({ myId, filters, inDuo, pendingLikes, duoEnded, leaving, onEditFilters, onLeave, onActivity }: SquadUpAppProps) {
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get('view') === 'lobby' ? 'lobby' : params.get('view') === 'matches' ? 'matches' : 'duo');
  const cards = useSquadUpCards(inDuo);
  const matches = useSquadUpMatches(true);
  const swipe = useSquadUpSwipe();
  const [swipeError, setSwipeError] = useState('');
  const [reporting, setReporting] = useState<ReportTarget | null>(null);

  function onSwipe(card: SquadUpCard, direction: 'left' | 'right') {
    setSwipeError('');
    onActivity();
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

  const summary = filters
    ? [filters.mode === 'competitive' ? 'Competitive' : 'Unrated', filters.areas.map(areaLabel).join(', '), filters.mode === 'competitive' ? 'Near my rank' : null]
      .filter(Boolean).join(', ')
    : '';
  const matchCount = matches.data?.length ?? 0;

  return (
    <div className="su-app">
      <header className="su-app-bar">
        <div className="su-app-title">
          <span className="su-dot" aria-hidden />
          <h1>Squad Up</h1>
          <span className="su-hint">{summary}</span>
        </div>
        <div className="su-row">
          <CommandButton variant="ghost" size="sm" onClick={onEditFilters}><SlidersHorizontal size={14} aria-hidden /> Edit</CommandButton>
          <CommandButton variant="secondary" size="sm" disabled={leaving} onClick={onLeave}>{leaving ? 'Leaving…' : 'Leave'}</CommandButton>
        </div>
      </header>
      <div className="su-app-tabs" role="tablist" aria-label="Squad Up sections">
        {([['duo', 'Duo'], ['lobby', 'Lobbies'], ['matches', `Matches${matchCount ? ` (${matchCount})` : ''}`]] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} aria-controls={`su-col-${id}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <div className="su-app-grid" data-tab={tab}>
        <section id="su-col-lobby" className="su-col su-col-lobby" aria-label="Lobbies"><h2 className="su-col-title">Lobbies</h2><LobbyPanel filters={filters} myId={myId} /></section>
        <section id="su-col-duo" className="su-col su-col-duo" aria-label="Duo">
          {inDuo ? (
            <DuoPanel cards={cards.data} loading={cards.isLoading} error={cards.isError} busy={swipe.isPending} swipeError={swipeError}
              pendingLikes={pendingLikes} onSwipe={onSwipe} onRetry={() => void cards.refetch()}
              onReport={(card) => setReporting({ userId: card.userId, username: card.username })} />
          ) : duoEnded}
        </section>
        <aside id="su-col-matches" className="su-col su-col-matches" aria-label="Matches and reports">
          <SquadUpMatches matches={matches.data ?? []}
            onReport={(match) => setReporting({ userId: match.matchedUserId, username: match.matchedUsername, matchId: match.matchId })} />
          <SquadUpSafetyPanel enabled />
        </aside>
      </div>
      <SquadUpReportDialog target={reporting} onClose={() => setReporting(null)} />
    </div>
  );
}
