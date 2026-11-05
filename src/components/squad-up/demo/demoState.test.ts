import { describe, expect, it } from 'vitest';
import { demoReducer, initialDemoState, SQUAD_SIZE } from './demoState';
import type { SlatePlayer } from '../shared/slate';

const player = (id: string, likedYou = false): SlatePlayer => ({ id, name: id, mode: 'competitive', agents: [], mic: true, needs: 1, likedYou });

describe('Squad Up demo', () => {
  it('passing removes the card without a match', () => {
    const state = demoReducer(initialDemoState([player('a'), player('b')]), { type: 'swipe', id: 'a', direction: 'left' });
    expect(state.deck.map((p) => p.id)).toEqual(['b']);
    expect(state.matched).toHaveLength(0);
  });

  it('matches on the third like so every visitor sees a match', () => {
    let state = initialDemoState([player('a'), player('b'), player('c')]);
    state = demoReducer(state, { type: 'swipe', id: 'a', direction: 'right' });
    state = demoReducer(state, { type: 'swipe', id: 'b', direction: 'right' });
    expect(state.justMatched).toBeNull();
    state = demoReducer(state, { type: 'swipe', id: 'c', direction: 'right' });
    expect(state.justMatched?.id).toBe('c');
    expect(state.matched.map((p) => p.id)).toEqual(['c']);
  });

  it('matches at once with a player who already liked you, and dismissing keeps them in the squad', () => {
    let state = demoReducer(initialDemoState([player('a', true)]), { type: 'swipe', id: 'a', direction: 'right' });
    expect(state.justMatched?.id).toBe('a');
    state = demoReducer(state, { type: 'dismiss' });
    expect(state.justMatched).toBeNull();
    expect(state.matched).toHaveLength(1);
  });

  it('stops matching when the squad of five is full, and reset starts over', () => {
    const players = Array.from({ length: 6 }, (_, i) => player(`p${i}`, true));
    let state = initialDemoState(players);
    for (const p of players) state = demoReducer(state, { type: 'swipe', id: p.id, direction: 'right' });
    expect(state.matched).toHaveLength(SQUAD_SIZE - 1);
    state = demoReducer(state, { type: 'reset', players });
    expect(state.deck).toHaveLength(6);
    expect(state.matched).toHaveLength(0);
  });

  it('ignores a swipe on a card that is no longer in the deck', () => {
    const state = initialDemoState([player('a')]);
    expect(demoReducer(state, { type: 'swipe', id: 'zzz', direction: 'right' })).toBe(state);
  });

  it('brings a picked player to the top of the deck without changing anything else', () => {
    const state = initialDemoState([player('a'), player('b'), player('c')]);
    const next = demoReducer(state, { type: 'pick', id: 'c' });
    expect(next.deck.map((p) => p.id)).toEqual(['c', 'a', 'b']);
    expect(demoReducer(state, { type: 'pick', id: 'zz' })).toBe(state);
  });
});
