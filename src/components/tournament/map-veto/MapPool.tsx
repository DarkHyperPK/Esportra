import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';
import { cn } from '@/lib/utils';
import { MatchMapVeto, GameMap, PickedMap, getVetoFormat, getTeamForAction, VetoService, isVetoLive } from '@/hooks/useMapVetoMachine';
import { MapPoolTile, type MapPoolTileStatus } from './MapPoolTile';
import { MapPoolSidePick } from './MapPoolSidePick';
import { buildVetoSelectedMapEntries } from './buildVetoSelectedMapEntries';
import { getVetoLayoutConfig, type VetoLayoutMode } from './vetoLayoutConfig';
import {
    MAP_FLASH_MS,
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
    /** Kept for API compatibility; map art now manages its own loading state. */
    imagesLoaded?: Set<string>;
    setImagesLoaded?: React.Dispatch<React.SetStateAction<Set<string>>>;
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
    /** Hide the turn instruction when a turn banner above already says it. */
    showInstruction?: boolean;
}

export const MapPool: React.FC<MapPoolProps> = ({
    veto,
    availableMaps,
    allAvailableMaps,
    isUserTurn,
    actionLoading,
    handleMapAction,
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
    showInstruction = true,
}) => {
    const service = React.useMemo(() => new VetoService(game, availableMaps.length || undefined), [game, availableMaps.length]);
    const mapLookup = allAvailableMaps.length > 0 ? allAvailableMaps : availableMaps;

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

    const seriesOrder = buildVetoSelectedMapEntries({
        veto,
        bestOf: currentBestOf,
        game,
        mapLookup,
        team1Name,
        team2Name,
        team1Id,
        team2Id,
    });

    const getMapStatus = (mapId: string): MapPoolTileStatus => {
        const mapIdStr = String(mapId);
        const pickedMap = allPickedMaps.find((pick) => String(pick.map_id) === mapIdStr);
        const isTeam1Ban = team1Banned.some((id) => String(id) === mapIdStr);
        const isBanned = isTeam1Ban || team2Banned.some((id) => String(id) === mapIdStr);
        const actorIsTeam1 = isBanned ? isTeam1Ban : pickedMap?.team === 'team1';
        const actorKnown = isBanned || Boolean(pickedMap);
        return {
            isBanned,
            isPicked: Boolean(pickedMap) || veto.selected_map_id === mapId,
            actorName: actorKnown ? (actorIsTeam1 ? team1Name : team2Name) : undefined,
            actorLogo: actorKnown ? (actorIsTeam1 ? team1Logo : team2Logo) : undefined,
            mapNumber: seriesOrder.find((entry) => String(entry.map_id) === mapIdStr)?.mapNumber,
        };
    };

    const layout = getVetoLayoutConfig(layoutMode, false);
    const { gridCols, gap } = layout.mapPool;
    const isModalLayout = layoutMode === 'modal';
    const nameSizeClass = isModalLayout ? 'text-sm sm:text-base' : 'text-base sm:text-lg lg:text-xl';
    const currentAction = veto.current_action || 'ban';
    const remainingCount = availableMapsToShow.filter((map) => {
        const status = getMapStatus(map.id);
        return !status.isBanned && !status.isPicked;
    }).length;

    const resolveSidePickMap = (): { map: GameMap | null; isDecider: boolean; error?: string } => {
        const currentActionNum = veto.current_action_number || 1;
        const sequence = service.getSequence(vetoFormat).map((step) => step.action);
        const previousActionType = sequence[currentActionNum - 2];
        // Only a decider if the previous action wasn't a pick (ban sequence → leftover map).
        const isDecider = previousActionType !== 'pick' && service.isDeciderAction(vetoFormat, currentActionNum);
        const pickActionNumber = currentActionNum - 1;

        if (pickActionNumber < 1 || pickActionNumber > sequence.length) {
            return { map: null, isDecider, error: 'This step is out of order. Ask the organizer to reset the veto.' };
        }
        if (previousActionType !== 'pick' && !isDecider) {
            return { map: null, isDecider, error: 'Waiting for a map pick before the side choice.' };
        }

        let pickedMapId: string | null = null;
        if (isDecider) {
            pickedMapId = mapLookup.find((map) => !allUsedMaps.includes(String(map.id)))?.id ?? null;
        } else {
            const pickTeamId = getTeamForAction(pickActionNumber, vetoFormat, effectiveTeam1Id!, effectiveTeam2Id!, service);
            const ownPicks = pickTeamId === effectiveTeam1Id ? team1Picked : team2Picked;
            const otherPicks = pickTeamId === effectiveTeam1Id ? team2Picked : team1Picked;
            const pending = [...ownPicks].reverse().find((pick) => pick.map_id && !pick.side)
                ?? [...otherPicks].reverse().find((pick) => pick.map_id && !pick.side);
            pickedMapId = pending?.map_id ?? null;
        }

        const fallbackId = pickedMapId || veto.selected_map_id;
        const map = mapLookup.find((entry) => entry.id === fallbackId)
            ?? (fallbackId ? { id: fallbackId, game, map_name: 'Selected map', map_image_url: null, is_active: true } : null);
        return { map, isDecider };
    };

    const instruction = isUserTurn
        ? (currentAction === 'pick' ? 'Choose a map to pick' : currentAction === 'pick_side' ? 'Choose your starting side' : 'Choose a map to ban')
        : `Waiting for ${currentTeamName}`;

    if (veto.current_action === 'pick_side') {
        const { map, isDecider, error } = resolveSidePickMap();
        return (
            <section aria-label="Side choice">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                    <h3 className="font-heading text-lg font-bold tracking-tight text-white">Starting side</h3>
                    {showInstruction ? <span className="truncate text-xs text-zinc-400">{instruction}</span> : null}
                </div>
                {map ? (
                    <MapPoolSidePick
                        map={map}
                        isDecider={isDecider}
                        canInteract={isUserTurn && !actionLoading && vetoLive}
                        isLoading={actionLoading === map.id}
                        currentTeamName={currentTeamName}
                        compact={isModalLayout}
                        onSelect={handleMapAction}
                    />
                ) : (
                    <p className="border border-dashed border-white/10 px-4 py-8 text-center text-sm text-zinc-400">
                        {error ?? 'Waiting for the selected map.'}
                    </p>
                )}
            </section>
        );
    }

    return (
        <section aria-label="Map pool">
            <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 className="font-heading text-lg font-bold tracking-tight text-white">
                    Map pool <span className="ml-1.5 font-mono text-[11px] font-semibold tracking-[0.2em] text-zinc-500">{remainingCount} LEFT</span>
                </h3>
                {showInstruction ? (
                    <span className={cn('truncate text-xs', isUserTurn ? 'text-white' : 'text-zinc-400')}>{instruction}</span>
                ) : null}
            </div>

            <LayoutGroup>
                <div className={cn('grid', gap, gridCols)}>
                    <AnimatePresence mode="popLayout" initial={false}>
                        {availableMapsToShow.map((map) => {
                            const mapId = String(map.id);
                            const flashAction = transitioning[mapId]?.action;
                            const status = getMapStatus(map.id);
                            const canInteract = !status.isBanned && !status.isPicked && isUserTurn && !actionLoading && vetoLive && !flashAction;

                            return (
                                <MapPoolTile
                                    key={map.id}
                                    map={map}
                                    status={status}
                                    currentAction={currentAction}
                                    canInteract={canInteract}
                                    isLoading={actionLoading === map.id && !flashAction}
                                    flashAction={flashAction}
                                    nameSizeClass={nameSizeClass}
                                    onSelect={handleMapActionWithTransition}
                                />
                            );
                        })}
                    </AnimatePresence>
                </div>
            </LayoutGroup>

            {availableMapsToShow.length === 0 ? (
                <p className="border border-dashed border-white/10 px-4 py-10 text-center text-sm text-zinc-400">
                    No maps in this pool. Ask the organizer to set the tournament map pool.
                </p>
            ) : null}
        </section>
    );
};
