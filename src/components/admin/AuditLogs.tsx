import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Search,
  Download,
  Eye,
  User,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Activity
} from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useAdminAuditLogs } from '@/hooks/useAdminQueries';

interface AuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action_type: string;
  target_type: string;
  target_id: string;
  target_name: string;
  details: any;
  ip_address: string;
  created_at: string;
}

const AuditLogs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const queryParams = useMemo(() => ({
    limit: itemsPerPage,
    offset: (currentPage - 1) * itemsPerPage,
    search: searchTerm || undefined,
    target_type: filterType !== 'all' ? filterType : undefined,
    from: dateFrom ? `${dateFrom}T00:00:00Z` : undefined,
    to: dateTo ? `${dateTo}T23:59:59Z` : undefined,
  }), [currentPage, itemsPerPage, searchTerm, filterType, dateFrom, dateTo]);

  const { data, isLoading } = useAdminAuditLogs(queryParams);

  const response = data;
  const logsArray = Array.isArray(response) ? response : (response?.data || []);
  const logs: AuditLog[] = logsArray.map((log: any) => ({
    ...log,
    action_type: log.action_type || log.action || '',
    admin_id: log.admin_id || log.actor_id || '',
    admin_name: log.admin_name || log.actor_name || 'System',
  }));
  const totalCount = response?.count || response?.total || logs.length;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const getActionIcon = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'create': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'update': return <Clock className="w-4 h-4 text-blue-400" />;
      case 'delete': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'suspend': return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'ban': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'approve': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'reject': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  const getTargetIcon = (targetType: string) => {
    switch (targetType) {
      case 'user': return <User className="w-4 h-4" />;
      case 'tournament': return <Calendar className="w-4 h-4" />;
      case 'venue': return <Shield className="w-4 h-4" />;
      case 'payment': return <CheckCircle className="w-4 h-4" />;
      case 'system': return <Activity className="w-4 h-4" />;
      case 'sponsor': return <Eye className="w-4 h-4" />;
      case 'dispute': return <AlertTriangle className="w-4 h-4" />;
      case 'match': return <Activity className="w-4 h-4" />;
      case 'team': return <User className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const exportLogs = async () => {
    try {
      const result = await apiClient.get<any>('/api/admin/audit-logs?export=true&order=created_at.desc');
      const data: AuditLog[] = (Array.isArray(result) ? result : (result?.data || [])).map((log: any) => ({
        ...log,
        action_type: log.action_type || log.action || '',
        admin_id: log.admin_id || log.actor_id || '',
        admin_name: log.admin_name || log.actor_name || 'System',
      }));

      // Convert to CSV
      const csvContent = [
        ['Date', 'Admin', 'Action', 'Target Type', 'Target', 'IP Address', 'Details'],
        ...data.map(log => [
          new Date(log.created_at).toLocaleString(),
          log.admin_name,
          log.action_type,
          log.target_type,
          log.target_name,
          log.ip_address,
          JSON.stringify(log.details)
        ])
      ].map(row => row.join(',')).join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error exporting logs:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Audit Logs</h2>
          <p className="text-zinc-500">Track all administrative actions and system events</p>
        </div>
        <Button
          onClick={exportLogs}
          variant="outline"
          className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-zinc-900/50 border-zinc-800 text-white focus:border-rose-500"
                />
              </div>
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48 bg-zinc-900/50 border-zinc-800 text-white">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="user">Users</SelectItem>
                <SelectItem value="tournament">Tournaments</SelectItem>
                <SelectItem value="venue">Venues</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="sponsor">Sponsors</SelectItem>
                <SelectItem value="dispute">Disputes</SelectItem>
                <SelectItem value="match">Matches</SelectItem>
                <SelectItem value="team">Teams</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Row */}
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1 block">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                className="bg-zinc-900/50 border-zinc-800 text-white"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-zinc-500 mb-1 block">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                className="bg-zinc-900/50 border-zinc-800 text-white"
              />
            </div>
            {(dateFrom || dateTo) && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDateFrom(''); setDateTo(''); setCurrentPage(1); }}
                  className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  Clear Dates
                </Button>
              </div>
            )}
          </div>
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl bg-[#0a0a0c] border border-zinc-800/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800/50 bg-zinc-900/50">
                <TableHead className="text-xs font-mono text-zinc-500 uppercase">Date & Time</TableHead>
                <TableHead className="text-xs font-mono text-zinc-500 uppercase">Admin</TableHead>
                <TableHead className="text-xs font-mono text-zinc-500 uppercase">Action</TableHead>
                <TableHead className="text-xs font-mono text-zinc-500 uppercase">Target</TableHead>
                <TableHead className="text-xs font-mono text-zinc-500 uppercase">IP Address</TableHead>
                <TableHead className="text-xs font-mono text-zinc-500 uppercase text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <div className="flex items-center justify-center gap-2 text-zinc-500">
                      <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                      Loading audit logs...
                    </div>
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-zinc-500">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="border-zinc-800/50 hover:bg-zinc-900/50">
                    <TableCell className="text-white">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-zinc-500" />
                        <span className="text-sm">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-white">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-zinc-500" />
                        <span className="text-sm">{log.admin_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-white">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action_type)}
                        <span className="capitalize text-sm">{log.action_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-white">
                      <div className="flex items-center gap-2">
                        {getTargetIcon(log.target_type)}
                        <div>
                          <div className="font-medium text-sm">{log.target_name || log.target_id?.slice(0, 12)}</div>
                          <div className="text-xs text-zinc-500 capitalize">{log.target_type}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-zinc-500 font-mono text-xs">
                      {log.ip_address || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-zinc-400 hover:text-white"
                        onClick={() => { setSelectedLog(log); setDetailsOpen(true); }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Previous
          </Button>

          <span className="text-zinc-500 text-sm">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            Next
          </Button>
        </div>
      )}
      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="bg-[#0a0a0c] border-zinc-800 max-w-3xl text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Log Details</DialogTitle>
            <DialogDescription className="text-zinc-500">
              Full payload for auditing and debugging
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-xl bg-zinc-900/50">
                  <span className="text-xs text-zinc-500 uppercase">Date</span>
                  <p className="text-white mt-1">{new Date(selectedLog.created_at).toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/50">
                  <span className="text-xs text-zinc-500 uppercase">Admin</span>
                  <p className="text-white mt-1">{selectedLog.admin_name}</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/50">
                  <span className="text-xs text-zinc-500 uppercase">Action</span>
                  <p className="text-white capitalize mt-1">{selectedLog.action_type}</p>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/50">
                  <span className="text-xs text-zinc-500 uppercase">Target</span>
                  <p className="text-white capitalize mt-1">{selectedLog.target_type} • {selectedLog.target_name || selectedLog.target_id?.slice(0, 12)}</p>
                </div>
                {selectedLog.ip_address && (
                  <div className="p-3 rounded-xl bg-zinc-900/50">
                    <span className="text-xs text-zinc-500 uppercase">IP</span>
                    <p className="text-white font-mono mt-1">{selectedLog.ip_address}</p>
                  </div>
                )}
              </div>
              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-4">
                <p className="text-xs text-zinc-500 uppercase mb-2">Details</p>
                <pre className="text-sm text-zinc-300 overflow-auto max-h-80 whitespace-pre-wrap break-words font-mono">{JSON.stringify(selectedLog.details, null, 2)}</pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="border-zinc-800 text-zinc-400 hover:text-white" onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogs;
