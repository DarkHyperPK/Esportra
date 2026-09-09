import React from 'react';
import { Trophy, Clock } from 'lucide-react';
import { useTournamentPlacements } from '@/hooks/useTournamentPlacements';
import { useTournamentStandings } from '@/hooks/useTournamentStandings';
import { formatCurrency } from '@/utils/formatCurrency';
import type { StandingsRow } from '@/types/standings';

interface StandingsTabProps {
    tournamentId: string;
    currency?: string;
}

const PODIUM_CONFIG = [
    { rank: 2, height: 'h-16', color: 'text-gray-300', bg: 'bg-gray-500/10 border-gray-500/20' },
    { rank: 1, height: 'h-24', color: 'text-yellow-300', bg: 'bg-yellow-500/10 border-yellow-500/20' },
    { rank: 3, height: 'h-12', color: 'text-amber-600', bg: 'bg-amber-600/10 border-amber-600/20' },
];

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

const StandingsTab: React.FC<StandingsTabProps> = ({ tournamentId, currency = 'USD' }) => {
    const { data: placements, isLoading: placementsLoading } = useTournamentPlacements(tournamentId);
    const { data: standings, isLoading: standingsLoading, isError: standingsError } = useTournamentStandings(tournamentId);

    if (placementsLoading || standingsLoading) {
        return <div className="py-12 text-center text-gray-500 text-sm">Loading standings...</div>;
    }

    if (standingsError) {
        return <div className="py-12 text-center text-gray-500 text-sm">Could not load standings.</div>;
    }

    if (!standings || standings.rows.length === 0) {
        return (
            <div className="py-12 text-center">
                <Trophy className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Final standings will appear here once the tournament is complete.</p>
            </div>
        );
    }

    const { rows, columns, is_complete: isComplete } = standings;

    const top3 = PODIUM_CONFIG.map(cfg => ({
        ...cfg,
        placement: placements?.find(p => p.placement === cfg.rank),
    })).filter(c => c.placement);

    return (
        <div className="space-y-8 py-4">
            {isComplete && top3.length >= 2 && (
                <div className="flex items-end justify-center gap-4 pt-4">
                    {top3.map(({ rank, height, color, bg, placement }) => (
                        placement && (
                            <div key={rank} className={`flex flex-col items-center gap-2 rounded-none border ${bg} px-6 ${height} justify-end pb-3 min-w-[100px]`}>
                                <div className={`text-sm font-bold ${color}`}>{placement.placement_label}</div>
                                <div className="text-white text-sm font-medium text-center leading-tight">{placement.team_name}</div>
                                {placement.prize_amount > 0 && (
                                    <div className={`text-xs font-mono ${color}`}>{formatCurrency(placement.prize_amount, placement.currency || currency)}</div>
                                )}
                            </div>
                        )
                    ))}
                </div>
            )}

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
                            {isComplete && (
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
                                {isComplete && (
                                    <td className="px-4 py-3 text-right text-gray-300 font-mono text-sm">
                                        {row.prize_amount > 0 ? formatCurrency(row.prize_amount, currency) : '—'}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default StandingsTab;
