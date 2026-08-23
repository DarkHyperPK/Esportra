import React, { useState } from "react";
import { Bell, AlertTriangle, CheckCircle, XCircle, RefreshCw, Filter, ChevronLeft, ChevronRight, Activity, Eye, Loader2 } from "lucide-react";
import { useAdminAlerts, useAdminAlertSummary, useAcknowledgeAlert, useResolveAlert, useBulkAcknowledgeAlerts } from "@/hooks/useAdminQueries";
import { useToast } from "@/hooks/use-toast";
import { AdminPage } from "@/components/admin/AdminPage";
import {
  CommandButton,
  CommandIconButton,
  CommandPanel,
  CommandSection,
  CommandToolbar,
} from "@/components/management/CommandSurface";

const ALERT_LABEL = "font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-500";

const AlertsManagement = () => {
  const { toast } = useToast();

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Queries
  const { data: summary, isLoading: summaryLoading } = useAdminAlertSummary();
  const { data: alertsData, isLoading, error, refetch } = useAdminAlerts({
    status: statusFilter || undefined,
    severity: severityFilter || undefined,
    type: typeFilter || undefined,
    page,
    limit,
  });
  const acknowledge = useAcknowledgeAlert();
  const resolve = useResolveAlert();
  const bulkAcknowledge = useBulkAcknowledgeAlerts();

  const alerts = alertsData?.data ?? [];
  const total = alertsData?.total ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  const handleAcknowledge = (id: string) => {
    acknowledge.mutate(id, {
      onSuccess: () => toast({ title: 'Alert acknowledged' }),
      onError: () => toast({ title: 'Failed to acknowledge', variant: 'destructive' }),
    });
  };

  const handleResolve = (id: string) => {
    resolve.mutate(id, {
      onSuccess: () => toast({ title: 'Alert resolved' }),
      onError: () => toast({ title: 'Failed to resolve', variant: 'destructive' }),
    });
  };

  const handleBulkAcknowledge = () => {
    if (selectedIds.length === 0) return;
    bulkAcknowledge.mutate(selectedIds, {
      onSuccess: (data) => {
        toast({ title: `${data.updated} alert(s) acknowledged` });
        setSelectedIds([]);
      },
      onError: () => toast({ title: 'Bulk acknowledge failed', variant: 'destructive' }),
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const activeAlerts = alerts.filter((a: any) => a.status === 'active');
  const allActiveSelected = activeAlerts.length > 0 && activeAlerts.every((a: any) => selectedIds.includes(a.id));
  const toggleSelectAll = () => {
    if (allActiveSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(activeAlerts.map((a: any) => a.id));
    }
  };

  const severityIcon = (s: string) => {
    if (s === 'critical') return <AlertTriangle className="h-4 w-4 text-red-300" />;
    if (s === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-300" />;
    return <Activity className="h-4 w-4 text-zinc-400" />;
  };

  const statusBadge = (s: string) => {
    if (s === 'active') return (
      <span className="inline-flex items-center gap-1.5 border border-white/25 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
        <span className="h-1.5 w-1.5 bg-rose-500" /> Active
      </span>
    );
    if (s === 'acknowledged') return (
      <span className="border border-amber-500/30 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-amber-300">Acknowledged</span>
    );
    if (s === 'resolved') return (
      <span className="border border-white/15 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-300">Resolved</span>
    );
    return (
      <span className="border border-white/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-zinc-400">{s}</span>
    );
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const summaryCards = [
    { label: 'Critical', count: summary?.critical_count ?? 0, icon: AlertTriangle, tone: 'text-red-300' },
    { label: 'Warning', count: summary?.warning_count ?? 0, icon: AlertTriangle, tone: 'text-amber-300' },
    { label: 'Info', count: summary?.info_count ?? 0, icon: Activity, tone: 'text-zinc-300' },
    { label: 'Acknowledged', count: summary?.acknowledged_count ?? 0, icon: CheckCircle, tone: 'text-white' },
  ];

  return (
    <AdminPage
      eyebrow="Operations"
      title="Alert Center"
      description="Monitor & manage system alerts"
      actions={
        <CommandButton variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </CommandButton>
      }
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {summaryCards.map((card) => (
          <CommandPanel key={card.label} className="flex items-center justify-between">
            <div>
              <div className={`flex items-center gap-2 ${ALERT_LABEL}`}>
                <card.icon className="h-4 w-4" />
                {card.label}
              </div>
              <p className={`mt-2 text-2xl font-black tabular-nums ${card.tone}`}>
                {summaryLoading ? '...' : card.count}
              </p>
            </div>
          </CommandPanel>
        ))}
      </div>

      {/* Filter Bar */}
      <CommandToolbar>
        <div className="flex flex-wrap items-center gap-3">
          <Filter className="h-4 w-4 text-zinc-500" />

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-none border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-zinc-300 outline-none transition-colors focus:border-rose-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
            className="rounded-none border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-zinc-300 outline-none transition-colors focus:border-rose-500"
          >
            <option value="">All Severity</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="rounded-none border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-zinc-300 outline-none transition-colors focus:border-rose-500"
          >
            <option value="">All Types</option>
            <option value="dispute_filed">Dispute Filed</option>
            <option value="tournament_pending">Tournament Pending</option>
            <option value="registration_spike">Registration Spike</option>
            <option value="kyc_pending">KYC Pending</option>
            <option value="system_event">System Event</option>
          </select>

          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
            className="rounded-none border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-zinc-300 outline-none transition-colors focus:border-rose-500"
          >
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>

        {selectedIds.length > 0 && (
          <CommandButton
            variant="secondary"
            size="sm"
            onClick={handleBulkAcknowledge}
            disabled={bulkAcknowledge.isPending}
          >
            {bulkAcknowledge.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Acknowledge ({selectedIds.length})
          </CommandButton>
        )}
      </CommandToolbar>

      {/* Alerts Table */}
      <CommandSection className="overflow-hidden p-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-zinc-500" />
            <p className="text-sm text-zinc-500">Loading alerts...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <XCircle className="mb-3 h-8 w-8 text-red-300" />
            <p className="mb-3 text-sm text-zinc-400">Failed to load alerts</p>
            <CommandButton variant="ghost" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </CommandButton>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Bell className="mb-3 h-8 w-8 text-zinc-600" />
            <p className="text-sm text-zinc-400">No alerts found</p>
            <p className="mt-1 text-xs text-zinc-600">Adjust filters or check back later</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-black/40 font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={allActiveSelected}
                        onChange={toggleSelectAll}
                        className="accent-rose-500"
                      />
                    </th>
                    <th className="px-4 py-3">Severity</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {alerts.map((alert: any) => (
                    <React.Fragment key={alert.id}>
                      <tr
                        className="transition-colors hover:bg-white/[0.03]"
                      >
                        <td className="px-4 py-3">
                          {alert.status === 'active' && (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(alert.id)}
                              onChange={() => toggleSelect(alert.id)}
                              className="accent-rose-500"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">{severityIcon(alert.severity)}</td>
                        <td className="max-w-[320px] px-4 py-3">
                          <p className="truncate font-medium text-white">{alert.title}</p>
                          {alert.message && (
                            <p className="mt-0.5 truncate text-xs text-zinc-500">{alert.message}</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className="border border-white/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-400">{alert.type?.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">{statusBadge(alert.status)}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono tabular-nums text-zinc-500">{formatDate(alert.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <CommandIconButton
                              label="View details"
                              variant="ghost"
                              onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </CommandIconButton>
                            {(alert.status === 'active') && (
                              <CommandIconButton
                                label="Acknowledge"
                                variant="ghost"
                                disabled={acknowledge.isPending}
                                onClick={() => handleAcknowledge(alert.id)}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                              </CommandIconButton>
                            )}
                            {(alert.status === 'active' || alert.status === 'acknowledged') && (
                              <CommandIconButton
                                label="Resolve"
                                variant="primary"
                                disabled={resolve.isPending}
                                onClick={() => handleResolve(alert.id)}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </CommandIconButton>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedId === alert.id && (
                        <tr key={`${alert.id}-detail`} className="bg-white/[0.02]">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-2 gap-4 text-xs md:grid-cols-4">
                              <div>
                                <p className={`${ALERT_LABEL} mb-1`}>Alert ID</p>
                                <p className="font-mono tabular-nums text-zinc-300">{alert.id.slice(0, 12)}...</p>
                              </div>
                              <div>
                                <p className={`${ALERT_LABEL} mb-1`}>Full Message</p>
                                <p className="text-zinc-300">{alert.message || 'No message'}</p>
                              </div>
                              <div>
                                <p className={`${ALERT_LABEL} mb-1`}>Acknowledged By</p>
                                <p className="text-zinc-300">{alert.acknowledged_by_name || '—'}</p>
                                {alert.acknowledged_at && (
                                  <p className="mt-0.5 font-mono tabular-nums text-zinc-500">{formatDate(alert.acknowledged_at)}</p>
                                )}
                              </div>
                              <div>
                                <p className={`${ALERT_LABEL} mb-1`}>Resolved By</p>
                                <p className="text-zinc-300">{alert.resolved_by_name || '—'}</p>
                                {alert.resolved_at && (
                                  <p className="mt-0.5 font-mono tabular-nums text-zinc-500">{formatDate(alert.resolved_at)}</p>
                                )}
                              </div>
                              {alert.data && Object.keys(alert.data).length > 0 && (
                                <div className="col-span-2 md:col-span-4">
                                  <p className={`${ALERT_LABEL} mb-1`}>Data</p>
                                  <pre className="overflow-x-auto border border-white/10 bg-black/60 p-3 font-mono text-xs text-zinc-400">
                                    {JSON.stringify(alert.data, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Stack */}
            <div className="divide-y divide-white/5 md:hidden">
              {alerts.map((alert: any) => (
                <div key={alert.id} className="p-4 transition-colors hover:bg-white/[0.03]">
                  <div className="mb-2 flex items-start gap-3">
                    {alert.status === 'active' && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(alert.id)}
                        onChange={() => toggleSelect(alert.id)}
                        className="mt-1 accent-rose-500"
                      />
                    )}
                    <div className="mt-0.5">{severityIcon(alert.severity)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white">{alert.title}</p>
                        {statusBadge(alert.status)}
                      </div>
                      {alert.message && (
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{alert.message}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="border border-white/10 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-zinc-400">{alert.type?.replace(/_/g, ' ')}</span>
                        <span className="font-mono text-[10px] tabular-nums text-zinc-600">{formatDate(alert.created_at)}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-1.5">
                        <CommandButton
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Details
                        </CommandButton>
                        {alert.status === 'active' && (
                          <CommandButton
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAcknowledge(alert.id)}
                            disabled={acknowledge.isPending}
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Ack
                          </CommandButton>
                        )}
                        {(alert.status === 'active' || alert.status === 'acknowledged') && (
                          <CommandButton
                            variant="primary"
                            size="sm"
                            onClick={() => handleResolve(alert.id)}
                            disabled={resolve.isPending}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            Resolve
                          </CommandButton>
                        )}
                      </div>
                      {expandedId === alert.id && (
                        <div className="mt-3 space-y-2 border border-white/10 bg-white/[0.02] p-3 text-xs">
                          <div>
                            <span className="text-zinc-500">ID: </span>
                            <span className="font-mono text-zinc-300">{alert.id.slice(0, 12)}...</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Ack by: </span>
                            <span className="text-zinc-300">{alert.acknowledged_by_name || '—'}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500">Resolved by: </span>
                            <span className="text-zinc-300">{alert.resolved_by_name || '—'}</span>
                          </div>
                          {alert.data && Object.keys(alert.data).length > 0 && (
                            <pre className="overflow-x-auto border border-white/10 bg-black/60 p-2 font-mono text-zinc-400">
                              {JSON.stringify(alert.data, null, 2)}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                <span className="tabular-nums">{total}</span> total alert{total !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <CommandIconButton
                  label="Previous page"
                  variant="ghost"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </CommandIconButton>
                <span className="font-mono text-xs tabular-nums text-zinc-400">
                  Page {page} of {totalPages}
                </span>
                <CommandIconButton
                  label="Next page"
                  variant="ghost"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </CommandIconButton>
              </div>
            </div>
          </>
        )}
      </CommandSection>
    </AdminPage>
  );
};

export default AlertsManagement;
