import { useRef } from 'react';
import { Check, X } from 'lucide-react';
import { CommandButton } from '@/components/management/CommandSurface';
import { SwipeStack, type SwipeStackHandle } from '../shared/SwipeStack';
import { PlayerSlate } from '../shared/PlayerSlate';
import { toSlatePlayer } from '@/lib/squadUpSlate';
import type { SquadUpCard } from '@/schemas/squadUp';

interface DuoPanelProps {
  cards: SquadUpCard[] | undefined;
  loading: boolean;
  error: boolean;
  busy: boolean;
  swipeError: string;
  pendingLikes: number;
  onSwipe: (card: SquadUpCard, direction: 'left' | 'right') => void;
  onReport: (card: SquadUpCard) => void;
  onRetry: () => void;
}

/** The live deck: compatible players, one at a time, swiped with a drag, the buttons or the arrow keys. */
export function DuoPanel({ cards, loading, error, busy, swipeError, pendingLikes, onSwipe, onReport, onRetry }: DuoPanelProps) {
  const stack = useRef<SwipeStackHandle>(null);
  const deck = cards ?? [];
  return (
    <section className="su-duo" aria-label="Players looking now">
      {pendingLikes > 0 && (
        <p className="su-likes" role="status"><span className="su-dot" aria-hidden /> {pendingLikes} {pendingLikes === 1 ? 'player wants' : 'players want'} to play with you. They're near the top of your deck.</p>
      )}
      {swipeError && <p className="su-error" role="alert">{swipeError}</p>}
      {deck.length > 0 ? (
        <>
          <SwipeStack ref={stack} items={deck} getId={(card) => card.userId} label="Players looking now" disabled={busy}
            renderCard={(card) => <PlayerSlate player={toSlatePlayer(card)} onReport={() => onReport(card)} />}
            onSwipe={onSwipe} />
          <div className="su-actions su-actions-live">
            <CommandButton variant="secondary" size="lg" disabled={busy} onClick={() => stack.current?.swipe('left')}><X size={18} aria-hidden /> Pass</CommandButton>
            <CommandButton variant="primary" size="lg" slide disabled={busy} onClick={() => stack.current?.swipe('right')}><Check size={18} aria-hidden /> Squad up</CommandButton>
          </div>
        </>
      ) : (
        <div className="su-empty">
          {loading ? <p role="status">Finding players…</p>
            : error ? <><p>Players could not load.</p><CommandButton variant="secondary" size="md" onClick={onRetry}>Try again</CommandButton></>
            : <><p><strong>No one new right now.</strong></p><p>Stay here: new players appear as they come online. Or open a lobby so players can find you.</p></>}
        </div>
      )}
    </section>
  );
}
