import type { QueueStats } from '@/schemas/lfgQueue';

const minutes = (seconds: number) => Math.max(1, Math.round(seconds / 60));

export function QueueSummary({ stats, onRestart }: { stats: QueueStats | null | undefined; onRestart: () => void }) {
  return (
    <section className="lfg-panel queue-panel-body" aria-label="Session summary">
      <h2>Session over</h2>
      {stats ? (
        <>
          <div className="queue-summary">
            <div className="queue-stat"><strong>{stats.swipesRight + stats.swipesLeft}</strong><span>Players seen</span></div>
            <div className="queue-stat"><strong>{stats.matchesCount}</strong><span>Matches</span></div>
            <div className="queue-stat"><strong>{minutes(stats.durationSeconds)} min</strong><span>In queue</span></div>
          </div>
          <p className="queue-muted">
            You swiped right on {stats.swipesRight} and passed on {stats.swipesLeft}.
          </p>
        </>
      ) : <p className="queue-muted">You left the queue.</p>}
      <button type="button" className="lfg-button lfg-button-primary" onClick={onRestart}>Queue again</button>
    </section>
  );
}
