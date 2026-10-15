import { render, screen, cleanup } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RundownPublication } from '../RundownPublication';
const state = vi.hoisted(() => ({ data: undefined as unknown }));
vi.mock('@/hooks/useRundownPublication', () => ({ useRundownPublication: () => ({ data: state.data, isLoading: false }) }));
afterEach(cleanup);
describe('rundown publication evidence', () => {
  it('distinguishes pending, older and stale node reports from publication', () => {
    state.data = { version: 3, nodes: [
      { id: 'a', name: 'Desk A', seenAt: new Date().toISOString(), plan: { version: 2, pendingVersion: 3 } },
      { id: 'b', name: 'Desk B', seenAt: new Date().toISOString(), plan: { version: 1 } },
      { id: 'c', name: 'Desk C', seenAt: new Date(Date.now() - 60000).toISOString(), plan: { version: 3 } },
    ] };
    render(<RundownPublication showId="show" />);
    expect(screen.getByText('Desk A · v2 · v3 waiting')).toBeInTheDocument();
    expect(screen.getByText('Desk B · v1 · older version')).toBeInTheDocument();
    expect(screen.getByText('Desk C · last report stale · verify on desktop')).toBeInTheDocument();
  });
  it('never treats a successful send as a receipt when no node reports exist', () => {
    state.data = { version: 1, nodes: [] }; render(<RundownPublication showId="show" />);
    expect(screen.getByText(/Sending does not confirm receipt/)).toBeInTheDocument();
  });
});
