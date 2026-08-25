import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { csvEscape } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import {
  CommandButton,
  CommandEmptyState,
  CommandSection,
  CommandSegmentedButton,
  CommandToolbar,
} from '@/components/management/CommandSurface';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  ChevronRight,
  Download,
  Loader2,
  Search,
} from 'lucide-react';

type AuditSource = 'staff' | 'platform';
type AuditSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

interface AuditRow {
  source: AuditSource;
  id: string;
  created_at: string;
  actor_name: string;
  actor_id: string;
  action_type: string;
  target_type: string;
  target_id: string;
  target_name: string;
  details: string;
  ip_address: string;
  user_agent: string;
  severity: AuditSeverity;
}

interface AuditLogsResponse {
  data: AuditRow[];
  count: number;
  page: number;
  limit: number;
}

const TARGET_TYPES = ['match', 'tournament', 'user', 'team', 'venue', 'sponsor', 'system', 'dispute'] as const;

const PAGE_LIMIT = 25;
const REFRESH_INTERVAL_MS = 30_000;
const SEARCH_DEBOUNCE_MS = 300;

const INPUT_CLASS =
  'h-9 w-full rounded-none border border-white/10 bg-[#0a0a0c]/90 px-3 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20';

const SEVERITY_DOT: Record<AuditSeverity, string> = {
  critical: 'animate-pulse bg-red-300',
  high: 'bg-red-300',
  medium: 'bg-amber-300',
  low: 'bg-zinc-600',
  info: 'bg-zinc-600',
};

function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function splitAction(actionType: string): { namespace: string | null; label: string } {
  if (!actionType) return { namespace: null, label: '—' };
  const dotIndex = actionType.indexOf('.');
  if (dotIndex > 0 && dotIndex < actionType.length - 1) {
    return { namespace: actionType.slice(0, dotIndex), label: actionType.slice(dotIndex + 1).replace(/[_.]/g, ' ') };
  }
  return { namespace: null, label: actionType };
}

function formatTimestamp(iso: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDetails(raw: string): string {
  if (!raw) return '{}';
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
  } catch {
    return raw;
  }
}

