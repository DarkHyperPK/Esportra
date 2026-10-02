import type { ReactNode } from 'react';
import { List, Network, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FilterState } from './BracketSidebarFilter';

export type BracketViewMode = 'bracket' | 'matches';
export type RoundTab = { key: string; label: string; filter: FilterState };
export type FindableTeam = { id: string; name: string; seed?: number | null };

const ALL_TEAMS = '__all__';

const segment = (active: boolean) =>
    cn(
        'inline-flex h-8 shrink-0 items-center gap-1.5 px-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
        active ? 'bg-white/[0.08] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]' : 'text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200',
    );

type Props = {
    viewMode?: BracketViewMode;
    onViewMode?: (mode: BracketViewMode) => void;
    rounds?: RoundTab[];
    activeKey?: string;
    onRound?: (tab: RoundTab) => void;
    teams: FindableTeam[];
    foundTeamId: string | null;
    onFindTeam: (teamId: string | null) => void;
    actions?: ReactNode;
};

/** View toggle, round chips, "Find a team" and page actions, in one bar above the bracket. */
export const BracketToolbar = ({ viewMode, onViewMode, rounds, activeKey, onRound, teams, foundTeamId, onFindTeam, actions }: Props) => (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/[0.07] px-4 py-2.5 sm:px-5">
        {viewMode && onViewMode ? (
            <div className="flex shrink-0 bg-black/30 p-0.5" role="group" aria-label="View">
                <button type="button" aria-pressed={viewMode === 'bracket'} className={segment(viewMode === 'bracket')} onClick={() => onViewMode('bracket')}>
                    <Network className="h-3.5 w-3.5" /> Bracket
                </button>
                <button type="button" aria-pressed={viewMode === 'matches'} className={segment(viewMode === 'matches')} onClick={() => onViewMode('matches')}>
                    <List className="h-3.5 w-3.5" /> Matches
                </button>
            </div>
        ) : null}

        <div className="hidden flex-1 sm:block" />

        <div className="flex w-full items-center gap-2 sm:w-auto">
            {teams.length > 0 ? (
                <Select value={foundTeamId ?? ALL_TEAMS} onValueChange={(value) => onFindTeam(value === ALL_TEAMS ? null : value)}>
                    <SelectTrigger
                        aria-label="Find a team"
                        className={cn(
                            'h-8 min-w-0 flex-1 rounded-none border-white/10 bg-black/30 text-[13px] sm:w-52 sm:flex-none',
                            foundTeamId ? 'text-white' : 'text-zinc-400',
                        )}
                    >
                        <Search className="mr-2 h-3.5 w-3.5 shrink-0 text-zinc-500" />
                        <SelectValue placeholder="Find a team" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80 rounded-none border-white/10 bg-[#111114]">
                        <SelectItem value={ALL_TEAMS} className="text-zinc-400">Find a team</SelectItem>
                        {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                                {team.seed ? <span className="mr-2 font-mono text-[10px] text-zinc-500">{team.seed}</span> : null}
                                {team.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : null}
            {actions}
        </div>

        {rounds && rounds.length > 1 && onRound ? (
            <div className="-mx-1 order-last flex min-w-0 basis-full gap-1 overflow-x-auto px-1" role="group" aria-label="Rounds">
                {rounds.map((tab) => (
                    <button key={tab.key} type="button" aria-pressed={tab.key === activeKey} className={segment(tab.key === activeKey)} onClick={() => onRound(tab)}>
                        {tab.label}
                    </button>
                ))}
            </div>
        ) : null}
    </div>
);

export default BracketToolbar;
