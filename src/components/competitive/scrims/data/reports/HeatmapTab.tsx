import { useMemo, useState } from 'react';
import { PanelError, PanelMessage, PanelSkeleton } from '@/components/competitive/scrims/data/PanelStates';
import { useScrimHeatmap } from '@/hooks/competitive/useScrimReports';
import { useValorantMaps } from '@/hooks/useValorantCatalog';
import { cn } from '@/lib/utils';
import { HEAT_KINDS, heatSummary, type HeatKind } from '@/services/scrimInsights/heatmap';
import { HeatmapCanvas } from './HeatmapCanvas';

const SIDES = [{ id: null, label: 'Both sides' }, { id: 'attack', label: 'Attack' }, { id: 'defense', label: 'Defense' }] as const;

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick}
      className={cn('h-9 border px-3 text-[12px] font-bold uppercase tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40',
        active ? 'border-white/60 bg-white/10 text-white' : 'border-white/[0.12] text-zinc-400 hover:text-white')}>
      {children}
    </button>
  );
}

/** Where the team's recorded events happened on each map. Positions at the moments Riot recorded, never movement. Loads when opened. */
export default function HeatmapTab({ teamId }: { teamId: string }) {
  const [kind, setKind] = useState<HeatKind>('kills');
  const [side, setSide] = useState<string | null>(null);
  const [map, setMap] = useState<string | null>(null);
  const { data: catalog } = useValorantMaps();
  const q = useScrimHeatmap(teamId, { map, kind, side });
  const chosen = map ?? q.data?.availableMaps[0]?.map ?? null;
  const art = useMemo(() => (catalog ?? []).find((m) => m.displayName?.toLowerCase() === chosen?.toLowerCase()), [catalog, chosen]);

  if (q.isLoading) return <PanelSkeleton />;
  if (q.isError || !q.data) return <PanelError onRetry={() => void q.refetch()} />;
  const data = q.data;
  if (data.availableMaps.length === 0) return <PanelMessage>No verified Riot maps yet. Heatmaps appear once auto-fetched maps are confirmed.</PanelMessage>;
  const help = HEAT_KINDS.find((k) => k.id === kind)?.help;
  return (
    <div className="space-y-4">
      <div className="space-y-3 border border-white/[0.06] bg-[#111114] p-4">
        <div role="group" aria-label="Map" className="flex flex-wrap gap-2">
          {data.availableMaps.map((m) => <Choice key={m.map} active={m.map === chosen} onClick={() => setMap(m.map)}>{`${m.map} · ${m.maps}`}</Choice>)}
        </div>
        <div role="group" aria-label="What to show" className="flex flex-wrap gap-2">
          {HEAT_KINDS.map((k) => <Choice key={k.id} active={k.id === kind} onClick={() => setKind(k.id)}>{k.label}</Choice>)}
        </div>
        <div role="group" aria-label="Side" className="flex flex-wrap gap-2">
          {SIDES.map((s) => <Choice key={s.label} active={s.id === side} onClick={() => setSide(s.id)}>{s.label}</Choice>)}
        </div>
        <p className="text-[12px] leading-relaxed text-zinc-500">{help} These are positions at the moments Riot recorded, not continuous movement.</p>
      </div>
      <p className="text-[13px] text-zinc-300" role="status">{heatSummary(kind, data.points.length, data.maps, chosen, side)}{data.truncated ? ' Showing the first 3,000 only.' : ''}</p>
      {!art?.displayIcon ? (
        <PanelMessage>{`Map art for ${chosen ?? 'this map'} is not available, so the positions cannot be drawn.`}</PanelMessage>
      ) : (
        <HeatmapCanvas art={art.displayIcon} transform={art} points={data.points} label={heatSummary(kind, data.points.length, data.maps, chosen, side)} />
      )}
    </div>
  );
}
