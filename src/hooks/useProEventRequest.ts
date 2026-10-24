import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/apiClient';
import { proEventDetailsSchema, proEventReceiptSchema, type ProEventDetails, type ProEventReceipt } from '@/schemas/proEventRequest';

export function useProEventRequest() {
  const [receipt, setReceipt] = useState<ProEventReceipt | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef<{ fingerprint: string; id: string; accessToken: string } | null>(null);
  const busy = useRef(false);
  const [restoredDetails, setRestoredDetails] = useState<ProEventDetails | null>(null);
  const [invoiceStatus, setInvoiceStatus] = useState('pending');
  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        const stored: unknown = JSON.parse(sessionStorage.getItem('esportra.pro-request') || 'null');
        if (!stored || typeof stored !== 'object' || !('id' in stored) || !('accessToken' in stored)
          || typeof stored.id !== 'string' || typeof stored.accessToken !== 'string'
          || !/^[a-f0-9-]{36}$/i.test(stored.id) || !/^[a-f0-9]{64}$/i.test(stored.accessToken)) return;
        setPending(true);
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/pro-event-requests/${stored.id}`, { headers: { 'X-Pro-Request-Token': stored.accessToken } });
        if (!response.ok) { if (response.status === 404) sessionStorage.removeItem('esportra.pro-request'); throw new Error('Your saved invoice could not be restored. Please retry or use its reference to contact our team.'); }
        const body: unknown = await response.json();
        if (!body || typeof body !== 'object' || !('receipt' in body) || !('details' in body)) throw new Error('Invalid saved invoice.');
        const saved = proEventReceiptSchema.parse(body.receipt);
        const details = proEventDetailsSchema.parse(body.details);
        if (active) {
          request.current = { id: stored.id, accessToken: stored.accessToken, fingerprint: JSON.stringify(details) };
          setReceipt(saved); setRestoredDetails(details);
          setInvoiceStatus('proofSubmitted' in body && body.proofSubmitted === true ? 'proof_submitted' : 'status' in body && typeof body.status === 'string' ? body.status : 'pending');
        }
      } catch (cause) { if (active) setError(cause instanceof Error ? cause.message : 'Unable to restore your invoice.'); }
      finally { if (active) setPending(false); }
    };
    void restore(); return () => { active = false; };
  }, []);
  const submit = async (details: ProEventDetails) => {
    if (busy.current) return;
    const parsed = proEventDetailsSchema.safeParse(details);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check the event details.'); return; }
    const fingerprint = JSON.stringify(parsed.data);
    if (!request.current || request.current.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID(), accessToken: Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('') };
    busy.current = true; setPending(true); setError(null);
    try {
      try { sessionStorage.setItem('esportra.pro-request', JSON.stringify({ id: request.current.id, accessToken: request.current.accessToken })); } catch { /* The active page can still retry if storage is disabled. */ }
      const result = await apiClient.post<unknown>('/api/pro-event-requests', { ...parsed.data, requestId: request.current.id, accessToken: request.current.accessToken });
      setReceipt(proEventReceiptSchema.parse(result));
      setInvoiceStatus('pending');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your request could not be saved. Please try again.');
    } finally { busy.current = false; setPending(false); }
  };
  const reset = () => { if (!busy.current) { setReceipt(null); setError(null); setRestoredDetails(null); request.current = null; setInvoiceStatus('pending'); try { sessionStorage.removeItem('esportra.pro-request'); } catch { /* Storage may be disabled. */ } } };
  return { receipt, pending, error, submit, requestAccess: request.current, restoredDetails, invoiceStatus, markProofSubmitted: () => setInvoiceStatus('proof_submitted'), reset };
}
