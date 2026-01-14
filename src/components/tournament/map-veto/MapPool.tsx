import React from 'react';
import { Sword, Shield as ShieldIcon, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MatchMapVeto, GameMap, PickedMap, VETO_SEQUENCES, getVetoFormat, getTeamForAction, getSidePickerTeam } from '@/hooks/useMapVetoMachine';
import { vetoService } from '@/services/vetoService';

interface MapPoolProps {
    veto: MatchMapVeto;
    availableMaps: GameMap[];
    isUserTurn: boolean;
    actionLoading: string | null;
    handleMapAction: (mapId: string) => void;
    imagesLoaded: Set<string>;
    setImagesLoaded: React.Dispatch<React.SetStateAction<Set<string>>>;
    currentTeamName: string;
    team1Name: string;
    team2Name: string;
    team1Id?: string | null;
    team2Id?: string | null;
    team1Logo?: string | null;
    team2Logo?: string | null;
    bestOf: number;
}

export const MapPool: React.FC<MapPoolProps> = ({
    veto,
    availableMaps,
    isUserTurn,
    actionLoading,
    handleMapAction,
    imagesLoaded,
    setImagesLoaded,
    currentTeamName,
    team1Name,
    team2Name,
    team1Id,
    team2Id,
    team1Logo,
    team2Logo,
    bestOf,
}) => {
    if (!((veto.status === 'in_progress' || (veto.status === 'pending' && bestOf !== null && bestOf !== undefined)))) {
        return null;
    }

    const effectiveTeam1Id = veto.team1_id || team1Id;
    const effectiveTeam2Id = veto.team2_id || team2Id;

    const currentBestOf = bestOf || 1;
    const vetoFormat = getVetoFormat(currentBestOf);

    // Normalize helpers
    const normalizeBannedMaps = (bannedMaps: any): string[] => {
        if (!bannedMaps) return [];
        if (Array.isArray(bannedMaps)) return bannedMaps;
        if (typeof bannedMaps === 'string') {
            try {
                const parsed = JSON.parse(bannedMaps);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [bannedMaps];
            }
        }
        return [bannedMaps];
    };

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

    const team1Banned = normalizeBannedMaps(veto.team1_banned_maps);
    const team2Banned = normalizeBannedMaps(veto.team2_banned_maps);
    const allBannedMaps = [...team1Banned, ...team2Banned];

    const team1Picked = normalizePickedMaps(veto.team1_picked_maps);
    const team2Picked = normalizePickedMaps(veto.team2_picked_maps);

    const allPickedMaps = [
        ...team1Picked.map((p: PickedMap) => ({ ...p, team: 'team1', teamName: team1Name })),
        ...team2Picked.map((p: PickedMap) => ({ ...p, team: 'team2', teamName: team2Name })),
    ];

    const allPickedMapIds = [
        ...team1Picked.map((p: PickedMap) => p?.map_id || p).filter(Boolean),
        ...team2Picked.map((p: PickedMap) => p?.map_id || p).filter(Boolean),
    ];

    const allUsedMaps = [
        ...allBannedMaps.map(id => String(id)),
        ...allPickedMapIds.map(id => String(id))
    ];

    const availableMapsToShow = availableMaps.filter((m) => {
        const mapId = String(m.id);
        return !allUsedMaps.includes(mapId);
    });

    const getMapStatus = (mapId: string) => {
        const mapIdStr = String(mapId);
        const isBanned = allBannedMaps.map(id => String(id)).includes(mapIdStr);
        const isTeam1Ban = team1Banned.map(id => String(id)).includes(mapIdStr);
        const isTeam2Ban = team2Banned.map(id => String(id)).includes(mapIdStr);
        const pickedMap = allPickedMaps.find((p: any) => p.map_id === mapId);
        const isPicked = !!pickedMap || veto.selected_map_id === mapId;

        let sidePickerTeamId: string | null = null;
        let sidePickerTeamName: string | null = null;

        if (pickedMap) {
            const sequence = VETO_SEQUENCES[vetoFormat];
            for (let actionIdx = 0; actionIdx < sequence.length; actionIdx++) {
                const action = sequence[actionIdx];
                const actionNumber = actionIdx + 1;

                if (action === 'pick') {
                    const mapPickerTeamId = getTeamForAction(
                        actionNumber,
                        vetoFormat,
                        effectiveTeam1Id!,
                        effectiveTeam2Id!,
                        action
                    );

                    const pickerTeamPicks = mapPickerTeamId === veto.team1_id ? team1Picked : team2Picked;

                    let pickCount = 0;
                    for (let i = 0; i < actionIdx; i++) {
                        if (sequence[i] === 'pick' || sequence[i] === 'auto_pick') {
                            pickCount++;
                        }
                    }

                    if (pickerTeamPicks[pickCount]?.map_id === mapId) {
                        sidePickerTeamId = getSidePickerTeam(
                            actionNumber,
                            vetoFormat,
                            effectiveTeam1Id!,
                            effectiveTeam2Id!
                        );
                        sidePickerTeamName = sidePickerTeamId === effectiveTeam1Id ? team1Name : team2Name;
                        break;
                    }
                }
            }

            // If still no sidePickerTeamId, check if it's the decider map
            if (!sidePickerTeamId) {
                const finalPickSideActionNumber = vetoFormat === 1 ? 7 : (vetoFormat === 3 ? 9 : 11);
                // We can use getSidePickerTeam directly for the decider action
                const step = vetoService.getStep(vetoFormat, finalPickSideActionNumber);
                if (step?.isDecider && step.action === 'pick_side') {
                    // Check if this map is indeed the decider (leftover or in the picks but not from a 'pick' action)
                    // A simple check: if it's in allPickedMaps but didn't match any 'pick' action above, it's the decider
                    sidePickerTeamId = getSidePickerTeam(
                        finalPickSideActionNumber,
                        vetoFormat,
                        effectiveTeam1Id!,
                        effectiveTeam2Id!
                    );
                    sidePickerTeamName = sidePickerTeamId === effectiveTeam1Id ? team1Name : team2Name;
                }
            }
        }

        let pickedByTeamLogo: string | null = null;
        if (pickedMap?.teamName) {
            const isTeam1Pick = team1Picked.some((p: any) => p.map_id === mapId);
            pickedByTeamLogo = isTeam1Pick ? team1Logo : team2Logo;
        }

        return {
            isBanned,
            isTeam1Ban,
            isTeam2Ban,
            isPicked,
            pickedBy: pickedMap?.teamName,
            pickedByTeamLogo,
            pickedSide: pickedMap?.side,
            sidePickerTeamId,
            sidePickerTeamName,
        };
    };

    return (
        <div>
            <div className="text-[10px] sm:text-xs md:text-sm font-black text-white uppercase tracking-widest mb-2 sm:mb-3 lg:mb-4 px-2 sm:px-0">
                {isUserTurn
                    ? (veto.current_action === 'ban'
                        ? 'SELECT MAP TO BAN'
                        : veto.current_action === 'pick_side'
                            ? 'SELECT SIDE FOR LAST PICKED MAP'
                            : 'SELECT MAP TO PICK')
                    : `WAITING FOR ${currentTeamName.toUpperCase()}`
                }
            </div>

            {veto.current_action === 'pick_side' ? (
                // Side Selection View
                (() => {
                    const currentActionNum = veto.current_action_number || 1;
                    const sequence = VETO_SEQUENCES[vetoFormat];

                    // Check for final pick_side (decider map) - bestOf is NUMBER now
                    const isFinalPickSide =
                        (vetoFormat === 3 && currentActionNum === 9) ||
                        (vetoFormat === 5 && currentActionNum === 11) ||
                        (vetoFormat === 1 && currentActionNum === 7);

                    const pickActionNumber = currentActionNum - 1;

                    if (pickActionNumber < 1 || pickActionNumber > sequence.length) {
                        return <div className="text-center py-8 text-gray-400">Invalid action number</div>;
                    }

                    const previousAction = sequence[pickActionNumber - 1];
                    if (previousAction !== 'pick' && !isFinalPickSide) {
                        return <div className="text-center py-8 text-gray-400">Expected pick action before side selection</div>;
                    }

                    let pickedMap: any = null;
                    let mapToShow: GameMap | null = null;

                    if (isFinalPickSide) {
                        // For the final map (decider), it's the one that hasn't been banned or picked yet.
                        // It's not in the picked list, so we find it by exclusion.
                        const leftoverMap = availableMaps.find(m => !allUsedMaps.includes(String(m.id)));
                        if (leftoverMap) {
                            pickedMap = { map_id: leftoverMap.id }; // Mock picked map object
                            mapToShow = leftoverMap;
                        }
                    } else {
                        const pickActionType = sequence[pickActionNumber - 1];
                        const pickActionTeamId = getTeamForAction(
                            pickActionNumber,
                            vetoFormat,
                            effectiveTeam1Id!,
                            effectiveTeam2Id!,
                            pickActionType
                        );

                        let teamPicks = pickActionTeamId === effectiveTeam1Id ? team1Picked : team2Picked;
                        let isTeam1 = pickActionTeamId === effectiveTeam1Id;

                        let mapIndex = -1;
                        for (let i = teamPicks.length - 1; i >= 0; i--) {
                            const pm = teamPicks[i] as any;
                            if (pm && pm.map_id && (pm.side === undefined || pm.side === null)) {
                                mapIndex = i;
                                pickedMap = pm;
                                break;
                            }
                        }

                        if (mapIndex === -1) {
                            const otherTeamPicks = isTeam1 ? team2Picked : team1Picked;
                            for (let i = otherTeamPicks.length - 1; i >= 0; i--) {
                                const pm = otherTeamPicks[i] as any;
                                if (pm && pm.map_id && (pm.side === undefined || pm.side === null)) {
                                    pickedMap = pm;
                                    break;
                                }
                            }
                        }

                        mapToShow = pickedMap ? availableMaps.find(m => m.id === pickedMap.map_id) || null : null;
                    }

                    if (!mapToShow) {
                        return <div className="text-center py-8 text-gray-400">Map not found</div>;
                    }

                    const canInteract = isUserTurn && !actionLoading && (veto.status === 'in_progress' || (veto.status === 'pending' && bestOf !== null && bestOf !== undefined));

                    const mapImageUrl = mapToShow.map_image_url || `https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=300&fit=crop&q=80`;

                    return (
                        <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
                            <div
                                className={cn(
                                    'relative group rounded-lg overflow-hidden border-2 transition-colors duration-150 motion-reduce:transition-none',
                                    canInteract
                                        ? 'border-white/50 hover:border-white hover:shadow-lg hover:shadow-white/20 cursor-pointer'
                                        : 'border-white/20',
                                    actionLoading === mapToShow.id && 'opacity-50 pointer-events-none'
                                )}
                                style={{
                                    backgroundImage: `url(${mapImageUrl})`,
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat'
                                }}
                                role="button"
                                tabIndex={canInteract ? 0 : -1}
                                aria-label={canInteract ? `Select side for ${mapToShow.map_name}` : `Map ${mapToShow.map_name}`}
                                onKeyDown={(e) => {
                                    if (canInteract && (e.key === 'Enter' || e.key === ' ')) {
                                        e.preventDefault();
                                        handleMapAction(mapToShow!.id);
                                    }
                                }}
                                onClick={() => {
                                    if (canInteract) {
                                        handleMapAction(mapToShow!.id);
                                    }
                                }}
                            >
                                <div className="relative h-48 sm:h-56 lg:h-64 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                                    <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 lg:p-6">
                                        <h3 className="text-lg sm:text-xl lg:text-2xl font-black text-white mb-1 sm:mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>{mapToShow.map_name}</h3>
                                        <p className="text-sm sm:text-base text-white font-bold" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>
                                            {canInteract ? 'Click to Select Side (Attack/Defend)' : 'Waiting for side selection...'}
                                        </p>
                                    </div>
                                    {canInteract && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all duration-200">
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3 border-2 border-white/50">
                                                    <p className="text-white font-black text-lg uppercase tracking-wider">SELECT SIDE</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })()
            ) : (
                // Map Grid View
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3 lg:gap-4">
                    {availableMapsToShow.map((map) => {
                        const mapStatus = getMapStatus(map.id);
                        const canInteract = !mapStatus.isBanned && !mapStatus.isPicked && isUserTurn && !actionLoading && (veto.status === 'in_progress' || (veto.status === 'pending' && bestOf !== null && bestOf !== undefined));

                        console.log('[MapPool] Render Map:', {
                            mapId: map.id,
                            isUserTurn,
                            actionLoading,
                            vetoStatus: veto.status,
                            mapStatus
                        });

                        let mapImageUrl = map.map_image_url || `https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=300&fit=crop&q=80`;
                        // Revert: Do not replace system.assets.website with system.assets.games as it might be breaking images
                        // if (mapImageUrl && mapImageUrl.includes('website-assets')) {
                        //     mapImageUrl = mapImageUrl.replace('website-assets/', 'system.assets.games/');
                        // } else if (mapImageUrl && mapImageUrl.includes('system.assets.website') && !mapImageUrl.includes('system.assets.games')) {
                        //     mapImageUrl = mapImageUrl.replace('system.assets.website/', 'system.assets.games/');
                        // }

                        const isImageLoaded = imagesLoaded.has(mapImageUrl);

                        return (
                            <div
                                key={map.id}
                                className={cn(
                                    'relative group rounded-lg overflow-hidden border transition-all duration-200 motion-reduce:transition-none',
                                    mapStatus.isBanned
                                        ? 'border-red-500 cursor-not-allowed opacity-60'
                                        : mapStatus.isPicked
                                            ? 'border-green-500'
                                            : canInteract
                                                ? 'border-red-500 hover:border-red-400 hover:shadow-lg hover:shadow-red-500/20 cursor-pointer'
                                                : 'border-red-500',
                                    actionLoading === map.id && 'opacity-50 pointer-events-none'
                                )}
                                style={{
                                    backgroundImage: isImageLoaded ? `url(${mapImageUrl})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                    minHeight: '8rem',
                                    backgroundColor: isImageLoaded ? 'transparent' : '#1a1a1a'
                                }}
                                role="button"
                                tabIndex={canInteract ? 0 : -1}
                                aria-label={`${veto.current_action === 'ban' ? 'Ban' : 'Pick'} ${map.map_name}`}
                                onKeyDown={(e) => {
                                    if (canInteract && (e.key === 'Enter' || e.key === ' ')) {
                                        e.preventDefault();
                                        handleMapAction(map.id);
                                    }
                                }}
                                onClick={() => canInteract && handleMapAction(map.id)}
                            >
                                {!isImageLoaded && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                                        <div className="text-[10px] text-zinc-500">Loading...</div>
                                    </div>
                                )}
                                {!isImageLoaded && (
                                    <img
                                        src={mapImageUrl}
                                        alt=""
                                        className="hidden"
                                        onLoad={() => setImagesLoaded(prev => new Set([...prev, mapImageUrl]))}
                                        onError={() => console.warn(`[MapPool] Failed to load image: ${mapImageUrl}`)}
                                    />
                                )}
                                {!mapStatus.isBanned && !mapStatus.isPicked && (
                                    <div className="absolute inset-0 bg-black/40 z-0" />
                                )}

                                <div className="relative w-full h-28 sm:h-36 md:h-40 lg:h-44">
                                    {!mapStatus.isPicked && !mapStatus.isBanned && (
                                        <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                                            <div className="space-y-0.5 sm:space-y-1 text-center">
                                                <span className={cn(
                                                    "text-lg sm:text-xl md:text-2xl font-bold block text-white mb-1 sm:mb-1.5"
                                                )}
                                                    style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>
                                                    {map.map_name}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {mapStatus.isBanned && (
                                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 border border-red-500 rounded-lg">
                                        <div className="bg-red-500 rounded-full p-3 sm:p-4 lg:p-5 border-4 border-white shadow-xl">
                                            <XCircle className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-white" strokeWidth={2.5} />
                                        </div>
                                    </div>
                                )}

                                {mapStatus.isPicked && (
                                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-10 border border-green-500 rounded-lg">
                                        <div className="w-full flex flex-col items-center justify-center space-y-2 sm:space-y-3 px-4">
                                            <div className="text-sm sm:text-base lg:text-lg font-black text-white text-center" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>
                                                {map.map_name}
                                            </div>

                                            {(() => {
                                                const pickedTeamLogo = mapStatus.pickedByTeamLogo;
                                                const pickedTeamName = mapStatus.pickedBy || '';

                                                return (
                                                    <div className="flex flex-col items-center justify-center gap-1 sm:gap-2">
                                                        {pickedTeamLogo ? (
                                                            <img
                                                                src={pickedTeamLogo}
                                                                alt={pickedTeamName}
                                                                className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 object-contain flex-shrink-0"
                                                            />
                                                        ) : (
                                                            <span className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wide text-center">
                                                                {pickedTeamName}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })()}

                                            {mapStatus.pickedSide && (
                                                <div className={cn(
                                                    "w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-lg border-2 border-white shadow-xl flex items-center justify-center",
                                                    mapStatus.pickedSide === 'attack'
                                                        ? "bg-orange-500 text-white"
                                                        : "bg-blue-500 text-white"
                                                )}>
                                                    {mapStatus.pickedSide === 'attack' ? (
                                                        <Sword className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                                                    ) : (
                                                        <ShieldIcon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {canInteract && (
                                    <div className={cn(
                                        "absolute inset-0 flex items-center justify-center z-20 border-2 transition-all",
                                        veto.current_action === 'ban'
                                            ? "bg-red-500/0 group-hover:bg-red-500/30 border-red-500/50 group-hover:border-red-500"
                                            : "bg-green-500/0 group-hover:bg-green-500/30 border-green-500/50 group-hover:border-green-500"
                                    )}>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className={cn(
                                                "px-6 py-4 rounded-lg text-lg font-black border-2 shadow-xl",
                                                veto.current_action === 'ban'
                                                    ? "bg-red-500 text-white border-white"
                                                    : "bg-green-500 text-white border-white"
                                            )}>
                                                {veto.current_action === 'ban' ? 'BAN' : 'PICK'}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {availableMapsToShow.length === 0 && veto.current_action !== 'pick_side' && (
                <div className="text-center py-12 text-gray-400">
                    <p className="text-lg font-semibold">All maps have been banned or picked.</p>
                </div>
            )}
        </div>
    );
};
