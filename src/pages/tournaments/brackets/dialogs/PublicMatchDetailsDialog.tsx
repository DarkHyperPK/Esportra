import React, { useId, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { PublicVetoPreview } from '@/components/tournament/map-veto/PublicVetoPreview';
import { MatchDetailsScorebug, type MatchStatusDisplay } from '@/components/tournament/match-details/MatchDetailsScorebug';
import { MatchSeriesStrip } from '@/components/tournament/match-details/MatchSeriesStrip';
import { MatchGameBreakdown } from '@/components/tournament/match-details/MatchGameBreakdown';
import { MatchEvidenceGrid } from '@/components/tournament/match-details/MatchEvidenceGrid';
import { buildPublicGames, type RawMatchGame, type SeriesSide } from '@/services/matchStats/publicGameStats';
import { formatLocalTimeWithTZ } from '@/lib/timeUtils';
import type { BracketMatch } from '@/types/bracketTypes';
import type { MatchResult } from './MatchResultsDialog';

export interface PublicMatchDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    match: BracketMatch | null;
    results?: MatchResult[];
    automatedResults?: RawMatchGame[];
}

const BRACKET_LABEL: Record<NonNullable<BracketMatch['bracketType']>, string> = {
    winners: 'Upper bracket',
    losers: 'Lower bracket',
    final: 'Grand final',
    group: 'Group stage',
    swiss_round: 'Swiss',
};

function getRawId(id: string | number) {
    return String(id).replace(/^(db-|wb-|lb-|source-)/, '');
}

function statusDisplay(status: string): MatchStatusDisplay {
    switch (status) {
        case 'live':
        case 'in_progress':
            return { label: 'Live', tone: 'accent' };
        case 'completed':
            return { label: 'Final', tone: 'success' };
        case 'disputed':
            return { label: 'Under review', tone: 'warning' };
        case 'cancelled':
            return { label: 'Cancelled', tone: 'neutral' };
        default:
            return { label: 'Upcoming', tone: 'neutral' };
    }
}

function fixtureCaption(match: BracketMatch) {
    const parts = [
        match.bracketType ? BRACKET_LABEL[match.bracketType] : null,
        `Round ${match.round}`,
        match.bestOf ? `Best of ${match.bestOf}` : null,
    ];
    return parts.filter(Boolean).join(' · ');
}

function seriesWinner(match: BracketMatch): SeriesSide | null {
    if (!match.winner?.id) return null;
    if (match.winner.id === match.team1?.id) return 'team1';
    if (match.winner.id === match.team2?.id) return 'team2';
    return null;
}

const SectionHeading: React.FC<{ title: string; caption?: string }> = ({ title, caption }) => (
    <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="font-heading text-lg font-bold tracking-tight text-white">{title}</h3>
        {caption ? <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">{caption}</span> : null}
    </div>
);

export const PublicMatchDetailsDialog: React.FC<PublicMatchDetailsDialogProps> = ({
    open,
    onOpenChange,
    match,
    results = [],
    automatedResults = [],
}) => {
    const baseId = useId();
    const [selectedKey, setSelectedKey] = useState<string | null>(null);
    const games = useMemo(
        () => buildPublicGames(automatedResults, match?.team1?.id),
        [automatedResults, match?.team1?.id],
    );

    if (!match) return null;

    const team1Name = match.team1?.name || 'Team 1';
    const team2Name = match.team2?.name || 'Team 2';
    const isLive = (match.status as string) === 'live' || match.status === 'in_progress';
    const winner = isLive ? null : seriesWinner(match);
    const selectedGame = games.find((game) => game.key === selectedKey) ?? games[0] ?? null;
    const evidence = results.map((result) => result.image_url).filter((url): url is string => Boolean(url));
    const timeLabel = match.scheduledTime
        ? formatLocalTimeWithTZ(match.scheduledTime, 'EEE, MMM d · h:mm a')
        : null;
    const panelId = `${baseId}-map-panel`;

    const mapsSection = (
        <section aria-label="Maps">
            <SectionHeading title="Maps" />
            {selectedGame ? (
                <>
                    <MatchSeriesStrip
                        games={games}
                        selectedKey={selectedGame.key}
                        onSelect={setSelectedKey}
                        team1Name={team1Name}
                        team2Name={team2Name}
                        panelId={panelId}
                    />
                    <MatchGameBreakdown
                        game={selectedGame}
                        team1Name={team1Name}
                        team2Name={team2Name}
                        team1Id={match.team1?.id}
                        panelId={panelId}
                    />
                </>
            ) : (
                <p className="border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
                    {match.status === 'completed'
                        ? 'The final score is in. No map-by-map results were reported.'
                        : 'Map results appear here once the match is reported.'}
                </p>
            )}
        </section>
    );

    const vetoSection = (
        <section aria-label="Map veto">
            <SectionHeading title="Map veto" />
            <PublicVetoPreview
                matchId={getRawId(match.id)}
                team1Name={team1Name}
                team2Name={team2Name}
                enabled={open}
            />
        </section>
    );

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!next) setSelectedKey(null);
                onOpenChange(next);
            }}
        >
            <DialogContent
                className="flex max-h-[min(90dvh,860px)] flex-col gap-0 overflow-hidden rounded-none border border-white/10 bg-background p-0 sm:max-w-[960px]"
            >
                <DialogTitle className="sr-only">{team1Name} vs {team2Name}</DialogTitle>
                <DialogDescription className="sr-only">
                    Series score, map results, player stats and the map veto for this match.
                </DialogDescription>

                <MatchDetailsScorebug
                    team1={match.team1}
                    team2={match.team2}
                    team1Score={match.team1_score}
                    team2Score={match.team2_score}
                    winner={winner}
                    status={statusDisplay(match.status)}
                    caption={fixtureCaption(match)}
                    timeLabel={timeLabel}
                />

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" data-lenis-prevent>
                    <div className="space-y-10 px-5 py-6 sm:px-7 sm:py-8">
                        {games.length > 0 ? mapsSection : vetoSection}
                        {games.length > 0 ? vetoSection : mapsSection}
                        {evidence.length > 0 ? (
                            <section aria-label="Submitted screenshots">
                                <SectionHeading title="Screenshots" />
                                <MatchEvidenceGrid imageUrls={evidence} />
                            </section>
                        ) : null}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PublicMatchDetailsDialog;
