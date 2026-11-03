import { PanelMessage } from '@/components/competitive/scrims/data/PanelStates';
import { PickResults, PickTable } from '@/components/competitive/scrims/data/tabs/MapPicksView';
import { useScrimMapPicks } from '@/hooks/competitive/useScrimMapPicks';
import type { ScrimData } from '@/types/scrimData';
import { MapRows } from './MapRows';
import { MapTierList } from './MapTierList';
import { useMapArt } from './useMapArt';

/** The map pool: a tier list by how the team has done, each map on its own picture with its veto habits, and how maps went by who chose them. */
export function MapsTab({ teamId, data }: { teamId: string; data: ScrimData }) {
  const artFor = useMapArt();
  const { data: picks } = useScrimMapPicks(teamId);
  if (data.maps.length === 0) return <PanelMessage>No confirmed maps yet.</PanelMessage>;
  const veto = picks?.hasData ? picks.picks : null;
  return (
    <div className="space-y-4">
      <MapTierList maps={data.maps} artFor={artFor} />
      <MapRows maps={data.maps} picks={veto?.maps ?? []} artFor={artFor} />
      {data.unplayedMaps.length > 0 && <p className="text-[12px] text-zinc-500">Not played yet: {data.unplayedMaps.join(', ')}</p>}
      {veto && <PickResults picks={veto} />}
      {veto && (
        <details className="border border-white/[0.06] bg-[#111114] p-4">
          <summary className="cursor-pointer text-[12px] font-bold uppercase tracking-wide text-zinc-300">Every pick and ban ({veto.vetoes} {veto.vetoes === 1 ? 'veto' : 'vetoes'})</summary>
          <div className="mt-3"><PickTable picks={veto} /></div>
        </details>
      )}
    </div>
  );
}
