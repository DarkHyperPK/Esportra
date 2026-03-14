import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { apiClient } from '@/lib/apiClient';
import { buildHubConnection, startWithRetry, HubPaths } from '@/lib/signalrClient';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { valorantTables } from '@/utils/gameTables';
import { vetoService, BestOf, TeamSide, VetoService } from '@/services/vetoService';
import type { HubConnection } from '@microsoft/signalr';
export { VetoService };

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
    best_of: 1 | 3 | 5;  // Standardized to NUMBER (was veto_format TEXT)
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

// Maps camelCase API response to snake_case MatchMapVeto (backend returns C# PascalCase → JSON camelCase)
function mapApiVetoToLocal(apiVeto: any): MatchMapVeto {
    return {
        id:                    apiVeto.id,
        match_id:              apiVeto.matchId ?? apiVeto.match_id,
        tournament_id:         apiVeto.tournamentId ?? apiVeto.tournament_id,
        team1_id:              apiVeto.team1Id ?? apiVeto.team1_id ?? null,
        team2_id:              apiVeto.team2Id ?? apiVeto.team2_id ?? null,
        team1_link_token:      apiVeto.team1LinkToken ?? apiVeto.team1_link_token ?? null,
        team2_link_token:      apiVeto.team2LinkToken ?? apiVeto.team2_link_token ?? null,
        best_of:               getBestOf(apiVeto.bestOf ?? apiVeto.best_of),
        status:                apiVeto.status ?? 'pending',
        current_team_id:       apiVeto.currentTeamId ?? apiVeto.current_team_id ?? null,
        current_action:        apiVeto.currentAction ?? apiVeto.current_action ?? null,
        current_action_number: apiVeto.currentActionNumber ?? apiVeto.current_action_number ?? 0,
        turn_started_at:       apiVeto.turnStartedAt ?? apiVeto.turn_started_at ?? null,
        turn_duration_seconds: apiVeto.turnDurationSeconds ?? apiVeto.turn_duration_seconds ?? 0,
        team1_banned_maps:     Array.isArray(apiVeto.team1BannedMaps ?? apiVeto.team1_banned_maps) ? (apiVeto.team1BannedMaps ?? apiVeto.team1_banned_maps) : [],
        team2_banned_maps:     Array.isArray(apiVeto.team2BannedMaps ?? apiVeto.team2_banned_maps) ? (apiVeto.team2BannedMaps ?? apiVeto.team2_banned_maps) : [],
        team1_picked_maps:     Array.isArray(apiVeto.team1PickedMaps ?? apiVeto.team1_picked_maps) ? (apiVeto.team1PickedMaps ?? apiVeto.team1_picked_maps) : [],
        team2_picked_maps:     Array.isArray(apiVeto.team2PickedMaps ?? apiVeto.team2_picked_maps) ? (apiVeto.team2PickedMaps ?? apiVeto.team2_picked_maps) : [],
        selected_map_id:       apiVeto.selectedMapId ?? apiVeto.selected_map_id ?? null,
        started_at:            apiVeto.startedAt ?? apiVeto.started_at ?? null,
        completed_at:          apiVeto.completedAt ?? apiVeto.completed_at ?? null,
    } as MatchMapVeto;
}

// Helper Functions
// getBestOf: Normalize to valid bestOf value (1, 3, or 5)
export const getBestOf = (value: number | null | undefined): 1 | 3 | 5 => {
    if (value === 1) return 1;
    if (value === 3) return 3;
    if (value === 5) return 5;
    return 1;  // Default to BO1
};

// Legacy helper - kept for backward compatibility during migration
export const getVetoFormat = (bestOf: number): 1 | 3 | 5 => getBestOf(bestOf);

// Service-wrapped helper functions
export const getTeamForAction = (
    actionNumber: number,
    bestOf: 1 | 3 | 5,
    team1Id: string,
    team2Id: string,
    service: VetoService = vetoService // Default to singleton
): string => {
    const teamSide = service.getTeamForAction(bestOf, actionNumber);
    return teamSide === 'T1' ? team1Id : team2Id;
};

