import { useState } from 'react';
import { KeyRound, MonitorSmartphone, Users } from 'lucide-react';
import { AdminPage } from '@/components/admin/AdminPage';
import { AirActivityTab } from '@/components/admin/air/AirActivityTab';
import { AirCustomersTab } from '@/components/admin/air/AirCustomersTab';
import { AirDevicesTab } from '@/components/admin/air/AirDevicesTab';
import { AirGrantSheet, type AirGrantTarget } from '@/components/admin/air/AirGrantSheet';
import { AirPlansTab } from '@/components/admin/air/AirPlansTab';
import { AirRequestsTab } from '@/components/admin/air/AirRequestsTab';
import { CommandMetric, CommandTabs } from '@/components/management/CommandSurface';
import { useAirOverview, type AirSection } from '@/hooks/useAirAdmin';

const TABS: { value: AirSection; label: string }[] = [
  { value: 'requests', label: 'Requests' },
  { value: 'customers', label: 'Customers' },
  { value: 'devices', label: 'PCs' },
  { value: 'plans', label: 'Plans' },
  { value: 'activity', label: 'Activity' },
];

const AirAccess = () => {
  const overview = useAirOverview();
  const counts = overview.data?.counts;
  const [tab, setTab] = useState<AirSection>('requests');
  const [granting, setGranting] = useState<AirGrantTarget | null>(null);
  const tabs = TABS.map((t) => (t.value === 'requests' && counts?.pendingRequests ? { ...t, label: `Requests · ${counts.pendingRequests}` } : t));

  return (
    <AdminPage
      eyebrow="Admin / Esportra Air"
      title="Air access"
      description="Grant, extend or suspend Esportra Air for an account. New accounts start with a 14-day trial."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <CommandMetric label="Waiting requests" value={counts?.pendingRequests ?? '—'} icon={<KeyRound className="h-4 w-4" />} tone={counts?.pendingRequests ? 'danger' : 'neutral'} />
        <CommandMetric label={`Customers · ${counts?.expiredAccess ?? 0} ended`} value={counts?.customers ?? '—'} icon={<Users className="h-4 w-4" />} />
        <CommandMetric label={`Active PCs · ${counts?.onlineDevices ?? 0} online`} value={counts?.activeDevices ?? '—'} icon={<MonitorSmartphone className="h-4 w-4" />} />
      </div>
      <CommandTabs tabs={tabs} active={tab} onChange={(v) => setTab(v as AirSection)} />
      {tab === 'requests' ? <AirRequestsTab onGrant={setGranting} /> : null}
      {tab === 'customers' ? <AirCustomersTab onGrant={setGranting} /> : null}
      {tab === 'devices' ? <AirDevicesTab /> : null}
      {tab === 'plans' ? <AirPlansTab /> : null}
      {tab === 'activity' ? <AirActivityTab /> : null}
      <AirGrantSheet target={granting} onClose={() => setGranting(null)} />
    </AdminPage>
  );
};

export default AirAccess;
