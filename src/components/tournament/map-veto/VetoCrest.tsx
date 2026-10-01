import React from 'react';
import { cn } from '@/lib/utils';

interface VetoCrestProps {
    name: string;
    logo?: string | null;
    className?: string;
}

/** A team's crest in a dark square well; falls back to the team's initial. */
export const VetoCrest: React.FC<VetoCrestProps> = ({ name, logo, className }) => (
    <span
        className={cn('flex shrink-0 items-center justify-center bg-black/70 p-1 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]', className)}
        title={name}
    >
        {logo ? (
            <img src={logo} alt="" className="h-full w-full object-contain" />
        ) : (
            <span className="font-heading text-xs font-black text-zinc-300" aria-hidden>{name.charAt(0)}</span>
        )}
    </span>
);

export default VetoCrest;