const AuditLogs = () => {
  const [searchInput, setSearchInput] = useState('');
  const [actionInput, setActionInput] = useState('');
  const [actorInput, setActorInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput.trim(), SEARCH_DEBOUNCE_MS);
  const debouncedAction = useDebouncedValue(actionInput.trim(), SEARCH_DEBOUNCE_MS);
  const debouncedActor = useDebouncedValue(actorInput.trim(), SEARCH_DEBOUNCE_MS);

  const [source, setSource] = useState<'all' | AuditSource>('all');
  const [targetType, setTargetType] = useState('all');
  const [severity, setSeverity] = useState<'all' | AuditSeverity>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const filterRecord = useMemo<Record<string, string>>(() => ({
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(debouncedAction ? { action: debouncedAction } : {}),
    ...(debouncedActor ? { actor: debouncedActor } : {}),
    ...(source !== 'all' ? { source } : {}),
    ...(targetType !== 'all' ? { target_type: targetType } : {}),
    ...(severity !== 'all' ? { severity } : {}),
    ...(dateFrom ? { from: `${dateFrom}T00:00:00Z` } : {}),
    ...(dateTo ? { to: `${dateTo}T23:59:59Z` } : {}),
  }), [debouncedSearch, debouncedAction, debouncedActor, source, targetType, severity, dateFrom, dateTo]);

  const hasActiveFilters = Object.keys(filterRecord).length > 0;

  const { data, isLoading, isError, refetch } = useQuery<AuditLogsResponse>({
    queryKey: ['admin', 'audit-logs', filterRecord, page],
    queryFn: () => {
      const qs = new URLSearchParams({ ...filterRecord, page: String(page), limit: String(PAGE_LIMIT) });
      return apiClient.get<AuditLogsResponse>(`/api/admin/audit-logs?${qs.toString()}`);
    },
    placeholderData: keepPreviousData,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  useEffect(() => {
    setPage(1);
    setExpandedId(null);
  }, [filterRecord]);

  const rows = useMemo(() => data?.data ?? [], [data]);
  const count = data?.count ?? 0;
  const maxPage = Math.max(1, Math.ceil(count / PAGE_LIMIT));

  useEffect(() => {
    if (page > maxPage) setPage(maxPage);
  }, [page, maxPage]);

  const actionPrefixes = useMemo(
    () =>
      Array.from(new Set(rows.map(row => splitAction(row.action_type).namespace ?? row.action_type).filter(Boolean))).sort(),
    [rows],
  );

  const rangeStart = count === 0 ? 0 : (page - 1) * PAGE_LIMIT + 1;
  const rangeEnd = Math.min(page * PAGE_LIMIT, count);

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const qs = new URLSearchParams({ ...filterRecord, page: '1', limit: '1000' });
      const payload = await apiClient.get<AuditLogsResponse>(`/api/admin/audit-logs?${qs.toString()}`);
      const exportRows = Array.isArray(payload?.data) ? payload.data : [];
      const lines = [
        ['timestamp', 'actor', 'source', 'severity', 'action', 'target_type', 'target', 'target_id', 'ip_address', 'user_agent', 'details'].join(','),
        ...exportRows.map(row =>
          [
            new Date(row.created_at).toISOString(),
            row.actor_name,
            row.source,
            row.severity,
            row.action_type,
            row.target_type,
            row.target_name || row.target_id,
            row.target_id,
            row.ip_address,
            row.user_agent,
            formatDetails(row.details).replace(/\s+/g, ' '),
          ]
            .map(csvEscape)
            .join(','),
        ),
      ];
      const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Export failed', description: 'Could not export audit logs. Try again.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <AuditFilters
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        source={source}
        onSourceChange={setSource}
        targetType={targetType}
        onTargetTypeChange={setTargetType}
        severity={severity}
        onSeverityChange={setSeverity}
        actionInput={actionInput}
        onActionChange={setActionInput}
        actorInput={actorInput}
        onActorChange={setActorInput}
        dateFrom={dateFrom}
        onDateFromChange={setDateFrom}
        dateTo={dateTo}
        onDateToChange={setDateTo}
        actionPrefixes={actionPrefixes}
      />

      <CommandSection className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3 font-mono text-[10px] tracking-[0.3em] uppercase text-zinc-500">
            <span>{count} events</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-400/80">
              <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
              live · 30s
            </span>
          </div>
          <CommandButton variant="ghost" size="sm" onClick={handleExportCsv} disabled={exporting}>
            {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            Export CSV
          </CommandButton>
        </div>

        {isLoading ? (
          <div className="flex min-h-[240px] items-center justify-center border border-dashed border-transparent">
            <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
          </div>
        ) : isError ? (
          <div className="p-5">
            <CommandEmptyState
              title="Failed to load audit trail"
              description="The audit service did not respond. Retry in a moment."
              icon={<AlertTriangle className="h-5 w-5 text-red-300" />}
              action={
                <CommandButton variant="secondary" size="sm" onClick={() => refetch()}>
                  Retry
                </CommandButton>
              }
            />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-5">
            <CommandEmptyState
              title="No audit events"
              description={
                hasActiveFilters
                  ? 'No events match the current filters. Loosen a filter or widen the date range.'
                  : 'Staff and platform actions will appear here as they happen.'
              }
              icon={<Search className="h-5 w-5" />}
            />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-xs">
                <thead className="bg-black/40 font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Severity</th>
                    <th className="px-4 py-3 font-medium">Actor</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Target</th>
                    <th className="px-4 py-3 font-medium">IP</th>
                    <th className="w-12 px-2 py-3 font-medium">
                      <span className="sr-only">Expand</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <AuditTableRow
                      key={row.id}
                      log={row}
                      expanded={expandedId === row.id}
                      onToggle={() => setExpandedId(prev => (prev === row.id ? null : row.id))}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-4 py-3">
              <span className="font-mono text-[11px] tabular-nums text-zinc-500">
                {rangeStart}–{rangeEnd} of {count}
              </span>
              <div className="flex items-center gap-2">
                <CommandButton variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(prev => Math.max(1, prev - 1))}>
                  Prev
                </CommandButton>
                <CommandButton variant="ghost" size="sm" disabled={rangeEnd >= count} onClick={() => setPage(prev => prev + 1)}>
                  Next
                </CommandButton>
              </div>
            </div>
          </>
        )}
      </CommandSection>
    </div>
  );
};

interface AuditFiltersProps {
  searchInput: string;
  onSearchChange: (value: string) => void;
  source: 'all' | AuditSource;
  onSourceChange: (value: 'all' | AuditSource) => void;
  targetType: string;
  onTargetTypeChange: (value: string) => void;
  severity: 'all' | AuditSeverity;
  onSeverityChange: (value: 'all' | AuditSeverity) => void;
  actionInput: string;
  onActionChange: (value: string) => void;
  actorInput: string;
  onActorChange: (value: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  actionPrefixes: string[];
}

function AuditFilters(props: AuditFiltersProps) {
  return (
    <div className="space-y-3">
      <CommandToolbar className="flex-wrap items-stretch gap-x-4 gap-y-3 lg:flex-nowrap">
        <FilterField label="Search" className="min-w-[220px] flex-[2]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
            <input
              value={props.searchInput}
              onChange={e => props.onSearchChange(e.target.value)}
              placeholder="Actor, action, target…"
              className={cn(INPUT_CLASS, 'pl-9')}
            />
          </div>
        </FilterField>

        <FilterField label="Source">
          <div className="flex h-9 items-center gap-1">
            {(['all', 'platform', 'staff'] as const).map(value => (
              <CommandSegmentedButton key={value} active={props.source === value} onClick={() => props.onSourceChange(value)}>
                {value === 'all' ? 'All' : value}
              </CommandSegmentedButton>
            ))}
          </div>
        </FilterField>

        <FilterField label="Severity">
          <div className="flex h-9 flex-wrap items-center gap-1">
            {(['all', 'info', 'low', 'medium', 'high', 'critical'] as const).map(value => (
              <CommandSegmentedButton key={value} active={props.severity === value} onClick={() => props.onSeverityChange(value)}>
                {value === 'all' ? 'All' : value.charAt(0).toUpperCase() + value.slice(1)}
              </CommandSegmentedButton>
            ))}
          </div>
        </FilterField>
      </CommandToolbar>

      <CommandToolbar className="flex-wrap items-stretch gap-x-4 gap-y-3 lg:flex-nowrap">
        <FilterField label="Target" className="w-full sm:w-44">
          <Select value={props.targetType} onValueChange={props.onTargetTypeChange}>
            <SelectTrigger className="h-9 rounded-none border-white/10 bg-[#0a0a0c]/90 font-mono text-xs focus:ring-rose-500/20">
              <SelectValue placeholder="Target type" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-white/10 bg-[#0a0a0c]">
              <SelectItem value="all" className="font-mono text-xs">All Targets</SelectItem>
              {TARGET_TYPES.map(type => (
                <SelectItem key={type} value={type} className="font-mono text-xs capitalize">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Action" className="w-full sm:w-44">
          <input
            value={props.actionInput}
            onChange={e => props.onActionChange(e.target.value)}
            placeholder="e.g. Match or delete"
            list="audit-action-prefixes"
            className={cn(INPUT_CLASS, 'font-mono')}
          />
          <datalist id="audit-action-prefixes">
            {props.actionPrefixes.map(prefix => (
              <option key={prefix} value={prefix} />
            ))}
          </datalist>
        </FilterField>

        <FilterField label="Actor" className="w-full sm:w-44">
          <input
            value={props.actorInput}
            onChange={e => props.onActorChange(e.target.value)}
            placeholder="Actor name"
            className={INPUT_CLASS}
          />
        </FilterField>

        <FilterField label="From" className="w-full sm:w-40">
          <input
            type="date"
            value={props.dateFrom}
            max={props.dateTo || undefined}
            onChange={e => props.onDateFromChange(e.target.value)}
            className={cn(INPUT_CLASS, 'font-mono tabular-nums [color-scheme:dark]')}
          />
        </FilterField>

        <FilterField label="To" className="w-full sm:w-40">
          <input
            type="date"
            value={props.dateTo}
            min={props.dateFrom || undefined}
            onChange={e => props.onDateToChange(e.target.value)}
            className={cn(INPUT_CLASS, 'font-mono tabular-nums [color-scheme:dark]')}
          />
        </FilterField>
      </CommandToolbar>
    </div>
  );
}

function FilterField({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('min-w-0', className)}>
      <span className="mb-1 block font-mono text-[10px] tracking-[0.3em] uppercase text-zinc-500">{label}</span>
      {children}
    </div>
  );
}

function AuditTableRow({ log, expanded, onToggle }: { log: AuditRow; expanded: boolean; onToggle: () => void }) {
  const { namespace, label } = splitAction(log.action_type);

  return (
    <>
      <tr className="border-t border-white/5 transition-colors hover:bg-white/[0.02]">
        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-zinc-300">
          {formatTimestamp(log.created_at)}
        </td>
        <td className="whitespace-nowrap px-4 py-3">
          <span className="inline-flex items-center gap-2">
            <span className={cn('h-2 w-2 shrink-0 rounded-full', SEVERITY_DOT[log.severity] ?? 'bg-zinc-600')} />
            <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-400">{log.severity || 'info'}</span>
          </span>
        </td>
        <td className="max-w-[220px] px-4 py-3">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-white" title={`${log.actor_name} · ${log.actor_id}`}>
              {log.actor_name || 'System'}
            </span>
            {log.source === 'platform' ? (
              <span className="shrink-0 border border-rose-500/40 px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-rose-300">
                platform
              </span>
            ) : (
              <span className="shrink-0 border border-white/15 px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-zinc-400">
                staff
              </span>
            )}
          </span>
        </td>
        <td className="max-w-[200px] px-4 py-3">
          <span className="flex items-center gap-2">
            {namespace ? (
              <span className="shrink-0 border border-white/15 bg-white/[0.03] px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-zinc-300">
                {namespace}
              </span>
            ) : null}
            <span className="truncate text-zinc-200">{label}</span>
          </span>
        </td>
        <td className="max-w-[240px] px-4 py-3">
          <span className="flex items-center gap-2">
            <span className="truncate text-white" title={log.target_name || log.target_id}>
              {log.target_name || log.target_id || '—'}
            </span>
            {log.target_type ? (
              <span className="shrink-0 border border-white/10 px-1.5 py-px font-mono text-[9px] uppercase tracking-wider text-zinc-500">
                {log.target_type}
              </span>
            ) : null}
          </span>
        </td>
        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-zinc-500">{log.ip_address || '—'}</td>
        <td className="px-2 py-3 text-right">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
            className="inline-flex h-7 w-7 items-center justify-center border border-white/10 bg-white/[0.03] text-zinc-500 transition-colors hover:text-white"
          >
            <ChevronRight className={cn('h-3.5 w-3.5 transition-transform duration-200', expanded && 'rotate-90')} />
          </button>
        </td>
      </tr>

      {expanded ? (
        <tr className="border-t border-white/5">
          <td colSpan={7} className="bg-black/30 p-0">
            <div className="space-y-3 px-4 py-4">
              <div>
                <div className="mb-2 font-mono text-[10px] tracking-[0.3em] uppercase text-zinc-500">Details</div>
                <pre className="max-h-64 overflow-auto border border-white/10 bg-black/40 p-3 font-mono text-xs leading-relaxed text-zinc-300">
                  {formatDetails(log.details)}
                </pre>
              </div>
              {log.user_agent ? (
                <p className="truncate font-mono text-[10px] text-zinc-500" title={log.user_agent}>
                  <span className="mr-2 tracking-[0.3em] text-zinc-600">USER-AGENT</span>
                  {log.user_agent}
                </p>
              ) : null}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

export default AuditLogs;
