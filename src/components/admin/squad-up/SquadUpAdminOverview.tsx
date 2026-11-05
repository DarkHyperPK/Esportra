import { Loader2 } from 'lucide-react';
import { InlineNotice } from '@/components/ui/kit';
import {
  useEndSquadUpSessionAdmin, useSquadUpAdminMatches, useSquadUpAdminSessions,
} from '@/hooks/competitive/useSquadUpAdmin';
import type { AdminOverview } from '@/schemas/squadUpAdmin';
import { SquadUpAdminStats } from './SquadUpAdminStats';
import { SquadUpAdminSessions } from './SquadUpAdminSessions';
import { SquadUpAdminMatches } from './SquadUpAdminMatches';

const RANGES = [7, 14, 30, 90] as const;

interface SquadUpAdminOverviewProps {
  overview: { data?: AdminOverview; isLoading: boolean; isError: boolean };
  days: number;
  onDaysChange: (days: number) => void;
  canManage: boolean;
}

export function SquadUpAdminOverview({ overview, days, onDaysChange, canManage }: SquadUpAdminOverviewProps) {
  const sessions = useSquadUpAdminSessions();
  const matches = useSquadUpAdminMatches();
  const end = useEndSquadUpSessionAdmin();
  return (
    <div className="space-y-6">
      {end.isError && <InlineNotice tone="critical" title="Action failed">{end.error.message}</InlineNotice>}
      <div className="flex gap-1" role="group" aria-label="Date range">
        {RANGES.map((range) => (
          <button key={range} type="button" aria-pressed={days === range} onClick={() => onDaysChange(range)}
            className={`px-3 py-1.5 text-xs ${days === range ? 'bg-white text-black' : 'border border-white/[0.12] text-zinc-300'}`}>{range}d</button>
        ))}
      </div>
      {overview.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-zinc-400" aria-label="Loading stats" />
        : overview.isError ? <InlineNotice tone="critical" title="Stats could not load">Try again in a moment.</InlineNotice>
        : overview.data && <SquadUpAdminStats overview={overview.data} />}
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        {sessions.isError ? <InlineNotice tone="critical" title="Sessions could not load">Try again in a moment.</InlineNotice>
          : <SquadUpAdminSessions sessions={sessions.data ?? []} canManage={canManage} ending={end.isPending} onEnd={(userId) => end.mutate(userId)} />}
        <SquadUpAdminMatches matches={matches.data ?? []} />
      </div>
    </div>
  );
}
