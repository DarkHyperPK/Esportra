import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { auditLog } from '@/lib/auditLog';
import { toast } from '@/components/ui/use-toast';
import { adminKeys, useAdminSponsorApplications } from '@/hooks/useAdminQueries';
import type { PartnerApplication } from '@/hooks/usePartnerApplication';
import {
  Building2,
  CheckCircle,
  FileText,
  Globe,
  Loader2,
  Mail,
  Phone,
  Search,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

const STATUS_TABS: StatusFilter[] = ['pending', 'reviewed', 'approved', 'rejected', 'all'];

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  reviewed: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  approved: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto" data-lenis-prevent>
          {STATUS_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition ${
                statusFilter === tab ? 'bg-zinc-800 text-white ring-1 ring-white/10' : 'text-zinc-600 hover:text-zinc-300'
              }`}
            >
              {tab}
              {counts[tab] > 0 && (
                <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] ${tab === 'pending' && statusFilter !== 'pending' ? 'bg-rose-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                  {counts[tab]}
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="relative sm:w-60">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search company or contact…"
            className="w-full rounded-lg border border-zinc-800 bg-black/40 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-zinc-600 focus:border-rose-500/40 focus:outline-none"
          />
        </div>
      </div>

      {/* Queue */}
      {isLoading ? (
        <div className="py-16 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin text-zinc-600" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-[#0a0a0c] py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900">
            <FileText className="h-8 w-8 text-zinc-600" />
          </div>
          <h3 className="text-lg font-bold text-white">No applications here</h3>
          <p className="text-sm text-zinc-500">New submissions from the Partners page will appear in this queue.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(app => (
            <div key={app.id} className="group rounded-xl border border-white/5 bg-[#0a0a0c] p-5 transition-colors hover:border-white/10">
              <div className="flex flex-col justify-between gap-6 lg:flex-row">
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-3">
                    <h3 className="text-lg font-bold text-white">{app.company_name}</h3>
                    <span className={`rounded border px-2 py-0.5 text-xs font-medium uppercase tracking-wider ${STATUS_BADGE[app.status || 'pending']}`}>
                      {app.status || 'pending'}
                    </span>
                    <span className="font-mono text-xs text-zinc-500">{new Date(app.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="mb-4 flex items-center gap-6 text-sm text-zinc-400">
                    <a href={app.company_website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 transition-colors hover:text-rose-400">
                      <Globe className="h-4 w-4" /> {app.company_website}
                    </a>
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-4 w-4" /> {app.industry} ({app.company_size})
                    </span>
                  </div>
                  <div className="rounded-lg border border-white/5 bg-zinc-900/50 p-3 text-sm font-light text-zinc-300">
                    <span className="mb-1 block text-xs font-medium uppercase text-zinc-500">Message</span>
                    "{app.message || 'No message provided.'}"
                  </div>
                </div>

                <div className="w-full space-y-3 border-white/5 lg:w-1/3 lg:border-l lg:pl-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 font-bold text-zinc-400">
                      {app.contact_name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{app.contact_name}</p>
                      <p className="text-xs text-zinc-500">{app.contact_title}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 text-xs text-zinc-400"><Mail className="h-3 w-3" /> {app.contact_email}</p>
                    {app.contact_phone && <p className="flex items-center gap-2 text-xs text-zinc-400"><Phone className="h-3 w-3" /> {app.contact_phone}</p>}
                  </div>
                  <div className="flex gap-2 border-t border-white/5 pt-3">
                    <Badge variant="outline" className={`text-xs uppercase ${app.partnership_tier === 'radiant' ? 'border-amber-500/30 bg-amber-500/10 text-amber-500' : app.partnership_tier === 'ascendant' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500' : 'border-white/10 bg-zinc-500/10 text-zinc-400'}`}>
                      {app.partnership_tier} Tier
                    </Badge>
                    {app.budget_range && (
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-400">{app.budget_range}</Badge>
                    )}
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="border-zinc-800 text-zinc-300 hover:text-white" onClick={() => setDetail(app)}>
                      Details
                    </Button>
                    {app.status !== 'approved' && (
                      <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700" disabled={approveMutation.isPending} onClick={() => handleApprove(app)}>
                        {approveMutation.isPending ? 'Approving…' : 'Approve'}
                      </Button>
                    )}
                    {app.status === 'pending' && (
                      <>
                        <Button size="icon" variant="ghost" title="Mark Reviewed" onClick={() => handleSetStatus(app, 'reviewed')}>
                          <CheckCircle className="h-4 w-4 text-zinc-500 transition-colors hover:text-sky-400" />
                        </Button>
                        <Button size="icon" variant="ghost" title="Reject" onClick={() => handleSetStatus(app, 'rejected')}>
                          <XCircle className="h-4 w-4 text-zinc-500 transition-colors hover:text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={detail !== null} onOpenChange={open => { if (!open) setDetail(null); }}>
        <DialogContent className="max-w-3xl border-zinc-800 bg-[#0a0a0c]">
          <DialogHeader>
            <DialogTitle>Application Details</DialogTitle>
            <DialogDescription>Submitted on {detail?.created_at && new Date(detail.created_at).toLocaleString()}</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="grid grid-cols-2 gap-8 py-4">
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-white">Company Information</h4>
                  <div className="space-y-2 text-sm">
                    {([
                      ['Name', detail.company_name],
                      ['Industry', detail.industry],
                      ['Size', detail.company_size],
                    ] as [string, string][]).map(([label, value]) => (
                      <div key={label} className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-zinc-500">{label}</span>
                        <span className="capitalize text-white">{value}</span>
                      </div>
                    ))}
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-zinc-500">Website</span>
                      <a href={detail.company_website} target="_blank" rel="noopener noreferrer" className="text-rose-400 hover:underline">{detail.company_website}</a>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-white">Proposal</h4>
                  <div className="rounded-lg bg-zinc-900 p-3 text-sm italic text-zinc-300">"{detail.message}"</div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-white">Contact Point</h4>
                  <div className="space-y-2 text-sm">
                    {([
                      ['Name', detail.contact_name],
                      ['Title', detail.contact_title],
                      ['Email', detail.contact_email],
                      ['Phone', detail.contact_phone || 'N/A'],
                    ] as [string, string][]).map(([label, value]) => (
                      <div key={label} className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-zinc-500">{label}</span>
                        <span className="text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-white">Metadata</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-zinc-500">Source</span><span className="text-white">{detail.how_heard}</span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-zinc-500">Tier</span>
                      <span className={`font-bold capitalize ${detail.partnership_tier === 'radiant' ? 'text-amber-500' : detail.partnership_tier === 'ascendant' ? 'text-emerald-500' : 'text-zinc-400'}`}>
                        {detail.partnership_tier}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-white/5 pb-1">
                      <span className="text-zinc-500">Budget</span><span className="text-white">{detail.budget_range?.replace(/_/g, ' ') || 'N/A'}</span>
                    </div>
                  </div>
                </div>
                {detail.partnership_goals?.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-bold uppercase tracking-wider text-white">Partnership Goals</h4>
                    <div className="flex flex-wrap gap-2">
                      {detail.partnership_goals.map((goal: string) => (
                        <Badge key={goal} variant="outline" className="border-rose-500/30 bg-rose-500/10 text-xs capitalize text-rose-400">
                          {goal.replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDetail(null)}>Close</Button>
            {detail?.status !== 'approved' && (
              <>
                <Button variant="outline" className="border-red-800 text-red-400 hover:bg-red-900/20" onClick={() => detail && handleSetStatus(detail, 'rejected')}>
                  Reject
                </Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={approveMutation.isPending} onClick={() => detail && handleApprove(detail)}>
                  {approveMutation.isPending
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Approving…</>
                    : <><CheckCircle className="mr-2 h-4 w-4" /> Approve & Onboard</>}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PipelineSection;
