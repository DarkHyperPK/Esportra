import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import type { BracketMatch, BracketTeam } from '@/types/bracketTypes';
import { cn } from '@/lib/utils';
import { formatBracketMatchLabel } from '@/utils/bracketMatchLabel';
import { CommandButton } from '@/components/management/CommandSurface';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { TeamCrest } from '../TeamCrest';

type Result = { team1Score: number; team2Score: number; winnerId: string };

type Props = {
    selected: BracketMatch | null;
    /** Matches with both teams set and no result yet. */
    ready: BracketMatch[];
    champion: BracketTeam | null;
    doubleElimination: boolean;
    /** Owners report results; everyone else just sees what's next. */
    canReport: boolean;
    saving: boolean;
    onSelect: (match: BracketMatch) => void;
    onCancel: () => void;
    onSave: (result: Result) => void;
};

const code = (match: BracketMatch, doubleElimination: boolean) =>
    formatBracketMatchLabel(match, { isDoubleElimination: doubleElimination })?.replace(/\./g, ' · ') ?? 'Match';

const Stepper = ({ team, value, onChange }: { team: BracketTeam | null; value: number; onChange: (value: number) => void }) => (
    <div className="flex items-center gap-3 py-3">
        <TeamCrest name={team?.name ?? 'TBD'} logoUrl={team?.logo_url} className="h-8 w-8 text-[10px]" />
        <p className="min-w-0 flex-1 truncate font-heading text-[15px] font-bold text-white">{team?.name ?? 'TBD'}</p>
        <div className="flex items-center bg-black/30 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
            <button type="button" aria-label={`Lower ${team?.name ?? 'team'} score`} onClick={() => onChange(Math.max(0, value - 1))} className="flex h-9 w-8 items-center justify-center text-zinc-400 hover:text-white">
                <Minus className="h-3.5 w-3.5" />
            </button>
            <span aria-live="polite" className="w-8 text-center font-heading text-[20px] font-black tabular-nums text-white">{value}</span>
            <button type="button" aria-label={`Raise ${team?.name ?? 'team'} score`} onClick={() => onChange(Math.min(99, value + 1))} className="flex h-9 w-8 items-center justify-center text-zinc-400 hover:text-white">
                <Plus className="h-3.5 w-3.5" />
            </button>
        </div>
    </div>
);

/**
 * The runner's side panel: report the selected match (scores, then who
 * advances, pre-picked from the scores), or pick the next match that's ready.
 */
export const BracketReportPanel = ({ selected, ready, champion, doubleElimination, canReport, saving, onSelect, onCancel, onSave }: Props) => {
    const [score1, setScore1] = useState(0);
    const [score2, setScore2] = useState(0);

    useEffect(() => {
        setScore1(selected?.team1_score ?? 0);
        setScore2(selected?.team2_score ?? 0);
    }, [selected]);

    if (selected && canReport) {
        const leader = score1 === score2 ? null : score1 > score2 ? selected.team1 : selected.team2;
        const winButton = (team: BracketTeam | null) => team ? (
            <CommandButton
                key={team.id}
                variant={leader?.id === team.id ? 'primary' : 'secondary'}
                disabled={saving}
                className="w-full justify-between normal-case tracking-normal"
                onClick={() => onSave({ team1Score: score1, team2Score: score2, winnerId: team.id })}
            >
                <span className="truncate">{team.name} advances</span>
            </CommandButton>
        ) : null;

        return (
            <div className="space-y-5">
                <div>
                    <p className={EYEBROW_CLASS}>{code(selected, doubleElimination)}</p>
                    <h2 className="mt-1 font-heading text-[18px] font-bold">Report result</h2>
                </div>
                <div className="divide-y divide-white/[0.06] border-y border-white/[0.06]">
                    <Stepper team={selected.team1} value={score1} onChange={setScore1} />
                    <Stepper team={selected.team2} value={score2} onChange={setScore2} />
                </div>
                <div className="space-y-2">
                    {winButton(selected.team1)}
                    {winButton(selected.team2)}
                    <p className="text-xs text-zinc-500">{leader ? 'Picked from the score. Confirm who advances.' : 'Scores are level. Pick who advances.'}</p>
                </div>
                <button type="button" onClick={onCancel} className="text-[13px] text-zinc-500 underline-offset-4 hover:text-white hover:underline">Cancel</button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <p className={EYEBROW_CLASS}>{champion ? 'Bracket complete' : 'Up next'}</p>
                <h2 className="mt-1 font-heading text-[18px] font-bold">
                    {champion ? `Champion: ${champion.name}` : canReport ? 'Report a result' : 'Ready to play'}
                </h2>
                {!champion && canReport ? <p className="mt-1 text-[13px] text-zinc-500">Pick a match here or click one in the bracket.</p> : null}
            </div>
            {ready.length > 0 ? (
                <ul className="grid gap-px bg-white/[0.06]">
                    {ready.map((match) => (
                        <li key={match.id}>
                            <button
                                type="button"
                                disabled={!canReport}
                                onClick={() => onSelect(match)}
                                className={cn('flex w-full flex-col gap-1 bg-card px-3 py-2.5 text-left transition-colors', canReport && 'hover:bg-white/[0.04]')}
                            >
                                <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{code(match, doubleElimination)}</span>
                                <span className="truncate text-[13px] text-zinc-200">{match.team1?.name} <span className="text-zinc-600">vs</span> {match.team2?.name}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : !champion ? (
                <p className="text-[13px] text-zinc-500">No match is ready yet. One opens as soon as both teams are known.</p>
            ) : null}
        </div>
    );
};

export default BracketReportPanel;
