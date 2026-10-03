import React, { useEffect, useMemo, useState } from 'react';
import { Download, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BracketMatch } from '@/types/bracketTypes';
import { useBracketViewData } from '@/hooks/useBracketViewData';
import { useBracketWheelScroll } from '@/hooks/useBracketWheelScroll';
import { useDragToPan } from '@/hooks/useDragToPan';
import { bracketChampion, bracketTeams, computeBracketLayout, rawMatchId, summarizeBracket } from '@/services/bracket/bracketLayout';
import type { BracketStageSummary } from '@/hooks/useTournamentBracketSource';
import type { FilterState } from '@/components/bracket/BracketSidebarFilter';
import { BracketRenderer } from '@/components/bracket/BracketRenderer';
import { BracketExporter } from '@/components/bracket/BracketExporter';
import { BracketStageTabs } from '@/components/bracket/BracketStageTabs';
import { BracketSummaryStrip } from '@/components/bracket/BracketSummaryStrip';
import { BracketToolbar, type BracketViewMode, type RoundTab } from '@/components/bracket/BracketToolbar';
import { BracketMatchList } from '@/components/bracket/BracketMatchList';
import { BracketCanvasSkeleton } from '@/components/bracket/BracketCanvasSkeleton';
import { BracketEmptyState } from '@/components/bracket/BracketEmptyState';
import { SwissView } from '@/components/bracket/SwissView';
import { GroupStageView } from '@/components/bracket/GroupStageView';
import { CommandIconButton } from '@/components/management/CommandSurface';
import { PublicMatchDetailsDialog } from './dialogs/PublicMatchDetailsDialog';

interface PublicBracketViewProps {
    versionId: string | null;
    tournamentId: string;
    stages?: BracketStageSummary[];
    selectedStageId?: string | null;
    onStageSelect?: (stageId: string) => void;
    versionsMap?: Record<string, string>;
    onFullscreen?: () => void;
    mode?: 'page' | 'embedded' | 'fullscreen';
    disableMotion?: boolean;
    height?: string;
    className?: string;
}

const ALL_ROUNDS: RoundTab = { key: 'all', label: 'All rounds', filter: { type: 'all' } };
const startsOnPhone = () => typeof window !== 'undefined' && window.matchMedia?.('(max-width: 767px)').matches;

/**
 * A published bracket for spectators: stage tabs, the bracket at a glance, a
 * toolbar to switch view, jump to a round or find a team, then the tree (or the
 * list on phones). Clicking a match opens its details.
 */
