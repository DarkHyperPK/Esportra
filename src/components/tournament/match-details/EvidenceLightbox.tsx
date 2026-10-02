import { useEffect } from 'react';
import { ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';

export type EvidenceShot = { url: string; caption: string };

type Props = {
    shots: EvidenceShot[];
    /** Open shot, or null when closed. */
    index: number | null;
    onIndex: (index: number | null) => void;
};

/**
 * Screenshots full size, one at a time, with arrows and keys to step through.
 * A nested dialog, so Esc closes the picture and leaves the match open.
 */
export const EvidenceLightbox = ({ shots, index, onIndex }: Props) => {
    const shot = index !== null ? shots[index] : null;
    const step = (delta: number) => index !== null && onIndex((index + delta + shots.length) % shots.length);

    useEffect(() => {
        if (index === null || shots.length < 2) return undefined;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'ArrowRight') step(1);
            if (event.key === 'ArrowLeft') step(-1);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    });

    return (
        <Dialog open={shot !== null} onOpenChange={(open) => !open && onIndex(null)}>
            <DialogContent className="flex h-[min(92dvh,900px)] max-w-[min(96vw,1400px)] flex-col gap-0 rounded-none border-white/10 bg-black/95 p-0 sm:max-w-[min(96vw,1400px)]">
                <DialogTitle className="sr-only">{shot?.caption ?? 'Screenshot'}</DialogTitle>
                <DialogDescription className="sr-only">Screenshot attached to the match result.</DialogDescription>
                <div className="relative flex min-h-0 flex-1 items-center justify-center p-4">
                    {shot ? <img src={shot.url} alt={shot.caption} className="max-h-full max-w-full object-contain" /> : null}
                    {shots.length > 1 ? (
                        <>
                            <button type="button" aria-label="Previous screenshot" onClick={() => step(-1)} className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-black/60 text-white hover:bg-black/80">
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button type="button" aria-label="Next screenshot" onClick={() => step(1)} className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center bg-black/60 text-white hover:bg-black/80">
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </>
                    ) : null}
                </div>
                <div className="flex items-center justify-between gap-4 border-t border-white/10 px-5 py-3">
                    <p className="text-[13px] text-zinc-200">
                        {shot?.caption}
                        {shots.length > 1 && index !== null ? <span className="ml-3 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">{index + 1} / {shots.length}</span> : null}
                    </p>
                    {shot ? (
                        <a href={shot.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400 hover:text-white">
                            Open original <ArrowUpRight className="h-3 w-3" />
                        </a>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default EvidenceLightbox;
