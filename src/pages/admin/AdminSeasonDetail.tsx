import { useParams } from 'react-router-dom';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import type { Season, SeasonAuditLog } from '@/types/season';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

export default function AdminSeasonDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'audit'>('overview');

  const { data: season, isLoading, refetch } = useQuery<Season>({
    queryKey: ['adminSeason', id],
    queryFn: () => apiClient.get(`/api/admin/seasons/${id}`),
    enabled: !!id,
  });

  const { data: auditLogs } = useQuery<SeasonAuditLog[]>({
    queryKey: ['seasonAuditLog', id],
    queryFn: () => apiClient.get(`/api/admin/seasons/${id}/audit`),
    enabled: !!id && activeTab === 'audit',
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      apiClient.patch(`/api/admin/seasons/${id}/status`, { status }),
    onSuccess: () => {
      toast({ title: 'Status updated' });
      refetch();
    },
    onError: (error) => {
      toast({
        title: 'Failed to update status',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-10 text-center text-zinc-400">
            Loading season...
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!season) {
    return (
      <div className="min-h-screen bg-[#050505] text-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-8">
            <p className="font-semibold text-red-100">Season not found.</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="w-full px-4 py-10 sm:px-6 lg:px-10 xl:px-14">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-rose-500/10 text-rose-300 hover:bg-rose-500/10">{season.status}</Badge>
                <Badge className="bg-white/10 text-white hover:bg-white/10">{season.participantMode}</Badge>
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight">{season.name}</h1>
              <p className="mt-3 max-w-3xl text-sm text-zinc-400">{season.description}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Select value={season.status} onValueChange={(value) => statusMutation.mutate(value)} disabled={statusMutation.isPending}>
                <SelectTrigger className="border-white/15 bg-white/5 text-white w-[180px]">
                  <SelectValue placeholder="Change status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={
                activeTab === 'overview'
                  ? 'rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-white'
                  : 'rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:bg-white/10 hover:text-white'
              }
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={
                activeTab === 'audit'
                  ? 'rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-white'
                  : 'rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:bg-white/10 hover:text-white'
              }
            >
              Audit Log
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
                <h2 className="text-2xl font-semibold">Season Details</h2>
                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-sm text-zinc-400">ID</p>
                    <p className="font-mono text-sm">{season.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Slug</p>
                    <p className="font-mono text-sm">{season.slug}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Game</p>
                    <p>{season.game}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Owner</p>
                    <p>{season.ownerUsername || season.ownerFullName || season.ownerUserId}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Organization</p>
                    <p>{season.organizationId || 'None'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Visibility</p>
                    <p>{season.isPublic ? 'Public' : 'Private'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Allow Manual Overrides</p>
                    <p>{season.allowManualOverrides ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">Created At</p>
                    <p>{season.createdAt ? new Date(season.createdAt).toLocaleString() : '-'}</p>
                  </div>
                  {season.publishedAt && (
                    <div>
                      <p className="text-sm text-zinc-400">Published At</p>
                      <p>{new Date(season.publishedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {season.completedAt && (
                    <div>
                      <p className="text-sm text-zinc-400">Completed At</p>
                      <p>{new Date(season.completedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {season.archivedAt && (
                    <div>
                      <p className="text-sm text-zinc-400">Archived At</p>
                      <p>{new Date(season.archivedAt).toLocaleString()}</p>
                    </div>
                  )}
                  {season.cancelledAt && (
                    <div>
                      <p className="text-sm text-zinc-400">Cancelled At</p>
                      <p>{new Date(season.cancelledAt).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
                <h2 className="text-2xl font-semibold">Schedule</h2>
                <div className="mt-6 space-y-4">
                  <div>
                    <p className="text-sm text-zinc-400">Start Date</p>
                    <p>{season.startDate ? new Date(season.startDate).toLocaleDateString() : 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-zinc-400">End Date</p>
                    <p>{season.endDate ? new Date(season.endDate).toLocaleDateString() : 'Not set'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Audit Log Tab */}
          {activeTab === 'audit' && (
            <div className="rounded-[32px] border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
              <h2 className="text-2xl font-semibold">Audit Log</h2>
              <div className="mt-6 max-h-96 overflow-y-auto space-y-3">
                {auditLogs && auditLogs.length > 0 ? (
                  auditLogs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-white">{log.action}</p>
                        <p className="text-xs text-zinc-400">{new Date(log.createdAt).toLocaleString()}</p>
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">Actor: {log.actorUsername || log.actorId}</p>
                      <p className="mt-1 text-sm text-zinc-400">Entity: {log.entityType} {log.entityId ? `(${log.entityId})` : ''}</p>
                      {log.reason && <p className="mt-1 text-sm text-zinc-500">Reason: {log.reason}</p>}
                    </div>
                  ))
                ) : (
                  <div className="text-center text-zinc-400">No audit log entries found.</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