export const PublicBracketView: React.FC<PublicBracketViewProps> = ({
    versionId, tournamentId, stages = [], selectedStageId, onStageSelect, versionsMap = {},
    onFullscreen, mode = 'page', disableMotion, height, className,
}) => {
    const { matches, loading, proofs, evidence, games } = useBracketViewData(versionId, tournamentId);
    const [round, setRound] = useState<RoundTab>(ALL_ROUNDS);
    const [viewMode, setViewMode] = useState<BracketViewMode>(() => (startsOnPhone() ? 'matches' : 'bracket'));
    const [hoveredTeamId, setHoveredTeamId] = useState<string | null>(null);
    const [foundTeamId, setFoundTeamId] = useState<string | null>(null);
    const [openMatch, setOpenMatch] = useState<BracketMatch | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const fullHeight = mode === 'page';
    const canvas = useBracketWheelScroll<HTMLDivElement>({ verticalToHorizontal: !fullHeight });
    useDragToPan(canvas.scrollRef);

    // A different stage is a different bracket: start from the whole tree again.
    useEffect(() => {
        setRound(ALL_ROUNDS);
        setFoundTeamId(null);
    }, [versionId]);

    const format = matches.some((m) => m.bracketType === 'group') ? 'group' : matches.some((m) => m.bracketType === 'swiss_round') ? 'swiss' : 'elimination';
    const layout = useMemo(() => computeBracketLayout(matches), [matches]);
    const champion = useMemo(() => bracketChampion(matches, layout.champion?.sourceId), [matches, layout.champion?.sourceId]);
    const summary = useMemo(() => summarizeBracket(matches), [matches]);
    const teams = useMemo(() => bracketTeams(matches), [matches]);
    const rounds = useMemo<RoundTab[]>(() => [
        ALL_ROUNDS,
        ...layout.columns.map((column) => ({
            key: column.key,
            label: column.label,
            filter: (column.side === 'final' ? { type: 'final' } : { type: column.side, round: column.round }) as FilterState,
        })),
    ], [layout.columns]);
    const currentStage = stages.find((stage) => stage.id === selectedStageId);
    const highlight = hoveredTeamId ?? foundTeamId;
    const elimination = format === 'elimination';
    const openDetails = (match: BracketMatch) => {
        setOpenMatch(match);
        setDetailsOpen(true);
    };

    const actions = (
        <>
            {onFullscreen ? (
                <CommandIconButton variant="secondary" label="Open fullscreen" onClick={onFullscreen} className="h-8 w-8">
                    <Maximize2 />
                </CommandIconButton>
            ) : null}
            {elimination && matches.length > 0 ? (
                <BracketExporter
                    matches={matches}
                    triggerButton={<CommandIconButton variant="secondary" label="Download bracket as PNG" className="h-8 w-8"><Download /></CommandIconButton>}
                />
            ) : null}
        </>
    );

    const content = () => {
        if (!versionId) return <BracketEmptyState message="It appears here when the organizer publishes this stage." />;
        if (loading) return <BracketCanvasSkeleton />;
        if (matches.length === 0) return <BracketEmptyState message="This stage has no matches yet." />;
        if (format === 'swiss') {
            return (
                <SwissView
                    stageId={selectedStageId ?? ''} versionId={versionId} matches={matches} isOrganizer={false} tournamentId={tournamentId}
                    stage={currentStage} activeFilter={{ type: 'all' }} onMatchClick={openDetails} hasResultsMap={games} hasProofsMap={proofs}
                    hoveredTeamId={highlight} onTeamHover={setHoveredTeamId}
                />
            );
        }
        if (format === 'group') {
            return (
                <GroupStageView
                    stageId={selectedStageId ?? ''} versionId={versionId} matches={matches} isOrganizer={false}
                    advancementCount={currentStage?.advancement_count ? Number(currentStage.advancement_count) : undefined}
                    onMatchClick={openDetails} hasResultsMap={games} hasProofsMap={proofs} hoveredTeamId={highlight} onTeamHover={setHoveredTeamId}
                />
            );
        }
        if (viewMode === 'matches') {
            return <BracketMatchList matches={matches} activeFilter={round.filter} foundTeamId={foundTeamId} onMatchClick={openDetails} hasResultsMap={games} />;
        }
        return (
            <BracketRenderer
                matches={matches} activeFilter={round.filter} onMatchClick={openDetails} hasResultsMap={games} hasProofsMap={proofs}
                disableAnimations={disableMotion ?? matches.length > 24} hoveredTeamId={highlight} onTeamHover={setHoveredTeamId}
            />
        );
    };

    return (
        <div
            className={cn('flex w-full flex-col bg-background', fullHeight ? 'overflow-clip' : 'h-full min-h-0 overflow-hidden', className)}
            style={height ? { height } : undefined}
        >
            {stages.length > 1 && onStageSelect ? (
                <BracketStageTabs stages={stages} selectedStageId={selectedStageId ?? null} versionsMap={versionsMap} onSelect={onStageSelect} />
            ) : null}
            {mode !== 'embedded' && elimination && matches.length > 0 ? (
                <BracketSummaryStrip played={summary.played} total={summary.total} live={summary.live} teams={summary.teams} champion={champion} />
            ) : null}
            {versionId && matches.length > 0 ? (
                // Page mode grows to full height, so the toolbar pins under the site navbar while you scroll.
                <div className={cn(fullHeight && 'sticky top-[5.5rem] z-20 bg-background')}>
                    <BracketToolbar
                        viewMode={elimination ? viewMode : undefined}
                        onViewMode={setViewMode}
                        rounds={elimination ? rounds : undefined}
                        activeKey={round.key}
                        onRound={setRound}
                        teams={teams}
                        foundTeamId={foundTeamId}
                        onFindTeam={setFoundTeamId}
                        actions={actions}
                    />
                </div>
            ) : null}
            <div
                ref={canvas.scrollRef}
                tabIndex={0}
                aria-label="Tournament bracket"
                className={cn(
                    'bracket-canvas focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/20',
                    fullHeight ? 'overflow-x-auto overflow-y-hidden overscroll-x-contain [touch-action:pan-x_pan-y]' : 'min-h-0 flex-1 overflow-auto overscroll-contain [touch-action:pan-x_pan-y]',
                )}
                data-lenis-prevent={fullHeight ? undefined : true}
            >
                {content()}
            </div>
            <PublicMatchDetailsDialog
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
                match={openMatch}
                evidence={openMatch ? evidence[rawMatchId(String(openMatch.id))] ?? [] : []}
                automatedResults={openMatch ? games[rawMatchId(String(openMatch.id))] ?? [] : []}
            />
        </div>
    );
};

export default PublicBracketView;
