import { useState } from 'react';
import { Clock, User, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

interface AuditLog {
  id: string;
  season_id: string;
  actor_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before_state: any;
  after_state: any;
  reason: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  actor_username?: string;
  actor_full_name?: string;
}

interface AdminAuditTrailProps {
  seasonId: string;
}

export default function AdminAuditTrail({ seasonId }: AdminAuditTrailProps) {
  const [filterAction, setFilterAction] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: auditLogs, isLoading, refetch } = useQuery({
    queryKey: ['adminAuditLogs', seasonId, filterAction, dateFrom, dateTo],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterAction) params.append('action', filterAction);
      if (dateFrom) params.append('from', dateFrom);
      if (dateTo) params.append('to', dateTo);
      const queryString = params.toString();
      const url = `/api/admin/seasons/${seasonId}/audit${queryString ? `?${queryString}` : ''}`;
      return apiClient.get<AuditLog[]>(url);
    },
  });

  const uniqueActions = Array.from(new Set(auditLogs?.map((log) => log.action) || []));

  const getActionBadge = (action: string) => {
    const actionColors: Record<string, string> = {
      season_created: 'bg-blue-100 text-blue-800',
      season_published: 'bg-green-100 text-green-800',
      season_updated: 'bg-purple-100 text-purple-800',
      season_cancelled: 'bg-red-100 text-red-800',
      tournament_created: 'bg-cyan-100 text-cyan-800',
      tournament_updated: 'bg-indigo-100 text-indigo-800',
      tournament_deleted: 'bg-red-100 text-red-800',
      announcement_created: 'bg-yellow-100 text-yellow-800',
      announcement_updated: 'bg-orange-100 text-orange-800',
      announcement_deleted: 'bg-red-100 text-red-800',
      manual_override: 'bg-pink-100 text-pink-800',
      admin_status_override: 'bg-gray-100 text-gray-800',
    };
    return actionColors[action] || 'bg-gray-100 text-gray-800';
  };

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Audit Trail</h2>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Clock className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {action.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input
              type="datetime-local"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilterAction('');
                setDateFrom('');
                setDateTo('');
              }}
              className="px-4 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Action</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actor</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Entity</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Reason</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Timestamp</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Details</th>
            </tr>
          </thead>
          <tbody>
            {auditLogs?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  No audit logs found.
                </td>
              </tr>
            ) : (
              auditLogs?.map((log) => (
                <>
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium capitalize ${getActionBadge(log.action)}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900">
                          {log.actor_full_name || log.actor_username || log.actor_id}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-400" />
                        <span>{log.entity_type}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm max-w-xs truncate">
                      {log.reason || '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 text-sm">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleRow(log.id)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        {expandedRow === log.id ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedRow === log.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="space-y-4">
                          {/* IP Address & User Agent */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">IP Address:</span>
                              <span className="ml-2 text-gray-600">{log.ip_address || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="font-medium text-gray-700">User Agent:</span>
                              <span className="ml-2 text-gray-600 text-xs max-w-md truncate block">
                                {log.user_agent || 'N/A'}
                              </span>
                            </div>
                          </div>

                          {/* Before State */}
                          {log.before_state && (
                            <div>
                              <span className="font-medium text-gray-700 text-sm">Before State:</span>
                              <pre className="mt-1 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                                {JSON.stringify(log.before_state, null, 2)}
                              </pre>
                            </div>
                          )}

                          {/* After State */}
                          {log.after_state && (
                            <div>
                              <span className="font-medium text-gray-700 text-sm">After State:</span>
                              <pre className="mt-1 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40">
                                {JSON.stringify(log.after_state, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
