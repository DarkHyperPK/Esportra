import React, { useCallback, useMemo, useState } from 'react';
import { addDays, format, isWithinInterval, parseISO } from 'date-fns';
import { Input } from '@/components/ui/input';
import { CommandButton } from '@/components/management/CommandSurface';
import { CONTROL_CLASS, EYEBROW_CLASS, Field, InlineNotice } from '@/components/ui/kit';
import { useMatchScheduling } from '@/hooks/useMatchScheduling';
import { cn } from '@/lib/utils';
import {
  getTimezoneAbbr, utcToLocalDate, utcToLocalTime, localDateTimeToUTC, dateInputToUTCEndOfDay,
  getTournamentScheduleDateBounds, isInvalidTournamentDateWindow, toUtcIsoString,
} from '@/lib/timeUtils';
import { BRACKET_SECTION_LABELS, formatWhen, getRoundName } from './schedule/roundNaming';
import { RoundRow, type RoundState } from './schedule/RoundRow';
import { MatchTimeList, type SchedulableMatch } from './schedule/MatchTimeList';

interface RoundSchedulingPanelProps {
  stageId: string;
  stageFormat: string;
  tournamentStartDate: string | null;
  tournamentEndDate: string | null;
  /** Fallback only: the live value is read from the stage's scheduling config. */
  selfPlayEnabled: boolean;
  /** Kept for callers; saves update caches directly, so no refetch is needed. */
  onScheduleApplied?: () => void;
}

interface RoundConfig {
  deadline: string | null;
  startTime: string | null;
}

type StageMatch = SchedulableMatch & { round_index: number; bracket_type?: string | null };

const SECTION_ORDER = ['winners', 'losers', 'final'];

