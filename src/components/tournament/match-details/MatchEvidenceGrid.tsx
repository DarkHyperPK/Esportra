import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface MatchEvidenceGridProps {
    imageUrls: string[];
}

/** Screenshots the captains submitted with their result. */
export const MatchEvidenceGrid: React.FC<MatchEvidenceGridProps> = ({ imageUrls }) => {
    if (imageUrls.length === 0) return null;

    return (
        <ul className="grid grid-cols-2 gap-px bg-white/[0.06] sm:grid-cols-3">
            {imageUrls.map((url, index) => (
                <li key={`${index}-${url}`} className="bg-card">
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative block aspect-video overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"
                        aria-label={`Open screenshot ${index + 1} in a new tab`}
                    >
                        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover opacity-80 transition-opacity duration-150 group-hover:opacity-100" />
                        <span className="absolute bottom-0 left-0 flex items-center gap-1 bg-black/75 px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-300">
                            Shot {index + 1}
                            <ArrowUpRight className="h-3 w-3" aria-hidden />
                        </span>
                    </a>
                </li>
            ))}
        </ul>
    );
};

export default MatchEvidenceGrid;
