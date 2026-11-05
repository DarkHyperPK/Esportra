import type { SlatePlayer } from '../shared/slate';
import type { SwipeDirection } from '../shared/swipeMath';

/** The squad is you plus up to four teammates (a Valorant 5-stack). */
export const SQUAD_SIZE = 5;

export interface DemoState {
  deck: SlatePlayer[];
  likes: number;
  matched: SlatePlayer[];
  /** The match that just happened, shown until dismissed. */
  justMatched: SlatePlayer | null;
}

export type DemoAction =
  | { type: 'swipe'; id: string; direction: SwipeDirection }
  | { type: 'dismiss' }
  | { type: 'pick'; id: string }
  | { type: 'reset'; players: SlatePlayer[] };

export const initialDemoState = (players: SlatePlayer[]): DemoState => ({ deck: players, likes: 0, matched: [], justMatched: null });

/**
 * Sample matching: a player who already liked you matches at once; otherwise every third like matches,
 * so a visitor always sees what a match looks like within a few swipes.
 */
export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  if (action.type === 'reset') return initialDemoState(action.players);
  if (action.type === 'dismiss') return { ...state, justMatched: null };
  if (action.type === 'pick') {
    const picked = state.deck.find((item) => item.id === action.id);
    return picked ? { ...state, deck: [picked, ...state.deck.filter((item) => item.id !== action.id)] } : state;
  }
  const player = state.deck.find((item) => item.id === action.id);
  if (!player) return state;
  const deck = state.deck.filter((item) => item.id !== action.id);
  if (action.direction === 'left') return { ...state, deck };
  const likes = state.likes + 1;
  const squadFull = state.matched.length >= SQUAD_SIZE - 1;
  const matches = !squadFull && (player.likedYou === true || likes % 3 === 0);
  return {
    deck,
    likes,
    matched: matches ? [...state.matched, player] : state.matched,
    justMatched: matches ? player : state.justMatched,
  };
}
