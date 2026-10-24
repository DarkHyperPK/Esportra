import { useState } from 'react';

export function useProEventProof(initiallySubmitted = false) {
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(initiallySubmitted);
  const [error, setError] = useState<string | null>(null);
  const upload = async (file: File, id: string, accessToken: string) => {
    if (pending || submitted) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || file.size === 0) {
      setError('Choose a JPEG, PNG or WebP receipt under 5 MB.'); return;
    }
    setPending(true); setError(null);
    try {
      const data = new FormData(); data.set('proof', file);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/pro-event-requests/${id}/proof`, {
        method: 'POST', headers: { 'X-Pro-Request-Token': accessToken }, body: data,
      });
      const body: unknown = await response.json();
      if (!response.ok) throw new Error(body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' ? body.error : 'Proof could not be saved. Please retry.');
      if (!body || typeof body !== 'object' || !('status' in body) || body.status !== 'proof_submitted') throw new Error('The upload could not be confirmed. Please retry.');
      setSubmitted(true);
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Proof could not be saved.'); }
    finally { setPending(false); }
  };
  return { upload, pending, submitted, error };
}
