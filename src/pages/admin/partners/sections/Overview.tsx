import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { useAdminSponsors, useAdminSponsorApplications } from '@/hooks/useAdminQueries';
import {
  CommandActionBar,
  CommandButton,
  CommandEmptyState,
  CommandMetric,
  CommandSection,
  CommandSegmentedButton,
  CommandToolbar,
} from '@/components/management/CommandSurface';
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
  radiant: 'border-white/40 bg-white/[0.06] text-white',
  ascendant: 'border-white/25 bg-white/[0.03] text-zinc-200',
  diamond: 'border-white/15 bg-transparent text-zinc-300',
  partner: 'border-white/10 bg-transparent text-zinc-400',
  standard: 'border-white/10 bg-transparent text-zinc-500',
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

  return (
    <div className="space-y-5">
      {/* Fleet metrics */}
      <CommandSection>
        <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-rose-400">
          Fleet · 30 days
        </p>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <CommandMetric label="Active Partners" value={fleetLoading ? '…' : fmt(activePartners)} icon={<Users className="h-4 w-4" />} />
          <CommandMetric label="Impressions" value={fleetLoading ? '…' : fmt(totals.impressions)} icon={<Eye className="h-4 w-4" />} />
          <CommandMetric label="Clicks" value={fleetLoading ? '…' : fmt(totals.clicks)} icon={<MousePointerClick className="h-4 w-4" />} />
          <CommandMetric label="Fleet CTR" value={fleetLoading ? '…' : `${fleetCtr.toFixed(2)}%`} icon={<TrendingUp className="h-4 w-4" />} />
        </div>
      </CommandSection>

      {/* Pending pipeline — inline meta, not a boxed banner */}
      {pendingApps > 0 && (
        <CommandActionBar>
          <p className="text-xs text-zinc-400">
            <span className="mr-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-rose-400">Pipeline</span>
            <span className="font-heading text-base font-black text-white">{pendingApps}</span>
            <span> application{pendingApps === 1 ? '' : 's'} awaiting review</span>
          </p>
          <CommandButton variant="ghost" size="sm" asChild>
            <a href="#pipeline" onClick={e => { e.preventDefault(); navigate('/admin/partners/sponsors/pipeline'); }}>
              Review <ArrowRight className="h-4 w-4" />
            </a>
          </CommandButton>
        </CommandActionBar>
      )}

      {/* Fleet table */}
      <div className="border border-white/10 bg-[#0a0a0c]/92">
        <CommandToolbar className="border-0 border-b border-white/10">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.45em] text-zinc-500">
            Sponsor Fleet
          </span>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative sm:w-52">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search sponsors…"
                className="w-full -none border border-white/10 bg-[#0a0a0c]/90 py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-zinc-600 outline-none transition-colors focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto" data-lenis-prevent>
              {TIER_FILTERS.map(t => (
                <CommandSegmentedButton
                  key={t}
                  active={tierFilter === t}
                  onClick={() => setTierFilter(t)}
                >
                  {t}
                </CommandSegmentedButton>
              ))}
            </div>
          </div>
        </CommandToolbar>

        {fleetError ? (
          <CommandEmptyState
            title="Could not load sponsor overview"
            description="The fleet report is unavailable right now. Retry in a moment."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-xs">
              <thead className="bg-black/40 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
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
                      className={`cursor-pointer px-4 py-3 transition-colors hover:text-zinc-300 ${key !== 'name' && key !== 'tier' ? 'tabular-nums' : ''}`}
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
                    className="group cursor-pointer text-zinc-300 transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        {s.logoUrl ? (
                          <img src={s.logoUrl} alt="" loading="lazy" className="h-7 w-7 border border-white/10 object-contain" />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center border border-white/10 bg-black/40 text-[9px] text-zinc-600">?</div>
                        )}
                        <span className="font-medium text-white group-hover:text-rose-300">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.tier ? (
                        <span className={`border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider ${TIER_BADGE[s.tier.toLowerCase()] ?? TIER_BADGE.standard}`}>
                          {s.tier}
                        </span>
                      ) : <span className="text-zinc-600">—</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{s.impressions30d > 0 ? fmt(s.impressions30d) : <span className="text-zinc-600">—</span>}</td>
                    <td className="px-4 py-3 tabular-nums">{s.clicks30d > 0 ? fmt(s.clicks30d) : <span className="text-zinc-600">—</span>}</td>
                    <td className="px-4 py-3 tabular-nums">{s.impressions30d > 0 ? `${s.ctr30d.toFixed(1)}%` : <span className="text-zinc-600">—</span>}</td>
                    <td className="px-4 py-3">
                      {s.activePlacements > 0 ? (
                        <span className="flex items-center gap-1.5 text-white">
                          <span className="h-1.5 w-1.5 bg-rose-500" />
                          {s.activePlacements} active
                        </span>
                      ) : (
                        <span className="text-zinc-600">0 active</span>
                      )}
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
