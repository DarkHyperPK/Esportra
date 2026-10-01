import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { normalizeStorageUrl } from '@/lib/storage';

interface VetoCrestProps {
    name: string;
    logo?: string | null;
    className?: string;
}

/**
 * A team's crest in a dark square well. A team without a logo (or with a broken
 * one) gets a neutral shield, never a stray letter.
 */
export const VetoCrest: React.FC<VetoCrestProps> = ({ name, logo, className }) => {
    const src = normalizeStorageUrl(logo);
    const [failedSrc, setFailedSrc] = useState<string | null>(null);
    const showLogo = Boolean(src) && failedSrc !== src;

    return (
        <span
            className={cn('flex shrink-0 items-center justify-center overflow-hidden bg-black/70 p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]', className)}
            title={name}
        >
            {showLogo && src ? (
                <img src={src} alt="" className="h-full w-full object-contain" onError={() => setFailedSrc(src)} />
            ) : (
                <Shield className="h-[60%] w-[60%] text-zinc-500" strokeWidth={1.5} aria-hidden />
            )}
        </span>
    );
};

export default VetoCrest;
