import type { AdminOverview } from '@/schemas/squadUpAdmin';

const num = (value: number) => value.toLocaleString();

export function SquadUpAdminStats({ overview }: { overview: AdminOverview }) {
  const { live, totals, series } = overview;
  const peak = Math.max(1, ...series.map((day) => day.swipesRight + day.swipesLeft));
  const tiles = [
    { label: 'Live now', value: num(live.activePlayers) },
    { label: 'Competitive / Unrated', value: `${num(live.competitive ?? 0)} / ${num(live.unrated ?? 0)}` },
    { label: 'Open lobbies', value: num(live.openLobbies ?? 0) },
    { label: `Sessions (${totals.days}d)`, value: num(totals.sessionsStarted) },
    { label: 'Right swipes', value: num(totals.swipesRight) },
    { label: 'Left swipes', value: num(totals.swipesLeft) },
    { label: 'Matches', value: num(totals.matches) },
    { label: 'Match rate', value: `${totals.matchRate}%` },
    { label: `Lobbies opened (${totals.days}d)`, value: num(totals.lobbiesOpened ?? 0) },
    { label: 'Lobbies filled', value: num(totals.lobbiesFilled ?? 0) },
  ];
  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
            <dt className="text-[11px] uppercase tracking-wider text-zinc-400">{tile.label}</dt>
            <dd className="mt-1 text-2xl font-bold text-white">{tile.value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-label="Live players by region" className="rounded-xl border border-white/[0.08] p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">Live by region</h2>
          {live.byRegion.length === 0 ? <p className="text-sm text-zinc-400">No one is in Squad Up right now.</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-zinc-400"><tr><th scope="col">Region</th><th scope="col">Players</th><th scope="col">Avg tier</th></tr></thead>
              <tbody>{live.byRegion.map((row) => (
                <tr key={row.region} className="border-t border-white/[0.06]"><td className="py-1.5 uppercase">{row.region}</td><td>{row.players}</td><td>{row.avgTier}</td></tr>
              ))}</tbody>
            </table>
          )}
        </section>
        <section aria-label="Daily activity" className="rounded-xl border border-white/[0.08] p-4">
          <h2 className="mb-3 text-sm font-semibold text-white">Daily swipes and matches</h2>
          {series.length === 0 ? <p className="text-sm text-zinc-400">No activity recorded in this period.</p> : (
            <ul className="space-y-1.5">{series.map((day) => {
              const swipes = day.swipesRight + day.swipesLeft;
              return (
                <li key={day.day} className="grid grid-cols-[84px_1fr_auto] items-center gap-3 text-xs text-zinc-300">
                  <span>{day.day}</span>
                  <span className="h-2 bg-white/[0.06]" role="img" aria-label={`${swipes} swipes`}>
                    <span className="block h-2 bg-rose-500" style={{ width: `${Math.round((swipes / peak) * 100)}%` }} />
                  </span>
                  <span>{swipes} swipes · {day.matches} matches · {day.lobbiesFilled ?? 0} lobbies filled</span>
                </li>
              );
            })}</ul>
          )}
        </section>
      </div>
    </div>
  );
}
