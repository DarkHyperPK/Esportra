import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { ArrowLeft, Bell, AlertTriangle, CheckCircle, XCircle, RefreshCw, Filter, ChevronLeft, ChevronRight, Activity, Eye, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAdminAlerts, useAdminAlertSummary, useAcknowledgeAlert, useResolveAlert, useBulkAcknowledgeAlerts } from "@/hooks/useAdminQueries";
import { useToast } from "@/hooks/use-toast";

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
    if (s === 'critical') return <AlertTriangle className="w-4 h-4 text-red-500" />;
    if (s === 'warning') return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    return <Activity className="w-4 h-4 text-blue-400" />;
  };

  const statusBadge = (s: string) => {
    if (s === 'active') return <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/20 text-xs">Active</Badge>;
    if (s === 'acknowledged') return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">Acknowledged</Badge>;
    if (s === 'resolved') return <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">Resolved</Badge>;
    return <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 text-xs">{s}</Badge>;
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const summaryCards = [
    { label: 'Critical', count: summary?.critical_count ?? 0, color: 'red', icon: AlertTriangle },
    { label: 'Warning', count: summary?.warning_count ?? 0, color: 'amber', icon: AlertTriangle },
    { label: 'Info', count: summary?.info_count ?? 0, color: 'blue', icon: Activity },
    { label: 'Acknowledged', count: summary?.acknowledged_count ?? 0, color: 'green', icon: CheckCircle },
  ];

  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    red: { bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500/20' },
    green: { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500/20' },
  };

  return (
    <div className="min-h-screen p-4 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div className="flex items-center gap-4">
          <Link to="/admin">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-rose-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Alert Center</h1>
              <p className="text-xs text-zinc-500">Monitor & manage system alerts</p>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="border-zinc-800 text-zinc-400 hover:text-white hover:border-white/25"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </motion.div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
      >
        {summaryCards.map((card, idx) => {
          const colors = colorMap[card.color];
          return (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * idx }}
              className={`p-4 rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 hover:border-zinc-700/50 transition-all`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
                  <card.icon className={`w-4 h-4 ${colors.text}`} />
                </div>
                <span className="text-xs text-zinc-500">{card.label}</span>
              </div>
              <p className={`text-2xl font-bold ${colors.text}`}>
                {summaryLoading ? '...' : card.count}
              </p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Filter Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-xl bg-[#0a0a0c] border border-zinc-800/50"
      >
        <Filter className="w-4 h-4 text-zinc-500" />

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-rose-500/50"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>

        <select
          value={severityFilter}
          onChange={(e) => { setSeverityFilter(e.target.value); setPage(1); }}
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-rose-500/50"
        >
          <option value="">All Severity</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-rose-500/50"
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
          className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-rose-500/50"
        >
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
        </select>

        {selectedIds.length > 0 && (
          <Button
            size="sm"
            onClick={handleBulkAcknowledge}
            disabled={bulkAcknowledge.isPending}
            className="ml-auto bg-rose-500 hover:bg-rose-600 text-white"
          >
            {bulkAcknowledge.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Acknowledge ({selectedIds.length})
          </Button>
        )}
      </motion.div>

      {/* Alerts Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl bg-[#0a0a0c] border border-zinc-800/50 overflow-hidden"
      >
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-rose-500 animate-spin mb-3" />
            <p className="text-zinc-500 text-sm">Loading alerts...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16">
            <XCircle className="w-8 h-8 text-red-500 mb-3" />
            <p className="text-zinc-400 text-sm mb-3">Failed to load alerts</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="border-zinc-800 text-zinc-400">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Bell className="w-8 h-8 text-zinc-600 mb-3" />
            <p className="text-zinc-400 text-sm">No alerts found</p>
            <p className="text-zinc-600 text-xs mt-1">Adjust filters or check back later</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={allActiveSelected}
                        onChange={toggleSelectAll}
                        className="rounded border-zinc-700 bg-zinc-900 text-rose-500 focus:ring-rose-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase">Time</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert: any) => (
                    <React.Fragment key={alert.id}>
                      <tr
                        className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          {alert.status === 'active' && (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(alert.id)}
                              onChange={() => toggleSelect(alert.id)}
                              className="rounded border-zinc-700 bg-zinc-900 text-rose-500 focus:ring-rose-500"
                            />
                          )}
                        </td>
                        <td className="px-4 py-3">{severityIcon(alert.severity)}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-white">{alert.title}</p>
                          {alert.message && (
                            <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[300px]">{alert.message}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-xs">{alert.type?.replace(/_/g, ' ')}</Badge>
                        </td>
                        <td className="px-4 py-3">{statusBadge(alert.status)}</td>
                        <td className="px-4 py-3 text-xs text-zinc-500 whitespace-nowrap">{formatDate(alert.created_at)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                              className="text-zinc-500 hover:text-white h-7 px-2"
                              title="View details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            {(alert.status === 'active') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAcknowledge(alert.id)}
                                disabled={acknowledge.isPending}
                                className="text-zinc-500 hover:text-amber-400 h-7 px-2"
                                title="Acknowledge"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                              </Button>
                            )}
                            {(alert.status === 'active' || alert.status === 'acknowledged') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleResolve(alert.id)}
                                disabled={resolve.isPending}
                                className="text-zinc-500 hover:text-green-400 h-7 px-2"
                                title="Resolve"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedId === alert.id && (
                        <tr key={`${alert.id}-detail`} className="bg-zinc-900/30">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                              <div>
                                <p className="text-zinc-600 uppercase mb-1">Alert ID</p>
                                <p className="text-zinc-300 font-mono">{alert.id.slice(0, 12)}...</p>
                              </div>
                              <div>
                                <p className="text-zinc-600 uppercase mb-1">Full Message</p>
                                <p className="text-zinc-300">{alert.message || 'No message'}</p>
                              </div>
                              <div>
                                <p className="text-zinc-600 uppercase mb-1">Acknowledged By</p>
                                <p className="text-zinc-300">{alert.acknowledged_by_name || '—'}</p>
                                {alert.acknowledged_at && (
                                  <p className="text-zinc-500 mt-0.5">{formatDate(alert.acknowledged_at)}</p>
                                )}
                              </div>
                              <div>
                                <p className="text-zinc-600 uppercase mb-1">Resolved By</p>
                                <p className="text-zinc-300">{alert.resolved_by_name || '—'}</p>
                                {alert.resolved_at && (
                                  <p className="text-zinc-500 mt-0.5">{formatDate(alert.resolved_at)}</p>
                                )}
                              </div>
                              {alert.data && Object.keys(alert.data).length > 0 && (
                                <div className="col-span-2 md:col-span-4">
                                  <p className="text-zinc-600 uppercase mb-1">Data</p>
                                  <pre className="text-zinc-400 bg-zinc-950 p-3 rounded-lg overflow-x-auto font-mono text-xs">
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
            <div className="md:hidden divide-y divide-zinc-800/50">
              {alerts.map((alert: any) => (
                <div key={alert.id} className="p-4 hover:bg-zinc-900/30 transition-colors">
                  <div className="flex items-start gap-3 mb-2">
                    {alert.status === 'active' && (
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(alert.id)}
                        onChange={() => toggleSelect(alert.id)}
                        className="mt-1 rounded border-zinc-700 bg-zinc-900 text-rose-500 focus:ring-rose-500"
                      />
                    )}
                    <div className="mt-0.5">{severityIcon(alert.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-white">{alert.title}</p>
                        {statusBadge(alert.status)}
                      </div>
                      {alert.message && (
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{alert.message}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700 text-xs">{alert.type?.replace(/_/g, ' ')}</Badge>
                        <span className="text-[10px] text-zinc-600">{formatDate(alert.created_at)}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
                          className="text-zinc-500 hover:text-white h-7 px-2"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          <span className="text-xs">Details</span>
                        </Button>
                        {alert.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAcknowledge(alert.id)}
                            className="text-zinc-500 hover:text-amber-400 h-7 px-2"
                          >
                            <CheckCircle className="w-3.5 h-3.5 mr-1" />
                            <span className="text-xs">Ack</span>
                          </Button>
                        )}
                        {(alert.status === 'active' || alert.status === 'acknowledged') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResolve(alert.id)}
                            className="text-zinc-500 hover:text-green-400 h-7 px-2"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            <span className="text-xs">Resolve</span>
                          </Button>
                        )}
                      </div>
                      {expandedId === alert.id && (
                        <div className="mt-3 p-3 bg-zinc-900/50 rounded-lg text-xs space-y-2">
                          <div>
                            <span className="text-zinc-600">ID: </span>
                            <span className="text-zinc-300 font-mono">{alert.id.slice(0, 12)}...</span>
                          </div>
                          <div>
                            <span className="text-zinc-600">Ack by: </span>
                            <span className="text-zinc-300">{alert.acknowledged_by_name || '—'}</span>
                          </div>
                          <div>
                            <span className="text-zinc-600">Resolved by: </span>
                            <span className="text-zinc-300">{alert.resolved_by_name || '—'}</span>
                          </div>
                          {alert.data && Object.keys(alert.data).length > 0 && (
                            <pre className="text-zinc-400 bg-zinc-950 p-2 rounded-lg overflow-x-auto font-mono">
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
              <p className="text-xs text-zinc-500">
                {total} total alert{total !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="text-zinc-500 hover:text-white h-7 px-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs text-zinc-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="text-zinc-500 hover:text-white h-7 px-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default AlertsManagement;
