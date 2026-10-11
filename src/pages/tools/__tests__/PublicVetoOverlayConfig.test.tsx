import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicVetoOverlayConfig } from '../PublicVetoOverlayConfig';
beforeEach(() => { localStorage.clear(); });
describe('host overlay configuration', () => {
  it('updates URL immediately and copies exactly the current selections', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    render(<PublicVetoOverlayConfig token="token" />);
    fireEvent.change(screen.getByLabelText('Transition'), { target: { value: 'none' } });
    fireEvent.click(screen.getByRole('switch', { name: 'Transparent background' }));
    const input = screen.getByLabelText<HTMLInputElement>('Overlay URL');
    expect(input.value).toContain('transition=none&theme=broadcast&transparent=1');
    fireEvent.click(screen.getByRole('button', { name: 'Copy overlay link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(input.value));
    expect(await screen.findByRole('button', { name: 'Link copied' })).toBeInTheDocument();
  });
  it('shows clipboard failure while keeping the selectable URL and retry available', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    render(<PublicVetoOverlayConfig token="token" />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy overlay link' }));
    expect(await screen.findByText("Couldn't copy the link. Select the URL and copy it manually.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy overlay link' })).toBeEnabled();
  });
});
