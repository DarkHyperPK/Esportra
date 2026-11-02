import { useState } from 'react';
import { InlineNotice } from '@/components/ui/kit';
import { useReportScrimGame } from '@/hooks/competitive/useScrimGames';
import { getApiErrorMessage } from '@/lib/apiClient';
import { ROOM_FIELD } from '../roomStyles';

interface Props {
  sessionId: string;
  gameNumber: number;
  myTeamId: string;
  team1Name: string;
  team2Name: string;
  onDone: () => void;
}

/** Type in the map's round score when there is no Riot game or screenshot to read it from. */
export function ScrimManualReport({ sessionId, gameNumber, myTeamId, team1Name, team2Name, onDone }: Props) {
  const report = useReportScrimGame(sessionId);
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [map, setMap] = useState('');
  const n1 = Number(s1);
  const n2 = Number(s2);
  const valid = s1 !== '' && s2 !== '' && Number.isInteger(n1) && Number.isInteger(n2) && n1 >= 0 && n2 >= 0 && n1 !== n2;

  async function submit() {
    if (!valid) return;
    try {
      await report.mutateAsync({
        gameNumber, reportedByTeamId: myTeamId, team1Score: n1, team2Score: n2, source: 'manual',
        mapName: map.trim() || undefined,
      });
      onDone();
    } catch { /* shown below */ }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor={`m1-${gameNumber}`} className="block truncate text-[12px] text-white/55">{team1Name} rounds</label>
          <input id={`m1-${gameNumber}`} type="number" inputMode="numeric" min={0} value={s1} onChange={(e) => setS1(e.target.value)} className={ROOM_FIELD} />
        </div>
        <div className="space-y-1">
          <label htmlFor={`m2-${gameNumber}`} className="block truncate text-[12px] text-white/55">{team2Name} rounds</label>
          <input id={`m2-${gameNumber}`} type="number" inputMode="numeric" min={0} value={s2} onChange={(e) => setS2(e.target.value)} className={ROOM_FIELD} />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor={`mm-${gameNumber}`} className="block text-[12px] text-white/55">Map (optional)</label>
        <input id={`mm-${gameNumber}`} value={map} maxLength={40} onChange={(e) => setMap(e.target.value)} placeholder="Haven" className={ROOM_FIELD} />
      </div>
      {report.isError && <InlineNotice tone="critical">{getApiErrorMessage(report.error, 'Could not report the map. Try again.')}</InlineNotice>}
      <button
        type="button"
        onClick={() => void submit()}
        disabled={!valid || report.isPending}
        className="min-h-[40px] rounded-lg bg-white px-5 text-[13px] font-semibold text-black hover:bg-zinc-200 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      >
        {report.isPending ? 'Sending…' : `Report game ${gameNumber}`}
      </button>
    </div>
  );
}
