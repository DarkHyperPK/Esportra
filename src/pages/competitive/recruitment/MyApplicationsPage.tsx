import { Link } from 'react-router-dom';
import { PageIntro } from '@/components/ui/kit';
import { Button } from '@/components/ui/button';
import { useMyApplications, useUpdateApplicationStatus } from '@/hooks/competitive/useRecruitment';
import type { RecruitmentApplication, RecruitmentApplicationStatus } from '@/types/competitive';

const TERMINAL_STATUSES: RecruitmentApplicationStatus[] = [
  'accepted',
  'withdrawn',
  'rejected',
  'expired',
  'archived',
  'removed',
];

const STATUS_LABEL: Record<RecruitmentApplicationStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  trial_invited: 'Trial Invited',
  offer_extended: 'Offer Extended',
  accepted: 'Accepted',
  withdrawn: 'Withdrawn',
  rejected: 'Rejected',
  expired: 'Expired',
  archived: 'Archived',
  removed: 'Removed',
};

const STATUS_COLOR: Record<RecruitmentApplicationStatus, string> = {
  submitted: 'text-white/55',
  under_review: 'text-amber-400',
  shortlisted: 'text-sky-400',
  trial_invited: 'text-rose-400',
  offer_extended: 'text-emerald-400',
  accepted: 'text-emerald-400',
  withdrawn: 'text-white/30',
  rejected: 'text-white/30',
  expired: 'text-white/30',
  archived: 'text-white/30',
  removed: 'text-red-400',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ApplicationRow({ application }: { application: RecruitmentApplication }) {
  const updateStatus = useUpdateApplicationStatus(application.id);
  const isTerminal = TERMINAL_STATUSES.includes(application.status);

  return (
    <div className="border border-white/[0.06] bg-white/[0.03] p-4 flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-[14px] font-semibold text-white truncate">
          {application.openingTitle ?? 'Opening'}
        </p>
        <p className="text-[12px] text-white/40">
          {application.teamName ?? 'Unknown team'} · Applied {formatDate(application.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className={`text-[12px] font-medium ${STATUS_COLOR[application.status]}`}>
          {STATUS_LABEL[application.status]}
        </span>
        {!isTerminal && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => updateStatus.mutate({ status: 'withdrawn' })}
            disabled={updateStatus.isPending}
            className="text-[12px] text-white/35 hover:text-white/70 rounded-none border border-white/[0.06]"
          >
            {updateStatus.isPending ? '…' : 'Withdraw'}
          </Button>
        )}
      </div>
    </div>
  );
}

export default function MyApplicationsPage() {
  const appsQuery = useMyApplications();
  const applications = appsQuery.data ?? [];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white w-full">
      <div className="px-4 pt-8 pb-4 lg:px-8">
        <PageIntro eyebrow="YOUR APPLICATIONS" title="My Applications" className="mb-6" />
      </div>

      <main className="px-4 lg:px-8 pb-8">
        {appsQuery.isLoading ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-white/[0.04] border border-white/[0.06]" />
            ))}
          </div>
        ) : appsQuery.isError ? (
          <div className="space-y-3">
            <p className="text-[14px] text-white/55">
              Could not load applications. Try again.
            </p>
            <Button
              variant="outline"
              onClick={() => appsQuery.refetch()}
              className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07]"
            >
              Retry
            </Button>
          </div>
        ) : applications.length === 0 ? (
          <div className="py-12 space-y-3">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-white/35">
              NO APPLICATIONS
            </p>
            <p className="text-[14px] text-white/55">
              You haven't applied to any team openings yet.
            </p>
            <Button
              asChild
              variant="outline"
              className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07] min-h-[44px]"
            >
              <Link to="/competitive/recruitment">Browse openings</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-2" role="list" aria-label="My applications">
            {applications.map((app) => (
              <div key={app.id} role="listitem">
                <ApplicationRow application={app} />
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
