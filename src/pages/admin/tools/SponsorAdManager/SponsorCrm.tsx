import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

interface SponsorOverviewItem {
  id: string;
  name: string;
  tier: string | null;
  logoUrl: string | null;
  impressions30d: number;
  clicks30d: number;
  ctr30d: number;
  activePlacements: number;
}

interface Props {
  onSelectSponsor: (id: string) => void;
}

const fmt = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);

const TIER_BADGE: Record<string, string> = {
  radiant: 'bg-rose-500/10 text-rose-400',
  ascendant: 'bg-violet-500/10 text-violet-400',
  partner: 'bg-zinc-700 text-zinc-300',
  standard: 'bg-zinc-700 text-zinc-300',
  diamond: 'bg-sky-500/10 text-sky-400',
};

type SortKey = 'name' | 'tier' | 'impressions30d' | 'clicks30d' | 'ctr30d' | 'activePlacements';

export function SponsorCrm({ onSelectSponsor }: Props) {
  const [sort, setSort] = useState<SortKey>('impressions30d');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'sponsors', 'overview'],
    queryFn: () => apiClient.get<{ sponsors: SponsorOverviewItem[] }>('/api/admin/sponsors/overview'),
    staleTime: 60_000,
  });

  const sponsors = data?.sponsors ?? [];

  const sorted = [...sponsors].sort((a, b) => {
    const av = a[sort] ?? '';
    const bv = b[sort] ?? '';
    const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return dir === 'asc' ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sort === key) setDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(key); setDir('desc'); }
  };

  const arrow = (key: SortKey) => sort === key ? (dir === 'desc' ? ' ↓' : ' ↑') : '';

  if (isLoading) return <div className="p-10 text-center text-sm text-zinc-500">Loading sponsor overview…</div>;
  if (isError) return <div className="p-10 text-center text-sm text-red-400">Could not load sponsor overview.</div>;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <span className="text-sm font-medium text-white">Sponsor Fleet</span>
        <span className="text-xs text-zinc-500">{sponsors.length} sponsors · 30-day window</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[800px] text-left text-xs">
          <thead className="sticky top-0 bg-zinc-950 text-[10px] uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="cursor-pointer px-4 py-3 hover:text-zinc-300" onClick={() => toggleSort('name')}>Sponsor{arrow('name')}</th>
              <th className="cursor-pointer px-4 py-3 hover:text-zinc-300" onClick={() => toggleSort('tier')}>Tier{arrow('tier')}</th>
              <th className="cursor-pointer px-4 py-3 hover:text-zinc-300 tabular-nums" onClick={() => toggleSort('impressions30d')}>Impr. 30d{arrow('impressions30d')}</th>
              <th className="cursor-pointer px-4 py-3 hover:text-zinc-300 tabular-nums" onClick={() => toggleSort('clicks30d')}>Clicks{arrow('clicks30d')}</th>
              <th className="cursor-pointer px-4 py-3 hover:text-zinc-300 tabular-nums" onClick={() => toggleSort('ctr30d')}>CTR{arrow('ctr30d')}</th>
              <th className="cursor-pointer px-4 py-3 hover:text-zinc-300" onClick={() => toggleSort('activePlacements')}>Placements{arrow('activePlacements')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {sorted.map(s => (
              <tr
                key={s.id}
                className="cursor-pointer text-zinc-300 hover:bg-white/[0.03]"
                onClick={() => onSelectSponsor(s.id)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {s.logoUrl ? (
                      <img src={s.logoUrl} alt="" className="h-7 w-7 rounded border border-zinc-800 object-contain" />
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
                <td className="px-4 py-3 tabular-nums">
                  {s.impressions30d > 0 ? <span className="text-white">{fmt(s.impressions30d)}</span> : <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {s.clicks30d > 0 ? <span className="text-white">{fmt(s.clicks30d)}</span> : <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  {s.impressions30d > 0 ? <span className="text-zinc-300">{s.ctr30d.toFixed(1)}%</span> : <span className="text-zinc-600">—</span>}
                </td>
                <td className="px-4 py-3">
                  {s.activePlacements > 0 ? (
                    <span className="text-emerald-400">{s.activePlacements} active</span>
                  ) : (
                    <span className="text-zinc-600">0 active</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
