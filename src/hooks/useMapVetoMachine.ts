import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { useToast } from '@/hooks/use-toast';
import { valorantTables } from '@/utils/gameTables';
import { vetoService, BestOf, TeamSide, VetoService } from '@/services/vetoService';
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

    const [dbBestOf, setDbBestOf] = useState<number | null>(null);
    const isInitialLoadRef = useRef(true);

    // Auto-initialize veto if stuck in pending with best_of set but no current_team_id
    // ALSO: Auto-update best_of if it changes in the tournament settings
    useEffect(() => {
        const autoInitializeOrUpdateVeto = async () => {
            if (!veto) return;

            // CRITICAL: Never auto-reset a completed veto
            if (veto.status === 'completed') {
                isInitialLoadRef.current = false;
                return;
            }

            try {
                // Case 1: Stuck in pending
                if (veto.status === 'pending' && !veto.current_team_id) {
                    console.log('[MapVeto] Auto-initializing stuck veto...');
                    // Use DB best_of if available, then veto's existing, then prop
                    const effectiveBestOf = getBestOf(dbBestOf || veto.best_of || bestOf);
                    const firstAction = localSequences[effectiveBestOf][0];

                    console.log('[MapVeto] Auto-init using best_of:', effectiveBestOf);

                    await supabase
                        .from(valorantTables.match_vetos)
                        .update({
                            status: 'in_progress',
                            best_of: effectiveBestOf,
                            started_at: new Date().toISOString(),
                            turn_started_at: new Date().toISOString(),
                            current_action: firstAction,
                            current_action_number: 1,
                            current_team_id: veto.team1_id,
                        })
                        .eq('id', veto.id);

                    isInitialLoadRef.current = false;
                    return;
                }

                // Case 2: Best Of Mismatch (e.g. user changed tournament format)
                // Use dbBestOf as the source of truth if available, otherwise use prop
                const targetBestOf = getBestOf(dbBestOf || bestOf);

                if (targetBestOf) {
                    // Only check for mismatch AFTER initial load has stabilized
                    if (isInitialLoadRef.current) {
                        console.log('[MapVeto] Initial load, skipping mismatch check');
                        isInitialLoadRef.current = false;
                        return;
                    }

                    if (veto.best_of !== targetBestOf && lastResetBestOfRef.current !== targetBestOf) {
                        console.log(`[MapVeto] Best Of mismatch detected. Target: ${targetBestOf}, Veto best_of: ${veto.best_of}. Resetting veto...`);
                        lastResetBestOfRef.current = targetBestOf;
                        const firstAction = localSequences[targetBestOf][0];

                        const { error } = await supabase
                            .from(valorantTables.match_vetos)
                            .update({
                                best_of: targetBestOf,
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

                        if (error) throw error;
                    }
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
            const { data: vetoData, error: vetoError } = await supabase
                .from(valorantTables.match_vetos)
                .select('*')
                .eq('match_id', matchId)
                .maybeSingle();

            if (vetoError) throw vetoError;

            // 2. Fetch the stage's best_of as the ultimate source of truth
            let stageBestOf = bestOf;
            let stageId: string | null = null;

            if (matchId) {
                // Query brkt_matches (graph engine) to get stage_id via version
                const { data: brktMatch } = await (supabase as any)
                    .from('brkt_matches')
                    .select('version_id')
                    .eq('id', matchId)
                    .single();

                if (brktMatch?.version_id) {
                    // Get stage_id from the bracket version
                    const { data: versionData } = await (supabase as any)
                        .from('brkt_versions')
                        .select('stage_id')
                        .eq('id', brktMatch.version_id)
                        .single();

                    if (versionData?.stage_id) {
                        stageId = versionData.stage_id;
                        const { data: stageData } = await supabase
                            .from('tournament_stages')
                            .select('best_of')
                            .eq('id', stageId)
                            .single() as any;

                        if (stageData?.best_of) {
                            stageBestOf = stageData.best_of;
                            setDbBestOf(stageBestOf);
                            console.log('[MapVeto] Synced best_of from stage DB:', stageBestOf);
                        }
                    }
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
                // Create new veto if none exists
                if (matchId && tournamentId && team1Id && team2Id) {
                    console.log('[MapVeto] No veto found, creating new one with best_of:', stageBestOf);

                    const initialBestOf = getBestOf(stageBestOf || 1);
                    const initialStatus = initialBestOf ? 'in_progress' : 'pending';
                    const initialAction = localSequences[initialBestOf][0];

                    const newVeto = {
                        match_id: matchId,
                        tournament_id: tournamentId,
                        stage_id: stageId,
                        team1_id: team1Id,
                        team2_id: team2Id,
                        status: initialStatus,
                        best_of: initialBestOf,
                        current_team_id: team1Id,
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
                        if (createError.code === '23505') {
                            console.log('[MapVeto] Veto created concurrently, refetching...');
                            fetchVetoData();
                            return;
                        }
                        throw createError;
                    } else if (createdVeto) {
                        const typedVeto = {
                            ...createdVeto,
                            team1_banned_maps: Array.isArray(createdVeto.team1_banned_maps) ? createdVeto.team1_banned_maps : [],
                            team2_banned_maps: Array.isArray(createdVeto.team2_banned_maps) ? createdVeto.team2_banned_maps : [],
                            team1_picked_maps: Array.isArray(createdVeto.team1_picked_maps) ? createdVeto.team1_picked_maps : [],
                            team2_picked_maps: Array.isArray(createdVeto.team2_picked_maps) ? createdVeto.team2_picked_maps : [],
                        } as MatchMapVeto;
                        setVeto(typedVeto);
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
                const { data: poolData, error: poolError } = await supabase
                    .from('tournament_map_pools')
                    .select('map_id, game_maps(*)')
                    .eq('tournament_id', tournamentId);

                if (poolData && poolData.length > 0) {
                    // Extract game_maps from the join
                    const maps = poolData.map((item: any) => {
                        let m = item.game_maps;
                        // Handle array response if join is interpreted as many-to-one
                        if (Array.isArray(m)) {
                            m = m[0];
                        }

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
                    console.log(`No tournament map pool found, fetching all active maps for game: ${game}`);
                    const dbGameName = ['cs2', 'counter-strike 2'].includes(game?.toLowerCase() || '') ? 'Counter-Strike 2' : game;
                    const { data: gameMaps } = await supabase
                        .from('game_maps')
                        .select('*')
                        .ilike('game', dbGameName) // Use ilike for case-insensitive normalization
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
                            team1_banned_maps: Array.isArray(rawVeto.team1_banned_maps) ? rawVeto.team1_banned_maps : [],
                            team2_banned_maps: Array.isArray(rawVeto.team2_banned_maps) ? rawVeto.team2_banned_maps : [],
                            team1_picked_maps: Array.isArray(rawVeto.team1_picked_maps) ? rawVeto.team1_picked_maps : [],
                            team2_picked_maps: Array.isArray(rawVeto.team2_picked_maps) ? rawVeto.team2_picked_maps : [],
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
            const { error } = await supabase
                .from(valorantTables.match_vetos)
                .update({
                    best_of: normalizedBestOf,  // Now INTEGER
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
                    return;
                }
                throw actionError;
            }

            // 4. Update Veto State
            const nextActionNumber = currentActionNum + 1;
            const nextStep = service.getStep(currentBestOf, nextActionNumber);
            const isComplete = !nextStep;

            let updateData: any = {
                current_action_number: nextActionNumber,
                turn_started_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            // Update arrays based on action
            if (actionType === 'ban') {
                if (expectedTeamId === dbVeto.team1_id) {
                    updateData.team1_banned_maps = [...dbVeto.team1_banned_maps, mapId];
                } else {
                    updateData.team2_banned_maps = [...dbVeto.team2_banned_maps, mapId];
                }
            } else if (actionType === 'pick') {
                const pickedMap: PickedMap = { map_id: mapId, side: undefined };
                if (expectedTeamId === dbVeto.team1_id) {
                    updateData.team1_picked_maps = [...dbVeto.team1_picked_maps, pickedMap];
                } else {
                    updateData.team2_picked_maps = [...dbVeto.team2_picked_maps, pickedMap];
                }
            } else if (actionType === 'pick_side') {
                // Check if this is a decider map using Service
                const isDecider = service.isDeciderAction(currentBestOf, currentActionNum);

                // If it's a decider, the side picker (expectedTeamId) gets the map in their list
                // If it's NOT a decider, the side picker is picking for the OTHER team's map
                const teamToUpdateId = isDecider ? expectedTeamId : (expectedTeamId === veto.team1_id ? veto.team2_id : veto.team1_id);

                if (teamToUpdateId === dbVeto.team1_id) {
                    const current = dbVeto.team1_picked_maps;
                    if (isDecider) {
                        const newMap: PickedMap = { map_id: mapId, side: side || undefined };
                        updateData.team1_picked_maps = [...current, newMap];
                    } else if (current.length > 0) {
                        const lastMap = { ...current[current.length - 1] };
                        lastMap.side = side || undefined;
                        updateData.team1_picked_maps = [...current.slice(0, current.length - 1), lastMap];
                    }
                } else {
                    const current = dbVeto.team2_picked_maps;
                    if (isDecider) {
                        const newMap: PickedMap = { map_id: mapId, side: side || undefined };
                        updateData.team2_picked_maps = [...current, newMap];
                    } else if (current.length > 0) {
                        const lastMap = { ...current[current.length - 1] };
                        lastMap.side = side || undefined;
                        updateData.team2_picked_maps = [...current.slice(0, current.length - 1), lastMap];
                    }
                }
            }

            if (!isComplete && nextStep) {
                updateData.current_action = nextStep.action;
                updateData.current_team_id = nextStep.team === 'T1' ? dbVeto.team1_id : dbVeto.team2_id;
            } else {
                updateData.status = 'completed';
                updateData.completed_at = new Date().toISOString();
                updateData.current_team_id = null;
                updateData.current_action = null;

                // Set selected_map_id on completion for easy retrieval (especially BO1)
                // mapId is the map involved in the final action (pick or pick_side)
                const isDecider = service.isDeciderAction(currentBestOf, currentActionNum);
                if (currentBestOf === 1 || isDecider) {
                    updateData.selected_map_id = mapId;
                }
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
                    team1_banned_maps: Array.isArray(updatedVeto.team1_banned_maps) ? updatedVeto.team1_banned_maps : [],
                    team2_banned_maps: Array.isArray(updatedVeto.team2_banned_maps) ? updatedVeto.team2_banned_maps : [],
                    team1_picked_maps: Array.isArray(updatedVeto.team1_picked_maps) ? updatedVeto.team1_picked_maps : [],
                    team2_picked_maps: Array.isArray(updatedVeto.team2_picked_maps) ? updatedVeto.team2_picked_maps : [],
                } as MatchMapVeto;
                setVeto(typedVeto);
            }

            toast({ title: 'Success', description: 'Action completed' });

            // Fire-and-forget veto notifications (non-blocking — don't await)
            if (!isComplete && nextStep && dbVeto.team1_id && dbVeto.team2_id) {
                const nextTeamId = nextStep.team === 'T1' ? dbVeto.team1_id : dbVeto.team2_id;
                supabase
                    .from('team_members')
                    .select('user_id')
                    .eq('team_id', nextTeamId)
                    .eq('role', 'captain')
                    .eq('is_active', true)
                    .maybeSingle()
                    .then(({ data: cap }) => {
                        if (cap?.user_id) {
                            const actionLabel = nextStep.action === 'ban' ? 'ban'
                                : nextStep.action === 'pick' ? 'pick'
                                : 'pick a side for';
                            supabase.from('notifications').insert({
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
                supabase
                    .from('team_members')
                    .select('user_id')
                    .in('team_id', [dbVeto.team1_id, dbVeto.team2_id])
                    .eq('role', 'captain')
                    .eq('is_active', true)
                    .then(({ data: caps }) => {
                        if (caps?.length) {
                            supabase.from('notifications').insert(
                                caps.map(c => ({
                                    user_id: c.user_id,
                                    type: 'veto_completed',
                                    title: 'Map Veto Complete',
                                    message: 'The map veto has finished. Good luck in your match!',
                                    link: '/tournaments/captain',
                                    data: { match_id: matchId },
                                    is_read: false,
                                }))
                            );
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
