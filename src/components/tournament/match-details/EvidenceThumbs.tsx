import type { EvidenceShot } from './EvidenceLightbox';

type Props = {
    shots: Array<EvidenceShot & { index: number }>;
    onOpen: (index: number) => void;
};

/** Screenshot thumbnails; each opens full size in the lightbox. */
export const EvidenceThumbs = ({ shots, onOpen }: Props) => (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {shots.map((shot) => (
            <li key={`${shot.index}-${shot.url}`}>
                <button
                    type="button"
                    onClick={() => onOpen(shot.index)}
                    aria-label={`View ${shot.caption}`}
                    className="group relative block aspect-video w-full overflow-hidden bg-zinc-900 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                    <img src={shot.url} alt="" loading="lazy" className="h-full w-full object-cover opacity-85 transition-[opacity,transform] duration-300 group-hover:scale-[1.03] group-hover:opacity-100" />
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/90 to-transparent px-2.5 pb-2 pt-6 text-left text-[11px] font-medium text-zinc-100">
                        {shot.caption}
                    </span>
                </button>
            </li>
        ))}
    </ul>
);

export default EvidenceThumbs;
