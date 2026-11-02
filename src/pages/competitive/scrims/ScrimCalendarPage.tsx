import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { ScrimCalendarGrid } from '@/components/competitive/scrims/calendar/ScrimCalendarGrid';
import { ScrimCalendarList } from '@/components/competitive/scrims/calendar/ScrimCalendarList';
import { UnscheduledPanel } from '@/components/competitive/scrims/calendar/UnscheduledPanel';
import { useTeamScrimSessions } from '@/hooks/competitive/useScrims';
import { useMyTeamsSummary } from '@/hooks/useNavTeamStatus';
import { useNow } from '@/hooks/useNow';
import { buildMonthGrid, monthLabel, shiftMonth, unscheduledMatches, type CalendarSession } from '@/services/scrimCalendar';

interface TeamSummary {
  id: string;
  name: string;
}

const NAV_BUTTON =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.14] text-white/70 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40';

export default function ScrimCalendarPage() {
  const [params] = useSearchParams();
  const teams = (useMyTeamsSummary().data ?? []) as TeamSummary[];
  const teamId = params.get('team_id') ?? teams[0]?.id ?? '';
  const sessionsQuery = useTeamScrimSessions(teamId);
  const nowMs = useNow(60_000);
  const today = useMemo(() => new Date(nowMs), [nowMs]);
  const [month, setMonth] = useState(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }));

  const sessions = useMemo<CalendarSession[]>(
    () => (sessionsQuery.data ?? []).map((s) => ({
      id: s.id,
      status: s.status,
      scheduledAt: s.scheduledAt,
      opponentName: (s.team1Id === teamId ? s.team2Name : s.team1Name) ?? null,
    })),
    [sessionsQuery.data, teamId],
  );
  const weeks = useMemo(() => buildMonthGrid(month.year, month.month, sessions, today), [month, sessions, today]);
  const waiting = useMemo(() => unscheduledMatches(sessions), [sessions]);
  const monthHasMatches = weeks.flat().some((d) => d.inMonth && d.items.length > 0);
  const isCurrent = month.year === today.getFullYear() && month.month === today.getMonth();

  return (
    <CompetitivePageShell>
      <div className="mx-auto max-w-[1320px] space-y-6 px-4 pb-16 pt-6 lg:px-8 lg:pt-8">
        <header className="flex flex-col gap-4 border-b border-white/[0.08] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-[24px] font-bold leading-tight text-white">Calendar</h1>
            <p className="mt-1 text-[13px] text-zinc-400">Your accepted scrims. Times are in your local time.</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Previous month" onClick={() => setMonth((m) => shiftMonth(m, -1))} className={NAV_BUTTON}>
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <p className="min-w-[150px] text-center font-heading text-[16px] font-semibold text-white" aria-live="polite">{monthLabel(month)}</p>
            <button type="button" aria-label="Next month" onClick={() => setMonth((m) => shiftMonth(m, 1))} className={NAV_BUTTON}>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
            {!isCurrent && (
              <button
                type="button"
                onClick={() => setMonth({ year: today.getFullYear(), month: today.getMonth() })}
                className="ml-1 inline-flex h-9 items-center rounded-lg border border-white/[0.14] px-3 text-[13px] font-semibold text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                Today
              </button>
            )}
          </div>
        </header>

        {sessionsQuery.isError ? (
          <div className="space-y-3 rounded-xl border border-white/[0.08] p-5">
            <p className="text-[13px] text-zinc-400">Could not load your scrims. Check your connection and try again.</p>
            <button type="button" onClick={() => void sessionsQuery.refetch()} className="h-9 rounded-lg border border-white/[0.14] px-4 text-[13px] font-semibold text-white/80 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">Retry</button>
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
            <div className="min-w-0 space-y-4">
              {sessionsQuery.isLoading ? (
                <div className="h-[520px] animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.03]" aria-busy="true" aria-label="Loading calendar" />
              ) : (
                <>
                  <ScrimCalendarGrid weeks={weeks} />
                  <ScrimCalendarList weeks={weeks} />
                  {!monthHasMatches && (
                    <p className="rounded-xl border border-dashed border-white/[0.12] px-5 py-6 text-center text-[13px] text-zinc-400">
                      No scrims in {monthLabel(month)}. <Link to="/competitive/scrims" className="font-semibold text-white underline-offset-4 hover:underline">Find a scrim</Link>
                    </p>
                  )}
                </>
              )}
            </div>
            <UnscheduledPanel matches={waiting} />
          </div>
        )}
      </div>
    </CompetitivePageShell>
  );
}
