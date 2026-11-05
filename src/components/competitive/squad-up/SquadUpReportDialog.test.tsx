import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/apiClient';
import { SquadUpReportDialog } from './SquadUpReportDialog';

const upload = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase', () => ({ supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } } }));
vi.mock('@/lib/apiClient', async (original) => ({
  ...(await original<typeof import('@/lib/apiClient')>()),
  apiClient: { upload, get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));

const target = { userId: 'u2', username: 'Ace', matchId: 'm1' };
function mount() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const onClose = vi.fn();
  render(<QueryClientProvider client={client}><SquadUpReportDialog target={target} onClose={onClose} /></QueryClientProvider>);
  return { onClose };
}
const png = (name = 'proof.png', size = 100) => new File([new Uint8Array(size)], name, { type: 'image/png' });

describe('SquadUpReportDialog', () => {
  beforeEach(() => {
    upload.mockReset();
    // jsdom has no object URLs; the picker only needs a string to preview.
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
  });

  it('asks for a reason before sending anything', async () => {
    mount();
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose what happened.');
    expect(upload).not.toHaveBeenCalled();
  });

  it('requires details for "Something else" and an https proof link', async () => {
    mount();
    fireEvent.click(screen.getByLabelText('Something else'));
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('at least 10 characters');
    fireEvent.click(screen.getByLabelText('Harassment or toxic behavior'));
    fireEvent.change(screen.getByPlaceholderText('https://'), { target: { value: 'http://clip.test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('https://');
  });

  it('sends one multipart request with the fields, the match and the screenshots, hiding the player by default', async () => {
    upload.mockResolvedValue({ id: 'r1' });
    mount();
    fireEvent.click(screen.getByLabelText('Cheating or boosting'));
    fireEvent.change(screen.getByPlaceholderText(/What did they say or do/), { target: { value: 'Aimbot in ranked' } });
    fireEvent.change(screen.getByLabelText('Choose screenshots'), { target: { files: [png('a.png'), png('b.png')] } });
    expect(screen.getAllByRole('img')).toHaveLength(2);
    expect(screen.getByLabelText('Also hide this player from me')).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));

    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    const [path, body] = upload.mock.calls[0] as [string, FormData];
    expect(path).toBe('/api/competitive/lfg/swipe/reports');
    expect(body.get('reported_user_id')).toBe('u2');
    expect(body.get('reason')).toBe('cheating');
    expect(body.get('hide_player')).toBe('true');
    expect(body.get('match_id')).toBe('m1');
    expect(body.getAll('files')).toHaveLength(2);
    expect(await screen.findByText('Report sent')).toBeInTheDocument();
  });

  it('rejects non-images and more than five screenshots before upload', async () => {
    mount();
    const input = screen.getByLabelText('Choose screenshots');
    fireEvent.change(input, { target: { files: [new File(['x'], 'clip.gif', { type: 'image/gif' })] } });
    expect(await screen.findByRole('alert')).toHaveTextContent('PNG, JPG or WebP');
    fireEvent.change(input, { target: { files: Array.from({ length: 6 }, (_, i) => png(`${i}.png`)) } });
    expect(await screen.findByRole('alert')).toHaveTextContent('up to 5');
    expect(screen.queryAllByRole('img')).toHaveLength(0);
  });

  it('explains server refusals in plain words', async () => {
    upload.mockRejectedValue(new ApiError(409, { error: 'ALREADY_REPORTED' }, 'conflict'));
    mount();
    fireEvent.click(screen.getByLabelText('Spam or scam'));
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('already reported this player');
  });
});
