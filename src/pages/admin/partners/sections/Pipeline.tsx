import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { auditLog } from '@/lib/auditLog';
import { toast } from '@/components/ui/use-toast';
import { adminKeys, useAdminSponsorApplications } from '@/hooks/useAdminQueries';
import type { PartnerApplication } from '@/hooks/usePartnerApplication';
import {
  CommandButton,
  CommandEmptyState,
  CommandSection,
  CommandTabs,
} from '@/components/management/CommandSurface';
import {
  Building2,
  CheckCircle,
  Globe,
  Loader2,
  Mail,
  Phone,
  Search,
  XCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Application extends PartnerApplication {
  id: string;
  created_at: string;
  status: 'pending' | 'reviewed' | 'approved' | 'rejected';
  notes?: string;
}

type StatusFilter = 'pending' | 'reviewed' | 'approved' | 'rejected' | 'all';

const STATUS_BADGE: Record<string, string> = {
  pending: 'border-rose-500/30 text-rose-300',
  reviewed: 'border-white/15 text-zinc-300',
  approved: 'border-white/40 text-white',
  rejected: 'border-red-500/30 text-red-300',
};

const PipelineSection = () => {
  const qc = useQueryClient();
  const { data: applications = [], isLoading } = useAdminSponsorApplications();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<Application | null>(null);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Application['status'] }) =>
      apiClient.patch(`/api/sponsors/applications/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: adminKeys.sponsorApplications() }),
  });

  const approveMutation = useMutation({
    mutationFn: (application: Application) =>
      apiClient.post<{ success: boolean; sponsorId: string; requiresPasswordSetup: boolean; companyName: string; contactEmail: string }>(
        `/api/sponsors/applications/${application.id}/approve`,
        { invitationEmail: application.contact_email, tier: application.partnership_tier },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.sponsors() });
      qc.invalidateQueries({ queryKey: adminKeys.sponsorApplications() });
      qc.invalidateQueries({ queryKey: adminKeys.sponsorInvitations() });
    },
  });

  const counts = useMemo(() => ({
    pending: applications.filter(a => a.status === 'pending').length,
    reviewed: applications.filter(a => a.status === 'reviewed').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    all: applications.length,
  }), [applications]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applications
      .filter(a => (statusFilter === 'all' ? true : a.status === statusFilter))
      .filter(a => !q
        || a.company_name?.toLowerCase().includes(q)
        || a.contact_name?.toLowerCase().includes(q)
        || a.contact_email?.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [applications, statusFilter, search]);

  const handleSetStatus = async (app: Application, status: Application['status']) => {
    try {
      await updateStatusMutation.mutateAsync({ id: app.id, status });
    } catch {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
      return;
    }
    await auditLog.log(status === 'approved' ? 'approve' : status === 'rejected' ? 'reject' : 'update', 'sponsor', app.id, app.company_name || 'Unknown', { status });
    toast({ title: 'Status Updated', description: `Application marked as ${status}` });
    setDetail(null);
  };

  const handleApprove = async (app: Application) => {
    try {
      const result = await approveMutation.mutateAsync(app);
      setDetail(null);
      toast({
        title: 'Partner Approved',
        description: result.requiresPasswordSetup
          ? `Partner approved! An account setup invitation was sent to ${result.contactEmail}.`
          : `Partner approved! An invitation was sent to ${result.contactEmail}.`,
      });
      await auditLog.log('approve', 'sponsor', result.sponsorId, result.companyName, {
        applicationId: app.id,
        requiresPasswordSetup: result.requiresPasswordSetup,
      });
    } catch {
      toast({ title: 'Approval Failed', description: 'Could not approve application.', variant: 'destructive' });
    }
  };

  const tabs = [
    { value: 'pending', label: `Pending ${counts.pending > 0 ? counts.pending : ''}` },
    { value: 'reviewed', label: `Reviewed ${counts.reviewed > 0 ? counts.reviewed : ''}` },
    { value: 'approved', label: `Approved ${counts.approved > 0 ? counts.approved : ''}` },
    { value: 'rejected', label: `Rejected ${counts.rejected > 0 ? counts.rejected : ''}` },
    { value: 'all', label: `All ${counts.all}` },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <CommandTabs
          tabs={tabs}
          active={statusFilter}
          onChange={v => setStatusFilter(v as StatusFilter)}
        />
        <div className="relative lg:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search company or contact…"
            className="w-full -none border border-white/10 bg-[#0a0a0c]/90 py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
          />
        </div>
      </div>

      {isLoading ? (
        <CommandSection className="py-16 text-center">
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-600" />
        </CommandSection>
      ) : rows.length === 0 ? (
        <CommandEmptyState
          title="No applications here"
          description="New submissions from the Partners page will appear in this queue."
          icon={<Search className="h-5 w-5" />}
        />
      ) : (
        <div className="space-y-4">
          {rows.map(app => (
            <article key={app.id} className="group border border-white/10 bg-[#0a0a0c]/92 p-5 transition-colors hover:border-white/25">
              <div className="flex flex-col justify-between gap-6 lg:flex-row">
                <div className="flex-1 min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h3 className="text-base font-bold text-white">{app.company_name}</h3>
                    <span className={`border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[app.status || 'pending']}`}>
                      {app.status || 'pending'}
                    </span>
                    <span className="font-mono text-xs text-zinc-600">{new Date(app.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-zinc-400">
                    <a href={app.company_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-rose-300">
                      <Globe className="h-4 w-4" /> {app.company_website}
                    </a>
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" /> {app.industry} ({app.company_size})
                    </span>
                  </div>
                  <p className="border-l-2 border-white/10 pl-3 text-sm font-light leading-relaxed text-zinc-300">
                    "{app.message || 'No message provided.'}"
                  </p>
                </div>

                <div className="w-full shrink-0 space-y-3 border-white/10 lg:w-72 lg:border-l lg:pl-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center border border-white/10 bg-black/40 font-bold text-zinc-400">
                      {app.contact_name[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{app.contact_name}</p>
                      <p className="truncate text-xs text-zinc-500">{app.contact_title}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 truncate text-xs text-zinc-400"><Mail className="h-3 w-3 shrink-0" /> {app.contact_email}</p>
                    {app.contact_phone && <p className="flex items-center gap-2 text-xs text-zinc-400"><Phone className="h-3 w-3 shrink-0" /> {app.contact_phone}</p>}
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    {app.partnership_tier} tier{app.budget_range ? ` — ${app.budget_range.replace(/_/g, ' ')}` : ''}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <ButtonDetails onClick={() => setDetail(app)} />
                    {app.status !== 'approved' && (
                      <CommandButton size="sm" disabled={approveMutation.isPending} onClick={() => handleApprove(app)}>
                        {approveMutation.isPending ? 'Approving…' : 'Approve'}
                      </CommandButton>
                    )}
                    {app.status === 'pending' && (
                      <>
                        <CommandIconButtonReviewed onClick={() => handleSetStatus(app, 'reviewed')} />
                        <CommandIconButtonReject onClick={() => handleSetStatus(app, 'rejected')} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={detail !== null} onOpenChange={open => { if (!open) setDetail(null); }}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto -none border-white/10 bg-[#0a0a0c]" data-lenis-prevent>
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>Submitted on {detail?.created_at && new Date(detail.created_at).toLocaleString()}</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="grid grid-cols-1 gap-8 py-4 md:grid-cols-2">
              <div className="space-y-6">
                <DetailGroup title="Company Information" rows={[
                  ['Name', detail.company_name],
                  ['Website', detail.company_website],
                  ['Industry', detail.industry],
                  ['Size', detail.company_size],
                ]} websiteHref={detail.company_website} />
                <div>
                  <h4 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Proposal</h4>
                  <p className="border-l-2 border-white/10 pl-3 text-sm italic leading-relaxed text-zinc-300">"{detail.message}"</p>
                </div>
              </div>
              <div className="space-y-6">
                <DetailGroup title="Contact Point" rows={[
                  ['Name', detail.contact_name],
                  ['Title', detail.contact_title],
                  ['Email', detail.contact_email],
                  ['Phone', detail.contact_phone || 'N/A'],
                ]} />
                <DetailGroup title="Metadata" rows={[
                  ['Source', detail.how_heard ?? 'N/A'],
                  ['Tier', detail.partnership_tier],
                  ['Budget', detail.budget_range?.replace(/_/g, ' ') || 'N/A'],
                ]} />
                {detail.partnership_goals?.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">Partnership Goals</h4>
                    <p className="font-mono text-xs uppercase tracking-wider text-zinc-400">
                      {detail.partnership_goals.map(g => g.replace(/_/g, ' ')).join(' / ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <CommandButton variant="ghost" size="sm" onClick={() => setDetail(null)}>Close</CommandButton>
            {detail?.status !== 'approved' && (
              <>
                <CommandButton variant="danger" size="sm" onClick={() => detail && handleSetStatus(detail, 'rejected')}>
                  Reject
                </CommandButton>
                <CommandButton size="sm" disabled={approveMutation.isPending} onClick={() => detail && handleApprove(detail)}>
                  {approveMutation.isPending
                    ? <><Loader2 className="h-4 w-4 animate-spin" /> Approving…</>
                    : <><CheckCircle className="h-4 w-4" /> Approve & Onboard</>}
                </CommandButton>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function DetailGroup({ title, rows, websiteHref }: {
  title: string;
  rows: [string, string | undefined][];
  websiteHref?: string;
}) {
  return (
    <div>
      <h4 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500">{title}</h4>
      <div className="divide-y divide-white/5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4 py-1.5 text-sm">
            <span className="shrink-0 text-zinc-500">{label}</span>
            {websiteHref && label === 'Website' ? (
              <a href={websiteHref} target="_blank" rel="noopener noreferrer" className="truncate text-rose-300 hover:text-rose-200">{value}</a>
            ) : (
              <span className="truncate capitalize text-white">{value || 'N/A'}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ButtonDetails({ onClick }: { onClick: () => void }) {
  return (
    <CommandButton variant="ghost" size="sm" onClick={onClick}>
      Details
    </CommandButton>
  );
}

function CommandIconButtonReviewed({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      title="Mark Reviewed"
      aria-label="Mark Reviewed"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center border border-white/10 bg-white/[0.03] text-zinc-500 transition-colors hover:border-white/25 hover:text-white"
    >
      <CheckCircle className="h-4 w-4" />
    </button>
  );
}

function CommandIconButtonReject({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      title="Reject"
      aria-label="Reject"
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center border border-white/10 bg-white/[0.03] text-zinc-500 transition-colors hover:border-red-500/40 hover:text-red-300"
    >
      <XCircle className="h-4 w-4" />
    </button>
  );
}

export default PipelineSection;
