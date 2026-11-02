import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { DisputeEvidenceInput } from '../DisputeEvidenceInput';
import { validateEvidenceFile } from '@/hooks/competitive/useDisputeEvidenceUpload';

function Harness({ initial = [] as string[] }) {
  const [urls, setUrls] = useState(initial);
  return (
    <QueryClientProvider client={new QueryClient()}>
      <DisputeEvidenceInput sessionId="s" urls={urls} onChange={setUrls} />
    </QueryClientProvider>
  );
}

describe('DisputeEvidenceInput', () => {
  it('adds a pasted link and lists it', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Evidence link'), { target: { value: 'https://clips.test/a' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByRole('link', { name: 'https://clips.test/a' })).toBeInTheDocument();
    expect(screen.getByText('1/5 attached')).toBeInTheDocument();
  });

  it('refuses something that is not a web link', () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText('Evidence link'), { target: { value: 'javascript:alert(1)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText(/starting with https/)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Attached evidence' })).toBeNull();
  });

  it('removes an attached item', () => {
    render(<Harness initial={['https://clips.test/a']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove evidence 1' }));
    expect(screen.queryByRole('link', { name: 'https://clips.test/a' })).toBeNull();
  });

  it('stops adding at the limit', () => {
    render(<Harness initial={['https://a.test/1', 'https://a.test/2', 'https://a.test/3', 'https://a.test/4', 'https://a.test/5']} />);
    expect(screen.getByRole('button', { name: /Attach screenshot/ })).toBeDisabled();
    expect(screen.getByLabelText('Evidence link')).toBeDisabled();
  });
});

describe('validateEvidenceFile', () => {
  const file = (type: string, size: number) => new File([new Uint8Array(size)], 'x', { type });
  it('accepts a normal image', () => expect(validateEvidenceFile(file('image/png', 1000))).toBeNull());
  it('rejects other types', () => expect(validateEvidenceFile(file('application/pdf', 1000))).toMatch(/PNG, JPG or WebP/));
  it('rejects oversized images', () => expect(validateEvidenceFile(file('image/jpeg', 11 * 1024 * 1024))).toMatch(/10 MB/));
});
