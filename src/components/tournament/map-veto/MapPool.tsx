import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MatchMapVeto, GameMap, PickedMap, getVetoFormat, getTeamForAction, getSidePickerTeam, VetoService, isVetoLive } from '@/hooks/useMapVetoMachine';
import { getVetoActionHoverClasses, getVetoActionNoun } from './vetoActionPresentation';
import { getVetoLayoutConfig, type VetoLayoutMode } from './vetoLayoutConfig';
import {
    MAP_FLASH_MS,
    mapOverlayMotion,
    type MapTransitionAction,
    type MapTransitionState,
} from './mapPoolAnimations';

function normalizeBannedMaps(bannedMaps: unknown): string[] {
    if (!bannedMaps) return [];
    if (Array.isArray(bannedMaps)) return bannedMaps.map(String);
    if (typeof bannedMaps === 'string') {
        try {
            const parsed = JSON.parse(bannedMaps);
            return Array.isArray(parsed) ? parsed.map(String) : [bannedMaps];
        } catch {
            return [bannedMaps];
        }
    }
    return [String(bannedMaps)];
}

function normalizePickedMaps(pickedMaps: unknown): PickedMap[] {
    if (!pickedMaps) return [];
    if (Array.isArray(pickedMaps)) {
        return pickedMaps
            .map((pick) => {
                if (typeof pick === 'string') return { map_id: pick };
                if (pick && typeof pick === 'object') {
                    const typedPick = pick as { map_id?: string; mapId?: string; side?: PickedMap['side'] };
                    return {
                        map_id: typedPick.map_id ?? typedPick.mapId ?? '',
                        side: typedPick.side,
                    };
                }
                return null;
            })
            .filter((pick): pick is PickedMap => Boolean(pick?.map_id));
    }
    if (typeof pickedMaps === 'string') {
        try {
            const parsed = JSON.parse(pickedMaps);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
}

interface MapPoolProps {
    veto: MatchMapVeto;
    availableMaps: GameMap[];
    allAvailableMaps: GameMap[];
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
    game?: string;
    layoutMode?: VetoLayoutMode;
    /** When false, ban/pick animations wait for server state instead of firing on click. */
    transitionOnClick?: boolean;
}

export const MapPool: React.FC<MapPoolProps> = ({
    veto,
    availableMaps,
    allAvailableMaps,
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
    game = 'valorant',
    layoutMode = 'embedded',
    transitionOnClick = true,
}) => {
    const service = React.useMemo(() => new VetoService(game, availableMaps.length || undefined), [game, availableMaps.length]);
    const mapLookup = allAvailableMaps.length > 0 ? allAvailableMaps : availableMaps;
    const reduceMotion = useReducedMotion();

    const [transitioning, setTransitioning] = useState<Record<string, MapTransitionState>>({});
    const transitionTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const prevUsedMapsRef = useRef<Set<string>>(new Set());
    const hasSeededUsedMapsRef = useRef(false);

    const clearTransitionTimer = useCallback((mapId: string) => {
        const timer = transitionTimersRef.current.get(mapId);
        if (timer) {
            clearTimeout(timer);
            transitionTimersRef.current.delete(mapId);
        }
    }, []);

    const startMapTransition = useCallback((mapId: string, action: MapTransitionAction) => {
        const normalizedId = String(mapId);
        clearTransitionTimer(normalizedId);

        setTransitioning((prev) => ({
            ...prev,
            [normalizedId]: { action, startedAt: Date.now() },
        }));

        const timer = setTimeout(() => {
            setTransitioning((prev) => {
                if (!prev[normalizedId]) return prev;
                const next = { ...prev };
                delete next[normalizedId];
                return next;
            });
            transitionTimersRef.current.delete(normalizedId);
        }, MAP_FLASH_MS);

        transitionTimersRef.current.set(normalizedId, timer);
    }, [clearTransitionTimer]);

    useEffect(() => () => {
        transitionTimersRef.current.forEach((timer) => clearTimeout(timer));
        transitionTimersRef.current.clear();
    }, []);

    const vetoLive = isVetoLive(veto);

    const team1Banned = useMemo(
        () => normalizeBannedMaps(veto.team1_banned_maps),
        [veto.team1_banned_maps],
    );
    const team2Banned = useMemo(
        () => normalizeBannedMaps(veto.team2_banned_maps),
        [veto.team2_banned_maps],
    );
    const team1Picked = useMemo(
        () => normalizePickedMaps(veto.team1_picked_maps),
        [veto.team1_picked_maps],
    );
    const team2Picked = useMemo(
        () => normalizePickedMaps(veto.team2_picked_maps),
        [veto.team2_picked_maps],
    );

    const allPickedMapIds = useMemo(
        () => [
            ...team1Picked.map((p) => String(p?.map_id || p)).filter(Boolean),
            ...team2Picked.map((p) => String(p?.map_id || p)).filter(Boolean),
        ],
        [team1Picked, team2Picked],
    );

    const usedMapsKey = useMemo(
        () => [...team1Banned, ...team2Banned, ...allPickedMapIds].sort().join('|'),
        [team1Banned, team2Banned, allPickedMapIds],
    );

    const bannedMapIdSet = useMemo(
        () => new Set([...team1Banned, ...team2Banned].map(String)),
        [team1Banned, team2Banned],
    );

    useEffect(() => {
        if (!vetoLive) return;

        if (usedMapsKey === '') {
            hasSeededUsedMapsRef.current = false;
            prevUsedMapsRef.current = new Set();
            return;
        }

        const currentUsed = new Set([...team1Banned, ...team2Banned, ...allPickedMapIds].map(String));

        if (!hasSeededUsedMapsRef.current) {
            prevUsedMapsRef.current = currentUsed;
            hasSeededUsedMapsRef.current = true;
            return;
        }

        currentUsed.forEach((mapId) => {
            if (prevUsedMapsRef.current.has(mapId) || transitionTimersRef.current.has(mapId)) return;
            const action: MapTransitionAction = bannedMapIdSet.has(mapId) ? 'ban' : 'pick';
            startMapTransition(mapId, action);
        });

        prevUsedMapsRef.current = currentUsed;
    }, [allPickedMapIds, bannedMapIdSet, startMapTransition, team1Banned, team2Banned, usedMapsKey, vetoLive]);

    const handleMapActionWithTransition = useCallback((mapId: string) => {
        const normalizedId = String(mapId);
        const action: MapTransitionAction = veto.current_action === 'pick' ? 'pick' : 'ban';
        if (
            transitionOnClick
            && (veto.current_action === 'ban' || veto.current_action === 'pick')
        ) {
            startMapTransition(normalizedId, action);
            prevUsedMapsRef.current = new Set([...prevUsedMapsRef.current, normalizedId]);
        }
        handleMapAction(mapId);
    }, [handleMapAction, startMapTransition, transitionOnClick, veto.current_action]);

    if (!vetoLive) {
        return null;
    }

    const effectiveTeam1Id = veto.team1_id || team1Id;
    const effectiveTeam2Id = veto.team2_id || team2Id;

    const currentBestOf = bestOf || 1;
    const vetoFormat = getVetoFormat(currentBestOf);

    const allBannedMaps = [...team1Banned, ...team2Banned];

    const allPickedMaps = [
        ...team1Picked.map((p: PickedMap) => ({ ...p, team: 'team1', teamName: team1Name })),
        ...team2Picked.map((p: PickedMap) => ({ ...p, team: 'team2', teamName: team2Name })),
    ];

    const allUsedMaps = [...allBannedMaps, ...allPickedMapIds].map(String);

    const availableMapsToShow = availableMaps;

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
            const sequence = service.getSequence(vetoFormat).map(s => s.action);
            for (let actionIdx = 0; actionIdx < sequence.length; actionIdx++) {
                const action = sequence[actionIdx];
                const actionNumber = actionIdx + 1;

                if (action === 'pick') {
                    const mapPickerTeamId = getTeamForAction(
                        actionNumber,
                        vetoFormat,
                        effectiveTeam1Id!,
                        effectiveTeam2Id!,
                        service
                    );

                    const pickerTeamPicks = mapPickerTeamId === effectiveTeam1Id ? team1Picked : team2Picked;

                    let pickCount = 0;
                    for (let i = 0; i < actionIdx; i++) {
                        if (sequence[i] === 'pick') {
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
                const deciderStep = service.getSequence(vetoFormat).find((step) => step.isDecider && step.action === 'pick_side');
                if (deciderStep) {
                    sidePickerTeamId = getSidePickerTeam(
                        deciderStep.actionNumber,
                        vetoFormat,
                        effectiveTeam1Id!,
                        effectiveTeam2Id!,
                        service
                    );
                    sidePickerTeamName = sidePickerTeamId === effectiveTeam1Id ? team1Name : team2Name;
                }
            }
        }

        let pickedByTeamLogo: string | null = null;
        if (pickedMap?.teamName) {
            const isTeam1Pick = team1Picked.some((p: any) => p.map_id === mapId);
            pickedByTeamLogo = (isTeam1Pick ? team1Logo : team2Logo) ?? null;
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

    const layout = getVetoLayoutConfig(layoutMode, false);
    const { gridCols, tileHeight, minHeight, gap, mapNameSize } = layout.mapPool;
    const isModalLayout = layoutMode === 'modal';
    const currentAction = veto.current_action || 'ban';
    const tileTransition = reduceMotion
        ? { duration: 0 }
        : { type: 'spring' as const, stiffness: 340, damping: 32, mass: 0.9 };

    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center gap-2 px-2 sm:px-0">
                <span className={cn(
                    'rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest',
                    currentAction === 'pick'
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                        : currentAction === 'pick_side'
                            ? 'border-white/25 bg-white/10 text-white'
                            : 'border-rose-500/40 bg-rose-500/15 text-rose-200',
                )}>
                    {getVetoActionNoun(currentAction)}
                </span>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-white/80">
                    {isUserTurn
                        ? (veto.current_action === 'ban'
                            ? 'Select a map to ban'
                            : veto.current_action === 'pick_side'
                                ? 'Select the starting side'
                                : 'Select a map to pick')
                        : `Waiting for ${currentTeamName}`}
                </span>
            </div>

            {veto.current_action === 'pick_side' ? (
                // Side Selection View
                (() => {
                    const currentActionNum = veto.current_action_number || 1;
                    const sequence = service.getSequence(vetoFormat).map(s => s.action);

                    const previousActionType = sequence[currentActionNum - 2]; // Action before the current side pick

                    // Only treat as decider if the previous action wasn't a 'pick' (ban sequence → leftover map)
                    const isFinalPickSide =
                        previousActionType !== 'pick' &&
                        service.isDeciderAction(vetoFormat, currentActionNum);

                    const pickActionNumber = currentActionNum - 1;

                    if (pickActionNumber < 1 || pickActionNumber > sequence.length) {
                        return <div className="text-center py-8 text-zinc-400">Invalid action number</div>;
                    }

                    if (previousActionType !== 'pick' && !isFinalPickSide) {
                        return <div className="text-center py-8 text-zinc-400">Expected pick action before side selection</div>;
                    }

                    let pickedMap: any = null;
                    let mapToShow: GameMap | null = null;

                    if (isFinalPickSide) {
                        // For the final map (decider), it's the one that hasn't been banned or picked yet.
                        // It's not in the picked list, so we find it by exclusion.
                        const leftoverMap = mapLookup.find(m => !allUsedMaps.includes(String(m.id)));
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
                            pickActionType === 'pick' ? service : service
                        );

                        const teamPicks = pickActionTeamId === effectiveTeam1Id ? team1Picked : team2Picked;
                        const isTeam1 = pickActionTeamId === effectiveTeam1Id;

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

                        mapToShow = pickedMap ? mapLookup.find(m => m.id === pickedMap.map_id) || null : null;
                    }

                    if (!mapToShow) {
                        const fallbackMapId = pickedMap?.map_id || veto.selected_map_id;
                        if (fallbackMapId) {
                            mapToShow = {
                                id: fallbackMapId,
                                game,
                                map_name: 'Selected map',
                                map_image_url: null,
                                is_active: true,
                            };
                        }
                    }

                    if (!mapToShow) {
                        return <div className="text-center py-8 text-zinc-400">Waiting for selected map...</div>;
                    }

                    const canInteract = isUserTurn && !actionLoading && (vetoLive);

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
                                <div className={cn(
                                    'relative overflow-hidden',
                                    isModalLayout ? 'h-36 sm:h-40 md:h-44' : 'h-48 sm:h-56 lg:h-64',
                                )}>
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
                                                    <p className="text-white font-black text-lg uppercase tracking-wider">Select Side</p>
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
                <LayoutGroup>
                <div className={cn('grid', gap, gridCols)}>
                    <AnimatePresence mode="popLayout" initial={false}>
                    {availableMapsToShow.map((map) => {
                        const mapId = String(map.id);
                        const transitionState = transitioning[mapId];
                        const isFlashing = Boolean(transitionState);
                        const flashAction = transitionState?.action;
                        const mapStatus = getMapStatus(map.id);
                        const canInteract = !mapStatus.isBanned && !mapStatus.isPicked && isUserTurn && !actionLoading && (vetoLive);

                        const mapImageUrl = map.map_image_url || `https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=300&fit=crop&q=80`;
                        // Revert: Do not replace system.assets.website with system.assets.games as it might be breaking images
                        // if (mapImageUrl && mapImageUrl.includes('website-assets')) {
                        //     mapImageUrl = mapImageUrl.replace('website-assets/', 'system.assets.games/');
                        // } else if (mapImageUrl && mapImageUrl.includes('system.assets.website') && !mapImageUrl.includes('system.assets.games')) {
                        //     mapImageUrl = mapImageUrl.replace('system.assets.website/', 'system.assets.games/');
                        // }

                        const isImageLoaded = imagesLoaded.has(mapImageUrl);

                        return (
                            <motion.div
                                key={map.id}
                                layout={!reduceMotion}
                                initial={reduceMotion ? false : { opacity: 0, scale: 0.96 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={undefined}
                                transition={tileTransition}
                                className={cn(
                                    'relative isolate group overflow-hidden rounded-lg border bg-black bg-clip-padding',
                                    isFlashing
                                        ? 'pointer-events-none z-10 border-white/25'
                                        : mapStatus.isBanned
                                            ? 'border-rose-500/60'
                                            : mapStatus.isPicked
                                                ? 'border-emerald-500/50'
                                        : canInteract
                                            ? `${getVetoActionHoverClasses(currentAction)} hover:shadow-lg cursor-pointer`
                                            : 'border-white/15',
                                    actionLoading === map.id && !isFlashing && 'opacity-70 pointer-events-none',
                                )}
                                style={{
                                    backgroundImage: isImageLoaded ? `url(${mapImageUrl})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundClip: 'padding-box',
                                    minHeight: minHeight,
                                    backgroundColor: isImageLoaded ? 'transparent' : '#1a1a1a'
                                }}
                                role="button"
                                tabIndex={canInteract ? 0 : -1}
                                aria-label={`${veto.current_action === 'ban' ? 'Ban' : 'Pick'} ${map.map_name}`}
                                onKeyDown={(e) => {
                                    if (canInteract && (e.key === 'Enter' || e.key === ' ')) {
                                        e.preventDefault();
                                        handleMapActionWithTransition(map.id);
                                    }
                                }}
                                onClick={() => canInteract && handleMapActionWithTransition(map.id)}
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
                                {!mapStatus.isBanned && !mapStatus.isPicked && !isFlashing && (
                                    <div className="absolute inset-0 bg-black/40 z-0" />
                                )}

                                <AnimatePresence>
                                    {isFlashing && flashAction && (
                                        <motion.div
                                            key={`${mapId}-${flashAction}-overlay`}
                                            initial={mapOverlayMotion[flashAction].initial}
                                            animate={mapOverlayMotion[flashAction].animate}
                                            exit={{ opacity: 0 }}
                                            transition={mapOverlayMotion[flashAction].transition}
                                            className={cn(
                                                'absolute inset-0 z-30 flex items-center justify-center',
                                                flashAction === 'ban'
                                                    ? 'bg-rose-950/60'
                                                    : 'bg-emerald-950/55',
                                            )}
                                        >
                                            <motion.div
                                                initial={reduceMotion ? false : { opacity: 0, y: 8, scale: 0.92 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ delay: 0.08, duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                                                className={cn(
                                                    'rounded-lg border px-5 py-3 text-center shadow-2xl backdrop-blur-sm',
                                                    flashAction === 'ban'
                                                        ? 'border-rose-400/60 bg-rose-500/25 text-rose-100'
                                                        : 'border-emerald-400/60 bg-emerald-500/25 text-emerald-100',
                                                )}
                                            >
                                                <div className="text-sm font-black uppercase tracking-[0.2em] sm:text-base">
                                                    {flashAction === 'ban' ? 'Banned' : 'Picked'}
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className={cn('relative w-full', tileHeight)}>
                                    {!mapStatus.isPicked && !mapStatus.isBanned && (
                                        <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3">
                                            <div className="space-y-0.5 sm:space-y-1 text-center">
                                                <span className={cn(
                                                    'font-bold block text-white mb-1 sm:mb-1.5',
                                                    mapNameSize,
                                                )}
                                                    style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>
                                                    {map.map_name}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {mapStatus.isBanned && !isFlashing && (
                                    <motion.div
                                        initial={reduceMotion ? false : { opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: reduceMotion ? 0 : 0.18 }}
                                        className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-black/80"
                                    >
                                        <div className="rounded-lg border border-rose-500/50 bg-rose-500/15 px-4 py-3 text-center shadow-xl">
                                            <div className="text-xs font-black uppercase tracking-widest text-rose-200">BANNED</div>
                                            <div className="mt-1 text-[10px] font-semibold text-white/70">
                                                {mapStatus.isTeam1Ban ? team1Name : team2Name}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {mapStatus.isPicked && !isFlashing && (
                                    <motion.div
                                        initial={reduceMotion ? false : { opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: reduceMotion ? 0 : 0.18 }}
                                        className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-black/80"
                                    >
                                        <div className="flex w-full flex-col items-center justify-center px-4 text-center">
                                            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 shadow-xl">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-200">PICKED</div>
                                                {mapStatus.pickedBy && (
                                                    <div className="mt-1 text-[10px] font-semibold text-white/75">
                                                        {mapStatus.pickedBy}
                                                    </div>
                                                )}
                                                {mapStatus.pickedSide && (
                                                    <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/60">
                                                        {mapStatus.pickedSide}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {canInteract && !isFlashing && (
                                    <div className={cn(
                                        "absolute inset-0 flex items-center justify-center z-20 border-2 transition-all duration-200",
                                        veto.current_action === 'ban'
                                            ? "bg-rose-500/0 group-hover:bg-rose-500/30 border-rose-500/50 group-hover:border-rose-500"
                                            : "bg-emerald-500/0 group-hover:bg-emerald-500/25 border-emerald-500/50 group-hover:border-emerald-400"
                                    )}>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                            <div className={cn(
                                                "px-6 py-4 rounded-lg text-lg font-black border-2 shadow-xl",
                                                veto.current_action === 'ban'
                                                    ? "bg-rose-500 text-white border-white"
                                                    : "bg-emerald-500 text-white border-emerald-300"
                                            )}>
                                                {veto.current_action === 'ban' ? 'BAN' : 'PICK'}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                    </AnimatePresence>
                </div>
                </LayoutGroup>
            )}

            {availableMapsToShow.length === 0 && veto.current_action !== 'pick_side' && (
                <div className="text-center py-12 text-zinc-400">
                    <p className="text-lg font-semibold">All maps have been banned or picked.</p>
                </div>
            )}
        </div>
    );
};
