import React from 'react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getVetoActionClasses } from './vetoActionPresentation';
import type { VetoStepDraft } from '@/types/veto';

interface VetoStepRowProps {
  index: number;
  step: VetoStepDraft;
  isDecider: boolean;
  team1Name: string;
  team2Name: string;
  onChange: (patch: Partial<Omit<VetoStepDraft, 'actionNumber'>>) => void;
  disabled?: boolean;
}

const ACTION_OPTIONS: { value: VetoStepDraft['action']; label: string }[] = [
  { value: 'ban', label: 'Ban' },
  { value: 'pick', label: 'Pick' },
  { value: 'pick_side', label: 'Pick Side' },
  { value: 'ignore', label: 'Ignore (Auto)' },
];

export const VetoStepRow: React.FC<VetoStepRowProps> = ({
  step,
  isDecider,
  team1Name,
  team2Name,
  onChange,
  disabled = false,
}) => {
  const showTeamSelect = step.action !== 'ignore' && !(step.action === 'pick_side' && isDecider);
  const showDeciderBadge = step.action === 'pick_side' && isDecider;
  const showSpacer = step.action === 'ignore';

  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0">
      <div
        className={cn(
          'h-7 w-7 shrink-0 flex items-center justify-center rounded-lg font-black text-xs',
          getVetoActionClasses(step.action),
        )}
      >
        {step.actionNumber}.
      </div>

      <Select
        disabled={disabled}
        value={step.action}
        onValueChange={(v) => {
          const newAction = v as VetoStepDraft['action'];
          onChange(
            newAction === 'ignore'
              ? { action: 'ignore', team: 'T1' }
              : { action: newAction },
          );
        }}
      >
        <SelectTrigger className="h-8 flex-1 min-w-0 text-xs border-white/10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ACTION_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showTeamSelect && (
        <Select
          disabled={disabled}
          value={step.team}
          onValueChange={(v) => onChange({ team: v as VetoStepDraft['team'] })}
        >
          <SelectTrigger className="h-8 w-[90px] shrink-0 text-xs border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="T1">{team1Name}</SelectItem>
            <SelectItem value="T2">{team2Name}</SelectItem>
          </SelectContent>
        </Select>
      )}

      {showDeciderBadge && (
        <span className="rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[9px] font-black px-1.5 py-0.5 uppercase tracking-widest w-[90px] shrink-0 flex items-center justify-center">
          Decider
        </span>
      )}

      {showSpacer && <div className="w-[90px] shrink-0" />}
    </div>
  );
};
