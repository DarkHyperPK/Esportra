import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageIntro, InlineNotice, StatusPill } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  useTeamOpenings,
  usePublishOpening,
  usePauseOpening,
  useCloseOpening,
} from '@/hooks/competitive/useRecruitment';
import { NewOpeningForm } from '@/components/competitive/recruitment/NewOpeningForm';
import type { RecruitmentOpening, RecruitmentOpeningStatus } from '@/types/competitive';

const STATUS_TONE: Record<
  RecruitmentOpeningStatus,
  'neutral' | 'accent' | 'success' | 'warning' | 'critical'
> = {
  draft: 'neutral',
  open: 'accent',
  paused: 'warning',
  filled: 'success',
  closed: 'neutral',
  expired: 'neutral',
  moderated: 'critical',
};

function isActive(s: RecruitmentOpeningStatus) {
  return s === 'open' || s === 'paused' || s === 'filled';
}
function isDraft(s: RecruitmentOpeningStatus) {
  return s === 'draft';
}
function isTerminal(s: RecruitmentOpeningStatus) {
  return s === 'closed' || s === 'expired' || s === 'moderated';
}

function OpeningRow({ opening }: { opening: RecruitmentOpening }) {
  const publishMutation = usePublishOpening(opening.id);
  const pauseMutation = usePauseOpening(opening.id);
  const closeMutation = useCloseOpening(opening.id);
  const isPending =
    publishMutation.isPending || pauseMutation.isPending || closeMutation.isPending;

  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-4 flex items-center gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[14px] font-semibold text-white truncate">{opening.title}</p>
          <StatusPill label={opening.status.toUpperCase()} tone={STATUS_TONE[opening.status]} />
        </div>
        <p className="text-[12px] text-white/40">
          {opening.positionsAvailable
            ? `${opening.positionsFilled}/${opening.positionsAvailable} filled`
            : `${opening.positionsFilled} filled`}
        </p>
      </div>
      <div className="flex gap-2 shrink-0 flex-wrap justify-end">
        {opening.status === 'draft' && (
          <Button
            size="sm"
            onClick={() => publishMutation.mutate()}
            disabled={isPending}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[12px]"
          >
            {publishMutation.isPending ? '…' : 'Publish'}
          </Button>
        )}
        {opening.status === 'open' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => pauseMutation.mutate()}
            disabled={isPending}
            className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07] text-[12px]"
          >
            {pauseMutation.isPending ? '…' : 'Pause'}
          </Button>
        )}
        {opening.status === 'paused' && (
          <Button
            size="sm"
            onClick={() => publishMutation.mutate()}
            disabled={isPending}
            className="bg-rose-500 hover:bg-rose-600 text-white rounded-none text-[12px]"
          >
            {publishMutation.isPending ? '…' : 'Resume'}
          </Button>
        )}
        {!isTerminal(opening.status) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => closeMutation.mutate()}
            disabled={isPending}
            className="text-[12px] text-red-300/70 hover:text-red-300 rounded-none"
          >
            {closeMutation.isPending ? '…' : 'Close'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function RecruitmentWorkspacePage() {
  const [searchParams] = useSearchParams();
  const teamId = searchParams.get('team_id') ?? '';
  const [showCreateForm, setShowCreateForm] = useState(false);

  const openingsQuery = useTeamOpenings(teamId);
  const openings = openingsQuery.data ?? [];

  const activeOpenings = openings.filter((o) => isActive(o.status));
  const draftOpenings = openings.filter((o) => isDraft(o.status));
  const closedOpenings = openings.filter((o) => isTerminal(o.status));

  if (!teamId) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] px-4 py-8 text-white">
        <InlineNotice tone="critical">
          No team ID provided. Add ?team_id= to the URL.
        </InlineNotice>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white w-full">
      <div className="px-4 pt-8 pb-4 lg:px-8 flex items-start justify-between gap-4">
        <PageIntro eyebrow="RECRUITMENT WORKSPACE" title="Your Openings" />
        <Button
          onClick={() => setShowCreateForm((v) => !v)}
          className="bg-rose-500 hover:bg-rose-600 text-white rounded-none shrink-0 text-[13px]"
        >
          {showCreateForm ? 'Cancel' : 'New Opening'}
        </Button>
      </div>

      <div className="px-4 lg:px-8 pb-8 space-y-4">
        {showCreateForm && (
          <NewOpeningForm
            teamId={teamId}
            onSuccess={() => setShowCreateForm(false)}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {openingsQuery.isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i} className="h-16 bg-white/[0.04] border border-white/[0.06]" />
            ))}
          </div>
        ) : openingsQuery.isError ? (
          <div className="space-y-3">
            <p className="text-[14px] text-white/55">Could not load openings. Try again.</p>
            <Button
              variant="outline"
              onClick={() => openingsQuery.refetch()}
              className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]"
            >
              Retry
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="active">
            <div className="border-b border-white/[0.08]">
              <TabsList className="bg-transparent p-0 h-10 gap-6">
                {(
                  [
                    { value: 'active', label: 'Active', count: activeOpenings.length },
                    { value: 'draft', label: 'Draft', count: draftOpenings.length },
                    { value: 'closed', label: 'Closed / Expired', count: closedOpenings.length },
                  ] as const
                ).map(({ value, label, count }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="bg-transparent text-[13px] font-medium text-white/55 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-rose-500 rounded-none pb-1 h-full data-[state=active]:bg-transparent"
                  >
                    {label}{' '}
                    <span className="ml-1 text-white/30">{count}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {(
              [
                { value: 'active', items: activeOpenings, empty: 'No active openings.' },
                { value: 'draft', items: draftOpenings, empty: 'No drafts.' },
                { value: 'closed', items: closedOpenings, empty: 'No closed or expired openings.' },
              ] as const
            ).map(({ value, items, empty }) => (
              <TabsContent key={value} value={value} className="mt-4 focus-visible:outline-none">
                {items.length === 0 ? (
                  <p className="text-[14px] text-white/40 py-6">{empty}</p>
                ) : (
                  <div className="space-y-2">
                    {items.map((o) => (
                      <OpeningRow key={o.id} opening={o} />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}
