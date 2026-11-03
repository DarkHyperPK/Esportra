import { cn } from '@/lib/utils';
import { resolveAgent } from '@/lib/valorantAgents';
import type { TimelinePlayer } from '@/schemas/scrimTimeline';
import { projectPoint, type MapTransform } from '@/services/scrimInsights/heatmap';
import type { Marker } from '@/services/scrimInsights/timeline';

interface Props { art: string; transform: MapTransform | undefined; markers: Marker[]; players: TimelinePlayer[]; label: string }

const RING: Record<Marker['role'], string> = { killer: 'ring-2 ring-emerald-300', victim: 'ring-2 ring-rose-400', assist: 'ring-2 ring-amber-300', other: 'ring-1 ring-white/30' };

/** The map with the players where Riot recorded them at the chosen moment. Killer green, victim red, assists amber; same projection as the heatmap. */
export function MatchMinimap({ art, transform, markers, players, label }: Props) {
  return (
    <figure className="relative aspect-square w-full overflow-hidden border border-white/[0.06] bg-[#0b0b0d]" aria-label={label}>
      <img src={art} alt="" className="absolute inset-0 h-full w-full object-contain" loading="lazy" />
      {markers.map((m) => {
        const at = projectPoint(m, transform);
        if (!at) return null;
        const player = players.find((p) => p.key === m.key);
        const agent = resolveAgent(player?.agent);
        return (
          <span key={m.key} title={`${player?.name ?? 'Spike'}${m.role === 'victim' ? ' (died)' : ''}`}
            style={{ left: `${at.across * 100}%`, top: `${at.down * 100}%` }}
            className={cn('absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden bg-black/70 text-[9px]', RING[m.role], player && !player.mine && 'opacity-90')}>
            {agent ? <img src={agent.iconUrl} alt="" className="h-full w-full" /> : <span className="text-white">{player?.name.slice(0, 2) ?? '◆'}</span>}
          </span>
        );
      })}
    </figure>
  );
}
