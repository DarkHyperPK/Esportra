import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { valorantTables } from '@/utils/gameTables';

// Types
export interface GameMap {
    id: string;
    game: string;
    map_name: string;
    map_image_url?: string | null;
    is_active: boolean;
}

export interface PickedMap {
    map_id: string;
    side?: 'attack' | 'defend';
}

export interface MatchMapVeto {
    id: string;
    match_id: string;
    tournament_id: string;
    team1_id: string | null;
    team2_id: string | null;
    team1_link_token: string | null;
    team2_link_token: string | null;
    veto_format: 'standard_7' | 'standard_5' | 'standard_9';
    best_of?: number | null;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    current_team_id: string | null;
    current_action: 'ban' | 'pick' | 'pick_side' | null;
    current_action_number: number;
    turn_started_at: string | null;
    turn_duration_seconds: number;
    team1_banned_maps: string[];
    team2_banned_maps: string[];
    team1_picked_maps?: PickedMap[];
    team2_picked_maps?: PickedMap[];
    selected_map_id: string | null;
    started_at: string | null;
    completed_at: string | null;
}

// Constants
export const VETO_SEQUENCES = {
    bo1: ['ban', 'ban', 'ban', 'ban', 'ban', 'pick', 'pick_side'],
    bo3: ['ban', 'ban', 'pick', 'pick_side', 'pick', 'pick_side', 'ban', 'ban', 'pick_side'],
    bo5: ['ban', 'ban', 'pick', 'pick_side', 'pick', 'pick_side', 'pick', 'pick_side', 'pick', 'pick_side', 'pick_side'],
    standard_7: ['ban', 'ban', 'pick', 'pick', 'ban', 'ban', 'pick'],
    standard_5: ['ban', 'ban', 'pick', 'pick', 'ban'],
    standard_9: ['ban', 'ban', 'pick', 'pick', 'ban', 'ban', 'pick', 'pick', 'ban'],
};

// Helper Functions
export const getVetoFormat = (bestOf: number): 'bo1' | 'bo3' | 'bo5' => {
    if (bestOf === 1) return 'bo1';
    if (bestOf === 3) return 'bo3';
    if (bestOf === 5) return 'bo5';
    return 'bo3';
};

export const getTeamForAction = (
    actionNumber: number,
    vetoFormat: 'bo1' | 'bo3' | 'bo5',
    team1Id: string,
    team2Id: string,
    actionType?: string
): string => {
    if (vetoFormat === 'bo3') {
        if (actionNumber === 5) return team2Id;
        if (actionNumber === 7) return team2Id;
        if (actionNumber === 8) return team1Id;
    }
    if (vetoFormat === 'bo5') {
        if (actionNumber === 5) return team2Id;
        if (actionNumber === 9) return team2Id;
    }
    return (actionNumber % 2 === 1) ? team1Id : team2Id;
};

export const getSidePickerTeam = (
    pickActionNumber: number,
    vetoFormat: 'bo1' | 'bo3' | 'bo5',
    team1Id: string,
    team2Id: string
): string => {
    if (vetoFormat === 'bo3' && pickActionNumber === 8) return team1Id;
    if (vetoFormat === 'bo5' && pickActionNumber === 10) return team1Id;

    // For regular picks, the side picker is the OPPOSITE of the map picker
    // First, find out who picked the map
    const pickActionType = VETO_SEQUENCES[vetoFormat][pickActionNumber - 1];
    const mapPickerTeamId = getTeamForAction(pickActionNumber, vetoFormat, team1Id, team2Id, pickActionType);

    // Return the opposite team
    return mapPickerTeamId === team1Id ? team2Id : team1Id;
};

// --- FSM Types & Logic ---

export type VetoState = 'INIT' | 'BAN' | 'PICK' | 'PICK_SIDE' | 'COMPLETE';

export type TransitionResult =
    | { ok: true }
    | { ok: false; reason: 'NOT_YOUR_TURN' | 'INVALID_STATE' | 'FORBIDDEN' | 'DUPLICATE_ACTION' | 'INVALID_MAP' | 'MAP_ALREADY_USED' };

export interface TurnContext {
    currentTeamId: string | null;
    isOrganizer: boolean;
    userTeamId: string | null;
    isCaptain: boolean;
}

// Pure FSM Functions

export function deriveState(veto: MatchMapVeto | null): VetoState {
    if (!veto) return 'INIT';
    if (veto.status === 'completed') return 'COMPLETE';
    if (veto.status === 'pending') return 'INIT';

    switch (veto.current_action) {
        case 'ban': return 'BAN';
        case 'pick': return 'PICK';
        case 'pick_side': return 'PICK_SIDE';
        default: return 'INIT';
    }
}

