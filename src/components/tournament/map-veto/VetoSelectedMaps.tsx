import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import type { MatchMapVeto, GameMap } from '@/hooks/useMapVetoMachine';
import { buildVetoSelectedMapEntries } from './buildVetoSelectedMapEntries';
import { VetoLineup } from './VetoLineup';

interface VetoSelectedMapsProps {
    veto: MatchMapVeto;
    availableMaps: GameMap[];
    allAvailableMaps: GameMap[];
    team1Name: string;
    team2Name: string;
    team1Id?: string | null;
    team2Id?: string | null;
    team1Logo?: string | null;
    team2Logo?: string | null;
    /** Kept for API compatibility; map art now manages its own loading state. */
    imagesLoaded?: Set<string>;
    setImagesLoaded?: React.Dispatch<React.SetStateAction<Set<string>>>;
    bestOf: number;
    game?: string;
    compact?: boolean;
    rail?: boolean;
    className?: string;
}

export const VetoSelectedMaps: React.FC<VetoSelectedMapsProps> = ({
    veto,
    availableMaps,
    allAvailableMaps,
    team1Name,
    team2Name,
    team1Id,
    team2Id,
    bestOf,
    game = 'valorant',
    rail = false,
    className,
}) => {
    const mapLookup = allAvailableMaps.length > 0 ? allAvailableMaps : availableMaps;
    const entries = useMemo(
        () => buildVetoSelectedMapEntries({
            veto,
            bestOf: bestOf || 1,
            game,
            mapLookup,
            team1Name,
            team2Name,
            team1Id,
            team2Id,
        }),
        [bestOf, game, mapLookup, team1Id, team1Name, team2Id, team2Name, veto],
    );

    if (veto.status !== 'completed' && veto.status !== 'in_progress') {
        return null;
    }

    const isComplete = veto.status === 'completed';
    const decided = entries.length;
    const total = Math.max(bestOf || 1, decided);

    return (
        <section className={cn('min-w-0', className)} aria-label="Series lineup">
            <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className={cn(
                    'font-heading font-bold tracking-tight text-white',
                    rail ? 'text-base' : 'text-lg sm:text-xl',
                )}>
                    {isComplete ? 'The series' : 'Series so far'}
                </h3>
                <span className={EYEBROW_CLASS}>
                    {decided} of {total} set
                </span>
            </div>
            <VetoLineup entries={entries} bestOf={bestOf || 1} variant={rail ? 'rail' : 'cards'} />
        </section>
    );
};
