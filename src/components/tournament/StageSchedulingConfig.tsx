import React from 'react';
import { useParams } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { ChoiceCard, ChoiceGroup, Field, CONTROL_CLASS, EYEBROW_CLASS } from '@/components/ui/kit';
import { CommandSegmentedButton } from '@/components/management/CommandSurface';
import { useMatchScheduling, type SchedulingConfig } from '@/hooks/useMatchScheduling';
import { useTournamentAccess } from '@/hooks/useTournamentAccess';
import { getTimezoneAbbr } from '@/lib/timeUtils';
import { isBattleRoyale } from '@/utils/gameFeatures';
import { cn } from '@/lib/utils';

interface StageSchedulingConfigProps {
  stageId: string;
  stageFormat: string;
  gameName?: string;
  onConfigChange?: (config: SchedulingConfig) => void;
}

const CHECKIN_MIN = 5;
const CHECKIN_MAX = 60;

/**
 * How matches in a stage start: who sets the time, the check-in window, and
 * (for organizer-run stages) whether times are set per round or per match.
 * Laid out as one horizontal band so it sits above the rounds, not beside them.
 */
const StageSchedulingConfig: React.FC<StageSchedulingConfigProps> = ({ stageId, stageFormat, gameName, onConfigChange }) => {
  const { slug } = useParams<{ slug: string }>();
  const { can, isLoading: accessLoading } = useTournamentAccess(slug);
  const canEdit = can('bracket:edit');
  const { schedulingConfig, updateConfig, isLoading } = useMatchScheduling(stageId);
  const isBR = gameName ? isBattleRoyale(gameName) : false;
  const hasDailyStart = stageFormat === 'swiss' || stageFormat === 'round_robin';

  const selfPlay = Boolean(schedulingConfig?.self_play_enabled ?? schedulingConfig?.selfPlayEnabled);
  const mode = schedulingConfig?.scheduling_mode ?? schedulingConfig?.schedulingMode ?? 'round_based';
  const savedCheckin = schedulingConfig?.checkin_window_minutes ?? schedulingConfig?.checkinWindowMinutes ?? 15;
  const savedDaily = schedulingConfig?.daily_start_time ?? schedulingConfig?.dailyStartTime ?? '20:00';

  // Text inputs commit on blur, not on every keystroke.
  const [checkinDraft, setCheckinDraft] = React.useState(String(savedCheckin));
  const [dailyDraft, setDailyDraft] = React.useState(savedDaily);
  React.useEffect(() => setCheckinDraft(String(savedCheckin)), [savedCheckin]);
  React.useEffect(() => setDailyDraft(savedDaily), [savedDaily]);

  const save = async (patch: Partial<SchedulingConfig>) => {
    if (!canEdit || !schedulingConfig) return;
    const next = { ...schedulingConfig, ...patch };
    try {
      await updateConfig.mutateAsync(next);
      onConfigChange?.(next);
    } catch {
      // useMatchScheduling rolls the cache back and shows the error toast.
    }
  };

  const commitCheckin = () => {
    const n = Math.round(Number(checkinDraft));
    const clamped = Number.isFinite(n) ? Math.min(CHECKIN_MAX, Math.max(CHECKIN_MIN, n)) : savedCheckin;
    setCheckinDraft(String(clamped));
    if (clamped !== savedCheckin) void save({ checkin_window_minutes: clamped });
  };

  if (isLoading || accessLoading || !schedulingConfig) {
    return (
      <div aria-busy="true" className="grid gap-3 px-5 py-6 sm:grid-cols-2 sm:px-6">
        <div className="h-20 bg-white/[0.04]" />
        <div className="h-20 bg-white/[0.04]" />
      </div>
    );
  }

  const checkinId = `checkin-${stageId}`;
  const dailyId = `daily-${stageId}`;

  return (
    <div className="space-y-6 px-5 py-6 sm:px-6">
      {!isBR && (
        <div className="space-y-3">
          <p className={EYEBROW_CLASS}>How matches start</p>
          <ChoiceGroup label="How matches start" columns={2}>
            <ChoiceCard
              selected={!selfPlay}
              disabled={!canEdit}
              onSelect={() => selfPlay && void save({ self_play_enabled: false })}
              title="You set the times"
              description="You pick when each round starts. Teams check in, then you share the lobby code."
            />
            <ChoiceCard
              selected={selfPlay}
              disabled={!canEdit}
              onSelect={() => !selfPlay && void save({ self_play_enabled: true })}
              title="Teams arrange their own"
              description="You set a deadline per round. Teams agree a time, check in and start the match themselves."
            />
          </ChoiceGroup>
        </div>
      )}

      <div className={cn('grid gap-6 sm:grid-cols-2', hasDailyStart ? 'lg:grid-cols-3' : 'lg:grid-cols-2')}>
        <Field label="Match check-in" htmlFor={checkinId} hint={`Opens this long before each match. ${CHECKIN_MIN}–${CHECKIN_MAX} minutes.`}>
          <div className="flex items-center gap-3">
            <Input
              id={checkinId}
              type="number"
              inputMode="numeric"
              min={CHECKIN_MIN}
              max={CHECKIN_MAX}
              disabled={!canEdit}
              value={checkinDraft}
              onChange={(e) => setCheckinDraft(e.target.value)}
              onBlur={commitCheckin}
              onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
              className={cn(CONTROL_CLASS, 'w-20 text-center font-mono tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none')}
            />
            <span className="text-sm text-zinc-400">minutes before start</span>
          </div>
        </Field>

        <Field
          label="Round timing"
          hint={
            selfPlay
              ? 'Teams play any time before the round deadline.'
              : mode === 'granular'
                ? 'Each match gets its own start time.'
                : 'Every match in a round starts together.'
          }
        >
          {selfPlay ? (
            <p className="flex h-11 items-center text-sm text-zinc-300">Deadline per round</p>
          ) : (
            <div role="radiogroup" aria-label="Round timing" className="flex h-11 items-center gap-2">
              {(['round_based', 'granular'] as const).map((m) => (
                <CommandSegmentedButton
                  key={m}
                  role="radio"
                  aria-checked={mode === m}
                  active={mode === m}
                  disabled={!canEdit}
                  onClick={() => mode !== m && void save({ scheduling_mode: m })}
                  className={mode === m ? 'bg-white text-matte-black' : undefined}
                >
                  {m === 'round_based' ? 'Per round' : 'Per match'}
                </CommandSegmentedButton>
              ))}
            </div>
          )}
        </Field>

        {hasDailyStart && (
          <Field label="Daily start" htmlFor={dailyId} hint="New rounds default to this time, one round per day.">
            <div className="flex items-center gap-3">
              <Input
                id={dailyId}
                type="time"
                disabled={!canEdit}
                value={dailyDraft}
                onChange={(e) => setDailyDraft(e.target.value)}
                onBlur={() => dailyDraft && dailyDraft !== savedDaily && void save({ daily_start_time: dailyDraft })}
                className={cn(CONTROL_CLASS, 'w-32 font-mono tabular-nums')}
              />
              <span className="font-mono text-xs text-zinc-500">{getTimezoneAbbr()}</span>
            </div>
          </Field>
        )}
      </div>
    </div>
  );
};

export default StageSchedulingConfig;
