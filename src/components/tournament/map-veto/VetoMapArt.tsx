import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface VetoMapArtProps {
    src?: string | null;
    /** Map name; the art is decorative, the name is rendered by the caller. */
    name: string;
    /** Banned maps lose their colour; the name stays readable on top. */
    muted?: boolean;
    className?: string;
}

/**
 * Map art as a window onto the stage. Missing or broken art falls back to a
 * designed well (hairline grid) instead of stock imagery.
 */
export const VetoMapArt: React.FC<VetoMapArtProps> = ({ src, muted = false, className }) => {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
    const showImage = Boolean(src) && failedSrc !== src;

    return (
        <div className={cn('absolute inset-0 overflow-hidden bg-zinc-900', className)} aria-hidden>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:20px_20px]" />
            {showImage && src ? (
                <img
                    src={src}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    onLoad={() => setLoadedSrc(src)}
                    onError={() => setFailedSrc(src)}
                    className={cn(
                        'absolute inset-0 h-full w-full object-cover transition-[opacity,filter] duration-300',
                        loadedSrc === src ? 'opacity-100' : 'opacity-0',
                        muted && 'grayscale',
                    )}
                />
            ) : null}
        </div>
    );
};

export default VetoMapArt;
