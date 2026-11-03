import { Link, useSearchParams } from 'react-router-dom';
import { DiscoveryFilterSelect } from '@/components/competitive/scrims/listing/DiscoveryFilterSelect';
import { cn } from '@/lib/utils';
import { RESULT_LABEL, gameDate, scoreLine } from '@/services/scrimData/format';
import { filterHistory, historyOptions, historySummary, type HistoryFilter } from '@/services/scrimData/history';
import type { GameResult, RecentMap } from '@/types/scrimData';
import { useMapArt } from '../maps/useMapArt';
import { PanelMessage } from '../PanelStates';
import { TierBadge } from '../TierBadge';

const RESULTS = [{ value: 'win', label: 'Wins' }, { value: 'loss', label: 'Losses' }, { value: 'draw', label: 'Draws' }];

/** Every confirmed scrim map, filterable by map, opponent and result. Filters live in the address so a view can be shared. */
export default function MatchHistory({ maps, teamId }: { maps: RecentMap[]; teamId: string }) {
  const [params, setParams] = useSearchParams();
  const art = useMapArt();
  const filter: HistoryFilter = { map: params.get('h_map') ?? '', opponent: params.get('h_opp') ?? '', result: (params.get('h_res') ?? '') as '' | GameResult };
  const set = (key: string, value: string) => setParams((p) => { const n = new URLSearchParams(p); if (value) n.set(key, value); else n.delete(key); return n; }, { replace: true });
  if (maps.length === 0) return <PanelMessage>No confirmed scrim maps yet.</PanelMessage>;

  const options = historyOptions(maps);
  const shown = filterHistory(maps, filter);
  const sum = historySummary(shown);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <DiscoveryFilterSelect label="Map" value={filter.map} onChange={(v) => set('h_map', v)} options={options.maps.map((m) => ({ value: m, label: m }))} placeholder="All maps" />
        <DiscoveryFilterSelect label="Opponent" value={filter.opponent} onChange={(v) => set('h_opp', v)} options={options.opponents.map((o) => ({ value: o, label: o }))} placeholder="All opponents" />
        <DiscoveryFilterSelect label="Result" value={filter.result} onChange={(v) => set('h_res', v)} options={RESULTS} placeholder="All results" />
        <p className="ml-auto pb-2 font-mono text-[12px] tabular-nums text-white/60" role="status">
          {`${shown.length} ${shown.length === 1 ? 'map' : 'maps'} · ${sum.wins}–${sum.losses}${sum.draws ? `–${sum.draws}` : ''} · rounds ${sum.roundDiff > 0 ? '+' : ''}${sum.roundDiff}`}
        </p>
      </div>
      {shown.length === 0 ? <PanelMessage>No maps match these filters.</PanelMessage> : (
        <ul className="overflow-hidden rounded-xl border border-white/[0.05] bg-[#0a0a0c] divide-y divide-white/[0.04]">
          {shown.map((m) => {
            const splash = m.map ? art(m.map) : null;
            return (
              <li key={`${m.sessionId}-${m.gameNumber}`}>
                <Link to={`/competitive/scrims/sessions/${m.sessionId}/games/${m.gameNumber}/report?team_id=${teamId}`}
                  className="group relative flex items-center gap-4 overflow-hidden px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40">
                  {splash && <img src={splash} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-20 transition-opacity group-hover:opacity-35" />}
                  <span aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#0a0a0c] via-[#0a0a0c]/80 to-[#0a0a0c]/30" />
                  <span className={cn('relative w-5 font-mono text-[12px] font-bold', m.result === 'win' ? 'text-emerald-300' : m.result === 'loss' ? 'text-rose-400' : 'text-white/50')}>{RESULT_LABEL[m.result][0]}</span>
                  <span className="relative min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-white">{m.map ?? 'Map not recorded'}</span>
                    <span className="block truncate text-[12px] text-white/50">{`vs ${m.opponent ?? 'Opponent'} · ${gameDate(m.playedAt)} · map ${m.gameNumber}`}</span>
                  </span>
                  <span className="relative hidden sm:block"><TierBadge tier={m.tier} /></span>
                  <span className="relative font-heading text-[18px] font-bold tabular-nums text-white">{scoreLine(m.roundsWon, m.roundsLost)}</span>
                  <span aria-hidden="true" className="relative font-mono text-[11px] text-white/40 group-hover:text-white">→</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
