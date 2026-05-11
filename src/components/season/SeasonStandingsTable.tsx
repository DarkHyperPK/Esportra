import type { SeasonStanding } from '@/types/season';

interface Props {
  standings: SeasonStanding[];
}

const SeasonStandingsTable = ({ standings }: Props) => {
  if (standings.length === 0)
    return (
      <div className="py-12 text-center text-sm text-zinc-500">
        No standings yet. Run a recalculation after some tournaments complete.
      </div>
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/5 text-left">
            <th className="pb-3 pr-4 font-medium text-zinc-500">#</th>
            <th className="pb-3 pr-4 font-medium text-zinc-500">Team</th>
            <th className="pb-3 pr-4 font-medium text-zinc-500 text-right">Points</th>
            <th className="pb-3 font-medium text-zinc-500">Status</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => (
            <tr key={row.id} className="border-b border-white/[0.04]">
              <td className="py-3 pr-4 text-zinc-500">{i + 1}</td>
              <td className="py-3 pr-4 font-medium text-white">{row.team_name ?? '—'}</td>
              <td className="py-3 pr-4 text-right font-mono font-semibold text-white">
                {row.total_points}
              </td>
              <td className="py-3 text-xs text-zinc-400">{row.qualification_status ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SeasonStandingsTable;