const RoundSchedulingPanel: React.FC<RoundSchedulingPanelProps> = ({
  stageId, stageFormat, tournamentStartDate, tournamentEndDate, selfPlayEnabled: selfPlayFallback,
}) => {
  const { matches, schedulingConfig, updateConfig, isLoading, updateMatchTime } = useMatchScheduling(stageId);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [roundConfigs, setRoundConfigs] = useState<Map<string, RoundConfig>>(new Map());
  const [matchEdits, setMatchEdits] = useState<Map<string, string>>(new Map());
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const isDE = stageFormat === 'double_elimination';
  const selfPlay = Boolean(schedulingConfig?.self_play_enabled ?? schedulingConfig?.selfPlayEnabled ?? selfPlayFallback);
  const mode = selfPlay ? 'round_based' : (schedulingConfig?.scheduling_mode ?? schedulingConfig?.schedulingMode ?? 'round_based');

  const serverDeadlines = useMemo<Record<string, string>>(() => ({
    ...(schedulingConfig?.roundDeadlines ?? {}),
    ...(schedulingConfig?.round_deadlines ?? {}),
  }), [schedulingConfig]);

  const bounds = useMemo(() => getTournamentScheduleDateBounds(tournamentStartDate, tournamentEndDate), [tournamentStartDate, tournamentEndDate]);
  const invalidWindow = bounds.isInvalidWindow || isInvalidTournamentDateWindow(tournamentStartDate, tournamentEndDate);

  const keyFor = useCallback((roundIndex: number, bracket?: string | null) =>
    (isDE && bracket ? `${bracket}_${roundIndex}` : String(roundIndex)), [isDE]);

  const typedMatches = useMemo(() => (matches ?? []) as StageMatch[], [matches]);

  const matchesByKey = useMemo(() => {
    const grouped = new Map<string, StageMatch[]>();
    typedMatches.forEach((m) => {
      const k = keyFor(m.round_index, isDE ? (m.bracket_type || 'winners') : null);
      grouped.set(k, [...(grouped.get(k) ?? []), m]);
    });
    return grouped;
  }, [typedMatches, keyFor, isDE]);

  // Rounds grouped into sections: one section for most formats, upper/lower/final for double elimination.
  const sections = useMemo(() => {
    const bySection = new Map<string, Map<number, StageMatch[]>>();
    typedMatches.forEach((m) => {
      const s = isDE ? (m.bracket_type || 'winners') : 'all';
      const rounds = bySection.get(s) ?? new Map<number, StageMatch[]>();
      rounds.set(m.round_index, [...(rounds.get(m.round_index) ?? []), m]);
      bySection.set(s, rounds);
    });
    const order = isDE ? SECTION_ORDER : ['all'];
    return order.filter((s) => bySection.has(s)).map((s) => ({
      key: s,
      label: BRACKET_SECTION_LABELS[s] ?? null,
      rounds: [...bySection.get(s)!.entries()].sort(([a], [b]) => a - b),
    }));
  }, [typedMatches, isDE]);

  // Sync rows from the server; rows with unsaved edits are left alone.
  React.useEffect(() => {
    if (matchesByKey.size === 0 || (selfPlay && !schedulingConfig)) return;
    setRoundConfigs((prev) => {
      const next = new Map(prev);
      matchesByKey.forEach((roundMatches, k) => {
        if (dirtyKeys.has(k)) return;
        const existing = roundMatches[0]?.scheduled_time ? toUtcIsoString(roundMatches[0].scheduled_time) : null;
        next.set(k, {
          deadline: selfPlay ? serverDeadlines[k] || existing : existing,
          startTime: selfPlay ? null : existing,
        });
      });
      return next;
    });
  }, [matchesByKey, selfPlay, schedulingConfig, serverDeadlines, dirtyKeys]);

  const defaultDeadline = (roundIndex: number): string => {
    if (!tournamentStartDate) return '';
    const d = addDays(parseISO(tournamentStartDate), roundIndex);
    d.setHours(23, 59, 0, 0);
    return d.toISOString();
  };

  const inWindow = (iso: string): boolean => {
    if (!iso) return true;
    if (invalidWindow) return !bounds.minDate || iso >= bounds.minDate;
    if (!tournamentStartDate || !tournamentEndDate) return true;
    try {
      return isWithinInterval(parseISO(iso), { start: parseISO(tournamentStartDate), end: parseISO(tournamentEndDate) });
    } catch {
      return false;
    }
  };

  const setRound = (k: string, patch: Partial<RoundConfig>) => {
    setDirtyKeys((prev) => new Set(prev).add(k));
    setRoundConfigs((prev) => new Map(prev).set(k, { deadline: null, startTime: null, ...prev.get(k), ...patch }));
  };

  const clearDirty = (k: string) => setDirtyKeys((prev) => { const n = new Set(prev); n.delete(k); return n; });

  const saveRound = async (k: string, roundIndex: number) => {
    const cfg = roundConfigs.get(k);
    if (!cfg) return;
    setSaving(true);
    try {
      if (selfPlay) {
        const deadlines = { ...serverDeadlines, [k]: cfg.deadline || defaultDeadline(roundIndex) };
        await updateConfig.mutateAsync({ ...(schedulingConfig ?? {}), round_deadlines: deadlines, roundDeadlines: deadlines });
      } else {
        await Promise.all((matchesByKey.get(k) ?? []).map((m) => updateMatchTime.mutateAsync({ matchId: m.id, scheduledTime: cfg.startTime })));
      }
      clearDirty(k);
    } catch {
      // The scheduling hook rolls back and shows the error toast; the row stays "Unsaved".
    } finally {
      setSaving(false);
    }
  };

  const saveMatch = async (matchId: string) => {
    const time = matchEdits.get(matchId);
    if (!time) return;
    setSaving(true);
    try {
      await updateMatchTime.mutateAsync({ matchId, scheduledTime: time });
      setMatchEdits((prev) => { const n = new Map(prev); n.delete(matchId); return n; });
    } catch {
      // Error toast comes from the hook; the edit stays so it can be retried.
    } finally {
      setSaving(false);
    }
  };

  const describe = (k: string, roundMatches: StageMatch[]): { state: RoundState; when: string | null } => {
    const cfg = roundConfigs.get(k);
    if (mode === 'granular') {
      const timed = roundMatches.filter((m) => m.scheduled_time).length;
      const unsaved = roundMatches.some((m) => matchEdits.has(m.id));
      const first = roundMatches.map((m) => m.scheduled_time).filter(Boolean).sort()[0] ?? null;
      return {
        state: unsaved ? 'unsaved' : timed === 0 ? 'unset' : timed < roundMatches.length ? 'partial' : 'set',
        when: timed === 0 ? null : timed < roundMatches.length ? `${timed} of ${roundMatches.length} timed` : `From ${formatWhen(first)}`,
      };
    }
    const value = selfPlay ? cfg?.deadline : cfg?.startTime;
    const when = selfPlay ? (value ? `Due ${formatWhen(value, false)}` : null) : formatWhen(value);
    return { state: dirtyKeys.has(k) ? 'unsaved' : value ? 'set' : 'unset', when };
  };

  const renderEditor = (k: string, roundIndex: number, roundMatches: StageMatch[]) => {
    const cfg = roundConfigs.get(k);
    if (mode === 'granular') {
      return (
        <MatchTimeList
          matches={roundMatches}
          edits={matchEdits}
          saving={saving}
          onEdit={(id, v) => setMatchEdits((prev) => new Map(prev).set(id, v))}
          onSave={saveMatch}
        />
      );
    }
    const dateId = `round-date-${stageId}-${k}`;
    const timeId = `round-time-${stageId}-${k}`;
    const dateValue = cfg?.deadline ? utcToLocalDate(cfg.deadline) : cfg?.startTime ? utcToLocalDate(cfg.startTime) : '';
    const outOfWindow = selfPlay ? cfg?.deadline && !inWindow(cfg.deadline) : cfg?.startTime && !inWindow(cfg.startTime);
    const canSave = dirtyKeys.has(k) && (selfPlay ? Boolean(cfg?.deadline) : true);

    const onDate = (v: string) => {
      if (selfPlay) return setRound(k, { deadline: v ? dateInputToUTCEndOfDay(v) : '' });
      setRound(k, { deadline: v ? dateInputToUTCEndOfDay(v) : '', ...(v && cfg?.startTime ? { startTime: localDateTimeToUTC(v, utcToLocalTime(cfg.startTime)) } : {}) });
    };
    const onTime = (v: string) => {
      if (!v) return setRound(k, { startTime: '' });
      const day = dateValue || utcToLocalDate(defaultDeadline(roundIndex) || new Date().toISOString());
      setRound(k, { startTime: localDateTimeToUTC(day, v) });
    };

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field label={selfPlay ? 'Deadline' : 'Day'} htmlFor={dateId} className="w-full sm:w-48">
            <Input id={dateId} type="date" value={dateValue} min={bounds.minDate} max={bounds.maxDate || undefined}
              onChange={(e) => onDate(e.target.value)} className={cn(CONTROL_CLASS, 'font-mono text-[13px]')} />
          </Field>
          {!selfPlay && (
            <Field label="Start time" htmlFor={timeId} className="w-full sm:w-36">
              <Input id={timeId} type="time" value={cfg?.startTime ? utcToLocalTime(cfg.startTime) : ''}
                onChange={(e) => onTime(e.target.value)} className={cn(CONTROL_CLASS, 'font-mono text-[13px]')} />
            </Field>
          )}
          <CommandButton variant={canSave ? 'primary' : 'ghost'} slide={canSave} disabled={saving || !canSave}
            onClick={() => saveRound(k, roundIndex)} className="w-full sm:w-auto">
            {saving && canSave ? 'Saving' : canSave || !(selfPlay ? cfg?.deadline : cfg?.startTime) ? 'Save round' : 'Saved'}
          </CommandButton>
        </div>
        <p className={cn('text-xs', outOfWindow ? 'text-amber-300' : 'text-zinc-500')}>
          {outOfWindow
            ? 'This is outside the tournament dates. Teams will still see it, but check it’s right.'
            : selfPlay
              ? `Teams have until 11:59 PM (${getTimezoneAbbr()}) that day to play.`
              : `All ${roundMatches.length} match${roundMatches.length === 1 ? '' : 'es'} start together (${getTimezoneAbbr()}).`}
        </p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div aria-busy="true" className="space-y-px px-5 pb-6 sm:px-6">
        {[0, 1, 2].map((i) => <div key={i} className="h-14 bg-white/[0.03]" />)}
      </div>
    );
  }

  const allKeys = [...matchesByKey.entries()];
  const setCount = allKeys.filter(([k, ms]) => describe(k, ms).state === 'set').length;
  const windowLabel = tournamentStartDate
    ? `${format(parseISO(tournamentStartDate), 'MMM d')}${tournamentEndDate ? ` – ${format(parseISO(tournamentEndDate), 'MMM d, yyyy')}` : ''}`
    : null;

  return (
    <div className="px-5 pb-6 sm:px-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div className="flex items-baseline gap-3">
          <p className={EYEBROW_CLASS}>Rounds</p>
          {allKeys.length > 0 && (
            <p className="font-mono text-xs tabular-nums text-zinc-400">
              <span className={setCount === allKeys.length ? 'text-emerald-300' : 'text-white'}>{setCount}</span> of {allKeys.length} scheduled
            </p>
          )}
        </div>
        {windowLabel && <p className="text-xs text-zinc-500">Event dates <span className="text-zinc-300">{windowLabel}</span> · {getTimezoneAbbr()}</p>}
      </div>

      {invalidWindow && (
        <InlineNotice tone="warning" className="mb-3">
          The tournament ends before it starts. Fix the dates in Basic info; until then, any day from the start date can be picked.
        </InlineNotice>
      )}

      {allKeys.length === 0 ? (
        <div className="border border-dashed border-white/10 px-5 py-8 text-center">
          <p className="text-sm font-medium text-white">No rounds yet</p>
          <p className="mt-1 text-xs text-zinc-500">Rounds appear here once the bracket for this stage is generated.</p>
        </div>
      ) : (
        <div className="border border-white/[0.07]">
          {sections.map((section) => (
            <div key={section.key}>
              {section.label && (
                <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-5 py-2 sm:px-6">
                  <p className={EYEBROW_CLASS}>{section.label}</p>
                  <p className="font-mono text-[11px] text-zinc-500">{section.rounds.length} round{section.rounds.length === 1 ? '' : 's'}</p>
                </div>
              )}
              {section.rounds.map(([roundIndex, roundMatches], i) => {
                const k = keyFor(roundIndex, isDE ? section.key : null);
                const name = section.key === 'final'
                  ? 'Grand final'
                  : getRoundName(stageFormat, roundIndex, section.rounds.length, section.key === 'losers');
                const { state, when } = describe(k, roundMatches);
                const rowId = `${section.key}_${roundIndex}`;
                return (
                  <RoundRow
                    key={rowId}
                    number={i + 1}
                    name={name}
                    matchCount={roundMatches.length}
                    when={when}
                    state={state}
                    expanded={expanded === rowId}
                    onToggle={() => setExpanded((cur) => (cur === rowId ? null : rowId))}
                  >
                    {renderEditor(k, roundIndex, roundMatches)}
                  </RoundRow>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoundSchedulingPanel;
