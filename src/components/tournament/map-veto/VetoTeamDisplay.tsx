import React from 'react';
import { cn } from '@/lib/utils';

interface VetoTeamDisplayProps {
    team1Name: string;
    team1Logo?: string | null;
    team2Name: string;
    team2Logo?: string | null;
    compact?: boolean;
}

export const VetoTeamDisplay: React.FC<VetoTeamDisplayProps> = ({
    team1Name,
    team1Logo,
    team2Name,
    team2Logo,
    compact = false,
}) => {
    const logoSize = compact
        ? 'max-w-10 max-h-10 sm:max-w-12 sm:max-h-12'
        : 'max-w-12 max-h-12 sm:max-w-16 sm:max-h-16 md:max-w-20 md:max-h-20 lg:max-w-24 lg:max-h-24';
    const fallbackSize = compact
        ? 'w-10 h-10 sm:w-12 sm:h-12'
        : 'w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24';

    return (
        <div className={cn(
            'flex items-center justify-center gap-3 px-2 py-2 rounded-lg border border-white/10 bg-black/40',
            compact ? 'mb-2 gap-2' : 'mb-4 sm:mb-6 lg:mb-10 gap-3 sm:gap-6 lg:gap-12 px-2 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-6',
        )}>
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                {team1Logo ? (
                    <img src={team1Logo} alt={team1Name} className={cn(logoSize, 'w-auto h-auto object-contain')} />
                ) : (
                    <div className={cn(fallbackSize, 'flex items-center justify-center bg-white/5 rounded-lg')}>
                        <span className="text-white font-bold text-sm">{team1Name.charAt(0)}</span>
                    </div>
                )}
                <span className={cn(
                    'font-bold text-white text-center truncate w-full',
                    compact ? 'text-xs' : 'text-xs sm:text-sm md:text-base lg:text-lg',
                )}>{team1Name}</span>
            </div>
            <div className={cn('text-white/30 font-light shrink-0', compact ? 'text-sm' : 'text-base sm:text-lg md:text-xl')}>VS</div>
            <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
                {team2Logo ? (
                    <img src={team2Logo} alt={team2Name} className={cn(logoSize, 'w-auto h-auto object-contain')} />
                ) : (
                    <div className={cn(fallbackSize, 'flex items-center justify-center bg-white/5 rounded-lg')}>
                        <span className="text-white font-bold text-sm">{team2Name.charAt(0)}</span>
                    </div>
                )}
                <span className={cn(
                    'font-bold text-white text-center truncate w-full',
                    compact ? 'text-xs' : 'text-xs sm:text-sm md:text-base lg:text-lg',
                )}>{team2Name}</span>
            </div>
        </div>
    );
};
