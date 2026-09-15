import { useState } from 'react';
import { Activity, BookOpen, ChevronRight, Key } from 'lucide-react';
import { useDeveloperAccessRequest, useDeveloperKeys } from '@/hooks/useDeveloperApi';
import { KeyManagementDashboard } from '@/components/organizer/developer/KeyManagementDashboard';
import { AnalyticsPanel } from '@/components/organizer/developer/AnalyticsPanel';
import { DocumentationPanel } from '@/components/organizer/developer/DocumentationPanel';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { value: 'keys', label: 'Keys', icon: Key },
  { value: 'analytics', label: 'Analytics', icon: Activity },
  { value: 'documentation', label: 'Docs', icon: BookOpen },
] as const;

type NavValue = (typeof NAV_ITEMS)[number]['value'];

interface DeveloperApiSettingsProps {
  orgId: string;
  isApiApproved: boolean;
}

export function DeveloperApiSettings({ orgId, isApiApproved }: DeveloperApiSettingsProps) {
  const [activeTab, setActiveTab] = useState<NavValue>('keys');

  const { data: keysData, isLoading: keysLoading } = useDeveloperKeys(orgId);
  const { data: accessRequest } = useDeveloperAccessRequest(orgId);

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-rose-400">
          Developer API
        </p>
        <h3 className="mt-1 text-xl font-black uppercase text-white">API Platform</h3>
        <p className="mt-2 text-sm text-zinc-500">
          Manage API keys, view usage analytics, and explore the interactive API reference.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
        {/* Sidebar nav */}
        <nav className="h-fit space-y-1 border border-white/10 bg-[#08080a] p-2 lg:sticky lg:top-24">
          {NAV_ITEMS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setActiveTab(value)}
              className={cn(
                'relative flex h-10 w-full items-center gap-3 border px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/70',
                activeTab === value
                  ? 'border-transparent bg-rose-500 text-white'
                  : 'border-white/15 bg-black text-zinc-200 hover:border-white/25 hover:bg-white/[0.06] hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
              {activeTab === value && <ChevronRight className="ml-auto h-4 w-4" />}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="min-w-0">
          {activeTab === 'keys' && (
            <KeyManagementDashboard
              orgId={orgId}
              isApiApproved={isApiApproved}
              accessRequest={accessRequest ?? null}
              keys={keysData?.keys ?? []}
              isLoading={keysLoading}
            />
          )}
          {activeTab === 'analytics' && <AnalyticsPanel orgId={orgId} />}
          {activeTab === 'documentation' && <DocumentationPanel />}
        </div>
      </div>
    </div>
  );
}
