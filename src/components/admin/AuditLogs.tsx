import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  Filter,
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
import { useAuth } from '@/contexts/AuthContext';

interface AuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action_type: string;
  target_type: 'user' | 'tournament' | 'venue' | 'payment' | 'system' | 'sponsor' | 'dispute' | 'match' | 'team';
  target_id: string;
  target_name: string;
  details: any;
  ip_address: string;
  user_agent: string;
  created_at: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const AuditLogs: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('perPage', String(itemsPerPage));
      params.set('order', 'created_at.desc');

      if (filterType !== 'all') {
        params.set('target_type', filterType);
      }
      if (filterSeverity !== 'all') {
        params.set('severity', filterSeverity);
      }
      if (searchTerm) {
        params.set('search', searchTerm);
      }
      if (dateFrom) {
        params.set('from', new Date(dateFrom).toISOString());
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setDate(endDate.getDate() + 1);
        params.set('to', endDate.toISOString());
      }

      const result = await apiClient.get<{ data: AuditLog[]; count: number }>(`/api/admin/audit-logs?${params.toString()}`);

      setLogs(result.data || []);
      setTotalPages(Math.ceil((result.count || 0) / itemsPerPage));

    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [currentPage, filterType, filterSeverity, searchTerm, dateFrom, dateTo]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      case 'low': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

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
      const data = await apiClient.get<AuditLog[]>('/api/admin/audit-logs?export=true&order=created_at.desc');

      // Convert to CSV
      const csvContent = [
        ['Date', 'Admin', 'Action', 'Target Type', 'Target', 'Severity', 'IP Address', 'Details'],
        ...data.map(log => [
          new Date(log.created_at).toLocaleString(),
          log.admin_name,
          log.action_type,
          log.target_type,
          log.target_name,
          log.severity,
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
          <p className="text-gray-400">Track all administrative actions and system events</p>
        </div>
        <Button
          onClick={exportLogs}
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-700"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </div>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full md:w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
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

            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-full md:w-48 bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600">
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range Row */}
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">From</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 mb-1 block">To</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
            {(dateFrom || dateTo) && (
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDateFrom(''); setDateTo(''); setCurrentPage(1); }}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Clear Dates
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">Date & Time</TableHead>
                <TableHead className="text-gray-300">Admin</TableHead>
                <TableHead className="text-gray-300">Action</TableHead>
                <TableHead className="text-gray-300">Target</TableHead>
                <TableHead className="text-gray-300">Severity</TableHead>
                <TableHead className="text-gray-300">IP Address</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                    Loading audit logs...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-400">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id} className="border-gray-700 hover:bg-gray-700/30">
                    <TableCell className="text-white">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell className="text-white">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        {log.admin_name}
                      </div>
                    </TableCell>
                    <TableCell className="text-white">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action_type)}
                        <span className="capitalize">{log.action_type}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-white">
                      <div className="flex items-center gap-2">
                        {getTargetIcon(log.target_type)}
                        <div>
                          <div className="font-medium">{log.target_name}</div>
                          <div className="text-xs text-gray-400 capitalize">{log.target_type}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getSeverityColor(log.severity)} text-white`}>
                        {log.severity.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-400 font-mono text-sm">
                      {log.ip_address}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
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
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Previous
          </Button>

          <span className="text-gray-400">
            Page {currentPage} of {totalPages}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Next
          </Button>
        </div>
      )}
      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-3xl text-white">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
            <DialogDescription className="text-gray-400">
              Full payload for auditing and debugging
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-400">Date:</span> {new Date(selectedLog.created_at).toLocaleString()}</div>
                <div><span className="text-gray-400">Admin:</span> {selectedLog.admin_name}</div>
                <div className="capitalize"><span className="text-gray-400">Action:</span> {selectedLog.action_type}</div>
                <div className="capitalize"><span className="text-gray-400">Target:</span> {selectedLog.target_type} • {selectedLog.target_name}</div>
                <div><span className="text-gray-400">Severity:</span> {selectedLog.severity}</div>
                <div><span className="text-gray-400">IP:</span> {selectedLog.ip_address}</div>
              </div>
              <div className="bg-gray-900 rounded border border-gray-700 p-3 text-xs overflow-auto max-h-80">
                <pre className="whitespace-pre-wrap break-words">{JSON.stringify(selectedLog.details, null, 2)}</pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="border-gray-600 text-gray-300" onClick={() => setDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditLogs;
