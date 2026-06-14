import React from 'react';
import { Search, Swords, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MatchRoomActionListProps {
  vetoEnabled: boolean;
  canOpenVeto: boolean;
  manualReportDisabled: boolean;
  manualReportLabel: string;
  assistedAction?: React.ReactNode;
  onOpenVeto: () => void;
  onManualReport: () => void;
}

export const MatchRoomActionList: React.FC<MatchRoomActionListProps> = ({
  vetoEnabled,
  canOpenVeto,
  manualReportDisabled,
  manualReportLabel,
  assistedAction,
  onOpenVeto,
  onManualReport,
}) => {
  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-zinc-500">
        Match actions
      </p>

      {vetoEnabled ? (
        <ActionRow
          eyebrow="Map veto"
          title="Open veto room"
          description={canOpenVeto ? 'Draft the map sequence with your opponent.' : 'Available once the match is live.'}
          icon={<Swords className="h-4 w-4" />}
          disabled={!canOpenVeto}
          onClick={onOpenVeto}
        />
      ) : null}

      <ActionRow
        eyebrow="Result upload"
        title={manualReportLabel}
        description="Use manual report when automated matching is not available."
        icon={<Trophy className="h-4 w-4" />}
        disabled={manualReportDisabled}
        onClick={onManualReport}
        accent
      />

      {assistedAction ? (
        <div className="rounded-none border border-white/10 bg-white/[0.02] p-4">
          <div className="mb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
              Assisted result
            </p>
            <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-white">
              <Search className="h-4 w-4 text-rose-300" />
              Auto-fetch match result
            </p>
          </div>
          {assistedAction}
        </div>
      ) : null}
    </div>
  );
};

function ActionRow({
  eyebrow,
  title,
  description,
  icon,
  disabled,
  accent,
  onClick,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  disabled?: boolean;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="group flex w-full items-center gap-3 border border-white/10 bg-white/[0.02] p-4 text-left transition-colors hover:border-white/20 hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-45"
    >
      <span className={`shrink-0 ${accent ? 'text-rose-300' : 'text-zinc-400'}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">{eyebrow}</p>
        <p className="mt-1 text-sm font-semibold text-white">{title}</p>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </div>
      <button type="button"
        asChild
        className="pointer-events-none h-9 shrink-0 rounded-none bg-zinc-900 px-4 font-mono text-[10px] uppercase tracking-[0.2em] text-white hover:bg-zinc-800"
      >
        <span>{disabled ? 'Locked' : 'Open'}</span>
      </button>
    </button>
  );
}
