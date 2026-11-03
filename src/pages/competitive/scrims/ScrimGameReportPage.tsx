import { Link, useParams, useSearchParams } from 'react-router-dom';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { PanelMessage } from '@/components/competitive/scrims/data/PanelStates';
import { ScrimGameReport } from '@/components/competitive/scrims/report/ScrimGameReport';

/** One scrim map in depth, for members of the two teams. */
export default function ScrimGameReportPage() {
  const { sessionId, gameNumber } = useParams();
  const [params] = useSearchParams();
  const n = Number(gameNumber);
  const valid = !!sessionId && Number.isInteger(n) && n > 0;
  return (
    <CompetitivePageShell>
      <div className="mx-auto max-w-[1100px] space-y-4 px-4 pb-16 pt-6 lg:px-8 lg:pt-8">
        <Link to={sessionId ? `/competitive/scrims/sessions/${sessionId}` : '/competitive/scrims'} className="inline-block text-[13px] text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
          ← Back to the scrim
        </Link>
        {valid ? <ScrimGameReport sessionId={sessionId} gameNumber={n} teamId={params.get('team_id') ?? undefined} /> : <PanelMessage>This map could not be found.</PanelMessage>}
      </div>
    </CompetitivePageShell>
  );
}
