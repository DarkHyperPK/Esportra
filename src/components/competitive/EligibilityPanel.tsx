import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useTournamentEligibility,
  useRefreshEligibility,
} from '@/hooks/competitive/useCompetitiveIntegration';
import type { TeamEligibilityStatus } from '@/types/competitive';

interface Props {
  tournamentId: string;
}

const TH = 'text-left text-[10px] font-mono font-semibold uppercase tracking-[0.28em] text-white/40 py-2 px-3';
const TD = 'py-2 px-3 text-[13px] text-white/80 align-top';

function StatusBadge({ eligible }: { eligible: boolean | null }) {
  if (eligible === true) {
    return (
      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-emerald-400">
        Eligible
      </span>
    );
  }
  if (eligible === false) {
    return (
      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-rose-400">
        Not Eligible
      </span>
    );
  }
  return (
    <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/30">
      Unknown
    </span>
  );
}

function GapList({ gaps, gapCount }: { gaps: string[]; gapCount: number }) {
  if (gapCount === 0) {
    return <span className="text-white/30 text-[13px]">—</span>;
  }
  return (
    <ul className="space-y-0.5">
      {gaps.map((gap) => (
        <li key={gap} className="text-[12px] text-rose-400">
          {gap}
        </li>
      ))}
    </ul>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[80, 40, 48, 96, 64].map((w, i) => (
        <td key={i} className="py-2 px-3">
          <div className={`h-4 bg-white/[0.06] w-${w === 80 ? '20' : w === 40 ? '10' : w === 48 ? '12' : w === 96 ? '24' : '16'}`} />
        </td>
      ))}
    </tr>
  );
}

function TableHead() {
  return (
    <thead className="border-b border-white/[0.06]">
      <tr>
        <th className={TH}>Team</th>
        <th className={TH}>Roster</th>
        <th className={TH}>Rank Verified</th>
        <th className={TH}>Gaps</th>
        <th className={TH}>Status</th>
      </tr>
    </thead>
  );
}

function EligibilityRow({ row }: { row: TeamEligibilityStatus }) {
  const rankClass =
    row.playersWithRank < row.rosterSize ? 'text-rose-400' : 'text-white/80';
  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.03]">
      <td className={TD}>{row.teamName}</td>
      <td className={TD}>{row.rosterSize}</td>
      <td className={TD}>
        <span className={rankClass}>
          {row.playersWithRank}/{row.rosterSize}
        </span>
      </td>
      <td className={TD}>
        <GapList gaps={row.gaps} gapCount={row.gapCount} />
      </td>
      <td className={TD}>
        <StatusBadge eligible={row.eligible} />
      </td>
    </tr>
  );
}

export function EligibilityPanel({ tournamentId }: Props) {
  const { data, isLoading, isError, refetch } =
    useTournamentEligibility(tournamentId);
  const refresh = useRefreshEligibility(tournamentId);

  function handleRefresh() {
    refresh.mutate(undefined, { onSuccess: () => void refetch() });
  }

  return (
    <section aria-labelledby="eligibility-title" className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <p
          id="eligibility-title"
          className="text-[10px] font-mono font-semibold uppercase tracking-[0.28em] text-white/40"
        >
          Roster Eligibility
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refresh.isPending}
          aria-label="Refresh eligibility"
          className="rounded-none border-white/[0.08] text-white/60 hover:text-white hover:bg-white/[0.06] h-8 text-[12px] gap-1.5"
        >
          <RefreshCw
            className={`h-3.5 w-3.5${refresh.isPending ? ' animate-spin' : ''}`}
            aria-hidden
          />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="border border-white/[0.06] overflow-x-auto">
          <table
            className="w-full"
            aria-busy="true"
            aria-label="Loading eligibility data"
          >
            <TableHead />
            <tbody>
              {[1, 2, 3].map((i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      ) : isError ? (
        <div className="py-8 space-y-3">
          <p className="text-[14px] text-white/55">
            Could not load eligibility data.
          </p>
          <Button
            variant="outline"
            onClick={() => void refetch()}
            className="rounded-none border-white/[0.08] text-white hover:bg-white/[0.07] h-9 text-[13px]"
          >
            Retry
          </Button>
        </div>
      ) : !data?.length ? (
        <p className="py-8 text-[14px] text-white/40">
          No participating teams found for this tournament.
        </p>
      ) : (
        <div className="border border-white/[0.06] overflow-x-auto">
          <table className="w-full" aria-label="Team eligibility">
            <TableHead />
            <tbody>
              {data.map((row) => (
                <EligibilityRow key={row.participantId} row={row} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
