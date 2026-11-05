import { formatDistanceToNow } from 'date-fns';
import { useMySquadUpReports, useSquadUpBlocks, useUnhideSquadUpPlayer } from '@/hooks/competitive/useSquadUpReport';
import { reasonLabel } from '@/schemas/squadUpReport';

/** The reporter's side of safety: where their reports stand, and who they have hidden. */
export function SquadUpSafetyPanel({ enabled }: { enabled: boolean }) {
  const reports = useMySquadUpReports(enabled);
  const blocks = useSquadUpBlocks(enabled);
  const unhide = useUnhideSquadUpPlayer();
  const myReports = reports.data ?? [];
  const hidden = blocks.data ?? [];
  if (myReports.length === 0 && hidden.length === 0) return null;
  return (
    <aside className="lfg-panel squad-matches" aria-label="Your reports and hidden players">
      {myReports.length > 0 && (
        <section>
          <h3>Your reports</h3>
          {myReports.slice(0, 5).map((report) => (
            <div className="squad-match-row" key={report.id}>
              <span>{report.reportedUsername ?? 'Player'} <span className="squad-muted">· {reasonLabel(report.reason)}</span></span>
              <span className="squad-badge" data-tone={report.status === 'open' ? 'neutral' : 'success'}
                title={formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}>
                {report.status === 'open' ? 'Under review' : 'Reviewed'}
              </span>
            </div>
          ))}
        </section>
      )}
      {hidden.length > 0 && (
        <section>
          <h3>Hidden players</h3>
          {hidden.map((player) => (
            <div className="squad-match-row" key={player.userId}>
              <span>{player.username ?? 'Player'}</span>
              <button type="button" className="lfg-button" disabled={unhide.isPending} onClick={() => unhide.mutate(player.userId)}>Unhide</button>
            </div>
          ))}
        </section>
      )}
    </aside>
  );
}
