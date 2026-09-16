import { useMemo, useState } from 'react';
import { subDays, subHours } from 'date-fns';
import { Activity, AlertCircle, Clock, Zap } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CommandEmptyState,
  CommandMetric,
  CommandSection,
  CommandSegmentedButton,
} from '@/components/management/CommandSurface';
import { useDeveloperAnalytics } from '@/hooks/useDeveloperApi';

type Period = '24h' | '7d' | '30d';

function toIso(date: Date) {
  return date.toISOString();
}

function periodRange(period: Period): { from: string; to: string } {
  const to = new Date();
  const from =
    period === '24h'
      ? subHours(to, 24)
      : period === '7d'
        ? subDays(to, 7)
        : subDays(to, 30);
  return { from: toIso(from), to: toIso(to) };
}

const GRID_COLOR = '#27272a';

const axisStyle = {
  fill: '#71717a',
  fontSize: 10,
  fontFamily: 'monospace',
};

function errorRateTone(rate: number): 'success' | 'warning' | 'danger' | 'neutral' {
  if (rate === 0) return 'success';
  if (rate < 5) return 'warning';
  return 'danger';
}

function responseTone(ms: number): 'success' | 'warning' | 'neutral' {
  if (ms < 200) return 'success';
  if (ms < 500) return 'neutral';
  return 'warning';
}

function methodBadgeClass(method: string) {
  const map: Record<string, string> = {
    GET: 'border-blue-500/35 bg-blue-950/20 text-blue-300',
    POST: 'border-emerald-500/35 bg-emerald-950/20 text-emerald-300',
    PUT: 'border-amber-500/35 bg-amber-950/20 text-amber-300',
    PATCH: 'border-amber-500/35 bg-amber-950/20 text-amber-300',
    DELETE: 'border-red-500/35 bg-red-950/20 text-red-300',
  };
  return map[method.toUpperCase()] ?? 'border-white/10 text-zinc-400';
}

interface AnalyticsPanelProps {
  orgId: string;
}

export function AnalyticsPanel({ orgId }: AnalyticsPanelProps) {
  const [period, setPeriod] = useState<Period>('7d');
  const { from, to } = useMemo(() => periodRange(period), [period]);
  const { summary, timeseries, endpoints } = useDeveloperAnalytics(orgId, from, to);

  const summaryData = summary.data;
  const chartData = timeseries.data?.datapoints ?? [];
  const endpointRows = endpoints.data?.endpoints ?? [];
  const errorRate = summaryData && summaryData.total_requests > 0
    ? (summaryData.error_count / summaryData.total_requests) * 100
    : 0;

  return (
    <div className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          Period
        </span>
        {(['24h', '7d', '30d'] as Period[]).map((p) => (
          <CommandSegmentedButton
            key={p}
            active={period === p}
            onClick={() => setPeriod(p)}
          >
            {p}
          </CommandSegmentedButton>
        ))}
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CommandMetric
          label="Total Requests"
          value={summaryData ? summaryData.total_requests.toLocaleString() : '—'}
          icon={<Activity className="h-4 w-4" />}
          tone="neutral"
        />
        <CommandMetric
          label="Error Rate"
          value={summaryData ? `${errorRate.toFixed(1)}%` : '—'}
          icon={<AlertCircle className="h-4 w-4" />}
          tone={summaryData ? errorRateTone(errorRate) : 'neutral'}
        />
        <CommandMetric
          label="Avg Response"
          value={summaryData ? `${(summaryData.avg_response_ms ?? 0).toFixed(0)}ms` : '—'}
          icon={<Clock className="h-4 w-4" />}
          tone={summaryData ? responseTone(summaryData.avg_response_ms ?? 0) : 'neutral'}
        />
        <CommandMetric
          label="Rate Limited"
          value={summaryData ? summaryData.rate_limited_count.toLocaleString() : '—'}
          icon={<Zap className="h-4 w-4" />}
          tone={summaryData && summaryData.rate_limited_count > 0 ? 'warning' : 'neutral'}
        />
      </div>

      {/* Timeseries chart */}
      <CommandSection>
        <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-rose-400">
          Requests Over Time
        </p>
        {chartData.length === 0 ? (
          <CommandEmptyState
            title="No data yet"
            description="Make some API calls to see usage appear here."
          />
        ) : (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="requestsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="errorsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
                <XAxis
                  dataKey="timestamp"
                  tick={axisStyle}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickFormatter={(v: string) => {
                    const d = new Date(v);
                    return period === '24h'
                      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis
                  tick={axisStyle}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#0a0a0c',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 0,
                    color: '#fff',
                    fontSize: 11,
                    fontFamily: 'monospace',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 10, fontFamily: 'monospace', color: '#71717a' }}
                />
                <Area
                  type="monotone"
                  dataKey="request_count"
                  name="Requests"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fill="url(#requestsGrad)"
                  activeDot={{ r: 5, fill: '#fff' }}
                />
                <Area
                  type="monotone"
                  dataKey="error_count"
                  name="Errors"
                  stroke="#ef4444"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  fill="url(#errorsGrad)"
                  activeDot={{ r: 4, fill: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CommandSection>

      {/* Top endpoints table */}
      <CommandSection>
        <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.35em] text-rose-400">
          Top Endpoints
        </p>
        {endpointRows.length === 0 ? (
          <CommandEmptyState title="No endpoint data" description="Usage by endpoint will appear after API calls are made." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {['Path', 'Method', 'Requests', 'Avg Time', 'Error %'].map((h) => (
                    <th
                      key={h}
                      className="pb-2 text-left font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-600"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {endpointRows.map((row) => (
                  <tr
                    key={`${row.method}-${row.path}`}
                    className="border-b border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="py-2 pr-4 font-mono text-xs text-white">{row.path}</td>
                    <td className="py-2 pr-4">
                      <span
                        className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${methodBadgeClass(row.method)}`}
                      >
                        {row.method}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs text-zinc-300">
                      {row.request_count.toLocaleString()}
                    </td>
                    <td className="py-2 pr-4 text-xs text-zinc-300">
                      {row.avg_response_ms.toFixed(0)}ms
                    </td>
                    <td className="py-2 text-xs">
                      <span
                        className={
                          row.error_rate === 0
                            ? 'text-emerald-400'
                            : row.error_rate < 5
                              ? 'text-amber-400'
                              : 'text-red-400'
                        }
                      >
                        {row.error_rate.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CommandSection>
    </div>
  );
}
