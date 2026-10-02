import type { PublicGame } from '@/services/matchStats/publicGameStats';
import type { ResultSource, ShotGroup } from '@/services/matchStats/matchEvidence';
import { ResultSourceBadge } from './ResultSourceBadge';
import { EvidenceThumbs } from './EvidenceThumbs';

type Props = {
    games: PublicGame[];
    sources: Record<string, ResultSource>;
    groups: ShotGroup[];
    onOpenShot: (index: number) => void;
};

/**
 * Everything behind the result: the maps pulled straight from Riot's match
 * records, then the screenshots teams attached, map by map.
 */
export const MatchProofPanel = ({ games, sources, groups, onOpenShot }: Props) => {
    const riotGames = games.filter((game) => sources[game.key] === 'riot');

    if (riotGames.length === 0 && groups.length === 0) {
        return (
            <p className="border border-dashed border-white/10 px-4 py-12 text-center text-sm text-zinc-500">
                No proof attached yet. Results pulled from Riot or reported with a screenshot show up here.
            </p>
        );
    }

    return (
        <div className="space-y-10">
            {riotGames.length > 0 ? (
                <section aria-label="Pulled from Riot">
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                        <h3 className="font-heading text-[17px] font-bold text-white">Pulled from Riot</h3>
                        <ResultSourceBadge source="riot" />
                    </div>
                    <p className="mb-4 max-w-xl text-[13px] text-zinc-400">
                        These maps were fetched from Riot's own match records after the game, so the score and stats weren't typed in by either team.
                    </p>
                    <ul className="grid gap-px bg-white/[0.07]">
                        {riotGames.map((game) => (
                            <li key={game.key} className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-[linear-gradient(180deg,#18181d,#131317)] px-4 py-3">
                                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Map {game.gameNumber}</span>
                                {game.mapKnown ? <span className="font-heading text-[15px] font-bold text-white">{game.mapName}</span> : null}
                                <span className="font-heading text-[14px] font-black tabular-nums text-zinc-200">{game.team1Score ?? '–'}–{game.team2Score ?? '–'}</span>
                                {game.riotMatchId ? <code className="ml-auto max-w-full truncate font-mono text-[11px] text-zinc-500" title={game.riotMatchId}>{game.riotMatchId}</code> : null}
                            </li>
                        ))}
                    </ul>
                </section>
            ) : null}

            {groups.map((group) => (
                <section key={group.key} aria-label={group.title}>
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                        <h3 className="font-heading text-[17px] font-bold text-white">{group.title}</h3>
                        <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                            {group.shots.length} {group.shots.length === 1 ? 'screenshot' : 'screenshots'}
                        </span>
                    </div>
                    <EvidenceThumbs shots={group.shots} onOpen={onOpenShot} />
                </section>
            ))}
        </div>
    );
};

export default MatchProofPanel;
