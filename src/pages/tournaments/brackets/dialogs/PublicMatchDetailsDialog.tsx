import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatLocalTimeWithTZ } from '@/lib/timeUtils';
import { PublicVetoPreview } from '@/components/tournament/map-veto/PublicVetoPreview';
import { MatchHero, type MatchStatusDisplay } from '@/components/tournament/match-details/MatchHero';
import { MatchMapCards } from '@/components/tournament/match-details/MatchMapCards';
import { MatchGameBreakdown } from '@/components/tournament/match-details/MatchGameBreakdown';
import { MatchProofPanel } from '@/components/tournament/match-details/MatchProofPanel';
import { EvidenceLightbox } from '@/components/tournament/match-details/EvidenceLightbox';
import { buildPublicGames, type RawMatchGame, type SeriesSide } from '@/services/matchStats/publicGameStats';
import { arrangeEvidence, evidenceForGame, resultSource, seriesSourceSummary, type MatchEvidence, type ResultSource } from '@/services/matchStats/matchEvidence';
import { valorantMapSplash } from '@/services/maps/valorantMapAssets';
import type { BracketMatch } from '@/types/bracketTypes';

export interface PublicMatchDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    match: BracketMatch | null;
    /** Screenshots attached to this match's results, per map where known. */
    evidence?: MatchEvidence[];
    /** Reported games (maps), auto-fetched from Riot or typed in. */
    automatedResults?: RawMatchGame[];
}

type Tab = 'series' | 'veto' | 'proof';

const BRACKET_LABEL: Record<NonNullable<BracketMatch['bracketType']>, string> = {
    winners: 'Upper bracket',
    losers: 'Lower bracket',
    final: 'Grand final',
    group: 'Group stage',
    swiss_round: 'Swiss',
};

const rawId = (id: string | number) => String(id).replace(/^(db-|wb-|lb-|source-)/, '');

function statusDisplay(status: string): MatchStatusDisplay {
    if (status === 'live' || status === 'in_progress') return { label: 'Live', tone: 'accent' };
    if (status === 'completed') return { label: 'Completed', tone: 'success' };
    if (status === 'disputed') return { label: 'Under review', tone: 'warning' };
    if (status === 'cancelled') return { label: 'Cancelled', tone: 'neutral' };
    return { label: 'Upcoming', tone: 'neutral' };
}

function seriesWinner(match: BracketMatch): SeriesSide | null {
    if (!match.winner?.id) return null;
    if (match.winner.id === match.team1?.id) return 'team1';
    if (match.winner.id === match.team2?.id) return 'team2';
    return null;
}

