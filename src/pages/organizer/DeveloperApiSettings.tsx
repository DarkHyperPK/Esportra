import { useDeveloperAccessRequest, useDeveloperKeys } from '@/hooks/useDeveloperApi';
import { KeyManagementDashboard } from '@/components/organizer/developer/KeyManagementDashboard';
import { AnalyticsPanel } from '@/components/organizer/developer/AnalyticsPanel';
import { DocumentationPanel } from '@/components/organizer/developer/DocumentationPanel';

interface DeveloperApiSettingsProps {
  orgId: string;
  isApiApproved: boolean;
  activePanel: 'keys' | 'analytics' | 'docs';
}

export function DeveloperApiSettings({ orgId, isApiApproved, activePanel }: DeveloperApiSettingsProps) {
  const { data: keysData, isLoading: keysLoading } = useDeveloperKeys(orgId);
  const { data: accessRequest } = useDeveloperAccessRequest(orgId);

  return (
    <div>
      {activePanel === 'keys' && (
        <KeyManagementDashboard
          orgId={orgId}
          isApiApproved={isApiApproved}
          accessRequest={accessRequest ?? null}
          keys={keysData?.keys ?? []}
          isLoading={keysLoading}
        />
      )}
      {activePanel === 'analytics' && <AnalyticsPanel orgId={orgId} />}
      {activePanel === 'docs' && <DocumentationPanel />}
    </div>
  );
}
