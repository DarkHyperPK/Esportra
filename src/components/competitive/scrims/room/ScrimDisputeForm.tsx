import { useState } from 'react';
import { InlineNotice } from '@/components/ui/kit';
import { useOpenDispute } from '@/hooks/competitive/useScrims';
import { getApiErrorMessage } from '@/lib/apiClient';
import { ROOM_EYEBROW, ROOM_GHOST } from './roomStyles';

export function ScrimDisputeForm({ sessionId, myTeamId, onCancel }: { sessionId: string; myTeamId: string | null; onCancel: () => void }) {
  const dispute = useOpenDispute(sessionId);
  const [reason, setReason] = useState('');

  async function submit() {
    if (!myTeamId || !reason.trim()) return;
    try { await dispute.mutateAsync({ raisedByTeamId: myTeamId, reason: reason.trim() }); }
    catch { /* shown via dispute.isError */ }
  }

  return (
    <div className="space-y-3">
      <p className={ROOM_EYEBROW}>Raise Dispute</p>
      <div className="space-y-1">
        <label htmlFor="dreason" className="block text-[13px] text-white/70">Reason</label>
        <textarea id="dreason" rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} aria-required="true" placeholder="Describe the dispute…" className="w-full border border-white/10 bg-black/30 px-3 py-2 text-[14px] text-white focus:outline-none focus:border-white/30 transition-colors resize-none" />
        <p className="text-[11px] text-white/25 text-right">{reason.length}/1000</p>
      </div>
      {dispute.isError && <InlineNotice tone="critical">{getApiErrorMessage(dispute.error, 'Could not raise dispute. Try again.')}</InlineNotice>}
      <div className="flex gap-3">
        <button onClick={onCancel} className={ROOM_GHOST}>Cancel</button>
        <button onClick={submit} disabled={dispute.isPending || !reason.trim()} className="bg-white text-black hover:bg-zinc-200 disabled:opacity-50  text-[13px] px-4 py-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
          {dispute.isPending ? 'Submitting…' : 'Raise dispute'}
        </button>
      </div>
    </div>
  );
}
