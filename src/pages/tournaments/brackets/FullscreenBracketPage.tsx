import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getWebsiteAssetUrl } from '@/lib/storage';
import { CommandButton } from '@/components/management/CommandSurface';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { BracketCanvasSkeleton } from '@/components/bracket/BracketCanvasSkeleton';
import { BracketEmptyState } from '@/components/bracket/BracketEmptyState';
import { useTournamentBracketSource } from '@/hooks/useTournamentBracketSource';
import { PublicBracketView } from './PublicBracketView';

const ESPORTRA_LOGO = getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png');

/**
 * The bracket on its own: a slim header and the whole screen for the tree.
 * Meant for a second monitor, a venue screen or a stream capture.
 */
const FullscreenBracketPage = () => {
    const { slug } = useParams<{ slug: string }>();
    const source = useTournamentBracketSource(slug);
    const { tournament } = source;
    const backTo = source.isOrganizer ? `/organizer/tournament/${slug}` : `/tournaments/${slug}`;

    return (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-background text-white">
            <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/[0.07] px-4 sm:px-5">
                <div className="flex min-w-0 items-center gap-4">
                    <img src={ESPORTRA_LOGO} alt="Esportra" className="h-5 w-auto shrink-0" />
                    <span aria-hidden className="h-5 w-px bg-white/15" />
                    <div className="min-w-0">
                        <p className={EYEBROW_CLASS}>Bracket</p>
                        <p className="truncate font-heading text-[15px] font-bold leading-tight">{tournament?.name ?? ' '}</p>
                    </div>
                </div>
                <CommandButton asChild variant="secondary" size="sm">
                    <Link to={backTo}>
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">{source.isOrganizer ? 'Back to manage' : 'Back to tournament'}</span>
                    </Link>
                </CommandButton>
            </header>
            <div className="min-h-0 flex-1">
                {source.loading ? (
                    <BracketCanvasSkeleton />
                ) : !tournament ? (
                    <BracketEmptyState message="This tournament could not be found." />
                ) : (
                    <PublicBracketView
                        versionId={source.activeVersionId}
                        tournamentId={tournament.id}
                        stages={source.stages}
                        selectedStageId={source.selectedStageId}
                        onStageSelect={source.selectStage}
                        versionsMap={source.versionsMap}
                        mode="fullscreen"
                    />
                )}
            </div>
        </div>
    );
};

export default FullscreenBracketPage;
