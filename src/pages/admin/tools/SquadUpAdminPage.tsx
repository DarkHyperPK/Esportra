/**
 * SquadUpAdminPage — Admin Centre control for Squad Up (live teammate finder).
 *
 * squad_up:view   — stats, live sessions, recent matches
 * squad_up:manage — end a player's session
 * feature_flags:toggle — switch the feature on or off (the same flag as Feature Flags > Squad Up)
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import {
  useEndSquadUpSessionAdmin, useSquadUpAdminMatches, useSquadUpAdminOverview, useSquadUpAdminSessions, useToggleSquadUpFlag,
} from '@/hooks/competitive/useSquadUpAdmin';
import { InlineNotice } from '@/components/ui/kit';
import { Switch } from '@/components/ui/switch';
import { SquadUpAdminStats } from '@/components/admin/squad-up/SquadUpAdminStats';
import { SquadUpAdminSessions } from '@/components/admin/squad-up/SquadUpAdminSessions';
import { SquadUpAdminMatches } from '@/components/admin/squad-up/SquadUpAdminMatches';

const RANGES = [7, 14, 30, 90] as const;

export default function SquadUpAdminPage() {
  const { can } = useAdminAccess();
  const [days, setDays] = useState<number>(14);
  const overview = useSquadUpAdminOverview(days);
  const sessions = useSquadUpAdminSessions();
  const matches = useSquadUpAdminMatches();
  const end = useEndSquadUpSessionAdmin();
  const toggle = useToggleSquadUpFlag();
  const flag = overview.data?.flag ?? null;
  const canToggle = can('feature_flags:toggle') && !!flag;

  if (!can('squad_up:view')) {
    return <div className="p-4 md:p-6"><InlineNotice title="Access denied" tone="critical">You need the squad_up:view permission to view Squad Up.</InlineNotice></div>;
  }

  return (
    <div className="min-w-0 w-full space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-[22px] font-bold tracking-tight text-white sm:text-2xl">Squad Up</h1>
          <p className="mt-1 text-sm text-zinc-400">Live teammate finder. Watch activity, remove a player from the pool, or switch the feature off.</p>
        </div>
        <label className="flex items-center gap-3 text-sm text-zinc-200">
          <span>{flag ? (flag.enabled ? 'Feature is on' : 'Feature is off') : 'Feature flag not found'}</span>
          <Switch
            checked={flag?.enabled ?? false}
            disabled={!canToggle || toggle.isPending}
            aria-label="Squad Up feature"
            onCheckedChange={(enabled) => { if (flag) toggle.mutate({ flagId: flag.id, enabled }); }}
          />
        </label>
      </header>
      {!can('feature_flags:toggle') && <p className="text-xs text-zinc-500">You need the feature_flags:toggle permission to switch the feature on or off.</p>}
      {(toggle.isError || end.isError) && <InlineNotice tone="critical" title="Action failed">{(toggle.error ?? end.error)?.message}</InlineNotice>}

      <div className="flex gap-1" role="group" aria-label="Date range">
        {RANGES.map((range) => (
          <button key={range} type="button" aria-pressed={days === range} onClick={() => setDays(range)}
            className={`px-3 py-1.5 text-xs ${days === range ? 'bg-white text-black' : 'border border-white/[0.12] text-zinc-300'}`}>{range}d</button>
        ))}
      </div>

      {overview.isLoading ? <Loader2 className="h-5 w-5 animate-spin text-zinc-400" aria-label="Loading stats" />
        : overview.isError ? <InlineNotice tone="critical" title="Stats could not load">Try again in a moment.</InlineNotice>
        : overview.data && <SquadUpAdminStats overview={overview.data} />}

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        {sessions.isError ? <InlineNotice tone="critical" title="Sessions could not load">Try again in a moment.</InlineNotice>
          : <SquadUpAdminSessions sessions={sessions.data ?? []} canManage={can('squad_up:manage')} ending={end.isPending} onEnd={(userId) => end.mutate(userId)} />}
        <SquadUpAdminMatches matches={matches.data ?? []} />
      </div>
    </div>
  );
}