const TabButton = ({ active, count, onClick, children }: { active: boolean; count?: number; onClick: () => void; children: React.ReactNode }) => (
    <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={onClick}
        className={cn(
            'relative flex shrink-0 items-center gap-2 py-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/30',
            active ? 'text-white' : 'text-zinc-500 hover:text-zinc-200',
        )}
    >
        {children}
        {count ? <span className="bg-white/[0.08] px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-zinc-300">{count}</span> : null}
        {active ? <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-white" /> : null}
    </button>
);

/**
 * A match from the public bracket, as a broadcast result page: the scoreline on
 * the map's art, then tabs for the series (map by map, how each result was
 * reported), the map veto, and the proof (Riot records and screenshots).
 */
export const PublicMatchDetailsDialog: React.FC<PublicMatchDetailsDialogProps> = ({ open, onOpenChange, match, evidence = [], automatedResults = [] }) => {
    const panelId = `${useId()}-map-panel`;
    const [tab, setTab] = useState<Tab>('series');
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const [shotIndex, setShotIndex] = useState<number | null>(null);
    const games = useMemo(() => buildPublicGames(automatedResults, match?.team1?.id), [automatedResults, match?.team1?.id]);
    const team1 = match?.team1 ?? null;
    const team2 = match?.team2 ?? null;
    const teamName = useCallback(
        (id: string | null) => (id && id === team1?.id ? team1.name : id && id === team2?.id ? team2.name : null),
        [team1, team2],
    );
    const proof = useMemo(() => arrangeEvidence(games, evidence, teamName), [games, evidence, teamName]);
    const sources = useMemo(() => Object.fromEntries(games.map((game) => [game.key, resultSource(game, evidenceForGame(evidence, game.gameNumber))])) as Record<string, ResultSource>, [games, evidence]);

    // Each match opens on its series if it has one, otherwise on the veto.
    useEffect(() => {
        if (!open) return;
        setTab(games.length > 0 ? 'series' : 'veto');
        setSelectedKey(null);
    }, [open, match?.id, games.length]);

    if (!match) return null;

    const team1Name = match.team1?.name || 'Team 1';
    const team2Name = match.team2?.name || 'Team 2';
    const live = match.status === 'in_progress' || (match.status as string) === 'live';
    const selected = games.find((game) => game.key === selectedKey) ?? games[0] ?? null;
    const lastMap = games[games.length - 1];
    const caption = [match.bracketType ? BRACKET_LABEL[match.bracketType] : null, `Round ${match.round}`, match.bestOf ? `Best of ${match.bestOf}` : null].filter(Boolean).join(' · ');
    const proofCount = proof.shots.length + games.filter((game) => sources[game.key] === 'riot').length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex h-[min(92dvh,920px)] flex-col gap-0 overflow-hidden rounded-none border border-white/10 bg-background p-0 sm:max-w-[1080px]">
                <DialogTitle className="sr-only">{team1Name} vs {team2Name}</DialogTitle>
                <DialogDescription className="sr-only">Series score, each map's result and how it was reported, the map veto and the proof.</DialogDescription>

                <MatchHero
                    team1={match.team1}
                    team2={match.team2}
                    team1Score={match.team1_score}
                    team2Score={match.team2_score}
                    winner={live ? null : seriesWinner(match)}
                    status={statusDisplay(match.status)}
                    caption={caption}
                    timeLabel={match.scheduledTime ? formatLocalTimeWithTZ(match.scheduledTime, 'EEE, MMM d · h:mm a') : null}
                    backdropUrl={lastMap ? valorantMapSplash(lastMap.mapName) : null}
                    source={seriesSourceSummary(games.map((game) => sources[game.key]))}
                />

                <div role="tablist" aria-label="Match details" className="flex shrink-0 gap-7 overflow-x-auto border-b border-white/[0.07] px-5 sm:px-8">
                    <TabButton active={tab === 'series'} count={games.length} onClick={() => setTab('series')}>Series</TabButton>
                    <TabButton active={tab === 'veto'} onClick={() => setTab('veto')}>Map veto</TabButton>
                    <TabButton active={tab === 'proof'} count={proofCount} onClick={() => setTab('proof')}>Proof</TabButton>
                </div>

                <div className="bracket-canvas min-h-0 flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
                    <div className="px-5 py-6 sm:px-8 sm:py-8">
                        {tab === 'series' ? (
                            selected ? (
                                <div className="space-y-6">
                                    <MatchMapCards games={games} sources={sources} selectedKey={selected.key} onSelect={setSelectedKey} team1={match.team1} team2={match.team2} panelId={panelId} />
                                    <MatchGameBreakdown
                                        game={selected}
                                        source={sources[selected.key]}
                                        reportedBy={teamName(selected.reportedByTeamId)}
                                        shots={proof.byGame[selected.key] ?? []}
                                        onOpenShot={setShotIndex}
                                        team1Name={team1Name}
                                        team2Name={team2Name}
                                        team1Id={match.team1?.id}
                                        panelId={panelId}
                                    />
                                </div>
                            ) : (
                                <p className="border border-dashed border-white/10 px-4 py-12 text-center text-sm text-zinc-500">
                                    {match.status === 'completed' ? 'The final score is in. No map-by-map results were reported.' : 'Map results appear here once the match is reported.'}
                                </p>
                            )
                        ) : null}
                        {tab === 'veto' ? <PublicVetoPreview matchId={rawId(match.id)} team1Name={team1Name} team2Name={team2Name} enabled={open} /> : null}
                        {tab === 'proof' ? <MatchProofPanel games={games} sources={sources} groups={proof.groups} onOpenShot={setShotIndex} /> : null}
                    </div>
                </div>

                <EvidenceLightbox shots={proof.shots} index={shotIndex} onIndex={setShotIndex} />
            </DialogContent>
        </Dialog>
    );
};

export default PublicMatchDetailsDialog;