export function validateTransition(
    state: VetoState,
    event: 'SET_BO' | 'BAN_MAP' | 'PICK_MAP' | 'PICK_SIDE' | 'RESET',
    context: TurnContext,
    payload?: { mapId?: string; veto?: MatchMapVeto }
): TransitionResult {
    const { isOrganizer, userTeamId, currentTeamId, isCaptain } = context;

    // 1. Universal Checks
    if (event === 'RESET') {
        if (!isOrganizer) return { ok: false, reason: 'FORBIDDEN' };
        return { ok: true };
    }

    if (state === 'COMPLETE') {
        return { ok: false, reason: 'INVALID_STATE' };
    }

    // 2. Event-Specific Checks
    switch (event) {
        case 'SET_BO':
            if (state !== 'INIT') return { ok: false, reason: 'INVALID_STATE' };
            if (!isOrganizer) return { ok: false, reason: 'FORBIDDEN' };
            return { ok: true };

        case 'BAN_MAP':
        case 'PICK_MAP':
        case 'PICK_SIDE':
            // Must be captain (or organizer acting as captain?) - usually organizer is separate
            // But if organizer is also captain, userTeamId will be set.
            // If strictly organizer (no team), they shouldn't act for a team unless debugging.
            // Requirement: "Turn Order: A user cannot act if userTeamId !== currentTeamId"

            // Organizer Override: If organizer, maybe allow? For now, stick to strict turn order.
            // If organizer wants to act, they should probably "force" it, but UI doesn't support that yet.
            // Let's assume strict turn order for now.

            if (!isCaptain && !isOrganizer) return { ok: false, reason: 'FORBIDDEN' };

            // If organizer, we might allow them to act for any team? 
            // The prompt said: "Turn Order: A user cannot act if userTeamId !== currentTeamId (unless Organizer override, if applicable)"
            // Let's be strict: only if userTeamId matches currentTeamId.
            // If organizer is NOT part of the team, they can't click the button normally.

            if (!isOrganizer && userTeamId !== currentTeamId) {
                return { ok: false, reason: 'NOT_YOUR_TURN' };
            }

            // State checks
            if (event === 'BAN_MAP' && state !== 'BAN') return { ok: false, reason: 'INVALID_STATE' };
            if (event === 'PICK_MAP' && state !== 'PICK') return { ok: false, reason: 'INVALID_STATE' };
            if (event === 'PICK_SIDE' && state !== 'PICK_SIDE') return { ok: false, reason: 'INVALID_STATE' };

            // Map Invariants
            if (payload?.mapId && payload?.veto) {
                const { veto, mapId } = payload;
                const isBanned = veto.team1_banned_maps.includes(mapId) || veto.team2_banned_maps.includes(mapId);

                // For PICK_SIDE, the map MUST be picked already (by the other team usually)
                // So we only check if it's picked for BAN_MAP or PICK_MAP events
                const isPicked = veto.team1_picked_maps?.some(p => p.map_id === mapId) || veto.team2_picked_maps?.some(p => p.map_id === mapId);

                if (isBanned) {
                    return { ok: false, reason: 'MAP_ALREADY_USED' };
                }

                if (event !== 'PICK_SIDE' && isPicked) {
                    return { ok: false, reason: 'MAP_ALREADY_USED' };
                }
            }

            return { ok: true };

        default:
            return { ok: false, reason: 'INVALID_STATE' };
    }
}

interface UseMapVetoMachineProps {
    matchId: string;
    tournamentId: string;
    team1Id?: string | null;
    team2Id?: string | null;
    team1Name?: string;
    team2Name?: string;
    bestOf?: number;
    forcedTeamId?: string | null;
    onComplete?: () => void;
}

