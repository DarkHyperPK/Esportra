import { useState } from 'react';
import { CommandSection, CommandTabs } from '@/components/management/CommandSurface';
import { useDeveloperAccessRequest, useDeveloperKeys } from '@/hooks/useDeveloperApi';
import { KeyManagementDashboard } from '@/components/organizer/developer/KeyManagementDashboard';
import { AnalyticsPanel } from '@/components/organizer/developer/AnalyticsPanel';
import { DocumentationPanel } from '@/components/organizer/developer/DocumentationPanel';

const SUB_TABS = [
  { value: 'keys', label: 'Keys' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'documentation', label: 'Documentation' },
];

interface DeveloperApiSettingsProps {
  orgId: string;
  isApiApproved: boolean;
}

export function DeveloperApiSettings({ orgId, isApiApproved }: DeveloperApiSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState('keys');

  const { data: keysData, isLoading: keysLoading } = useDeveloperKeys(orgId);
  const { data: accessRequest } = useDeveloperAccessRequest(orgId);

  return (
    <CommandSection>
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-rose-400">
          Developer API
        </p>
        <h3 className="mt-1 text-xl font-black uppercase text-white">Developer API</h3>
        <p className="mt-2 text-sm text-zinc-500">
          Manage API keys, view analytics, and access documentation for programmatic tournament
          management.
        </p>
      </div>

      <div className="mt-6">
        <CommandTabs tabs={SUB_TABS} active={activeSubTab} onChange={setActiveSubTab} />
      </div>

      <div className="mt-6">
        {activeSubTab === 'keys' && (
          <KeyManagementDashboard
            orgId={orgId}
            isApiApproved={isApiApproved}
            accessRequest={accessRequest ?? null}
            keys={keysData?.keys ?? []}
            isLoading={keysLoading}
          />
        )}
        {activeSubTab === 'analytics' && <AnalyticsPanel orgId={orgId} />}
        {activeSubTab === 'documentation' && <DocumentationPanel />}
      </div>
    </CommandSection>
  );
}
