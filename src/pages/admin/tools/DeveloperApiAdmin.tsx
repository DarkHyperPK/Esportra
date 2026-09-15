import { useState } from 'react';
import { CommandTabs } from '@/components/management/CommandSurface';
import { AdminPage } from '@/components/admin/AdminPage';
import { AccessRequestsPanel } from '@/components/admin/developer/AccessRequestsPanel';
import { PartnerActivityPanel } from '@/components/admin/developer/PartnerActivityPanel';

const SUB_TABS = [
  { value: 'access-requests', label: 'Access Requests' },
  { value: 'partner-activity', label: 'Partner Activity' },
];

export function DeveloperApiAdmin() {
  const [activeTab, setActiveTab] = useState('access-requests');

  return (
    <AdminPage
      eyebrow="Partners"
      title="Developer API"
      description="Review API access applications and monitor partner usage."
    >
      <CommandTabs tabs={SUB_TABS} active={activeTab} onChange={setActiveTab} />
      <div className="mt-5">
        {activeTab === 'access-requests' && <AccessRequestsPanel />}
        {activeTab === 'partner-activity' && <PartnerActivityPanel />}
      </div>
    </AdminPage>
  );
}

export default DeveloperApiAdmin;
