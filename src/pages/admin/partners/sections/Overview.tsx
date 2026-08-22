import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAdminSponsors, useAdminSponsorApplications } from '@/hooks/useAdminQueries';
import { ArrowRight, ArrowUpDown, Eye, MousePointerClick, Search, TrendingUp, Users } from 'lucide-react';

interface FleetItem {
  id: string;
  name: string;
  tier: string | null;
  logoUrl: string | null;
  impressions30d: number;
  clicks30d: number;
  ctr30d: number;
  activePlacements: number;
}

const TIER_FILTERS = ['all', 'radiant', 'ascendant', 'diamond', 'partner', 'standard'] as const;

const TIER_BADGE: Record<string, string> = {
  radiant: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/25',
  ascendant: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/25',
  diamond: 'bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/25',
  partner: 'bg-zinc-700/40 text-zinc-300 ring-1 ring-white/10',
  standard: 'bg-zinc-700/40 text-zinc-300 ring-1 ring-white/10',
};

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);

type SortKey = 'name' | 'tier' | 'impressions30d' | 'clicks30d' | 'ctr30d' | 'activePlacements';

const OverviewSection = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<(typeof TIER_FILTERS)[number]>('all');
  const [sort, setSort] = useState<SortKey>('impressions30d');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  const { data: fleetData, isLoading: fleetLoading, isError: fleetError } = useQuery({
    queryKey: ['admin', 'sponsors', 'overview'],
    queryFn: () => apiClient.get<{ sponsors: FleetItem[] }>('/api/admin/sponsors/overview'),
    staleTime: 60_000,
  });
  const fleet = useMemo(() => fleetData?.sponsors ?? [], [fleetData]);

  const { data: sponsors = [] } = useAdminSponsors();
  const { data: applications = [] } = useAdminSponsorApplications();

  const pendingApps = applications.filter(a => a.status === 'pending').length;
  const activePartners = sponsors.filter(s => s.is_active).length;

  const totals = useMemo(() => fleet.reduce(
    (acc, s) => ({
      impressions: acc.impressions + (s.impressions30d || 0),
      clicks: acc.clicks + (s.clicks30d || 0),
    }),
    { impressions: 0, clicks: 0 },
  ), [fleet]);
  const fleetCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;

  const toggleSort = (key: SortKey) => {
    if (sort === key) setDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(key); setDir('desc'); }
  };
  const arrow = (key: SortKey) => (sort === key ? (dir === 'desc' ? ' ↓' : ' ↑') : '');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return fleet
      .filter(s => (tierFilter === 'all' ? true : (s.tier ?? '').toLowerCase() === tierFilter))
      .filter(s => !q || s.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const av = a[sort] ?? '';
        const bv = b[sort] ?? '';
        const cmp = typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv));
        return dir === 'asc' ? cmp : -cmp;
      });
  }, [fleet, search, tierFilter, sort, dir]);

  const kpis = [
    { label: 'Active Partners', value: fmt(activePartners), icon: Users, tone: 'text-white' },
    { label: 'Impressions · 30d', value: fmt(totals.impressions), icon: Eye, tone: 'text-white' },
    { label: 'Clicks · 30d', value: fmt(totals.clicks), icon: MousePointerClick, tone: 'text-white' },
    { label: 'Fleet CTR · 30d', value: `${fleetCtr.toFixed(2)}%`, icon: TrendingUp, tone: 'text-emerald-400' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="rounded-2xl border border-white/10 bg-[#0a0a0c] p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-zinc-500">{kpi.label}</p>
              <kpi.icon className={`h-4 w-4 ${kpi.tone === 'text-emerald-400' ? 'text-emerald-400' : 'text-zinc-600'}`} />
            </div>
            <p className={`font-heading text-2xl font-black ${kpi.tone}`}>{fleetLoading ? '…' : kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Pending pipeline banner */}
      {pendingApps > 0 && (
        <button
          onClick={() => navigate('/admin/partners/sponsors/pipeline')}
          className="flex w-full items-center justify-between rounded-xl border border-rose-500/25 bg-rose-500/[0.06] px-5 py-3.5 text-left transition hover:border-rose-500/45"
        >
          <span className="text-sm text-zinc-200">
            <strong className="text-white">{pendingApps}</strong> partner application{pendingApps === 1 ? '' : 's'} awaiting review
          </span>
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-300">
            Review <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </button>
      )}

      {/* Fleet table */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0c]">
        <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-semibold text-white">Sponsor Fleet</span>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search sponsors…"
                className="w-full rounded-lg border border-zinc-800 bg-black/40 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-zinc-600 focus:border-rose-500/40 focus:outline-none sm:w-48"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto" data-lenis-prevent>
              {TIER_FILTERS.map(t => (
                <button
                  key={t}
                  onClick={() => setTierFilter(t)}
                  className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition ${
                    tierFilter === t ? 'bg-zinc-800 text-white' : 'text-zinc-600 hover:text-zinc-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {fleetError ? (
          <div className="py-16 text-center text-sm text-red-400">Could not load sponsor overview.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-500">
                <tr>
                  {([
                    ['name', 'Sponsor'],
                    ['tier', 'Tier'],
                    ['impressions30d', 'Impr. 30d'],
                    ['clicks30d', 'Clicks'],
                    ['ctr30d', 'CTR'],
                    ['activePlacements', 'Placements'],
                  ] as [SortKey, string][]).map(([key, label]) => (
                    <th
                      key={key}
                      onClick={() => toggleSort(key)}
                      className={`cursor-pointer px-4 py-3 hover:text-zinc-300 ${key !== 'name' && key !== 'tier' ? 'tabular-nums' : ''}`}
                    >
                      <span className="inline-flex items-center gap-1">{label}<ArrowUpDown className="h-3 w-3 opacity-40" />{arrow(key)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map(s => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/admin/partners/sponsors/placements?sponsor=${s.id}`)}
                    className="cursor-pointer text-zinc-300 transition hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {s.logoUrl ? (
                          <img src={s.logoUrl} alt="" loading="lazy" className="h-7 w-7 rounded border border-zinc-800 object-contain" />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded border border-zinc-800 bg-zinc-950 text-[9px] text-zinc-600">?</div>
                        )}
                        <span className="font-medium text-white">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.tier ? (
                        <span className={`rounded px-1.5 py-0.5 text-[9px] font-mono uppercase ${TIER_BADGE[s.tier.toLowerCase()] ?? TIER_BADGE.standard}`}>
                          {s.tier}
                        </span>
                      ) : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{s.impressions30d > 0 ? fmt(s.impressions30d) : <span className="text-zinc-600">—</span>}</td>
                    <td className="px-4 py-3 tabular-nums">{s.clicks30d > 0 ? fmt(s.clicks30d) : <span className="text-zinc-600">—</span>}</td>
                    <td className="px-4 py-3 tabular-nums">{s.impressions30d > 0 ? `${s.ctr30d.toFixed(1)}%` : <span className="text-zinc-600">—</span>}</td>
                    <td className="px-4 py-3">
                      {s.activePlacements > 0
                        ? <span className="text-emerald-400">{s.activePlacements} active</span>
                        : <span className="text-zinc-600">0 active</span>}
                    </td>
                  </tr>
                ))}
                {!fleetLoading && rows.length === 0 && (
                  <tr><td colSpan={6} className="py-14 text-center text-zinc-600">No sponsors match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverviewSection;