export const getSidePickerTeam = (
    actionNumber: number,
    bestOf: 1 | 3 | 5,
    team1Id: string,
    team2Id: string,
    service: VetoService = vetoService // Default to singleton
): string => {
    const step = service.getStep(bestOf, actionNumber);
    if (!step) return team1Id;

    // Case 1: It's a decider side pick (e.g., Action 9 in BO3)
    if (step.isDecider && step.action === 'pick_side') {
        return step.team === 'T1' ? team1Id : team2Id;
    }

    // Case 2: It's a regular side pick action (e.g., Action 4 or 6 in BO3)
    // We need to look at the PICK action that preceded it
    if (step.action === 'pick_side') {
        const sidePickerSide = service.getSidePickerForMap(bestOf, actionNumber - 1);
        return sidePickerSide === 'T1' ? team1Id : team2Id;
    }

    // Case 3: It's a pick action, and we want to know who WILL pick the side (used in UI summaries)
    if (step.action === 'pick') {
        const sidePickerSide = service.getSidePickerForMap(bestOf, actionNumber);
        return sidePickerSide === 'T1' ? team1Id : team2Id;
    }

    return team1Id;
};

// VETO_SEQUENCES should be derived from the service in the hook now
// But we keep this for type compatibility if needed, though it's better to use local sequences
// Export a legacy VETO_SEQUENCES constant for components that still import it directly.
// This defaults to Valorant sequences for backward compatibility.
const defaultVetoService = new VetoService('valorant');
const getLocalSequences = (service: VetoService): Record<number, string[]> => ({
    1: service.getSequence(1).map(s => s.action),
    3: service.getSequence(3).map(s => s.action),
    5: service.getSequence(5).map(s => s.action),
});
export const VETO_SEQUENCES = getLocalSequences(defaultVetoService);

// --- FSM Types & Logic ---

export type VetoState = 'INIT' | 'BAN' | 'PICK' | 'PICK_SIDE' | 'COMPLETE';

