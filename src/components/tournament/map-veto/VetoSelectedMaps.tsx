import React from 'react';
import { Sword, Shield as ShieldIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchMapVeto, GameMap, PickedMap, getVetoFormat, getTeamForAction, getSidePickerTeam, VetoService } from '@/hooks/useMapVetoMachine';

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
    imagesLoaded: Set<string>;
    setImagesLoaded: React.Dispatch<React.SetStateAction<Set<string>>>;
    bestOf: number;
    game?: string;
    compact?: boolean;
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
    team1Logo: _team1Logo,
    team2Logo: _team2Logo,
    imagesLoaded,
    setImagesLoaded,
    bestOf,
    game = 'valorant',
    compact = false,
    className,
}) => {
    const service = React.useMemo(() => new VetoService(game, availableMaps.length || undefined), [game, availableMaps.length]);
    const mapLookup = allAvailableMaps.length > 0 ? allAvailableMaps : availableMaps;
    const currentBestOf = bestOf || 1;
    const vetoFormat = getVetoFormat(currentBestOf);

    const effectiveTeam1Id = veto.team1_id || team1Id;
    const effectiveTeam2Id = veto.team2_id || team2Id;

    // Normalize picked_maps to arrays
    const normalizePickedMaps = (pickedMaps: any): PickedMap[] => {
        if (!pickedMaps) return [];
        if (Array.isArray(pickedMaps)) return pickedMaps;
        if (typeof pickedMaps === 'string') {
            try {
                const parsed = JSON.parse(pickedMaps);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [pickedMaps];
    };

    const team1Picks = normalizePickedMaps(veto.team1_picked_maps);
    const team2Picks = normalizePickedMaps(veto.team2_picked_maps);

    const allPickedMaps = [
        ...team1Picks.map((p: PickedMap) => ({ ...p, team: 'team1', teamName: team1Name })),
        ...team2Picks.map((p: PickedMap) => ({ ...p, team: 'team2', teamName: team2Name })),
    ];

    if (!((veto.status === 'completed') || (veto.status === 'in_progress' && allPickedMaps.length > 0))) {
        return null;
    }

    return (
        <div className={cn('rounded-lg border border-white/10 bg-black/30 p-3', className)}>
            <div className={cn(
                'font-black text-white/80 uppercase tracking-widest',
                compact ? 'mb-3 text-[10px]' : 'mb-5 text-xs sm:text-sm',
            )}>
                SELECTED MAPS
            </div>

            <div className={cn(
                'grid gap-2.5 sm:gap-3',
                compact
                    ? 'grid-cols-2 sm:grid-cols-3 2xl:grid-cols-5'
                    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
            )}>
                {(() => {
                    const mapsWithSides: Array<{
                        map_id: string;
                        map_name: string;
                        map_image_url?: string | null;
                        side?: 'attack' | 'defend';
                        sidePickerTeamId: string | null;
                        sidePickerTeamName: string;
                        mapPickerTeamId: string | null;
                        mapPickerTeamName: string;
                        mapNumber: number;
                        pickActionNumber: number;
                    }> = [];

                    const sequence = service.getSequence(vetoFormat);

                    const pickActions: Array<{ actionNumber: number; action: string; teamId: string }> = [];
                    for (const step of sequence) {
                        if (step.action === 'pick') {
                            const actionNumber = step.actionNumber;
                            const mapPickerTeamId = getTeamForAction(
                                actionNumber,
                                vetoFormat,
                                effectiveTeam1Id!,
                                effectiveTeam2Id!,
                                service
                            );
                            pickActions.push({ actionNumber, action: step.action, teamId: mapPickerTeamId });
                        }
                    }

                    let mapNumber = 1;
                    const usedMapIds = new Set<string>();

                    for (const pickAction of pickActions) {
                        const pickerTeamPicks = pickAction.teamId === effectiveTeam1Id ? team1Picks : team2Picks;

                        for (const pickedMapData of pickerTeamPicks) {
                            const mapId = (pickedMapData as any)?.map_id;
                            if (mapId && !usedMapIds.has(mapId)) {
                                usedMapIds.add(mapId);

                                const sidePickerTeamId = getSidePickerTeam(
                                    pickAction.actionNumber,
                                    vetoFormat,
                                    effectiveTeam1Id!,
                                    effectiveTeam2Id!,
                                    service
                                );

                                const map = mapLookup.find(m => m.id === mapId);
                                mapsWithSides.push({
                                    map_id: mapId,
                                    map_name: map?.map_name || 'Selected map',
                                    map_image_url: map?.map_image_url,
                                    side: (pickedMapData as any).side,
                                    sidePickerTeamId,
                                    sidePickerTeamName: sidePickerTeamId === effectiveTeam1Id ? team1Name : team2Name,
                                    mapPickerTeamId: pickAction.teamId,
                                    mapPickerTeamName: pickAction.teamId === effectiveTeam1Id ? team1Name : team2Name,
                                    mapNumber: mapNumber++,
                                    pickActionNumber: pickAction.actionNumber
                                });
                                break;
                            }
                        }
                    }

                    // Add decider map for BO3 and BO5 ONLY (not BO1 - BO1 has active pick at action 6)
                    // BO1 doesn't have a decider - T1 actively picks from the remaining 2 maps
                    const deciderStep = sequence.find((step) => step.isDecider && step.action === 'pick_side');
                    if (deciderStep && (vetoFormat === 3 || vetoFormat === 5) && (veto.status === 'completed' || veto.status === 'in_progress')) {
                        const finalPickSideActionNumber = deciderStep.actionNumber;
                        const currentActionNum = veto.current_action_number || 0;

                        if (currentActionNum >= finalPickSideActionNumber || veto.status === 'completed') {
                            const finalSidePickerTeamId = getSidePickerTeam(
                                finalPickSideActionNumber,
                                vetoFormat,
                                effectiveTeam1Id!,
                                effectiveTeam2Id!,
                                service
                            );

                            // Find the decider map: it's the leftover map that wasn't banned or picked
                            // Get all banned map IDs
                            const normalizeBannedMaps = (bannedMaps: any): string[] => {
                                if (!bannedMaps) return [];
                                if (Array.isArray(bannedMaps)) return bannedMaps.filter(id => typeof id === 'string');
                                if (typeof bannedMaps === 'string') {
                                    try {
                                        const parsed = JSON.parse(bannedMaps);
                                        return Array.isArray(parsed) ? parsed.filter(id => typeof id === 'string') : [];
                                    } catch {
                                        return [];
                                    }
                                }
                                return [];
                            };

                            const team1Bans = normalizeBannedMaps(veto.team1_banned_maps);
                            const team2Bans = normalizeBannedMaps(veto.team2_banned_maps);
                            const allBannedMapIds = new Set([...team1Bans, ...team2Bans]);

                            // Find the decider: the map that's not banned and not already in usedMapIds
                            const deciderMap = mapLookup.find(m => !allBannedMapIds.has(m.id) && !usedMapIds.has(m.id));

                            if (deciderMap) {
                                // Find the side selection from the finalSidePickerTeamId's picks
                                const finalSidePickerPicks = finalSidePickerTeamId === effectiveTeam1Id ? team1Picks : team2Picks;
                                const deciderPickData = finalSidePickerPicks.find((p: any) => p.map_id === deciderMap.id) as any;

                                usedMapIds.add(deciderMap.id);
                                mapsWithSides.push({
                                    map_id: deciderMap.id,
                                    map_name: deciderMap.map_name,
                                    map_image_url: deciderMap.map_image_url,
                                    side: deciderPickData?.side,
                                    sidePickerTeamId: finalSidePickerTeamId,
                                    sidePickerTeamName: finalSidePickerTeamId === effectiveTeam1Id ? team1Name : team2Name,
                                    mapPickerTeamId: null, // Decider has no picker, it's the leftover
                                    mapPickerTeamName: 'Decider',
                                    mapNumber: mapNumber++,
                                    pickActionNumber: finalPickSideActionNumber
                                });
                            }
                        }
                    }

                    return mapsWithSides.map((mapData, idx) => {
                        const mapImageUrl = mapData.map_image_url || `https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=300&fit=crop&q=80`;

                        const isImageLoaded = imagesLoaded.has(mapImageUrl);

                        return (
                            <div
                                key={idx}
                                className="group relative bg-black border border-rose-500/40 rounded-lg overflow-hidden shadow-lg transition-colors duration-200 hover:border-rose-400"
                            >
                                <div
                                    className={cn(
                                        'relative w-full',
                                        compact ? 'h-32 sm:h-36 lg:h-40' : 'h-[160px] sm:h-[180px] md:h-[200px] lg:h-[220px]',
                                    )}
                                    style={{
                                        backgroundImage: isImageLoaded ? `url(${mapImageUrl})` : 'none',
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        backgroundRepeat: 'no-repeat',
                                        backgroundColor: isImageLoaded ? 'transparent' : '#0a0a0a'
                                    }}
                                >
                                    {!isImageLoaded && (
                                        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
                                            <div className="animate-pulse text-zinc-500 text-xs">Loading map...</div>
                                        </div>
                                    )}
                                    <img
                                        src={mapImageUrl}
                                        alt=""
                                        className="hidden"
                                        onLoad={() => {
                                            setImagesLoaded(prev => new Set([...prev, mapImageUrl]));
                                        }}
                                        onError={(_e) => {
                                            console.warn(`[MapVeto] Failed to load image: ${mapImageUrl}`);
                                            // Mark as "loaded" anyway to remove the loading spinner
                                            setImagesLoaded(prev => new Set([...prev, mapImageUrl]));
                                        }}
                                        loading="eager"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 via-black/40 to-transparent" />

                                    <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-20 gap-2">
                                        <div className="px-2 py-1 bg-rose-500 rounded-md shadow-lg">
                                            <span className="text-[9px] sm:text-[10px] font-black text-white tracking-tight">MAP {mapData.mapNumber}</span>
                                        </div>

                                        {mapData.side && (
                                            <div className={cn(
                                                "p-1.5 rounded-md flex items-center justify-center shadow-lg",
                                                mapData.side === 'attack'
                                                    ? "bg-rose-500"
                                                    : "bg-white text-black"
                                            )}>
                                                {mapData.side === 'attack' ? (
                                                    <Sword className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white flex-shrink-0" />
                                                ) : (
                                                    <ShieldIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-black flex-shrink-0" />
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="absolute bottom-0 left-0 right-0 p-3 z-20 text-center">
                                        <div
                                            className={cn(
                                                'font-black text-white leading-tight',
                                                compact ? 'text-sm sm:text-base' : 'text-lg sm:text-xl md:text-2xl',
                                            )}
                                            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                                        >
                                            {mapData.map_name}
                                        </div>
                                        {mapData.side && mapData.sidePickerTeamId && (
                                            <div className="flex items-center justify-center gap-1 text-[10px] sm:text-xs text-white/85 mt-1">
                                                {mapData.side === 'attack' ? (
                                                    <Sword className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-rose-300 flex-shrink-0" />
                                                ) : (
                                                    <ShieldIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-white flex-shrink-0" />
                                                )}
                                                <span className="font-semibold">{mapData.sidePickerTeamName}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    });
                })()}
            </div>
        </div>
    );
};
