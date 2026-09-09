import React from 'react';
import { RefreshCw, Lock, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTournamentPlacements, useResolvePlacements } from '@/hooks/useTournamentPlacements';
import { useTournamentStandings } from '@/hooks/useTournamentStandings';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/formatCurrency';
import type { StandingsRow } from '@/types/standings';
import type { Tournament } from '@/types/tournament';

interface OrganizerStandingsTabProps {
    tournament: Pick<Tournament, 'id' | 'prize_pool' | 'currency'>;
    locked?: boolean;
}

const COLUMN_HEADERS: Record<string, string> = {
    rank: '#',
    team: 'Team',
    bracket_side: 'Bracket',
    wins: 'W',
    losses: 'L',
    ties: 'T',
    played: 'P',
    points: 'Pts',
    score_diff: '+/-',
    buchholz: 'Buchholz',
    round_results: 'Rounds',
    kills: 'Kills',
};

const CELL_RENDERERS: Partial<Record<string, (row: StandingsRow) => React.ReactNode>> = {
    rank: (row) => <RankCell row={row} />,
    team: (row) => (
        <span className={`font-medium ${row.rank_status === 'confirmed' ? 'text-gray-400' : 'text-white'}`}>
            {row.team_name}
        </span>
    ),
    bracket_side: (row) =>
        row.bracket_side === 'winners'
            ? 'Upper Bracket'
            : row.bracket_side === 'losers'
              ? 'Lower Bracket'
              : '–',
    wins: (row) => <span className="text-green-400">{row.wins}</span>,
    losses: (row) => <span className="text-red-400">{row.losses}</span>,
    ties: (row) => String(row.ties),
    played: (row) => String(row.played),
    points: (row) => String(row.points),
    score_diff: (row) => (
        <span className={row.score_diff > 0 ? 'text-green-400' : row.score_diff < 0 ? 'text-red-400' : 'text-gray-500'}>
            {row.score_diff > 0 ? `+${row.score_diff}` : String(row.score_diff)}
        </span>
    ),
    buchholz: (row) => String(row.buchholz),
    round_results: (row) => {
        if (!row.round_results || row.round_results.length === 0) return '–';
        return row.round_results
            .map(r => r === 'win' ? 'W' : r === 'loss' ? 'L' : '·')
            .join(' ');
    },
    kills: (row) => String(row.kills),
};

function RankCell({ row }: { row: StandingsRow }) {
    const textClass = row.rank_status === 'confirmed' ? 'text-gray-500' : 'text-white';
    return (
        <span className="inline-flex items-center gap-1">
            {row.is_live && (
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            )}
            <span className={`font-mono font-bold text-sm ${textClass}`}>{row.rank}</span>
            {row.rank_status === 'provisional' && (
                <Clock className="w-3 h-3 text-gray-600 flex-shrink-0" aria-label="Provisional rank" />
            )}
            {row.is_live && row.live_opponent != null && (
                <span className="text-xs text-gray-400">vs {row.live_opponent}</span>
            )}
        </span>
    );
}

function getTdClass(col: string): string {
    const align = col === 'rank' || col === 'team' ? 'text-left' : 'text-center';
    const font = col === 'team' ? 'font-medium' : 'font-mono text-sm';
    const border = col === 'rank' ? 'border-r border-white/5' : '';
    return ['px-4 py-3', align, font, border].filter(Boolean).join(' ');
}

export const OrganizerStandingsTab: React.FC<OrganizerStandingsTabProps> = ({ tournament, locked }) => {
    const { toast } = useToast();
    const tournamentId = tournament.id;
    const prizePool = parseFloat(tournament.prize_pool ?? '0') || 0;
    const currency = tournament.currency ?? 'USD';
    const hasPrizePool = prizePool > 0;

    const { isLoading: placementsLoading } = useTournamentPlacements(tournamentId);
    const { data: standings, isLoading: standingsLoading, isError: standingsError } = useTournamentStandings(tournamentId);
    const resolvePlacements = useResolvePlacements();

    const isLoading = placementsLoading || standingsLoading;
    const rows = standings?.rows ?? [];
    const columns = standings?.columns ?? [];
    const isComplete = standings?.is_complete ?? false;
    const showPrize = hasPrizePool && isComplete;

    const handleResolve = async () => {
        try {
            await resolvePlacements.mutateAsync({ tournamentId, force: true });
            toast({ title: 'Standings Updated', description: 'Placements recalculated from current bracket data.' });
        } catch {
            toast({ title: 'Error', description: 'Could not recalculate standings.', variant: 'destructive' });
        }
    };

    return (
        <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Standings</h3>
                {locked ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                        <Lock className="w-3.5 h-3.5" />
                        Results locked
                    </span>
                ) : (
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleResolve}
                        disabled={resolvePlacements.isPending}
                        className="text-xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${resolvePlacements.isPending ? 'animate-spin' : ''}`} />
                        Update
                    </Button>
                )}
            </div>

            {isLoading ? (
                <div className="text-sm text-gray-500">Loading standings...</div>
            ) : standingsError ? (
                <div className="text-sm text-gray-500">Could not load standings.</div>
            ) : rows.length === 0 ? (
                <div className="rounded-none border border-dashed border-white/10 py-8 text-center">
                    <p className="text-sm text-gray-500">No standings available yet</p>
                    <p className="text-xs text-gray-600 mt-1">Use the Update button to calculate standings from current bracket data.</p>
                </div>
            ) : (
                <div className="rounded-none border border-white/10 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-white/[0.03]">
                            <tr>
                                {columns.map(col => (
                                    <th
                                        key={col}
                                        className={`px-4 py-2 text-xs font-bold text-gray-500 uppercase ${col === 'rank' || col === 'team' ? 'text-left' : 'text-center'}`}
                                    >
                                        {COLUMN_HEADERS[col] ?? col}
                                    </th>
                                ))}
                                {showPrize && (
                                    <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">Prize</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => (
                                <tr key={row.team_id} className="border-t border-white/5">
                                    {columns.map(col => (
                                        <td key={col} className={getTdClass(col)}>
                                            {CELL_RENDERERS[col]?.(row) ?? '–'}
                                        </td>
                                    ))}
                                    {showPrize && (
                                        <td className="px-4 py-3 text-right text-gray-300 font-mono text-sm">
                                            {row.prize_amount > 0 ? formatCurrency(row.prize_amount, currency) : '—'}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
