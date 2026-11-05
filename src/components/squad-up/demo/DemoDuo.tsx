import { useRef, type Dispatch } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';
import { CommandButton } from '@/components/management/CommandSurface';
import { SwipeStack, type SwipeStackHandle } from '../shared/SwipeStack';
import { SquadUpPlayerCard } from '../shared/SquadUpPlayerCard';
import { LobbyRail } from '../shared/LobbyRail';
import type { SlatePlayer } from '../shared/slate';
import { SQUAD_SIZE, type DemoAction, type DemoState } from './demoState';
import { DemoMatch } from './DemoMatch';

interface DemoDuoProps {
  state: DemoState;
  dispatch: Dispatch<DemoAction>;
  players: SlatePlayer[];
}

/** The sample Duo deck: swipe sample players, see a match, watch your squad fill. No network calls. */
export function DemoDuo({ state, dispatch, players }: DemoDuoProps) {
  const stack = useRef<SwipeStackHandle>(null);
  const slots = [{ name: 'You', you: true }, ...state.matched.map((p) => ({ name: p.name, avatarUrl: p.avatarUrl, role: p.roles?.[0] }))];
  const rail = Array.from({ length: SQUAD_SIZE }, (_, i) => slots[i] ?? null);
  const blocked = !!state.justMatched;

  return (
    <div className="su-demo-duo">
      <div className="su-demo-stage">
        {state.deck.length > 0 ? (
          <SwipeStack ref={stack} items={state.deck} getId={(p) => p.id} label="Sample players"
            renderCard={(p) => <SquadUpPlayerCard player={p} />} onSwipe={(p, direction) => dispatch({ type: 'swipe', id: p.id, direction })}
            disabled={blocked} />
        ) : (
          <div className="su-demo-empty">
            <p>You've seen every sample player here.</p>
            <CommandButton variant="secondary" size="md" onClick={() => dispatch({ type: 'reset', players })}>
              <RotateCcw size={14} aria-hidden /> Run it again
            </CommandButton>
          </div>
        )}
        {state.justMatched && <DemoMatch player={state.justMatched} onClose={() => dispatch({ type: 'dismiss' })} />}
      </div>
      {state.deck.length > 0 && (
        <div className="su-actions su-demo-actions">
          <CommandButton variant="secondary" size="lg" disabled={blocked} onClick={() => stack.current?.swipe('left')}>
            <X size={18} aria-hidden /> Pass
          </CommandButton>
          <CommandButton variant="primary" size="lg" slide disabled={blocked} onClick={() => stack.current?.swipe('right')}>
            <Check size={18} aria-hidden /> Squad up
          </CommandButton>
        </div>
      )}
      <div className="su-demo-rail">
        <p className="su-caption">Your squad {state.matched.length + 1}/{SQUAD_SIZE}</p>
        <LobbyRail slots={rail} label="Your squad" />
      </div>
    </div>
  );
}
