import React from 'react';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DisputeIdStripProps {
  disputeId: string;
  matchId?: string | null;
  riotMatchIds?: string[];
}

/** Compact row of all copyable IDs for quick reference */
const DisputeIdStrip: React.FC<DisputeIdStripProps> = ({ disputeId, matchId, riotMatchIds }) => {
  const { toast } = useToast();

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: `${label} copied` });
  };

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800/60">
      <IdChip label="Dispute" value={disputeId} onCopy={() => copy(disputeId, 'Dispute ID')} />
      {matchId && <IdChip label="Match" value={matchId} onCopy={() => copy(matchId, 'Match ID')} />}
      {riotMatchIds?.map((rid, i) => (
        <IdChip key={rid} label={riotMatchIds.length > 1 ? `Riot #${i + 1}` : 'Riot'} value={rid} onCopy={() => copy(rid, 'Riot Match ID')} />
      ))}
    </div>
  );
};

const IdChip: React.FC<{ label: string; value: string; onCopy: () => void }> = ({ label, value, onCopy }) => (
  <div className="flex items-center gap-1.5 group">
    <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold">{label}</span>
    <code className="text-[11px] font-mono text-zinc-300 bg-zinc-800/80 px-1.5 py-0.5 rounded max-w-[160px] truncate">
      {value}
    </code>
    <button
      onClick={onCopy}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-white text-zinc-500"
    >
      <Copy className="w-3 h-3" />
    </button>
  </div>
);

export default DisputeIdStrip;
