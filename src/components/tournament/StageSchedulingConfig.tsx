import React from 'react';
import { Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMatchScheduling } from '@/hooks/useMatchScheduling';
import { useTournamentAccess } from '@/hooks/useTournamentAccess';
import { useParams } from 'react-router-dom';
import { getTimezoneAbbr } from '@/lib/timeUtils';
import { isBattleRoyale } from '@/utils/gameFeatures';

interface StageSchedulingConfigProps {
  stageId: string;
  stageFormat: string;
  gameName?: string;
  onConfigChange?: (config: any) => void;
}

const FORMAT_INFO: Record<string, { label: string; description: string; roundsNote: string }> = {
  single_elimination: {
    label: 'Single Elimination',
    description: 'One loss and you\'re out.',
    roundsNote: 'Rounds halve each stage — 8 teams → 4 → 2 → 1.',
  },
  double_elimination: {
    label: 'Double Elimination',
    description: 'Winners and losers brackets — teams get a second chance.',
    roundsNote: 'Upper and lower bracket rounds run in parallel.',
  },
  swiss: {
    label: 'Swiss',
    description: 'Fixed rounds; teams with similar records play each other.',
    roundsNote: 'All matches in each round happen simultaneously.',
  },
  round_robin: {
    label: 'Round Robin',
    description: 'Every team plays every other team.',
    roundsNote: 'Multiple matchdays — each team plays once per round.',
  },
};

const SELF_PLAY_STEPS = [
  'Set a deadline for each round.',
  'Teams chat to agree on a time within the deadline.',
  'Both teams check in when ready.',
  'Team 1 generates a party code to start the match.',
];

const ORGANIZER_STEPS = [
  'Set specific start times for each round.',
  'Teams check in at the scheduled time.',
  'Organizer provides party codes to start matches.',
];

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-default">
          <Info className="h-3 w-3 text-zinc-600 hover:text-zinc-400 transition-colors" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] border-white/10 bg-[#0d0d0f] text-[11px] text-zinc-300">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

const StageSchedulingConfig: React.FC<StageSchedulingConfigProps> = ({
  stageId,
  stageFormat,
  gameName,
  onConfigChange,
}) => {
  const { slug } = useParams<{ slug: string }>();
  const { can, isLoading: accessLoading } = useTournamentAccess(slug);
  const canEdit = can('bracket:edit');
  const { schedulingConfig, updateConfig, isLoading } = useMatchScheduling(stageId);
  const formatData = FORMAT_INFO[stageFormat] || FORMAT_INFO.single_elimination;
  const [optimisticSelfPlay, setOptimisticSelfPlay] = React.useState<boolean | null>(null);
  const isBR = gameName ? isBattleRoyale(gameName) : false;
  const isSelfPlayEnabled =
    optimisticSelfPlay !== null
      ? optimisticSelfPlay
      : Boolean(schedulingConfig?.self_play_enabled ?? schedulingConfig?.selfPlayEnabled);

  const handleUpdate = async (key: string, value: any) => {
    if (!canEdit) return;
    if (key === 'self_play_enabled') setOptimisticSelfPlay(value);
    const newConfig = { ...schedulingConfig, [key]: value };
    try {
      await updateConfig.mutateAsync(newConfig);
      onConfigChange?.(newConfig);
    } catch {
      if (key === 'self_play_enabled') setOptimisticSelfPlay(null);
    }
  };

  if (isLoading || accessLoading || !schedulingConfig) {
    return (
      <div className="space-y-2 px-4 py-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-1/2 bg-white/[0.04]" />
          <div className="h-10 bg-white/[0.04]" />
          <div className="h-10 bg-white/[0.04]" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div>
        {/* Header */}
        <div className="border-b border-white/[0.08] bg-white/[0.025] px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-widest text-white">Match Settings</p>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {/* Format */}
          <div className="flex items-center gap-2 px-4 py-2.5">
            <span className="text-sm font-semibold text-zinc-300">{formatData.label}</span>
            <InfoTip text={`${formatData.description} ${formatData.roundsNote}`} />
          </div>

          {/* Self-Play Mode */}
          {!isBR && (
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-white">Self-Play Mode</span>
                <InfoTip text="Teams coordinate and start matches themselves within a set deadline." />
              </div>
              <Switch
                checked={isSelfPlayEnabled}
                disabled={!canEdit}
                onCheckedChange={(checked) => handleUpdate('self_play_enabled', checked)}
                className="data-[state=checked]:bg-rose-500"
              />
            </div>
          )}

          {/* Match Check-In */}
          <div className="px-4 py-2.5">
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="text-sm font-medium text-white">Match Check-In</span>
              <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-rose-400/70">Required</span>
              <InfoTip text="Teams must check in before their match starts. The window opens this many minutes before the scheduled time." />
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={5}
                max={60}
                disabled={!canEdit}
                value={schedulingConfig.checkin_window_minutes || 15}
                onChange={(e) => handleUpdate('checkin_window_minutes', parseInt(e.target.value) || 15)}
                className="w-16 border-white/10 bg-transparent text-center text-white focus:border-rose-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
              />
              <span className="text-sm text-zinc-500">min before match</span>
            </div>
          </div>

          {/* Daily Start Time (Swiss + Round Robin only) */}
          {(stageFormat === 'swiss' || stageFormat === 'round_robin') && (
            <div className="px-4 py-2.5">
              <div className="flex items-center gap-1.5 mb-2.5">
                <span className="text-sm font-medium text-white">Daily Start Time</span>
                <InfoTip text="Default time each day's round begins. Auto-applied when new rounds are generated — one round per day." />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  disabled={!canEdit}
                  value={schedulingConfig.daily_start_time || '20:00'}
                  onChange={(e) => handleUpdate('daily_start_time', e.target.value)}
                  className="w-28 border-white/10 bg-transparent text-center text-white focus:border-rose-500 [color-scheme:dark]"
                />
                <span className="text-xs text-zinc-500">{getTimezoneAbbr()}</span>
              </div>
            </div>
          )}

          {/* How it works — compact, only shown when relevant */}
          <div className="px-4 py-2.5">
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.25em] text-rose-500/60">How It Works</p>
            <ol className="space-y-1">
              {(isSelfPlayEnabled ? SELF_PLAY_STEPS : ORGANIZER_STEPS).map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-zinc-500">
                  <span className="shrink-0 font-bold text-zinc-600">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default StageSchedulingConfig;
