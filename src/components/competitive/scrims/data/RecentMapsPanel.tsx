import { Link } from 'react-router-dom';
import { EYEBROW_CLASS, StatusPill, type Tone } from '@/components/ui/kit';
import { RESULT_LABEL, gameDate, scoreLine } from '@/services/scrimData/format';
import type { GameResult, RecentMap } from '@/types/scrimData';
import { TierBadge } from './TierBadge';

const TONE: Record<GameResult, Tone> = { win: 'success', loss: 'critical', draw: 'neutral' };

function Row({ m, teamId }: { m: RecentMap; teamId?: string }) {
  return (
    <Link to={`/competitive/scrims/sessions/${m.sessionId}/games/${m.gameNumber}/report${teamId ? `?team_id=${teamId}` : ''}`} className="flex flex-wrap items-center gap-3 py-3 hover:bg-white/[0.03]">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-white">{m.map ?? 'Map not recorded'}{m.opponent ? <span className="text-zinc-500"> vs {m.opponent}</span> : null}</p>
        <p className="text-[11px] text-zinc-500">{gameDate(m.playedAt)} · map {m.gameNumber}</p>
      </div>
      <TierBadge tier={m.tier} />
      <p className="shrink-0 font-mono text-sm tabular-nums text-zinc-200">{scoreLine(m.roundsWon, m.roundsLost)}</p>
      <StatusPill label={RESULT_LABEL[m.result]} tone={TONE[m.result]} className="shrink-0" />
    </Link>
  );
}

export function RecentMapsPanel({ maps, teamId }: { maps: RecentMap[]; teamId?: string }) {
  if (maps.length === 0) return null;
  return (
    <section aria-label="Recent maps" className="rounded-xl border border-white/5 bg-white/[0.02] px-4 pb-1 pt-4">
      <h3 className={EYEBROW_CLASS}>Recent maps</h3>
      <ul className="mt-2 divide-y divide-white/5">{maps.map((m) => <li key={`${m.sessionId}-${m.gameNumber}`}><Row m={m} teamId={teamId} /></li>)}</ul>
    </section>
  );
}
