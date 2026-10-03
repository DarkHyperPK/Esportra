import { FullScoreboard } from '@/components/tournament/FullScoreboard';
import { VetoMapArt } from '@/components/tournament/map-veto/VetoMapArt';
import { StatusPill, type Tone } from '@/components/ui/kit';
import { valorantMapSplash } from '@/services/maps/valorantMapAssets';
import type { GameVerification, PublicGame } from '@/services/matchStats/publicGameStats';
import type { ResultSource } from '@/services/matchStats/matchEvidence';
import { MatchRoundStrip } from './MatchRoundStrip';
import { MatchRiotStats } from './MatchRiotStats';
import { ResultSourceBadge } from './ResultSourceBadge';
import { EvidenceThumbs } from './EvidenceThumbs';
import type { EvidenceShot } from './EvidenceLightbox';

type Props = {
    game: PublicGame;
    source: ResultSource;
    reportedBy: string | null;
    shots: Array<EvidenceShot & { index: number }>;
    onOpenShot: (index: number) => void;
    team1Name: string;
    team2Name: string;
    team1Id?: string;
    panelId: string;
};

const VERIFICATION: Record<GameVerification, { label: string; tone: Tone }> = {
    verified: { label: 'Verified', tone: 'success' },
    proposed: { label: 'Awaiting confirmation', tone: 'neutral' },
    pending: { label: 'Awaiting confirmation', tone: 'neutral' },
    disputed: { label: 'Disputed', tone: 'warning' },
    rejected: { label: 'Rejected', tone: 'critical' },
};

function sourceLine(game: PublicGame, source: ResultSource, reportedBy: string | null) {
    if (source === 'riot') return game.riotMatchId ? 'Pulled from the Riot match record' : 'Stats pulled from Riot';
    if (source === 'screenshot') return reportedBy ? `Reported by ${reportedBy} with a screenshot` : 'Reported with a screenshot';
    return reportedBy ? `Score reported by ${reportedBy}` : 'Score reported by the teams';
}

/**
 * One map: the result on its art, how it was reported, then the full Riot record
 * when the map was pulled from Riot (otherwise rounds and scoreboard), and its screenshots.
 */
export const MatchGameBreakdown = ({ game, source, reportedBy, shots, onOpenShot, team1Name, team2Name, team1Id, panelId }: Props) => {
    const hasScore = game.team1Score !== null && game.team2Score !== null;
    const verification = game.verification ? VERIFICATION[game.verification] : null;

    return (
        <div id={panelId} role="tabpanel" aria-labelledby={`${panelId}-tab-${game.key}`} className="space-y-6">
            <div className="relative isolate flex min-h-[9rem] items-end overflow-hidden shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
                <VetoMapArt src={valorantMapSplash(game.mapName)} name={game.mapName} className="-z-10" />
                <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-black/95 via-black/70 to-black/10" />
                <div className="flex w-full items-end justify-between gap-4 p-5 sm:p-6">
                    <div className="min-w-0">
                        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-300">{game.mapKnown ? `Map ${game.gameNumber}` : 'Map not recorded'}</p>
                        <p className="mt-1.5 truncate font-heading text-[34px] font-black leading-none tracking-tight text-white sm:text-[44px]">{game.mapName}</p>
                    </div>
                    {hasScore ? (
                        <p className="shrink-0 font-heading text-[34px] font-black leading-none tabular-nums sm:text-[48px]" aria-label={`${team1Name} ${game.team1Score}, ${team2Name} ${game.team2Score}`}>
                            <span className={game.winner === 'team2' ? 'text-white/35' : 'text-white'}>{game.team1Score}</span>
                            <span className="px-2 text-[24px] text-white/25">–</span>
                            <span className={game.winner === 'team1' ? 'text-white/35' : 'text-white'}>{game.team2Score}</span>
                        </p>
                    ) : null}
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-white/[0.07] py-3">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <ResultSourceBadge source={source} />
                    <span className="text-[13px] text-zinc-300">{sourceLine(game, source, reportedBy)}</span>
                    {game.riotMatchId ? <code className="max-w-[16rem] truncate font-mono text-[11px] text-zinc-500" title={game.riotMatchId}>{game.riotMatchId}</code> : null}
                </div>
                {verification ? <StatusPill label={verification.label} tone={verification.tone} /> : null}
            </div>

            {game.enriched?.players?.length && game.t1Side ? (
                <MatchRiotStats enriched={game.enriched} t1Side={game.t1Side} team1Name={team1Name} team2Name={team2Name} />
            ) : (
                <>
                    <MatchRoundStrip rounds={game.rounds} team1Name={team1Name} team2Name={team2Name} />

                    {game.players.length > 0 ? (
                        <FullScoreboard
                            players={game.players}
                            team1Name={team1Name}
                            team2Name={team2Name}
                            team1Score={game.team1Score ?? 0}
                            team2Score={game.team2Score ?? 0}
                            team1Id={team1Id}
                            t1Side={game.t1Side}
                        />
                    ) : shots.length === 0 ? (
                        <p className="border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-500">
                            {hasScore ? 'Score recorded. No player stats came with this map.' : 'No result reported for this map yet.'}
                        </p>
                    ) : null}
                </>
            )}

            {shots.length > 0 ? (
                <section aria-label="Screenshots for this map">
                    <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-400">Screenshot proof</p>
                    <EvidenceThumbs shots={shots} onOpen={onOpenShot} />
                </section>
            ) : null}
        </div>
    );
};

export default MatchGameBreakdown;
