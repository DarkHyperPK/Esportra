import React, { useEffect, useMemo, useState } from 'react';
import { Check, Map as MapIcon, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getWebsiteAssetUrl } from '@/lib/storage';
import { canSelectAdditionalMap, filterTournamentMaps } from '@/components/tournament/wizard/tournamentMapPoolUtils';

export interface TournamentMapOption {
    id: string;
    map_name: string;
    map_image_url?: string | null;
}

export interface TournamentMapPoolSelectorProps {
    game: string;
    requiredCount: number;
    availableMaps: TournamentMapOption[];
    selectedIds: string[];
    onChange: (ids: string[]) => void;
    mapVetoEnabled: boolean;
    loading?: boolean;
}

interface MapCardProps {
    map: TournamentMapOption;
    isSelected: boolean;
    onToggle: (id: string) => void;
    index: number;
    disabled: boolean;
}

const MapCard: React.FC<MapCardProps> = ({ map, isSelected, onToggle, index, disabled }) => {
    const [isImgLoaded, setIsImgLoaded] = useState(false);
    const [imgFailed, setImgFailed] = useState(false);
    const fallbackUrl = getWebsiteAssetUrl('Backgrounds/grid-pattern.png');
    const imageUrl = map.map_image_url || fallbackUrl;

    useEffect(() => {
        setIsImgLoaded(false);
        setImgFailed(false);
    }, [imageUrl]);

    return (
        <button
            type="button"
            disabled={disabled}
            aria-pressed={isSelected}
            aria-label={`${isSelected ? 'Deselect' : 'Select'} ${map.map_name}`}
            className={cn(
                'group relative aspect-video rounded-none overflow-hidden border-2 text-left transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60',
                isSelected
                    ? 'border-rose-500 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500'
                    : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100',
            )}
            onClick={() => onToggle(map.id)}
        >
            {!isImgLoaded && !imgFailed && (
                <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-rose-500/20 border-t-emerald-500/80 animate-spin" />
                </div>
            )}

            <img
                src={imgFailed ? fallbackUrl : imageUrl}
                alt=""
                loading={index < 8 ? 'eager' : 'lazy'}
                onLoad={() => setIsImgLoaded(true)}
                onError={() => {
                    setImgFailed(true);
                    setIsImgLoaded(true);
                }}
                className={cn(
                    'object-cover w-full h-full transition-all duration-700',
                    isImgLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110',
                    isSelected && isImgLoaded ? 'scale-105' : 'scale-100 group-hover:scale-105',
                )}
            />

            <div
                className={cn(
                    'absolute inset-0 bg-gradient-to-t transition-opacity duration-300',
                    isSelected ? 'from-black/90 via-black/40 to-transparent' : 'from-black/80 via-transparent to-transparent',
                )}
            />

            {isSelected && (
                <div className="absolute top-2 right-2 z-20 bg-emerald-500 rounded-full p-1 shadow-lg">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </div>
            )}

            <div className="absolute bottom-2 left-2 right-2">
                <span
                    className={cn(
                        'text-[10px] sm:text-xs font-bold uppercase tracking-wide drop-shadow-md transition-colors',
                        isSelected ? 'text-rose-400' : 'text-white',
                    )}
                >
                    {map.map_name}
                </span>
            </div>
        </button>
    );
};

const TournamentMapPoolSelector: React.FC<TournamentMapPoolSelectorProps> = ({
    game,
    requiredCount,
    availableMaps,
    selectedIds,
    onChange,
    mapVetoEnabled,
    loading = false,
}) => {
    const [search, setSearch] = useState('');
    const [showSelectedOnly, setShowSelectedOnly] = useState(false);

    const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
    const exactCountRequired = mapVetoEnabled;
    const selectionComplete = selectedIds.length === requiredCount;
    const selectionOver = selectedIds.length > requiredCount;
    const selectionUnder = selectedIds.length < requiredCount;

    const filteredMaps = useMemo(
        () => filterTournamentMaps(availableMaps, search, showSelectedOnly, selectedIds),
        [availableMaps, search, showSelectedOnly, selectedIds],
    );

    const recommendedIds = useMemo(
        () => availableMaps.slice(0, requiredCount).map((map) => map.id),
        [availableMaps, requiredCount],
    );

    const toggleMap = (mapId: string) => {
        if (selectedSet.has(mapId)) {
            onChange(selectedIds.filter((id) => id !== mapId));
            return;
        }
        if (!canSelectAdditionalMap(selectedIds.length, requiredCount, exactCountRequired)) return;
        onChange([...selectedIds, mapId]);
    };

    useEffect(() => {
        if (availableMaps.length === 0) return;
        availableMaps.forEach((map) => {
            if (map.map_image_url) {
                const img = new Image();
                img.src = map.map_image_url;
            }
        });
    }, [availableMaps]);

    const countLabel = exactCountRequired
        ? `${selectedIds.length} of ${requiredCount} required`
        : `${selectedIds.length} of ${requiredCount} max`;

    const statusMessage = exactCountRequired
        ? selectionComplete
            ? 'Map pool ready for veto.'
            : `Select exactly ${requiredCount} maps for this tournament's veto pool.`
        : `Select up to ${requiredCount} maps for this tournament.`;

    return (
        <div className="space-y-4" data-testid="tournament-map-pool-selector">
            <p className="text-sm text-gray-400">{statusMessage}</p>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
                </div>
            ) : availableMaps.length === 0 ? (
                <div className="p-4 bg-amber-500/10 rounded-none border border-amber-500/30">
                    <p className="text-amber-400 text-sm">No maps found for {game}. Maps can be added to the database.</p>
                </div>
            ) : (
                <>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <span
                                className={cn(
                                    'text-sm',
                                    selectionComplete ? 'text-emerald-400' : selectionOver ? 'text-rose-400' : 'text-gray-400',
                                )}
                            >
                                {countLabel}
                            </span>
                            {exactCountRequired && !selectionComplete && (
                                <p className="text-xs text-amber-400">
                                    {selectionUnder
                                        ? `Select ${requiredCount - selectedIds.length} more map${requiredCount - selectedIds.length === 1 ? '' : 's'}.`
                                        : `Remove ${selectedIds.length - requiredCount} map${selectedIds.length - requiredCount === 1 ? '' : 's'}.`}
                                </p>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button type="button"
                                type="button"
                                size="sm"
                                onClick={() => onChange(recommendedIds)}
                            >
                                Select Recommended
                            </button>
                            <button type="button"
                                type="button"
                                size="sm"
                                onClick={() => onChange([])}
                            >
                                Clear All
                            </button>
                            <button type="button"
                                type="button"
                                variant={showSelectedOnly ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setShowSelectedOnly((prev) => !prev)}
                            >
                                Show Selected Only
                            </button>
                        </div>
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search maps..."
                            className="pl-9 [color-scheme:dark]"
                            aria-label="Search maps"
                        />
                    </div>

                    {filteredMaps.length === 0 ? (
                        <p className="text-sm text-gray-500 py-6 text-center">No maps match your filter.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                            {filteredMaps.map((map, index) => (
                                <MapCard
                                    key={map.id}
                                    map={map}
                                    index={index}
                                    isSelected={selectedSet.has(map.id)}
                                    onToggle={toggleMap}
                                    disabled={
                                        !selectedSet.has(map.id)
                                        && exactCountRequired
                                        && selectedIds.length >= requiredCount
                                    }
                                />
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export const MapPoolSectionLabel: React.FC = () => (
    <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
        <MapIcon className="w-4 h-4" />
        Map Pool
    </div>
);

export default TournamentMapPoolSelector;
