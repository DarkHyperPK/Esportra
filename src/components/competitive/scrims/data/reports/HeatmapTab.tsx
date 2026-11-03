import { useState } from 'react';
import { PanelError, PanelMessage, PanelSkeleton } from '@/components/competitive/scrims/data/PanelStates';
import { useScrimHeatmap } from '@/hooks/competitive/useScrimReports';
import { cn } from '@/lib/utils';
import { useMapMinimap } from '@/components/competitive/scrims/data/maps/useMapMinimap';
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
  const q = useScrimHeatmap(teamId, { map, kind, side });
  // With no map picked yet the API answers for the team's most-played map and says which; that is the map drawn.
  const chosen = map ?? q.data?.map ?? q.data?.availableMaps[0]?.map ?? null;
  const minimap = useMapMinimap(chosen);

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
        <div role="group" aria-label="What to show" title={`${help} Positions at the moments Riot recorded, not continuous movement.`} className="flex flex-wrap gap-2">
          {HEAT_KINDS.map((k) => <Choice key={k.id} active={k.id === kind} onClick={() => setKind(k.id)}>{k.label}</Choice>)}
        </div>
        <div role="group" aria-label="Side" className="flex flex-wrap gap-2">
          {SIDES.map((s) => <Choice key={s.label} active={s.id === side} onClick={() => setSide(s.id)}>{s.label}</Choice>)}
        </div>
      </div>
      <p className="text-[13px] text-zinc-300" role="status">{heatSummary(kind, data.points.length, data.maps, chosen, side)}{data.truncated ? ' Showing the first 3,000 only.' : ''}</p>
      {minimap.status === 'loading' ? <PanelSkeleton /> : minimap.status === 'error' ? <PanelError onRetry={minimap.retry} /> : minimap.status === 'missing' ? (
        <PanelMessage>{`Map art for ${chosen ?? 'this map'} is not available, so the positions cannot be drawn.`}</PanelMessage>
      ) : (
        <HeatmapCanvas art={minimap.art} transform={minimap.transform} points={data.points} label={heatSummary(kind, data.points.length, data.maps, chosen, side)} />
      )}
    </div>
  );
}
