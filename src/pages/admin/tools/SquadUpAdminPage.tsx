/**
 * SquadUpAdminPage — Admin Centre control for Squad Up (live teammate finder).
 *
 * squad_up:view        — stats, live sessions, matches, player reports and their screenshots
 * squad_up:manage      — decide reports (dismiss / warn / remove from Squad Up), end sessions, lift restrictions
 * users:ban            — additionally needed to suspend the whole account from a report
 * feature_flags:toggle — switch the feature on or off (the same flag as Feature Flags > Squad Up)
 */

import { useState } from 'react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { useSquadUpAdminOverview, useToggleSquadUpFlag } from '@/hooks/competitive/useSquadUpAdmin';
import { InlineNotice, TabBar, TabPanel, useTabBase } from '@/components/ui/kit';
import { Switch } from '@/components/ui/switch';
import { SquadUpAdminOverview } from '@/components/admin/squad-up/SquadUpAdminOverview';
import { SquadUpAdminReports } from '@/components/admin/squad-up/SquadUpAdminReports';
import { SquadUpAdminRestrictions } from '@/components/admin/squad-up/SquadUpAdminRestrictions';

export default function SquadUpAdminPage() {
  const { can } = useAdminAccess();
  const base = useTabBase();
  const [tab, setTab] = useState('overview');
  const [days, setDays] = useState<number>(14);
  const overview = useSquadUpAdminOverview(days);
  const toggle = useToggleSquadUpFlag();
  const flag = overview.data?.flag ?? null;
  const canToggle = can('feature_flags:toggle') && !!flag;
  const canManage = can('squad_up:manage');

  if (!can('squad_up:view')) {
    return <div className="p-4 md:p-6"><InlineNotice title="Access denied" tone="critical">You need the squad_up:view permission to view Squad Up.</InlineNotice></div>;
  }

  return (
    <div className="min-w-0 w-full space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-[22px] font-bold tracking-tight text-white sm:text-2xl">Squad Up</h1>
          <p className="mt-1 text-sm text-zinc-400">Live teammate finder. Watch activity, review player reports, remove players, or switch the feature off.</p>
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
      {toggle.isError && <InlineNotice tone="critical" title="Action failed">{toggle.error.message}</InlineNotice>}

      <TabBar base={base} label="Squad Up sections" value={tab} onChange={setTab} tabs={[
        { id: 'overview', label: 'Overview' },
        { id: 'reports', label: 'Reports', count: overview.data?.reports?.open },
        { id: 'restrictions', label: 'Restrictions' },
      ]} />
      <TabPanel base={base} id="overview" value={tab}>
        <SquadUpAdminOverview overview={overview} days={days} onDaysChange={setDays} canManage={canManage} />
      </TabPanel>
      <TabPanel base={base} id="reports" value={tab}>
        <SquadUpAdminReports canManage={canManage} canSuspend={can('users:ban')} />
      </TabPanel>
      <TabPanel base={base} id="restrictions" value={tab}>
        <SquadUpAdminRestrictions canManage={canManage} />
      </TabPanel>
    </div>
  );
}
