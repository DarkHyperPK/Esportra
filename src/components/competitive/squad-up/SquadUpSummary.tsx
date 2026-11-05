import type { SquadUpStats } from '@/schemas/squadUp';

const minutes = (seconds: number) => Math.max(1, Math.round(seconds / 60));

export function SquadUpSummary({ stats, onRestart }: { stats: SquadUpStats | null | undefined; onRestart: () => void }) {
  return (
    <section className="lfg-panel squad-panel-body" aria-label="Session summary">
      <h2>Session over</h2>
      {stats ? (
        <>
          <div className="squad-summary">
            <div className="squad-stat"><strong>{stats.swipesRight + stats.swipesLeft}</strong><span>Players seen</span></div>
            <div className="squad-stat"><strong>{stats.matchesCount}</strong><span>Matches</span></div>
            <div className="squad-stat"><strong>{minutes(stats.durationSeconds)} min</strong><span>In Squad Up</span></div>
          </div>
          <p className="squad-muted">
            You swiped right on {stats.swipesRight} and passed on {stats.swipesLeft}.
          </p>
        </>
      ) : <p className="squad-muted">You left Squad Up.</p>}
      <button type="button" className="lfg-button lfg-button-primary" onClick={onRestart}>Squad up again</button>
    </section>
  );
}