export const useMapVetoMachine = ({
    matchId,
    tournamentId,
    team1Id,
    team2Id,
    team1Name,
    team2Name,
    bestOf,
    forcedTeamId,
    onComplete,
}: UseMapVetoMachineProps) => {
    const { user } = useAuth();
    const { currentRole, switchRole } = useRole();
    const { toast } = useToast();

    // State
    const [veto, setVeto] = useState<MatchMapVeto | null>(null);
    const [loading, setLoading] = useState(true);
    const [availableMaps, setAvailableMaps] = useState<GameMap[]>([]);
    const [allAvailableMaps, setAllAvailableMaps] = useState<GameMap[]>([]); // Same as availableMaps now
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [showBODialog, setShowBODialog] = useState(false);
    const [dialogStep, setDialogStep] = useState<'map_pool' | 'bo'>('bo'); // Default to BO since map pool is auto-fetched
    const [selectedBO, setSelectedBO] = useState<number | null>(null);
    // const [selectedMapPool, setSelectedMapPool] = useState<string[]>([]); // Removed
    const [showRoleSwitchPrompt, setShowRoleSwitchPrompt] = useState(false);
    const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set());
    const [copiedLink, setCopiedLink] = useState<'team1' | 'team2' | null>(null);
    const [resetting, setResetting] = useState(false);
    const [dialogManuallyClosed, setDialogManuallyClosed] = useState(false);

    // Side selection state
    const [showSideDialog, setShowSideDialog] = useState(false);
    const [pendingMapId, setPendingMapId] = useState<string | null>(null);

    // Refs
    const copiedLinkTimeoutRef = useRef<NodeJS.Timeout>();
    const scrollPositionRef = useRef<number>(0);
    const lastResetBestOfRef = useRef<number | null>(null);

    // Derived State
    const [isOrganizer, setIsOrganizer] = useState(currentRole === 'organizer');
    const [isCaptain, setIsCaptain] = useState(false);
    const [userTeamId, setUserTeamId] = useState<string | null>(null);
    const [isTeam1Captain, setIsTeam1Captain] = useState(false);
    const [isTeam2Captain, setIsTeam2Captain] = useState(false);

    // Sync isOrganizer with context
    useEffect(() => {
        setIsOrganizer(currentRole === 'organizer');
    }, [currentRole]);

    // Check user permissions
    useEffect(() => {
        const checkPermissions = async () => {
            if (!user || !team1Id || !team2Id) return;

            // Check if user is captain of either team
            const teamIds = [team1Id, team2Id].filter(Boolean) as string[];
            // Fetch team members and check ownership
            const { data: teamMembers } = await supabase
                .from('team_members')
                .select('team_id, role')
                .in('team_id', teamIds)
                .eq('user_id', user.id)
                .in('role', ['captain', 'owner'])
                .eq('is_active', true);

            // Also check if user is the owner in the teams table directly
            const { data: ownedTeams } = await supabase
                .from('teams')
                .select('id')
                .in('id', teamIds)
                .eq('owner_id', user.id);

            const captainTeamIds = new Set([
                ...(teamMembers || []).map((tm: any) => tm.team_id),
                ...(ownedTeams || []).map((t: any) => t.id)
            ]);

            console.log('[MapVeto] Permission Check:', {
                userId: user.id,
                team1Id,
                team2Id,
                teamMembers,
                captainTeamIds: Array.from(captainTeamIds)
            });

            const isT1Capt = team1Id ? captainTeamIds.has(team1Id) : false;
            const isT2Capt = team2Id ? captainTeamIds.has(team2Id) : false;

            setIsTeam1Captain(isT1Capt);
            setIsTeam2Captain(isT2Capt);

            // If forcedTeamId is provided (e.g. from token), use that
            if (forcedTeamId) {
                setIsCaptain(true); // Token access implies captain rights for that team
                setUserTeamId(forcedTeamId);
                setIsOrganizer(false); // Token access is never organizer
                // Also update specific flags
                if (forcedTeamId === team1Id) setIsTeam1Captain(true);
                if (forcedTeamId === team2Id) setIsTeam2Captain(true);
            } else {
                setIsCaptain(isT1Capt || isT2Capt);

                // If captain of both, userTeamId could be ambiguous, but we'll set it to the first one for legacy compatibility
                // The UI should prefer using isTeam1Captain/isTeam2Captain
                if (isT1Capt) {
                    setUserTeamId(team1Id!);
                } else if (isT2Capt) {
                    setUserTeamId(team2Id!);
                } else {
                    setUserTeamId(null);
                }
            }
        };

        checkPermissions();
    }, [user, team1Id, team2Id, forcedTeamId]);

    // Fetch Team Logos
    const [team1Logo, setTeam1Logo] = useState<string | null>(null);
    const [team2Logo, setTeam2Logo] = useState<string | null>(null);

    useEffect(() => {
        const fetchTeamLogos = async () => {
            if (!team1Id && !team2Id) return;

            const teamIds = [team1Id, team2Id].filter(Boolean) as string[];
            const { data: teams } = await supabase
                .from('teams')
                .select('id, logo_url')
                .in('id', teamIds);

            if (teams) {
                teams.forEach((team: any) => {
                    if (team.id === team1Id) setTeam1Logo(team.logo_url);
                    if (team.id === team2Id) setTeam2Logo(team.logo_url);
                });
            }
        };
        fetchTeamLogos();
    }, [team1Id, team2Id]);

    // Auto-initialize veto if stuck in pending with best_of set but no current_team_id
    // ALSO: Auto-update best_of if it changes in the tournament settings
    useEffect(() => {
        const autoInitializeOrUpdateVeto = async () => {
            if (!veto) return;

            // Case 1: Stuck in pending
            if (veto.status === 'pending' && veto.best_of && !veto.current_team_id) {
                console.log('[MapVeto] Auto-initializing stuck veto...');
                const vetoFormat = getVetoFormat(veto.best_of);
                const firstAction = VETO_SEQUENCES[vetoFormat][0];

                await supabase
                    .from(valorantTables.match_vetos)
                    .update({
                        status: 'in_progress',
                        veto_format: vetoFormat,
                        started_at: new Date().toISOString(),
                        turn_started_at: new Date().toISOString(),
                        current_action: firstAction,
                        current_action_number: 1,
                        current_team_id: veto.team1_id,
                    })
                    .eq('id', veto.id);
                return;
            }

            // Case 2: Best Of Mismatch (e.g. user changed tournament format)
            // If the bestOf prop differs from the veto record, we need to reset and update
            // Guard: Only reset if we haven't already reset for this bestOf value
            if (bestOf && veto.best_of !== bestOf && lastResetBestOfRef.current !== bestOf) {
                console.log(`[MapVeto] Best Of mismatch detected. Props: ${bestOf}, Veto: ${veto.best_of}. Resetting veto...`);
                lastResetBestOfRef.current = bestOf; // Mark that we're resetting for this value
                const vetoFormat = getVetoFormat(bestOf);
                const firstAction = VETO_SEQUENCES[vetoFormat][0];

                await supabase
                    .from(valorantTables.match_vetos)
                    .update({
                        best_of: bestOf,
                        veto_format: vetoFormat,
                        status: 'in_progress',
                        current_action: firstAction,
                        current_action_number: 1,
                        current_team_id: veto.team1_id,
                        team1_banned_maps: [],
                        team2_banned_maps: [],
                        team1_picked_maps: [],
                        team2_picked_maps: [],
                        selected_map_id: null,
                        completed_at: null,
                        started_at: new Date().toISOString(),
                        turn_started_at: new Date().toISOString(),
                    })
                    .eq('id', veto.id);
            }
        };

        autoInitializeOrUpdateVeto();
    }, [veto?.id, veto?.status, veto?.best_of, veto?.current_team_id, veto?.team1_id, veto?.current_action_number, bestOf]);

    // Fetch Veto Data
    const fetchVetoData = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from(valorantTables.match_vetos)
                .select('*')
                .eq('match_id', matchId)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                // Cast Json to PickedMap[]
                const typedData = {
                    ...data,
                    team1_picked_maps: (data.team1_picked_maps as unknown) as PickedMap[] || [],
                    team2_picked_maps: (data.team2_picked_maps as unknown) as PickedMap[] || [],
                } as MatchMapVeto;

                setVeto(typedData);
            } else {
                // Create new veto if none exists
                // We should create it if we have the necessary info, especially if bestOf is set (from tournament config)
                // or if the user is an organizer.
                if (matchId && tournamentId && team1Id && team2Id) {
                    console.log('[MapVeto] No veto found, creating new one...');

                    const initialStatus = bestOf ? 'in_progress' : 'pending';
                    const initialFormat = bestOf ? getVetoFormat(bestOf) : 'standard_7'; // Default fallback
                    const initialAction = bestOf ? VETO_SEQUENCES[initialFormat][0] : null;

                    const newVeto = {
                        match_id: matchId,
                        tournament_id: tournamentId,
                        team1_id: team1Id,
                        team2_id: team2Id,
                        status: initialStatus,
                        veto_format: initialFormat,
                        best_of: bestOf || null,
                        current_team_id: bestOf ? team1Id : null, // Start with team 1 if ready
                        current_action: initialAction,
                        current_action_number: 1,
                        team1_banned_maps: [],
                        team2_banned_maps: [],
                        team1_picked_maps: [],
                        team2_picked_maps: [],
                        turn_started_at: new Date().toISOString(),
                        started_at: new Date().toISOString(),
                    };

                    const { data: createdVeto, error: createError } = await supabase
                        .from(valorantTables.match_vetos)
                        .insert(newVeto)
                        .select()
                        .single();

                    if (createError) {
                        // If error is duplicate key, it means it was created concurrently
                        if (createError.code === '23505') {
                            console.log('[MapVeto] Veto created concurrently, refetching...');
                            // Recursively call fetch to get the created one
                            // But avoid infinite loop with a flag? 
                            // Actually, just let the next effect cycle or realtime handle it, 
                            // but for now let's try one retry or just return null and wait for realtime.
                            return;
                        }
                        console.error('Error creating veto:', createError);
                        setVeto(null);
                    } else if (createdVeto) {
                        const typedVeto = {
                            ...createdVeto,
                            team1_picked_maps: [],
                            team2_picked_maps: [],
                        } as MatchMapVeto;
                        setVeto(typedVeto);
                        console.log('[MapVeto] Created new veto:', typedVeto);
                    }
                } else {
                    setVeto(null);
                }
            }
        } catch (err) {
            console.error('Error fetching veto:', err);
        } finally {
            setLoading(false);
        }
    }, [matchId, isOrganizer, currentRole, tournamentId, team1Id, team2Id, bestOf]);

    // Fetch all available maps (Tournament Pool)
    useEffect(() => {
        const fetchAllMaps = async () => {
            if (!tournamentId) return;

            try {
                // First try to fetch from tournament_map_pools
                const { data: poolData, error: poolError } = await supabase
                    .from('tournament_map_pools')
                    .select('map_id, game_maps(*)')
                    .eq('tournament_id', tournamentId);

                if (poolData && poolData.length > 0) {
                    // Extract game_maps from the join
                    const maps = poolData.map((item: any) => {
                        const m = item.game_maps;
                        if (m && typeof m.map_image_url === 'string') {
                            m.map_image_url = m.map_image_url.trim();
                        }
                        return m;
                    }).filter((m: any) => m && m.is_active !== false);
                    // Remove duplicates just in case
                    const uniqueMaps = Array.from(new Map(maps.map((m: any) => [m.id, m])).values());

                    const typedMaps = uniqueMaps as GameMap[];
                    setAllAvailableMaps(typedMaps);
                    setAvailableMaps(typedMaps); // Set availableMaps too!
                } else {
                    // Fallback: fetch all active maps if no pool selected for tournament
                    console.log('No tournament map pool found, fetching all active maps');
                    const { data: gameMaps } = await supabase
                        .from('game_maps')
                        .select('*')
                        .eq('game', 'valorant')
                        .eq('is_active', true)
                        .order('map_name');

                    if (gameMaps) {
                        setAllAvailableMaps(gameMaps as GameMap[]);
                        setAvailableMaps(gameMaps as GameMap[]);
                    }
                }
            } catch (err) {
                console.error('Error fetching maps:', err);
            }
        };
        fetchAllMaps();
    }, [tournamentId]);

    // Initial Fetch
    useEffect(() => {
        fetchVetoData();
    }, [fetchVetoData]);

    // Real-time Subscription
    useEffect(() => {
        if (!matchId) return;

        let mounted = true;

        const channel = supabase
            .channel(`match-veto-${matchId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: valorantTables.match_vetos,
                    filter: `match_id=eq.${matchId}`,
                },
                async (payload) => {
                    if (!mounted) return;

                    if (payload.eventType === 'UPDATE' && payload.new) {
                        const rawVeto = payload.new;
                        const updatedVeto = {
                            ...rawVeto,
                            team1_picked_maps: (rawVeto.team1_picked_maps as unknown) as PickedMap[] || [],
                            team2_picked_maps: (rawVeto.team2_picked_maps as unknown) as PickedMap[] || [],
                        } as MatchMapVeto;

                        setVeto(updatedVeto);
                    } else if (payload.eventType === 'INSERT' && payload.new) {
                        const rawVeto = payload.new;
                        const newVeto = {
                            ...rawVeto,
                            team1_picked_maps: (rawVeto.team1_picked_maps as unknown) as PickedMap[] || [],
                            team2_picked_maps: (rawVeto.team2_picked_maps as unknown) as PickedMap[] || [],
                        } as MatchMapVeto;
                        setVeto(newVeto);
                    } else if (payload.eventType === 'DELETE') {
                        setVeto(null);
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: valorantTables.veto_actions,
                    filter: `match_id=eq.${matchId}`,
                },
                async (payload) => {
                    if (!mounted) return;

                    if (payload.eventType === 'INSERT' && payload.new) {
                        // Refetch veto to get updated current_action_number
                        const { data: updatedVeto } = await supabase
                            .from(valorantTables.match_vetos)
                            .select('*')
                            .eq('match_id', matchId)
                            .maybeSingle();

                        if (updatedVeto) {
                            const typedVeto = {
                                ...updatedVeto,
                                team1_picked_maps: (updatedVeto.team1_picked_maps as unknown) as PickedMap[] || [],
                                team2_picked_maps: (updatedVeto.team2_picked_maps as unknown) as PickedMap[] || [],
                            } as MatchMapVeto;
                            setVeto(typedVeto);
                        }
                    }
                }
            )
            .subscribe();

        return () => {
            mounted = false;
            supabase.removeChannel(channel);
        };
    }, [matchId]);

    // Dialog Auto-Show Logic
    useEffect(() => {
        const effectiveIsOrganizer = isOrganizer || currentRole === 'organizer';

        if (!veto) return;

        // We no longer check for map pool since it's from tournament
        const needsBO = (!veto.best_of && veto.best_of !== 0);

        const shouldShowDialog =
            veto.status === 'pending' &&
            effectiveIsOrganizer &&
            !showBODialog &&
            !dialogManuallyClosed &&
            needsBO;

        if (shouldShowDialog) {
            setDialogStep('bo');
            setShowBODialog(true);
        }
    }, [veto, isOrganizer, currentRole, showBODialog, dialogManuallyClosed]);

    // Role Switch Prompt Logic
    useEffect(() => {
        const effectiveIsOrganizer = isOrganizer || currentRole === 'organizer';
        const organizerIsCaptain = effectiveIsOrganizer && isCaptain && userTeamId;

        const hasBestOf = veto?.best_of !== null && veto?.best_of !== undefined && veto.best_of > 0;
        const isVetoReady = veto && veto.status === 'in_progress' && hasBestOf;

        if (organizerIsCaptain && isVetoReady && veto.status !== 'completed') {
            setShowRoleSwitchPrompt(true);
        } else {
            setShowRoleSwitchPrompt(false);
        }
    }, [isOrganizer, currentRole, isCaptain, userTeamId, veto]);

    // Actions
    const handleSetBO = async (bo: number) => {
        const currentState = deriveState(veto);
        const context: TurnContext = {
            currentTeamId: veto?.current_team_id || null,
            isOrganizer,
            userTeamId,
            isCaptain
        };

        const validation = validateTransition(currentState, 'SET_BO', context);
        if (!validation.ok) {
            toast({
                title: 'Action Failed',
                description: `Cannot set Best Of: ${validation.reason}`,
                variant: 'destructive',
            });
            return;
        }

        if (!veto) return;

        // No map pool check needed here as we use tournament pool

        setSelectedBO(bo);
        const vetoFormat = getVetoFormat(bo);
        const firstAction = VETO_SEQUENCES[vetoFormat][0];

        try {
            const { error } = await supabase
                .from(valorantTables.match_vetos)
                .update({
                    best_of: bo,
                    veto_format: vetoFormat,
                    // selected_map_pool: selectedMapPool, // Removed
                    status: 'in_progress',
                    started_at: new Date().toISOString(),
                    turn_started_at: new Date().toISOString(),
                    current_action: firstAction,
                    current_action_number: 1,
                    current_team_id: veto.team1_id,
                })
                .eq('id', veto.id);

            if (error) throw error;

            setShowBODialog(false);
            setDialogStep('bo'); // Reset or keep as is
            toast({
                title: `BO${bo} Selected`,
                description: 'Map veto process started.',
            });
        } catch (error: any) {
            console.error('Error setting BO:', error);
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        }
    };

    const handleResetVeto = useCallback(async () => {
        const currentState = deriveState(veto);
        const context: TurnContext = {
            currentTeamId: veto?.current_team_id || null,
            isOrganizer,
            userTeamId,
            isCaptain
        };

        const validation = validateTransition(currentState, 'RESET', context);
        if (!validation.ok) {
            toast({
                title: 'Action Failed',
                description: `Cannot reset veto: ${validation.reason}`,
                variant: 'destructive',
            });
            return;
        }

        if (!veto) return;
        if (!confirm('Are you sure you want to reset the map veto?')) return;

        setResetting(true);
        try {
            const { error } = await supabase.rpc('reset_match_veto', {
                p_match_id: matchId,
            });

            if (error) throw error;

            toast({ title: 'Veto Reset', description: 'Please select Best Of format.' });
            await fetchVetoData();
            setShowBODialog(true);
            setSelectedBO(null);
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setResetting(false);
        }
    }, [veto, matchId, fetchVetoData, toast, isOrganizer, userTeamId, isCaptain]);

    const performMapAction = useCallback(async (mapId: string, actionType: 'ban' | 'pick' | 'pick_side', side: 'attack' | 'defend' | null) => {
        if (!veto) return;

        // FSM Validation
        const currentState = deriveState(veto);
        const context: TurnContext = {
            currentTeamId: veto.current_team_id,
            isOrganizer,
            userTeamId,
            isCaptain
        };

        // Map event type
        let event: 'BAN_MAP' | 'PICK_MAP' | 'PICK_SIDE';
        if (actionType === 'ban') event = 'BAN_MAP';
        else if (actionType === 'pick') event = 'PICK_MAP';
        else event = 'PICK_SIDE';

        const validation = validateTransition(currentState, event, context, { mapId, veto });
        if (!validation.ok) {
            toast({
                title: 'Action Failed',
                description: `Cannot perform action: ${validation.reason}`,
                variant: 'destructive',
            });
            return;
        }

        // Set loading state to prevent double clicks
        setActionLoading(mapId);

        try {
            // 1. Fetch latest veto to get current_action_number
            const { data: latestVeto, error: fetchError } = await supabase
                .from(valorantTables.match_vetos)
                .select('*')
                .eq('id', veto.id)
                .single();

            if (fetchError || !latestVeto) throw new Error('Veto not found');

            // --- RE-VALIDATION AGAINST DB STATE ---
            // Re-construct state and context from DB data to prevent race conditions
            const dbVeto = {
                ...latestVeto,
                team1_picked_maps: (latestVeto.team1_picked_maps as unknown) as PickedMap[] || [],
                team2_picked_maps: (latestVeto.team2_picked_maps as unknown) as PickedMap[] || [],
            } as MatchMapVeto;

            const dbState = deriveState(dbVeto);
            const dbContext: TurnContext = {
                currentTeamId: dbVeto.current_team_id,
                isOrganizer,
                userTeamId,
                isCaptain
            };

            // Check if the action type matches what the DB expects
            // If DB expects 'pick' but we sent 'ban' (because UI was stale), this will fail
            // We need to check if the event matches the state derived from DB
            let dbEvent: 'BAN_MAP' | 'PICK_MAP' | 'PICK_SIDE';
            if (actionType === 'ban') dbEvent = 'BAN_MAP';
            else if (actionType === 'pick') dbEvent = 'PICK_MAP';
            else dbEvent = 'PICK_SIDE';

            const dbValidation = validateTransition(dbState, dbEvent, dbContext, { mapId, veto: dbVeto });
            if (!dbValidation.ok) {
                throw new Error(`State mismatch: ${(dbValidation as any).reason}`);
            }
            // --------------------------------------

            const currentActionNum = latestVeto.current_action_number || 1;
            const currentVetoFormat = getVetoFormat(latestVeto.best_of || 1);
            const currentSequence = VETO_SEQUENCES[currentVetoFormat];

            // 2. Calculate expected team
            let expectedTeamId: string;
            if (actionType === 'pick_side') {
                const pickActionNumber = currentActionNum - 1;
                expectedTeamId = getSidePickerTeam(pickActionNumber, currentVetoFormat, latestVeto.team1_id!, latestVeto.team2_id!);
            } else {
                const actionTypeForCalc = currentSequence[currentActionNum - 1];
                expectedTeamId = getTeamForAction(currentActionNum, currentVetoFormat, latestVeto.team1_id!, latestVeto.team2_id!, actionTypeForCalc);
            }

            // 3. Insert Action
            const { error: actionError } = await supabase.from(valorantTables.veto_actions).insert({
                veto_id: veto.id,
                match_id: matchId,
                team_id: expectedTeamId,
                action_type: actionType,
                map_id: mapId,
                action_number: currentActionNum,
                side: side || null,
            });

            if (actionError) {
                if (actionError.code === '23505') { // Duplicate key
                    // Silently succeed, let realtime handle it
                    return;
                }
                throw actionError;
            }

            // 4. Update Veto State
            const nextActionNumber = currentActionNum + 1;
            const isComplete = nextActionNumber > currentSequence.length;

            let updateData: any = {
                current_action_number: nextActionNumber,
                turn_started_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            // Update arrays based on action
            if (actionType === 'ban') {
                if (expectedTeamId === veto.team1_id) {
                    updateData.team1_banned_maps = [...(latestVeto.team1_banned_maps || []), mapId];
                } else {
                    updateData.team2_banned_maps = [...(latestVeto.team2_banned_maps || []), mapId];
                }
            } else if (actionType === 'pick') {
                const pickedMap: PickedMap = { map_id: mapId, side: undefined };
                if (expectedTeamId === veto.team1_id) {
                    const current = (latestVeto.team1_picked_maps as unknown as PickedMap[]) || [];
                    updateData.team1_picked_maps = [...current, pickedMap];
                } else {
                    const current = (latestVeto.team2_picked_maps as unknown as PickedMap[]) || [];
                    updateData.team2_picked_maps = [...current, pickedMap];
                }
            } else if (actionType === 'pick_side') {
                const pickActionNumber = currentActionNum - 1;
                const pickActionType = VETO_SEQUENCES[currentVetoFormat][pickActionNumber - 1];
                const mapPickerTeamId = getTeamForAction(pickActionNumber, currentVetoFormat, latestVeto.team1_id!, latestVeto.team2_id!, pickActionType);

                // Check if this is the decider map (final pick_side)
                const isDecider = (currentVetoFormat === 'bo3' && currentActionNum === 9) ||
                    (currentVetoFormat === 'bo5' && currentActionNum === 11);

                if (mapPickerTeamId === veto.team1_id) {
                    const current = (latestVeto.team1_picked_maps as unknown as PickedMap[]) || [];

                    if (isDecider) {
                        // Decider map: Add it as a new entry
                        const newMap: PickedMap = { map_id: mapId, side: side || undefined };
                        updateData.team1_picked_maps = [...current, newMap];
                    } else if (current.length > 0) {
                        // Standard map: Update the side of the last picked map
                        const lastMap = { ...current[current.length - 1] };
                        lastMap.side = side || undefined;
                        const newMaps = [...current.slice(0, current.length - 1), lastMap];
                        updateData.team1_picked_maps = newMaps;
                    }
                } else {
                    const current = (latestVeto.team2_picked_maps as unknown as PickedMap[]) || [];

                    if (isDecider) {
                        // Decider map: Add it as a new entry
                        const newMap: PickedMap = { map_id: mapId, side: side || undefined };
                        updateData.team2_picked_maps = [...current, newMap];
                    } else if (current.length > 0) {
                        // Standard map: Update the side of the last picked map
                        const lastMap = { ...current[current.length - 1] };
                        lastMap.side = side || undefined;
                        const newMaps = [...current.slice(0, current.length - 1), lastMap];
                        updateData.team2_picked_maps = newMaps;
                    }
                }
            }

            if (!isComplete) {
                const nextAction = currentSequence[nextActionNumber - 1];
                let nextTeamId: string;

                if (nextAction === 'pick_side') {
                    const nextPickActionNumber = nextActionNumber - 1;
                    nextTeamId = getSidePickerTeam(nextPickActionNumber, currentVetoFormat, veto.team1_id!, veto.team2_id!);
                } else {
                    nextTeamId = getTeamForAction(nextActionNumber, currentVetoFormat, veto.team1_id!, veto.team2_id!, nextAction);
                }
                updateData.current_action = nextAction;
                updateData.current_team_id = nextTeamId;
            } else {
                updateData.status = 'completed';
                updateData.completed_at = new Date().toISOString();
                updateData.current_team_id = null;
                updateData.current_action = null;
            }

            const { data: updatedVeto, error: updateError } = await supabase
                .from(valorantTables.match_vetos)
                .update(updateData)
                .eq('id', veto.id)
                .select()
                .single();

            if (updateError) throw updateError;

            if (updatedVeto) {
                const typedVeto = {
                    ...updatedVeto,
                    team1_picked_maps: (updatedVeto.team1_picked_maps as unknown) as PickedMap[] || [],
                    team2_picked_maps: (updatedVeto.team2_picked_maps as unknown) as PickedMap[] || [],
                } as MatchMapVeto;
                setVeto(typedVeto);
            }

            toast({ title: 'Success', description: 'Action completed' });
            if (isComplete && onComplete) onComplete();

        } catch (error: any) {
            console.error('Error:', error);
            // Only show toast if it's not a state mismatch (which might happen on race conditions and we can ignore/refresh)
            // Actually, we should show it so user knows why it failed.
            toast({ title: 'Error', description: error.message, variant: 'destructive' });

            // Refetch to sync state
            fetchVetoData();
        } finally {
            setActionLoading(null);
        }
    }, [veto, matchId, onComplete, toast, isOrganizer, userTeamId, isCaptain, fetchVetoData]);

    const handleMapAction = useCallback(async (mapId: string) => {
        if (!veto) return;

        const actionType = veto.current_action;
        if (!actionType) return;

        if (actionType === 'pick_side') {
            setPendingMapId(mapId);
            setShowSideDialog(true);
        } else {
            await performMapAction(mapId, actionType, null);
        }
    }, [veto, performMapAction]);

    const handleRoleSwitch = useCallback(async () => {
        await switchRole('casual', 'Switching to player role');
        setShowRoleSwitchPrompt(false);
    }, [switchRole]);

    const getTeamLink = useCallback((token: string | null) => {
        if (!token) return null;
        return `${window.location.origin}/map-veto/${token}`;
    }, []);

    const copyToClipboard = useCallback(async (text: string, type: 'team1' | 'team2') => {
        await navigator.clipboard.writeText(text);
        setCopiedLink(type);
        toast({ title: 'Copied!', description: 'Link copied to clipboard.' });
        if (copiedLinkTimeoutRef.current) clearTimeout(copiedLinkTimeoutRef.current);
        copiedLinkTimeoutRef.current = setTimeout(() => setCopiedLink(null), 2000);
    }, [toast]);

    return {
        veto,
        loading,
        availableMaps,
        allAvailableMaps,
        actionLoading,
        showBODialog,
        setShowBODialog,
        dialogStep,
        setDialogStep,
        selectedBO,
        handleSetBO,
        selectedMapPool: [], // Empty as we don't use it anymore
        setSelectedMapPool: () => { }, // No-op
        showRoleSwitchPrompt,
        setShowRoleSwitchPrompt,
        handleRoleSwitch,
        imagesLoaded,
        setImagesLoaded,
        handleMapAction,
        handleResetVeto,
        resetting,
        isOrganizer,
        isCaptain,
        userTeamId,
        getTeamLink,
        copyToClipboard,
        copiedLink,
        showSideDialog,
        setShowSideDialog,
        pendingMapId,
        setPendingMapId,
        performMapAction,
        setDialogManuallyClosed,
        team1Logo,
        team2Logo,
        isTeam1Captain,
        isTeam2Captain
    };
};