export type TransitionResult =
    | { ok: true; reason?: never }
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
    // Resiliency: If status is pending but we ALREADY have a current action/team assigned,
    // treat it as BAN/PICK etc. to avoid INVALID_STATE if the DB is slightly inconsistent.
    if (veto.status === 'pending' && !veto.current_team_id) return 'INIT';

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
    game?: string;
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
    game = 'valorant',
    forcedTeamId,
    onComplete,
}: UseMapVetoMachineProps) => {
    // Initialize VetoService for the specific game
    const service = useMemo(() => new VetoService(game), [game]);
    const localSequences = useMemo(() => getLocalSequences(service), [service]);

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
    const [dialogStep, setDialogStep] = useState<'map_pool' | 'bo'>(bestOf ? 'map_pool' : 'bo'); // Default to BO unless bestOf is provided
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
    const initInProgressRef = useRef(false); // Guard against duplicate init calls

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
            const teamMembers = await apiClient.get<{ team_id: string; role: string }[]>(
                `/api/teams/members?team_ids=${teamIds.join(',')}&user_id=${user.id}&roles=captain,owner&is_active=true`
            );

            // Also check if user is the owner in the teams table directly
            const ownedTeams = await apiClient.get<{ id: string }[]>(
                `/api/teams?ids=${teamIds.join(',')}&owner_id=${user.id}`
            );

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
            const teams = await apiClient.get<{ id: string; logo_url: string | null }[]>(
                `/api/teams?ids=${teamIds.join(',')}`
            );

            if (teams) {
                teams.forEach((team: any) => {
                    if (team.id === team1Id) setTeam1Logo(team.logo_url);
                    if (team.id === team2Id) setTeam2Logo(team.logo_url);
                });
            }
        };
        fetchTeamLogos();
    }, [team1Id, team2Id]);

    const [dbBestOf, setDbBestOf] = useState<number | null>(null);
    const isInitialLoadRef = useRef(true);
    const lastAutoInitTimeRef = useRef(0); // B4: cooldown to prevent auto-init loops

    // Auto-initialize veto if stuck in pending with best_of set but no current_team_id
    // ALSO: Auto-update best_of if it changes in the tournament settings
    useEffect(() => {
        const autoInitializeOrUpdateVeto = async () => {
            if (!veto) return;

            // B4: Cooldown — skip if last auto-init was within 5 seconds
            const now = Date.now();
            if (now - lastAutoInitTimeRef.current < 5000) return;

            // CRITICAL: Never auto-reset a completed veto
            if (veto.status === 'completed') {
                isInitialLoadRef.current = false;
                return;
            }

            try {
                // Case 1: Stuck in pending — re-init via the idempotent /init endpoint
                if (veto.status === 'pending' && !veto.current_team_id) {
                    // Wait until we have a reliable best_of from the DB
                    const effectiveBestOf = getBestOf(dbBestOf || bestOf);
                    if (!effectiveBestOf || effectiveBestOf < 1) {
                        console.log('[MapVeto] Waiting for best_of data before auto-init');
                        return;
                    }

                    console.log('[MapVeto] Auto-initializing stuck veto with best_of:', effectiveBestOf);
                    lastAutoInitTimeRef.current = Date.now();

                    await apiClient.post(`/api/veto/${matchId}/init`, {
                        tournamentId: veto.tournament_id || tournamentId,
                        team1Id: veto.team1_id || team1Id,
                        team2Id: veto.team2_id || team2Id,
                        bestOf: effectiveBestOf,
                        game: 'valorant',
                    });

                    // Re-fetch to get the fresh state
                    const fresh = await apiClient.get<any>(`/api/veto/${matchId}`).catch(() => null);
                    if (fresh) setVeto(fresh as MatchMapVeto);

                    isInitialLoadRef.current = false;
                    return;
                }

                // Case 2: Best Of Mismatch — only when we have authoritative data from the DB
                // Do NOT use the bestOf prop alone — it may be a default value (1)
                if (dbBestOf && dbBestOf > 0) {
                    const targetBestOf = getBestOf(dbBestOf);

                    if (isInitialLoadRef.current) {
                        console.log('[MapVeto] Initial load, skipping mismatch check');
                        isInitialLoadRef.current = false;
                        return;
                    }

                    if (targetBestOf && veto.best_of !== targetBestOf && lastResetBestOfRef.current !== targetBestOf) {
                        console.log(`[MapVeto] Best Of mismatch detected. Target: ${targetBestOf}, Veto best_of: ${veto.best_of}. Resetting veto...`);
                        lastAutoInitTimeRef.current = Date.now();
                        lastResetBestOfRef.current = targetBestOf;

                        // Reset then re-init with correct best_of
                        await apiClient.post(`/api/veto/${matchId}/reset`).catch(() => {});
                        await apiClient.post(`/api/veto/${matchId}/init`, {
                            tournamentId: veto.tournament_id || tournamentId,
                            team1Id: veto.team1_id || team1Id,
                            team2Id: veto.team2_id || team2Id,
                            bestOf: targetBestOf,
                            game: 'valorant',
                        });

                        const fresh = await apiClient.get<any>(`/api/veto/${matchId}`).catch(() => null);
                        if (fresh) setVeto(fresh as MatchMapVeto);
                    }
                } else {
                    // No authoritative best_of yet — just clear the initial load flag
                    isInitialLoadRef.current = false;
                }
            } catch (error) {
                console.error('[MapVeto] Error in auto-init:', error);
            } finally {
                isInitialLoadRef.current = false;
            }
        };

        autoInitializeOrUpdateVeto();
    }, [veto?.id, veto?.status, veto?.best_of, veto?.current_team_id, veto?.team1_id, veto?.current_action_number, bestOf, dbBestOf]);

    // Fetch Veto Data
    const fetchVetoData = useCallback(async () => {
        try {
            // 1. Fetch the veto record
            const vetoData = await apiClient.get<any | null>(`/api/veto/${matchId}`).catch(() => null);

            // 2. Fetch the stage's best_of as the ultimate source of truth
            let stageBestOf = bestOf;

            if (matchId) {
                try {
                    const brktMatch = await apiClient.get<any>(`/api/brackets/matches/${matchId}`);

                    if (brktMatch?.stage_best_of) {
                        stageBestOf = brktMatch.stage_best_of;
                        setDbBestOf(stageBestOf);
                        console.log('[MapVeto] Synced best_of from stage DB:', stageBestOf);
                    }
                } catch {
                    // Failed to fetch stage data, use prop best_of
                    console.warn('[MapVeto] Failed to fetch match/stage best_of, using prop:', bestOf);
                }
            }

            if (vetoData) {
                // Cast Json to PickedMap[]
                const typedData = {
                    ...vetoData,
                    team1_banned_maps: Array.isArray(vetoData.team1_banned_maps) ? vetoData.team1_banned_maps : [],
                    team2_banned_maps: Array.isArray(vetoData.team2_banned_maps) ? vetoData.team2_banned_maps : [],
                    team1_picked_maps: Array.isArray(vetoData.team1_picked_maps) ? vetoData.team1_picked_maps : [],
                    team2_picked_maps: Array.isArray(vetoData.team2_picked_maps) ? vetoData.team2_picked_maps : [],
                } as MatchMapVeto;

                // If the veto exists but its best_of doesn't match the stage, 
                // the autoInitializeOrUpdateVeto effect will handle the reset/update
                // if it's not completed.
                setVeto(typedData);

                // If we have a more accurate best_of from the stage DB, we should use it
                // for the auto-init logic if the prop was missing or different.
                if (stageBestOf && stageBestOf !== bestOf) {
                    setSelectedBO(stageBestOf);
                }
            } else {
                // Create new veto if none exists — guarded against duplicate calls
                if (matchId && tournamentId && team1Id && team2Id && !initInProgressRef.current) {
                    initInProgressRef.current = true;
                    console.log('[MapVeto] No veto found, creating new one with best_of:', stageBestOf);

                    const initialBestOf = getBestOf(stageBestOf || 1);

                    const newVeto = {
                        tournamentId: tournamentId,
                        team1Id: team1Id,
                        team2Id: team2Id,
                        bestOf: initialBestOf,
                        game: 'valorant',
                    };

                    try {
                        const createdVeto = await apiClient.post<any>(`/api/veto/${matchId}/init`, newVeto);

                        if (createdVeto) {
                            const typedVeto = {
                                ...createdVeto,
                                team1_banned_maps: Array.isArray(createdVeto.team1_banned_maps) ? createdVeto.team1_banned_maps : [],
                                team2_banned_maps: Array.isArray(createdVeto.team2_banned_maps) ? createdVeto.team2_banned_maps : [],
                                team1_picked_maps: Array.isArray(createdVeto.team1_picked_maps) ? createdVeto.team1_picked_maps : [],
                                team2_picked_maps: Array.isArray(createdVeto.team2_picked_maps) ? createdVeto.team2_picked_maps : [],
                            } as MatchMapVeto;
                            setVeto(typedVeto);
                        }
                    } catch (initErr) {
                        console.error('[MapVeto] Init failed:', initErr);
                        // Fallback: try fetching again (init endpoint is idempotent, may have been created by race)
                        const retryVeto = await apiClient.get<any>(`/api/veto/${matchId}`).catch(() => null);
                        if (retryVeto) setVeto(retryVeto as MatchMapVeto);
                    } finally {
                        initInProgressRef.current = false;
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
    }, [matchId, tournamentId, team1Id, team2Id, bestOf]);

    // Fetch all available maps (Tournament Pool)
    useEffect(() => {
        const fetchAllMaps = async () => {
            if (!tournamentId) return;

            try {
                // First try to fetch from tournament_map_pools
                const poolData = await apiClient.get<any[]>(`/api/tournaments/${tournamentId}/map-pool`);

                if (poolData && poolData.length > 0) {
                    // Backend returns flat rows: { id, game, map_name, map_image_url, is_active }
                    // Handle both flat and nested (game_maps) response formats
                    const maps = poolData.map((item: any) => {
                        // If backend returns nested game_maps (Supabase-style)
                        if (item.game_maps) {
                            let m = item.game_maps;
                            if (Array.isArray(m)) m = m[0];
                            if (m && typeof m.map_image_url === 'string') {
                                m.map_image_url = m.map_image_url.trim();
                            }
                            return m;
                        }
                        // Flat row from backend API
                        if (item.id && item.map_name) {
                            if (typeof item.map_image_url === 'string') {
                                item.map_image_url = item.map_image_url.trim();
                            }
                            return item;
                        }
                        return null;
                    }).filter((m: any) => m && m.is_active !== false);

                    // Remove duplicates just in case
                    const uniqueMaps = Array.from(new Map(maps.map((m: any) => [m.id, m])).values());

                    const typedMaps = uniqueMaps as GameMap[];
                    setAllAvailableMaps(typedMaps);
                    setAvailableMaps(typedMaps); // Set availableMaps too!
                } else {
                    // Fallback: fetch all active maps if no pool selected for tournament
                    console.log(`No tournament map pool found, fetching all active maps for game: ${game}`);
                    const dbGameName = ['cs2', 'counter-strike 2'].includes(game?.toLowerCase() || '') ? 'Counter-Strike 2' : game;
                    const gameMaps = await apiClient.get<GameMap[]>(
                        `/api/game-maps?game=${encodeURIComponent(dbGameName)}&is_active=true`
                    );

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

    // Ref to track VetoHub connection
    const vetoConnectionRef = useRef<HubConnection | null>(null);

    // Real-time Subscription via SignalR VetoHub
    useEffect(() => {
        if (!matchId) return;

        let mounted = true;
        const connection = buildHubConnection(HubPaths.Veto);
        vetoConnectionRef.current = connection;

        // Handle state sync (sent on join + after each action)
        connection.on('StateSync', (rawVeto: any) => {
            if (!mounted) return;
            setVeto(mapApiVetoToLocal(rawVeto));
        });

        // Handle veto action updates
        connection.on('VetoAction', (rawVeto: any) => {
            if (!mounted) return;
            setVeto(mapApiVetoToLocal(rawVeto));
        });

        // Handle veto reset
        connection.on('VetoReset', () => {
            if (!mounted) return;
            setVeto(null);
            fetchVetoData();
        });

        // Handle veto complete
        connection.on('VetoComplete', (_pickedMaps: PickedMap[]) => {
            if (!mounted) return;
            // Refetch to get final state
            fetchVetoData();
        });

        // Start connection and join veto room
        startWithRetry(connection)
            .then(() => connection.invoke('JoinVeto', matchId))
            .catch(err => console.error('[VetoHub] Failed to connect:', err));

        return () => {
            mounted = false;
            connection.invoke('LeaveVeto', matchId).catch(() => {});
            connection.stop();
            vetoConnectionRef.current = null;
        };
    }, [matchId, fetchVetoData]);

    // Dialog Auto-Show Logic
    useEffect(() => {
        const effectiveIsOrganizer = isOrganizer || currentRole === 'organizer';

        if (!veto) return;

        // We no longer check for map pool since it's from tournament
        const needsBO = (veto.best_of === null || veto.best_of === undefined);

        const shouldShowDialog =
            veto.status === 'pending' &&
            effectiveIsOrganizer &&
            !showBODialog &&
            !dialogManuallyClosed &&
            needsBO &&
            !bestOf; // Don't show dialog if bestOf is provided via props (auto-init will handle it)

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
        if (validation.ok === false) {
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
        const normalizedBestOf = getBestOf(bo);
        const firstAction = localSequences[normalizedBestOf][0];

        try {
            await apiClient.post(`/api/veto/${matchId}/init`, {
                tournamentId: veto.tournament_id,
                team1Id: veto.team1_id,
                team2Id: veto.team2_id,
                bestOf: normalizedBestOf,
                game: veto.game || 'valorant',
            });

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
        if (validation.ok === false) {
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
            await apiClient.post(`/api/veto/${matchId}/reset`, {});

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
        if (validation.ok === false) {
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
            const latestVeto = await apiClient.get<any>(`/api/veto/${matchId}`);

            if (!latestVeto) throw new Error('Veto not found');

            // --- RE-VALIDATION AGAINST DB STATE ---
            // Re-construct state and context from DB data to prevent race conditions
            const dbVeto = {
                ...latestVeto,
                team1_banned_maps: Array.isArray(latestVeto.team1_banned_maps) ? latestVeto.team1_banned_maps : [],
                team2_banned_maps: Array.isArray(latestVeto.team2_banned_maps) ? latestVeto.team2_banned_maps : [],
                team1_picked_maps: Array.isArray(latestVeto.team1_picked_maps) ? latestVeto.team1_picked_maps : [],
                team2_picked_maps: Array.isArray(latestVeto.team2_picked_maps) ? latestVeto.team2_picked_maps : [],
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

            const currentActionNum = dbVeto.current_action_number || 1;
            const currentBestOf = getBestOf(dbVeto.best_of || 1);

            // 2. Calculate expected team using Service
            let expectedTeamId: string;
            if (actionType === 'pick_side') {
                expectedTeamId = getSidePickerTeam(currentActionNum, currentBestOf, dbVeto.team1_id!, dbVeto.team2_id!, service);
            } else {
                expectedTeamId = getTeamForAction(currentActionNum, currentBestOf, dbVeto.team1_id!, dbVeto.team2_id!, service);
            }

            // 3. Perform action via backend API (replaces client-side insert + update)
            const endpoint = actionType === 'ban' ? 'ban'
                : actionType === 'pick' ? 'pick'
                : 'pick-side';

            const payload: any = { mapId };
            if (actionType === 'pick_side' && side) {
                payload.side = side;
            }

            let updatedVetoResponse: any;
            try {
                updatedVetoResponse = await apiClient.post(`/api/veto/${matchId}/${endpoint}`, payload);
            } catch (err: any) {
                // Duplicate action (race condition) — silently ignore
                if (err.status === 409 || err.message?.includes('duplicate')) return;
                throw err;
            }

            // 4. Map camelCase API response to snake_case frontend types
            if (updatedVetoResponse) {
                const typedVeto = mapApiVetoToLocal(updatedVetoResponse);
                setVeto(typedVeto);
            }

            const nextActionNumber = currentActionNum + 1;
            const nextStep = service.getStep(currentBestOf, nextActionNumber);
            const isComplete = !nextStep;

            toast({ title: 'Success', description: 'Action completed' });

            // Fire-and-forget veto notifications (non-blocking — don't await)
            if (!isComplete && nextStep && dbVeto.team1_id && dbVeto.team2_id) {
                const nextTeamId = nextStep.team === 'T1' ? dbVeto.team1_id : dbVeto.team2_id;
                apiClient
                    .get<{ user_id: string } | null>(`/api/teams/${nextTeamId}/captain`)
                    .then((cap) => {
                        if (cap?.user_id) {
                            const actionLabel = nextStep.action === 'ban' ? 'ban'
                                : nextStep.action === 'pick' ? 'pick'
                                : 'pick a side for';
                            apiClient.post('/api/notifications', {
                                user_id: cap.user_id,
                                type: 'veto_your_turn',
                                title: 'Your Veto Turn',
                                message: `It's your turn to ${actionLabel} a map.`,
                                link: '/tournaments/captain',
                                data: { match_id: matchId },
                                is_read: false,
                            });
                        }
                    });
            }
            if (isComplete && dbVeto.team1_id && dbVeto.team2_id) {
                apiClient
                    .get<{ user_id: string }[]>(`/api/teams/captains?team_ids=${[dbVeto.team1_id, dbVeto.team2_id].join(',')}`)
                    .then((caps) => {
                        if (caps?.length) {
                            Promise.all(caps.map(c =>
                                apiClient.post('/api/notifications', {
                                    user_id: c.user_id,
                                    type: 'veto_completed',
                                    title: 'Map Veto Complete',
                                    message: 'The map veto has finished. Good luck in your match!',
                                    link: '/tournaments/captain',
                                    data: { match_id: matchId },
                                    is_read: false,
                                })
                            ));
                        }
                    });
            }

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
