import { useState } from 'react';
import { cn } from '@/lib/utils';
import { crestTint } from './teamTint';

const initials = (name: string) =>
    name
        .trim()
        .split(/\s+/)
        .map((part) => part[0])
        .join('')
        .replace(/[^a-z0-9]/gi, '')
        .slice(0, 2)
        .toUpperCase() || name.slice(0, 2).toUpperCase();

/** A team's crest in a dark well; initials when there is no logo or it fails to load. */
export const TeamCrest = ({ name, logoUrl, className, tintKey }: { name: string; logoUrl?: string | null; className?: string; tintKey?: string | null }) => {
    const [failed, setFailed] = useState(false);
    const showLogo = Boolean(logoUrl) && !failed;

    return (
        <span
            aria-hidden
            className={cn(
                'inline-flex shrink-0 items-center justify-center overflow-hidden font-mono text-[9px] font-bold',
                showLogo && 'bg-white/[0.06]',
                className ?? 'h-5 w-5',
            )}
            style={showLogo ? undefined : crestTint(tintKey || name)}
        >
            {showLogo ? (
                <img src={logoUrl ?? undefined} alt="" className="h-full w-full object-contain p-0.5" onError={() => setFailed(true)} />
            ) : (
                initials(name)
            )}
        </span>
    );
};

export default TeamCrest;
