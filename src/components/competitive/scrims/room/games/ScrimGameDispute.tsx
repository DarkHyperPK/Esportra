import { useState } from 'react';
import { InlineNotice } from '@/components/ui/kit';
import { useDisputeScrimGame } from '@/hooks/competitive/useScrimGames';
import { getApiErrorMessage } from '@/lib/apiClient';
import { ROOM_GHOST } from '../roomStyles';

interface Props {
  sessionId: string;
  gameNumber: number;
  myTeamId: string;
  onClose: () => void;
}

/** Disputes one map. The other maps can still be played while staff rule on it. */
export function ScrimGameDispute({ sessionId, gameNumber, myTeamId, onClose }: Props) {
  const dispute = useDisputeScrimGame(sessionId);
  const [reason, setReason] = useState('');

  async function submit() {
    if (!reason.trim()) return;
    try {
      await dispute.mutateAsync({ gameNumber, raisedByTeamId: myTeamId, reason: reason.trim() });
      onClose();
    } catch { /* shown below */ }
  }

  return (
    <div className="space-y-3 rounded-lg border border-white/10 bg-black/30 p-4">
      <label htmlFor={`dispute-${gameNumber}`} className="block text-[13px] text-white/70">
        What is wrong with game {gameNumber}?
      </label>
      <textarea
        id={`dispute-${gameNumber}`}
        rows={3}
        maxLength={1000}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Wrong score, wrong map, wrong players…"
        className="w-full resize-none border border-white/10 bg-black/30 px-3 py-2 text-[14px] text-white focus:border-white/30 focus:outline-none"
      />
      {dispute.isError && (
        <InlineNotice tone="critical">{getApiErrorMessage(dispute.error, 'Could not open the dispute. Try again.')}</InlineNotice>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className={ROOM_GHOST}>Cancel</button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={dispute.isPending || !reason.trim()}
          className="min-h-[36px] rounded-lg bg-white px-4 text-[13px] font-semibold text-black hover:bg-zinc-200 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          {dispute.isPending ? 'Sending…' : 'Dispute this map'}
        </button>
      </div>
    </div>
  );
}
