import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Clock, Shield, CheckCircle, XCircle, Play, Copy, Check, RotateCcw, Sword, Shield as ShieldIcon, Link2, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRole } from '@/contexts/RoleContext';

interface GameMap {
  id: string;
  game: string;
  map_name: string;
  map_image_url?: string | null;
  is_active: boolean;
}

interface PickedMap {
  map_id: string;
  side?: 'attack' | 'defend';
}

interface MatchMapVeto {
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
  selected_map_pool?: string[] | null; // Array of map IDs selected by organizer
  started_at: string | null;
  completed_at: string | null;
}

interface MapVetoProps {
  matchId: string;
  tournamentId: string;
  team1Id?: string | null;
  team2Id?: string | null;
  team1Name?: string;
  team2Name?: string;
  game?: string;
  bestOf?: number;
  onComplete?: () => void;
  forcedTeamId?: string | null;
  matchStatus?: 'pending' | 'in_progress' | 'completed';
}

// Official Valorant Tournament Veto Sequences
// Team A = team1 (odd actions), Team B = team2 (even actions)
// IMPORTANT: For BO3, action 5 (the second pick) breaks the odd/even pattern:
// - Action 1 (odd): Team A bans
// - Action 2 (even): Team B bans
// - Action 3 (odd): Team A picks map 1
// - Action 4 (even): Team B picks side for map 1
// - Action 5 (odd BUT Team B picks): Team B picks map 2 ← SPECIAL CASE
// - Action 6 (even): Team A picks side for map 2
// - Action 7 (odd): Team A bans
// - Action 8 (even): Team B bans
// - Action 9 (odd): Team A auto-picks map 3
// - Action 10 (even): Team A picks side for map 3 (SPECIAL CASE: same team as auto-picker)
const VETO_SEQUENCES = {
  bo1: ['ban', 'ban', 'ban', 'ban', 'ban', 'pick', 'pick_side'], // BO1: 5 bans, 1 pick, 1 side pick
  bo3: ['ban', 'ban', 'pick', 'pick_side', 'pick', 'pick_side', 'ban', 'ban', 'pick_side'], // BO3: Team 1 bans, Team 2 bans, Team 1 picks Map 1, Team 2 picks side, Team 2 picks Map 2, Team 1 picks side, Team 2 bans, Team 1 bans, last map auto-assigned, Team 1 picks side
  bo5: ['ban', 'ban', 'pick', 'pick_side', 'pick', 'pick_side', 'pick', 'pick_side', 'pick', 'pick_side', 'pick_side'], // BO5: Team 1 bans, Team 2 bans, Team 1 picks Map 1, Team 2 picks side, Team 2 picks Map 2, Team 1 picks side, Team 1 picks Map 3, Team 2 picks side, Team 2 picks Map 4, Team 1 picks side, last map auto-assigned, Team 1 picks side (higher seed advantage)
  // Legacy formats (for backwards compatibility)
  standard_7: ['ban', 'ban', 'pick', 'pick', 'ban', 'ban', 'pick'],
  standard_5: ['ban', 'ban', 'pick', 'pick', 'ban'],
  standard_9: ['ban', 'ban', 'pick', 'pick', 'ban', 'ban', 'pick', 'pick', 'ban'],
};

// Get veto format from best_of value
const getVetoFormat = (bestOf: number): 'bo1' | 'bo3' | 'bo5' => {
  if (bestOf === 1) return 'bo1';
  if (bestOf === 3) return 'bo3';
  if (bestOf === 5) return 'bo5';
  return 'bo3'; // Default to BO3
};

/**
 * Get the team ID that should perform a specific action
 * Handles all BO formats including BO3 and BO5 special cases
 * 
 * IMPORTANT RULE: The team that bans first should NOT pick the first map
 * 
 * @param actionNumber - 1-based action number
 * @param vetoFormat - The veto format ('bo1', 'bo3', 'bo5')
 * @param team1Id - Team A (Team 1) ID
 * @param team2Id - Team B (Team 2) ID
 * @param actionType - The type of action ('ban', 'pick', 'pick_side')
 * @returns The team ID that should perform this action
 */
const getTeamForAction = (
  actionNumber: number,
  vetoFormat: 'bo1' | 'bo3' | 'bo5',
  team1Id: string,
  team2Id: string,
  actionType?: string
): string => {
  // BO3 Sequence:
  // 1. Team 1 bans
  // 2. Team 2 bans
  // 3. Team 1 picks Map 1
  // 4. Team 2 picks side for Map 1
  // 5. Team 2 picks Map 2
  // 6. Team 1 picks side for Map 2
  // 7. Team 2 bans
  // 8. Team 1 bans
  // 9. Last map becomes Map 3 (auto-assigned), Team 1 picks side (higher seed)
  
  // BO5 Sequence:
  // 1. Team 1 bans
  // 2. Team 2 bans
  // 3. Team 1 picks Map 1
  // 4. Team 2 picks side for Map 1
  // 5. Team 2 picks Map 2
  // 6. Team 1 picks side for Map 2
  // 7. Team 1 picks Map 3
  // 8. Team 2 picks side for Map 3
  // 9. Team 2 picks Map 4
  // 10. Team 1 picks side for Map 4
  // 11. Last map becomes Map 5 (auto-assigned), Team 1 picks side (higher seed advantage)
  
  // BO3 special cases:
  if (vetoFormat === 'bo3') {
    // Action 5: Team 2 picks Map 2 (breaks pattern - should be Team 1 by odd/even)
    if (actionNumber === 5) return team2Id;
    // Action 7: Team 2 bans (breaks pattern - should be Team 1 by odd/even)
    if (actionNumber === 7) return team2Id;
    // Action 8: Team 1 bans (breaks pattern - should be Team 2 by odd/even)
    if (actionNumber === 8) return team1Id;
  }
  
  // BO5 special cases:
  if (vetoFormat === 'bo5') {
    // Action 5: Team 2 picks Map 2 (breaks pattern - should be Team 1 by odd/even)
    // After Team 1 picks Map 1, Team 2 picks Map 2 (alternating pattern)
    if (actionNumber === 5) return team2Id;
    // Action 9: Team 2 picks Map 4 (breaks pattern - should be Team 1 by odd/even)
    // After Team 1 picks Map 3, Team 2 picks Map 4 (alternating pattern)
    if (actionNumber === 9) return team2Id;
  }
  
  // Standard pattern: Odd actions = Team 1, Even actions = Team 2
  return (actionNumber % 2 === 1) ? team1Id : team2Id;
};

/**
 * Get the team ID that should pick the side after a map pick
 * Special cases:
 * - BO3 action 10: Team A picks side (same team as auto-picker) - OFFICIAL VALORANT RULE
 * - All other cases: Opposite team from the one that picked the map
 * 
 * @param pickActionNumber - The action number where the map was picked
 * @param vetoFormat - The veto format ('bo1', 'bo3', 'bo5')
 * @param team1Id - Team A (Team 1) ID
 * @param team2Id - Team B (Team 2) ID
 * @returns The team ID that should pick the side
 */
const getSidePickerTeam = (
  pickActionNumber: number,
  vetoFormat: 'bo1' | 'bo3' | 'bo5',
  team1Id: string,
  team2Id: string
): string => {
  // BO3 Special Case: Action 9 (side pick for last remaining map) - Team 1 picks side (higher seed)
  // The last map becomes Map 3 automatically (no pick action), then Team 1 picks side
  if (vetoFormat === 'bo3' && pickActionNumber === 8) {
    // After action 8 (Team 1 bans), the last map becomes Map 3, Team 1 picks side
    return team1Id; // Team 1 picks side for Map 3 (higher seed)
  }
  
  // BO5 Special Case: Action 11 (side pick for last remaining map) - Team 1 picks side (higher seed advantage)
  // The last map becomes Map 5 automatically (no pick action), then Team 1 picks side
  // Pattern: Team 1 picks Map 1, Team 2 picks side; Team 2 picks Map 2, Team 1 picks side;
  //          Team 1 picks Map 3, Team 2 picks side; Team 2 picks Map 4, Team 1 picks side;
  //          Map 5 auto-assigned, Team 1 picks side (higher seed advantage)
  if (vetoFormat === 'bo5' && pickActionNumber === 10) {
    // After action 10 (Team 1 picks side for Map 4), the last map becomes Map 5, Team 1 picks side
    return team1Id; // Team 1 picks side for Map 5 (higher seed advantage)
  }
  
  // For regular pick actions, get the team that picked the map
  const pickActionType = 'pick';
  const pickerTeamId = getTeamForAction(pickActionNumber, vetoFormat, team1Id, team2Id, pickActionType);
  
  // Return the opposite team (standard rule: opposite team picks side)
  return pickerTeamId === team1Id ? team2Id : team1Id;
};

export const MapVeto: React.FC<MapVetoProps> = ({
  matchId,
  tournamentId,
  team1Id,
  team2Id,
  team1Name = 'Team 1',
  team2Name = 'Team 2',
  game,
  bestOf = 1,
  onComplete,
  forcedTeamId,
  matchStatus,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { switchRole, currentRole } = useRole();
  const [veto, setVeto] = useState<MatchMapVeto | null>(null);
  const [availableMaps, setAvailableMaps] = useState<GameMap[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [isCaptain, setIsCaptain] = useState(false);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [showSideDialog, setShowSideDialog] = useState(false);
  const [pendingMapId, setPendingMapId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [showBODialog, setShowBODialog] = useState(false);
  const [selectedBO, setSelectedBO] = useState<number | null>(null);
  const [showRoleSwitchPrompt, setShowRoleSwitchPrompt] = useState(false);
  const [team1Logo, setTeam1Logo] = useState<string | null>(null);
  const [team2Logo, setTeam2Logo] = useState<string | null>(null);
  const [selectedMapPool, setSelectedMapPool] = useState<string[]>([]);
  const [dialogStep, setDialogStep] = useState<'map_pool' | 'bo'>('map_pool'); // Two-step dialog: map pool first, then BO
  const [allAvailableMaps, setAllAvailableMaps] = useState<GameMap[]>([]); // All maps for selection dialog

  // Fetch team logos
  useEffect(() => {
    const fetchTeamLogos = async () => {
      if (team1Id) {
        const { data: team1 } = await supabase
          .from('teams')
          .select('logo_url')
          .eq('id', team1Id)
          .maybeSingle();
        if (team1?.logo_url) setTeam1Logo(team1.logo_url);
      }
      if (team2Id) {
        const { data: team2 } = await supabase
          .from('teams')
          .select('logo_url')
          .eq('id', team2Id)
          .maybeSingle();
        if (team2?.logo_url) setTeam2Logo(team2.logo_url);
      }
    };
    fetchTeamLogos();
  }, [team1Id, team2Id]);

  useEffect(() => {
    const checkUserPermissions = async () => {
      if (forcedTeamId) {
        setUserTeamId(forcedTeamId);
        setIsCaptain(true);
        setIsOrganizer(false);
        return;
      }

      if (!user) {
        setIsCaptain(false);
        setIsOrganizer(false);
        setUserTeamId(null);
        return;
      }

      // Check both profile role and currentRole from context
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const profileRole = profile?.role;
      const contextRole = currentRole;
      const isUserOrganizer = profileRole === 'organizer' || contextRole === 'organizer';
      
      console.log('[MapVeto] Role check:', {
        userId: user.id,
        profileRole,
        contextRole,
        isUserOrganizer
      });

      if (isUserOrganizer) {
        console.log('[MapVeto] User is organizer (from profile or context)');
        setIsOrganizer(true);
        // Check if organizer is also a captain of one of the teams
        if (team1Id || team2Id) {
          const teamIds = [team1Id, team2Id].filter(Boolean) as string[];
          const { data: teamMembers } = await supabase
            .from('team_members')
            .select('team_id, role')
            .in('team_id', teamIds)
            .eq('user_id', user.id)
            .eq('role', 'captain')
            .eq('is_active', true);
          
          const captainTeamIds = new Set((teamMembers || []).map((tm: any) => tm.team_id));
          const isTeam1Captain = team1Id ? captainTeamIds.has(team1Id) : false;
          const isTeam2Captain = team2Id ? captainTeamIds.has(team2Id) : false;
          
          if (isTeam1Captain || isTeam2Captain) {
            setIsCaptain(true);
            setUserTeamId(isTeam1Captain ? team1Id! : team2Id!);
            // Will show role switch prompt in UI
          } else {
            setIsCaptain(false);
            setUserTeamId(null);
          }
        } else {
          setIsCaptain(false);
          setUserTeamId(null);
        }
        return;
      }

      if (team1Id || team2Id) {
        // Check if user is captain in team_members table (not teams.captain_id)
        const teamIds = [team1Id, team2Id].filter(Boolean) as string[];
        
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('team_id, role')
          .in('team_id', teamIds)
          .eq('user_id', user.id)
          .eq('role', 'captain')
          .eq('is_active', true);

        const captainTeamIds = new Set((teamMembers || []).map((tm: any) => tm.team_id));
        const isTeam1Captain = team1Id ? captainTeamIds.has(team1Id) : false;
        const isTeam2Captain = team2Id ? captainTeamIds.has(team2Id) : false;

        console.log('[MapVeto] Captain check:', {
          userId: user.id,
          team1Id,
          team2Id,
          teamMembers,
          isTeam1Captain,
          isTeam2Captain,
        });

        if (isTeam1Captain) {
          setIsCaptain(true);
          setUserTeamId(team1Id!);
        } else if (isTeam2Captain) {
          setIsCaptain(true);
          setUserTeamId(team2Id!);
        } else {
          setIsCaptain(false);
          setUserTeamId(null);
        }
      } else {
        setIsCaptain(false);
        setUserTeamId(null);
      }
    };

    checkUserPermissions();
  }, [user, team1Id, team2Id, forcedTeamId, currentRole]);

  const fetchVetoData = useCallback(async () => {
    if (!matchId || !tournamentId) return;

    // Check if match is live before allowing veto access
    if (matchStatus && matchStatus !== 'in_progress') {
      toast({
        title: 'Match not live',
        description: 'Please make the match live first by clicking "Go Live" and entering the party code.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data: vetoData, error: vetoError } = await supabase
        .from('match_map_vetos')
        .select('*')
        .eq('match_id', matchId)
        .maybeSingle();

      if (vetoError && vetoError.code !== 'PGRST116') {
        throw vetoError;
      }

      if (!vetoData) {
        const { data: initializedVetoId, error: initError } = await supabase.rpc('initialize_match_veto', {
          p_match_id: matchId,
          p_tournament_id: tournamentId,
          p_team1_id: team1Id,
          p_team2_id: team2Id,
        });

        if (initError) {
          console.error('[MapVeto] Error initializing veto:', initError);
          throw initError;
        }

        if (initializedVetoId) {
          const { data: newVeto, error: fetchError } = await supabase
            .from('match_map_vetos')
            .select('*')
            .eq('id', initializedVetoId)
            .single();

          if (fetchError) {
            console.error('[MapVeto] Error fetching initialized veto:', fetchError);
            throw fetchError;
          }
          if (newVeto) {
            // Check if best_of is actually set in the database (not just defaulted)
            const dbBestOf = newVeto.best_of;
            const matchBestOf = (vetoData as any)?.match?.best_of;
            const hasBestOf = dbBestOf !== null && dbBestOf !== undefined;
            
            const vetoWithBestOf = {
              ...newVeto,
              best_of: hasBestOf ? dbBestOf : (matchBestOf || bestOf || null),
            };
            setVeto(vetoWithBestOf as MatchMapVeto);
            
            // If veto is pending and organizer, show BO selection dialog if best_of is not set
            if (newVeto.status === 'pending' && !hasBestOf) {
              const effectiveIsOrganizer = isOrganizer || currentRole === 'organizer';
              console.log('[MapVeto] New veto created, checking if should show BO dialog. isOrganizer:', isOrganizer, 'currentRole:', currentRole, 'effectiveIsOrganizer:', effectiveIsOrganizer);
              // The useEffect will handle showing the dialog once isOrganizer is set
              if (effectiveIsOrganizer) {
                console.log('[MapVeto] Showing BO dialog for new veto');
                // Show dialog immediately
                setShowBODialog(true);
              } else {
                console.log('[MapVeto] User is not organizer yet, useEffect will handle dialog when permissions load');
              }
              
              // Auto-start if BO is already set in DB
              if (hasBestOf) {
                const { error: startError } = await supabase
                  .from('match_map_vetos')
                  .update({
                    status: 'in_progress',
                    started_at: new Date().toISOString(),
                    turn_started_at: new Date().toISOString(),
                  })
                  .eq('id', initializedVetoId);
                
                if (!startError) {
                  const { data: updatedVeto } = await supabase
                    .from('match_map_vetos')
                    .select('*')
                    .eq('id', initializedVetoId)
                    .single();
                  if (updatedVeto) {
                    setVeto(updatedVeto as MatchMapVeto);
                    return;
                  }
                }
              }
            }
          }
        }
      } else {
        // Check if best_of is actually set in the database
        const hasBestOf = vetoData.best_of !== null && vetoData.best_of !== undefined;
        const matchBestOf = (vetoData as any)?.match?.best_of;
        
        const vetoWithBestOf = {
          ...vetoData,
          best_of: hasBestOf ? vetoData.best_of : (matchBestOf || bestOf || null),
        };
        setVeto(vetoWithBestOf as MatchMapVeto);
        
        // Initialize selectedMapPool if it exists
        const mapPool = (vetoData as any).selected_map_pool;
        if (mapPool && Array.isArray(mapPool)) {
          setSelectedMapPool(mapPool);
        }
        
        // If pending and organizer, show BO selection if not set in DB
        if (vetoData.status === 'pending' && !hasBestOf) {
          const effectiveIsOrganizer = isOrganizer || currentRole === 'organizer';
          console.log('[MapVeto] Existing veto found, checking if should show BO dialog. isOrganizer:', isOrganizer, 'currentRole:', currentRole, 'effectiveIsOrganizer:', effectiveIsOrganizer);
          // The useEffect will handle showing the dialog once isOrganizer is set
          if (effectiveIsOrganizer) {
            console.log('[MapVeto] Showing BO dialog for existing veto');
            // Small delay to ensure state is set before showing dialog
            setTimeout(() => {
              setShowBODialog(true);
            }, 500);
          } else {
            console.log('[MapVeto] User is not organizer yet, useEffect will handle dialog when permissions load');
          }
          
          if (hasBestOf) {
            // Auto-start if BO is set in DB
            const { error: startError } = await supabase
              .from('match_map_vetos')
              .update({
                status: 'in_progress',
                started_at: new Date().toISOString(),
                turn_started_at: new Date().toISOString(),
              })
              .eq('id', vetoData.id);
            
            if (!startError) {
              const { data: updatedVeto } = await supabase
                .from('match_map_vetos')
                .select('*')
                .eq('id', vetoData.id)
                .single();
              if (updatedVeto) {
                setVeto(updatedVeto as MatchMapVeto);
              }
            }
          }
        }
      }

      let maps: GameMap[] = [];
      
      const { data: poolMaps, error: poolError } = await supabase
        .from('tournament_map_pools')
        .select('map_id, game_maps(*)')
        .eq('tournament_id', tournamentId);

      if (!poolError && poolMaps && poolMaps.length > 0) {
        maps = (poolMaps || [])
          .map((p: any) => p.game_maps)
          .filter((m: any) => m && m.is_active) as GameMap[];
      }

      if (maps.length === 0 && game) {
        const { data: gameMaps, error: gameMapsError } = await supabase
          .from('game_maps')
          .select('*')
          .eq('game', game)
          .eq('is_active', true)
          .order('map_name');

        if (gameMapsError) {
          throw gameMapsError;
        }
        maps = (gameMaps as GameMap[]) || [];
      }

      // If veto has a selected_map_pool, fetch those specific maps
      const matchBestOf = vetoData ? (vetoData as any)?.match?.best_of : null;
      const vetoWithMapPool = vetoData ? {
        ...vetoData,
        best_of: vetoData.best_of !== null && vetoData.best_of !== undefined 
          ? vetoData.best_of 
          : (matchBestOf || bestOf || null),
      } : null;

      if (vetoWithMapPool) {
        const mapPool = (vetoWithMapPool as any).selected_map_pool;
        if (mapPool && Array.isArray(mapPool) && mapPool.length > 0) {
          // Fetch maps directly from game_maps using the selected_map_pool IDs
          const { data: poolMapsData, error: poolMapsError } = await supabase
            .from('game_maps')
            .select('*')
            .in('id', mapPool)
            .eq('is_active', true)
            .order('map_name');
          
          if (!poolMapsError && poolMapsData && poolMapsData.length > 0) {
            maps = poolMapsData as GameMap[];
          } else {
            // Fallback: filter existing maps if direct fetch fails
            maps = maps.filter(m => mapPool.includes(m.id));
          }
        }
      }

      if (maps.length === 0) {
        console.warn('[MapVeto] No maps available:', {
          game,
          hasVeto: !!vetoData,
          mapPool: vetoWithMapPool ? (vetoWithMapPool as any).selected_map_pool : null,
          mapsFromTournament: maps.length
        });
        // Don't show toast if maps are just not loaded yet (veto might be pending)
        if (vetoData && vetoData.status === 'in_progress') {
          toast({
            title: 'No maps available',
            description: `No maps found for ${game}. Please configure the map pool.`,
            variant: 'destructive',
          });
        }
      }

      setAvailableMaps(maps);
      
      // Store all maps for the selection dialog (before filtering by selected_map_pool)
      // This ensures organizers can see all maps when selecting the pool
      if (game) {
        const { data: allGameMaps } = await supabase
          .from('game_maps')
          .select('*')
          .eq('game', game)
          .eq('is_active', true)
          .order('map_name');
        if (allGameMaps) {
          setAllAvailableMaps(allGameMaps as GameMap[]);
        }
      }
    } catch (error: any) {
      console.error('Error fetching veto data:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load map veto',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [matchId, tournamentId, game, toast, isOrganizer, user?.id, matchStatus]);

  useEffect(() => {
    fetchVetoData();
  }, [fetchVetoData]);
  
  // Refetch veto data when side dialog opens to ensure correct team logo
  useEffect(() => {
    if (showSideDialog && veto?.id) {
      console.log('[MapVeto] Side dialog opened, refetching veto data...', {
        currentTeamId: veto.current_team_id,
        currentAction: veto.current_action,
        currentActionNumber: veto.current_action_number,
      });
      fetchVetoData();
    }
  }, [showSideDialog, fetchVetoData, veto?.id]);
  
  // Show BO dialog when veto is loaded and conditions are met
  useEffect(() => {
    // Also check currentRole from context as fallback
    const effectiveIsOrganizer = isOrganizer || currentRole === 'organizer';
    
    console.log('[MapVeto] BO Dialog Check:', {
      hasVeto: !!veto,
      vetoStatus: veto?.status,
      vetoBestOf: veto?.best_of,
      isOrganizer,
      currentRole,
      effectiveIsOrganizer,
      showBODialog,
      shouldShow: veto && veto.status === 'pending' && (veto.best_of === null || veto.best_of === undefined) && effectiveIsOrganizer && !showBODialog
    });
    
    // Show dialog if: veto is pending, user is organizer, and dialog not already showing
    // Allow showing even if best_of is set (organizer can change it if still pending)
    const shouldShowDialog = veto && 
      veto.status === 'pending' && 
      effectiveIsOrganizer && 
      !showBODialog &&
      (veto.best_of === null || veto.best_of === undefined || veto.best_of === 0 || veto.best_of === 1);
    
    if (shouldShowDialog) {
      console.log('[MapVeto] Showing BO dialog...');
      // Show dialog immediately
      setShowBODialog(true);
    }
  }, [veto?.status, veto?.best_of, veto?.id, isOrganizer, currentRole, showBODialog]);


  // Check if organizer is also a captain - show role switch prompt
  useEffect(() => {
    const effectiveIsOrganizer = isOrganizer || currentRole === 'organizer';
    const organizerIsCaptain = effectiveIsOrganizer && isCaptain && userTeamId;
    if (organizerIsCaptain && veto && veto.status !== 'completed') {
      setShowRoleSwitchPrompt(true);
    } else {
      setShowRoleSwitchPrompt(false);
    }
  }, [isOrganizer, currentRole, isCaptain, userTeamId, veto?.status]);

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
          table: 'match_map_vetos',
          filter: `match_id=eq.${matchId}`,
        },
        async (payload) => {
          if (!mounted) return;
          
          console.log('[MapVeto] Real-time veto event received:', {
            eventType: payload.eventType,
            table: payload.table,
            new: payload.new,
            old: payload.old,
            timestamp: new Date().toISOString()
          });
          
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedVeto = payload.new as MatchMapVeto;
            console.log('[MapVeto] Processing veto UPDATE:', {
              id: updatedVeto.id,
              status: updatedVeto.status,
              best_of: updatedVeto.best_of,
              current_action_number: updatedVeto.current_action_number,
              team1_banned: updatedVeto.team1_banned_maps?.length || 0,
              team2_banned: updatedVeto.team2_banned_maps?.length || 0,
              team1_picked: updatedVeto.team1_picked_maps?.length || 0,
              team2_picked: updatedVeto.team2_picked_maps?.length || 0,
            });
            // Always update the veto state when we receive an UPDATE event
            // This ensures the UI reflects the latest state immediately
            setVeto(prevVeto => {
              if (!prevVeto || prevVeto.id !== updatedVeto.id) {
                console.log('[MapVeto] Setting new veto state (no previous veto or different ID)');
                return updatedVeto;
              }
              
              // Check if any key fields changed
              const prevBanned = [...(prevVeto.team1_banned_maps || []), ...(prevVeto.team2_banned_maps || [])];
              const newBanned = [...(updatedVeto.team1_banned_maps || []), ...(updatedVeto.team2_banned_maps || [])];
              const prevPicked1 = Array.isArray(prevVeto.team1_picked_maps) ? [...prevVeto.team1_picked_maps] : (prevVeto.team1_picked_maps ? [prevVeto.team1_picked_maps] : []);
              const prevPicked2 = Array.isArray(prevVeto.team2_picked_maps) ? [...prevVeto.team2_picked_maps] : (prevVeto.team2_picked_maps ? [prevVeto.team2_picked_maps] : []);
              const newPicked1 = Array.isArray(updatedVeto.team1_picked_maps) ? [...updatedVeto.team1_picked_maps] : (updatedVeto.team1_picked_maps ? [updatedVeto.team1_picked_maps] : []);
              const newPicked2 = Array.isArray(updatedVeto.team2_picked_maps) ? [...updatedVeto.team2_picked_maps] : (updatedVeto.team2_picked_maps ? [updatedVeto.team2_picked_maps] : []);
              const prevPicked = [...prevPicked1, ...prevPicked2];
              const newPicked = [...newPicked1, ...newPicked2];
              
              // Check if any picked map's side has changed (deep comparison)
              const pickedMapsChanged = prevPicked.length !== newPicked.length || 
                prevPicked.some((prevMap: any, idx: number) => {
                  const newMap = newPicked[idx] as any;
                  if (!newMap) return true;
                  return prevMap?.map_id !== newMap?.map_id || prevMap?.side !== newMap?.side;
                }) ||
                newPicked.some((newMap: any, idx: number) => {
                  const prevMap = prevPicked[idx] as any;
                  if (!prevMap) return true;
                  return prevMap?.map_id !== newMap?.map_id || prevMap?.side !== newMap?.side;
                });
              
              const hasChanges = 
                prevBanned.length !== newBanned.length || 
                pickedMapsChanged ||
                prevVeto.current_action_number !== updatedVeto.current_action_number ||
                prevVeto.current_action !== updatedVeto.current_action ||
                prevVeto.status !== updatedVeto.status ||
                prevVeto.best_of !== updatedVeto.best_of ||
                prevVeto.selected_map_id !== updatedVeto.selected_map_id ||
                prevVeto.current_team_id !== updatedVeto.current_team_id;
              
              if (hasChanges) {
                console.log('[MapVeto] Veto state changed, updating UI:', {
                  actionNumber: `${prevVeto.current_action_number} -> ${updatedVeto.current_action_number}`,
                  action: `${prevVeto.current_action} -> ${updatedVeto.current_action}`,
                  status: `${prevVeto.status} -> ${updatedVeto.status}`,
                  banned: `${prevBanned.length} -> ${newBanned.length}`,
                  picked: `${prevPicked.length} -> ${newPicked.length}`,
                });
                
                // Show BO dialog if status changed to pending and best_of is not set
                const effectiveIsOrganizer = isOrganizer || currentRole === 'organizer';
                if (updatedVeto.status === 'pending' && (updatedVeto.best_of === null || updatedVeto.best_of === undefined || updatedVeto.best_of === 0) && effectiveIsOrganizer) {
                  setShowBODialog(true);
                }
                return updatedVeto;
              }
              
              console.log('[MapVeto] No changes detected in veto UPDATE, keeping previous state');
              return prevVeto;
            });
          } else if (payload.eventType === 'INSERT' && payload.new) {
            const newVeto = payload.new as MatchMapVeto;
            console.log('[MapVeto] Processing veto INSERT:', {
              id: newVeto.id,
              status: newVeto.status,
              best_of: newVeto.best_of,
              match_id: newVeto.match_id,
            });
            setVeto(newVeto);
            // Show BO dialog if pending and best_of is not set
            const effectiveIsOrganizer = isOrganizer || currentRole === 'organizer';
            if (newVeto.status === 'pending' && (newVeto.best_of === null || newVeto.best_of === undefined || newVeto.best_of === 0) && effectiveIsOrganizer) {
              setShowBODialog(true);
            }
          } else if (payload.eventType === 'DELETE' && payload.old) {
            console.log('[MapVeto] Processing veto DELETE:', payload.old);
            setVeto(null);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_map_veto_actions',
          filter: `match_id=eq.${matchId}`,
        },
        async (payload) => {
          if (!mounted) return;
          
          console.log('[MapVeto] Real-time veto action event received:', {
            eventType: payload.eventType,
            table: payload.table,
            new: payload.new,
            old: payload.old,
            timestamp: new Date().toISOString()
          });
          
          if (payload.eventType === 'INSERT' && payload.new) {
            const newAction = payload.new;
            console.log('[MapVeto] Processing action INSERT (real-time):', {
              action_type: newAction.action_type,
              action_number: newAction.action_number,
              map_id: newAction.map_id,
              team_id: newAction.team_id,
              veto_id: newAction.veto_id,
            });
            
            // Immediately refetch the veto state to get the updated current_action_number
            // This ensures the UI updates instantly when another client performs an action
            const { data: updatedVeto, error } = await supabase
              .from('match_map_vetos')
              .select('*')
              .eq('match_id', matchId)
              .maybeSingle();
            
            if (!error && updatedVeto && mounted) {
              console.log('[MapVeto] Refetched veto after action insert (real-time):', {
                current_action_number: updatedVeto.current_action_number,
                current_action: updatedVeto.current_action,
                status: updatedVeto.status,
                team1_banned: updatedVeto.team1_banned_maps?.length || 0,
                team2_banned: updatedVeto.team2_banned_maps?.length || 0,
                team1_picked: Array.isArray(updatedVeto.team1_picked_maps) ? updatedVeto.team1_picked_maps.length : (updatedVeto.team1_picked_maps ? 1 : 0),
                team2_picked: Array.isArray(updatedVeto.team2_picked_maps) ? updatedVeto.team2_picked_maps.length : (updatedVeto.team2_picked_maps ? 1 : 0),
              });
              // Force update the veto state to reflect the new action
              setVeto(updatedVeto as MatchMapVeto);
            } else if (error) {
              console.error('[MapVeto] Error refetching veto after action (real-time):', error);
            } else if (!mounted) {
              console.log('[MapVeto] Component unmounted, skipping veto update');
            }
          } else if (payload.eventType === 'DELETE' && payload.old) {
            console.log('[MapVeto] Processing action DELETE:', payload.old);
            const { data: updatedVeto, error } = await supabase
              .from('match_map_vetos')
              .select('*')
              .eq('match_id', matchId)
              .maybeSingle();
            
            if (!error && updatedVeto && mounted) {
              console.log('[MapVeto] Refetched veto after action delete');
              setVeto(updatedVeto as MatchMapVeto);
            } else if (error) {
              console.error('[MapVeto] Error refetching veto after action delete:', error);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[MapVeto] Subscription status for match-veto:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[MapVeto] Successfully subscribed to match_map_vetos and match_map_veto_actions real-time updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[MapVeto] Error subscribing to map veto real-time:', status);
        } else if (status === 'TIMED_OUT') {
          console.warn('[MapVeto] Subscription timed out, retrying...');
        }
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [matchId, isOrganizer, currentRole]);

  const getTeamLink = (teamToken: string | null) => {
    if (!teamToken) return null;
    const baseUrl = window.location.origin;
    return `${baseUrl}/map-veto/${teamToken}`;
  };

  const copyToClipboard = async (text: string, linkType: 'team1' | 'team2') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLink(linkType);
      toast({
        title: 'Link copied!',
        description: 'Share this link with your team.',
      });
      setTimeout(() => setCopiedLink(null), 2000);
    } catch (err) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy the link manually.',
        variant: 'destructive',
      });
    }
  };

  const handleMapAction = async (mapId: string) => {
    // Allow actions if veto exists and has best_of set (even if status is still 'pending' - it will be updated)
    const canPerformAction = veto && user && (veto.status === 'in_progress' || (veto.status === 'pending' && veto.best_of !== null && veto.best_of !== undefined));
    
    if (!canPerformAction) {
      toast({
        title: 'Cannot perform action',
        description: veto?.status === 'pending' && !veto.best_of 
          ? 'Please wait for the organizer to set the Best Of format.'
          : `Veto process is not in progress. Current status: ${veto?.status || 'unknown'}`,
        variant: 'destructive',
      });
      return;
    }

    // Use the latest veto state (will be updated if refetched)
    let currentVeto = veto;
    
    const currentActionNum = currentVeto.current_action_number || 1;
    const currentBestOf = currentVeto.best_of ?? bestOf ?? 1;
    const vetoFormat = getVetoFormat(currentBestOf);
    const sequence = VETO_SEQUENCES[vetoFormat];
    
    // Calculate expectedTeamId using centralized helper functions
    let expectedTeamId: string;
    if (currentVeto.current_action === 'pick_side') {
      // The pick action is always the one before pick_side
      const pickActionNumber = currentActionNum - 1;
      // Use centralized helper to get the side picker team (opposite of map picker)
      expectedTeamId = getSidePickerTeam(
        pickActionNumber,
        vetoFormat as 'bo1' | 'bo3' | 'bo5',
        currentVeto.team1_id!,
        currentVeto.team2_id!
      );
    } else {
      // Use centralized helper to get the team for this action
      const actionType = sequence[currentActionNum - 1];
      // For pick_side actions, use getSidePickerTeam (opposite team from map picker)
      // For other actions, use getTeamForAction
      if (actionType === 'pick_side') {
        const pickActionNumber = currentActionNum - 1; // The pick action is always before pick_side
        expectedTeamId = getSidePickerTeam(
          pickActionNumber,
          vetoFormat as 'bo1' | 'bo3' | 'bo5',
          currentVeto.team1_id!,
          currentVeto.team2_id!
        );
      } else {
        expectedTeamId = getTeamForAction(
          currentActionNum,
          vetoFormat as 'bo1' | 'bo3' | 'bo5',
          currentVeto.team1_id!,
          currentVeto.team2_id!,
          actionType
        );
      }
    }

    console.log('[MapVeto] handleMapAction:', {
      mapId,
      isOrganizer,
      isCaptain,
      userTeamId,
      expectedTeamId,
      vetoTeam1Id: currentVeto.team1_id,
      vetoTeam2Id: currentVeto.team2_id,
      currentActionNumber: currentVeto.current_action_number,
      currentAction: currentVeto.current_action,
      vetoFormat,
      currentBestOf,
    });

    if (effectiveIsOrganizer) {
      toast({
        title: 'Organizer View Only',
        description: 'As an organizer, you can view the veto process but cannot perform actions.',
        variant: 'destructive',
      });
      return;
    }

    const canAct = isCaptain && expectedTeamId === userTeamId;
    
    if (!canAct) {
      const expectedTeamName = expectedTeamId === currentVeto.team1_id ? team1Name : team2Name;
      console.log('[MapVeto] Cannot act:', { canAct, isCaptain, expectedTeamId, userTeamId });
      toast({
        title: 'Not your turn',
        description: `It is ${expectedTeamName}'s turn to make a decision. ${!isCaptain ? 'You are not a captain.' : `Your team ID: ${userTeamId}, Expected: ${expectedTeamId}`}`,
        variant: 'destructive',
      });
      return;
    }

    setActionLoading(mapId);

    try {
      // If current_action is missing, refetch veto data to get latest state
      if (!currentVeto.current_action) {
        console.log('[MapVeto] current_action is null, refetching veto data...');
        // Refetch directly from database
        const { data: refreshedVeto, error: refetchError } = await supabase
          .from('match_map_vetos')
          .select('*')
          .eq('match_id', matchId)
          .single();
        
        if (refetchError || !refreshedVeto) {
          toast({
            title: 'Error',
            description: 'Failed to fetch veto data. Please try again.',
            variant: 'destructive',
          });
          setActionLoading(null);
          return;
        }
        
        currentVeto = refreshedVeto as MatchMapVeto;
        setVeto(currentVeto);
        
        // Check again after refetch
        if (!currentVeto.current_action) {
          toast({
            title: 'Error',
            description: 'Veto process not properly initialized. Please wait for the organizer to set the Best Of format.',
            variant: 'destructive',
          });
          setActionLoading(null);
          return;
        }
      }
      
      const actionType = currentVeto.current_action;
      const map = availableMaps.find((m) => m.id === mapId);

      if (!map) throw new Error('Map not found');

      // Use currentVeto instead of veto to ensure we have the latest state
      const allBannedMaps = [...(currentVeto.team1_banned_maps || []), ...(currentVeto.team2_banned_maps || [])];
      if (allBannedMaps.includes(mapId)) {
        toast({
          title: 'Map already used',
          description: 'This map has already been banned or picked.',
          variant: 'destructive',
        });
        setActionLoading(null);
        return;
      }

      // Handle different action types
      if (actionType === 'pick') {
        // Map pick - side selection comes in next action (pick_side)
        // DO NOT show side dialog here - it will be shown for the OPPOSITE team
        // when they click on a map during the pick_side action
        await performMapAction(mapId, 'pick', null);
      } else if (actionType === 'pick_side') {
        // Side selection - need to show side dialog
        // The pick_side action is always immediately after a pick action
        // The side is picked by the OPPOSITE team from the one that picked the map
        const currentActionNum = currentVeto.current_action_number || 1;
        const vetoFormat = getVetoFormat(currentVeto.best_of || 1);
        const sequence = VETO_SEQUENCES[vetoFormat];
        
        // The pick action is always the one immediately before pick_side
        const pickActionNumber = currentActionNum - 1;
        
        if (pickActionNumber < 1 || pickActionNumber > sequence.length) {
          toast({
            title: 'Error',
            description: 'Invalid action number for side selection.',
            variant: 'destructive',
          });
          setActionLoading(null);
          return;
        }
        
        // Use centralized helper to get the team that should pick the side
        const currentVetoFormatForSide = getVetoFormat(currentVeto.best_of || 1) as 'bo1' | 'bo3' | 'bo5';
        
        // Check if this is the final pick_side for auto-assigned last map (BO3 action 9, BO5 action 11)
        const isFinalPickSide = 
          (currentVetoFormatForSide === 'bo3' && currentActionNum === 9) ||
          (currentVetoFormatForSide === 'bo5' && currentActionNum === 11);
        
        // Verify that the previous action was indeed a pick (unless it's the final pick_side)
        const previousAction = sequence[pickActionNumber - 1];
        if (previousAction !== 'pick' && !isFinalPickSide) {
          toast({
            title: 'Error',
            description: `Expected pick action before side selection, but found: ${previousAction}`,
            variant: 'destructive',
          });
          setActionLoading(null);
          return;
        }
        const sidePickerTeamId = getSidePickerTeam(
          pickActionNumber,
          currentVetoFormatForSide as 'bo1' | 'bo3' | 'bo5',
          currentVeto.team1_id!,
          currentVeto.team2_id!
        );
        
        // Verify that the current user is from the side picker team (OPPOSITE team)
        const currentUserTeamId = forcedTeamId || userTeamId;
        if (!currentUserTeamId || currentUserTeamId !== sidePickerTeamId) {
          toast({
            title: 'Error',
            description: `Side selection must be performed by ${sidePickerTeamId === currentVeto.team1_id ? team1Name : team2Name}, not ${currentUserTeamId === currentVeto.team1_id ? team1Name : team2Name}.`,
            variant: 'destructive',
          });
          setActionLoading(null);
          return;
        }
        
        // IMPORTANT: Only show dialog if user is from the OPPOSITE team (side picker team)
        // The mapId parameter is ignored for pick_side - we find the map that was just picked
        // Find the last map in the team's picked_maps array that doesn't have a side yet
        // Use centralized helper to get the team that picked the map
        const pickActionType = sequence[pickActionNumber - 1];
        const calculatedPickActionTeamId = getTeamForAction(
          pickActionNumber,
          currentVetoFormatForSide,
          currentVeto.team1_id!,
          currentVeto.team2_id!,
          pickActionType
        );
        
        const team1Picks = Array.isArray(currentVeto.team1_picked_maps) 
          ? currentVeto.team1_picked_maps 
          : (currentVeto.team1_picked_maps ? [currentVeto.team1_picked_maps] : []);
        const team2Picks = Array.isArray(currentVeto.team2_picked_maps) 
          ? currentVeto.team2_picked_maps 
          : (currentVeto.team2_picked_maps ? [currentVeto.team2_picked_maps] : []);
        
        // Try the expected team's picks first
        let teamPicks = calculatedPickActionTeamId === currentVeto.team1_id ? team1Picks : team2Picks;
        
        // Find the last map without a side in the expected team's array
        let mapIndex = -1;
        for (let i = teamPicks.length - 1; i >= 0; i--) {
          const pickedMap = teamPicks[i] as any;
          if (pickedMap && pickedMap.map_id && (pickedMap.side === undefined || pickedMap.side === null)) {
            mapIndex = i;
            break;
          }
        }
        
        // If not found in expected team's array, check the other team's array
        // This handles cases where the map might have been saved to the wrong array (e.g., before a logic fix)
        if (mapIndex === -1) {
          const otherTeamPicks = calculatedPickActionTeamId === currentVeto.team1_id ? team2Picks : team1Picks;
          for (let i = otherTeamPicks.length - 1; i >= 0; i--) {
            const pickedMap = otherTeamPicks[i] as any;
            if (pickedMap && pickedMap.map_id && (pickedMap.side === undefined || pickedMap.side === null)) {
              mapIndex = i;
              teamPicks = otherTeamPicks;
              break;
            }
          }
        }
        
        // If still not found, use the last map from either array
        if (mapIndex === -1) {
          if (team1Picks.length > 0) {
            mapIndex = team1Picks.length - 1;
            teamPicks = team1Picks;
          } else if (team2Picks.length > 0) {
            mapIndex = team2Picks.length - 1;
            teamPicks = team2Picks;
          }
        }
        
        if (!teamPicks || mapIndex < 0 || mapIndex >= teamPicks.length) {
          toast({
            title: 'Error',
            description: 'No map found to assign side to.',
            variant: 'destructive',
          });
          setActionLoading(null);
          return;
        }
        
        const pickedMap = teamPicks[mapIndex];
        if (pickedMap && pickedMap.map_id) {
          // Only show dialog if user is from the correct team (opposite team)
          setPendingMapId(pickedMap.map_id);
          setShowSideDialog(true);
          setActionLoading(null);
          return;
        } else {
          toast({
            title: 'Error',
            description: 'No map found to assign side to.',
            variant: 'destructive',
          });
          setActionLoading(null);
          return;
        }
      } else {
        // Ban action
        await performMapAction(mapId, actionType, null);
      }
    } catch (error: any) {
      // Silently handle actions that were already processed (no error toast)
      if (error.message === 'ACTION_ALREADY_PROCESSED') {
        console.log('[MapVeto] Action already processed - UI will update via real-time');
        // Loading state will be cleared in finally block
        return;
      }
      
      console.error('Error performing map action:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to perform action',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const performMapAction = async (mapId: string, actionType: 'ban' | 'pick' | 'pick_side', side: 'attack' | 'defend' | null) => {
    if (!veto) return;

    // Validate actionType is not null/undefined
    if (!actionType) {
      console.error('[MapVeto] performMapAction called with null/undefined actionType');
      throw new Error('Action type is required');
    }

    try {
      // Fetch the latest veto state to ensure we have the most recent current_action_number
      // This prevents duplicate key errors from race conditions
      const { data: latestVeto, error: fetchError } = await supabase
        .from('match_map_vetos')
        .select('current_action_number, current_action, team1_id, team2_id, team1_banned_maps, team2_banned_maps, team1_picked_maps, team2_picked_maps, best_of')
        .eq('id', veto.id)
        .single();

      if (fetchError) throw fetchError;
      if (!latestVeto) throw new Error('Veto not found');

      // Get the correct sequence and determine the action number
      const currentVetoFormat = getVetoFormat(latestVeto.best_of || 1) as 'bo1' | 'bo3' | 'bo5';
      const currentSequence = VETO_SEQUENCES[currentVetoFormat];
      
      // current_action_number represents the NEXT action to be performed (1-indexed)
      // So if current_action_number is 3, we're about to perform action 3
      const currentActionNum = latestVeto.current_action_number || 1;
      
      // Verify that the current action matches what we expect
      if (latestVeto.current_action !== actionType) {
        console.warn('[MapVeto] Action type mismatch:', {
          expected: actionType,
          actual: latestVeto.current_action,
          actionNumber: currentActionNum
        });
        // Don't throw - the action type might have changed due to real-time update
        // We'll let the database constraint handle it
      }
      
      // Calculate expectedTeamId using centralized helper functions
      // This ensures consistency with the UI display and handles all special cases
      let expectedTeamId: string;
      if (actionType === 'pick_side') {
        // For pick_side, use getSidePickerTeam (handles BO3 special case for action 10)
        const pickActionNumber = currentActionNum - 1; // The pick action is always before pick_side
        expectedTeamId = getSidePickerTeam(
          pickActionNumber,
          currentVetoFormat,
          latestVeto.team1_id!,
          latestVeto.team2_id!
        );
      } else {
        // For other actions, use getTeamForAction (handles BO3 action 5 and BO5 actions 3, 5, 9)
        const actionTypeForCalc = currentSequence[currentActionNum - 1];
        expectedTeamId = getTeamForAction(
          currentActionNum,
          currentVetoFormat,
          latestVeto.team1_id!,
          latestVeto.team2_id!,
          actionTypeForCalc
        );
      }

      // Check if an action with this number already exists (prevent duplicate)
      // This is a race condition check - if another client already performed this action
      const { data: existingAction } = await supabase
        .from('match_map_veto_actions')
        .select('id, action_type, map_id')
        .eq('veto_id', veto.id)
        .eq('action_number', currentActionNum)
        .maybeSingle();

      if (existingAction) {
        console.warn('[MapVeto] Action already exists for this action number:', {
          actionNumber: currentActionNum,
          existingAction: existingAction,
          attemptingAction: actionType,
          attemptingMap: mapId
        });
        
        // Check if it's the exact same action (same type and map) - if so, it's a duplicate click
        // For pick_side, check if it's the same action type and same map (or both have null map_id)
        const isSameAction = existingAction.action_type === actionType && 
          (actionType === 'pick_side' 
            ? (existingAction.map_id === mapId || (existingAction.map_id === null && mapId === null))
            : existingAction.map_id === mapId);
        
        if (isSameAction) {
          console.log('[MapVeto] Duplicate action detected - same type and map. Refetching veto state...');
          
          // For pick_side, silently succeed - real-time will update UI
          if (actionType === 'pick_side') {
            console.log(`[MapVeto] ${actionType} action already exists, checking if veto state needs to advance...`);
            
            // Refetch veto state to get the latest state
            const { data: refreshedVeto } = await supabase
              .from('match_map_vetos')
              .select('*')
              .eq('id', veto.id)
              .single();
            
            if (refreshedVeto) {
              // For pick_side, check if the side was actually saved and advance state if needed
              if (actionType === 'pick_side' && side && mapId) {
                const team1Picks = Array.isArray(refreshedVeto.team1_picked_maps) 
                  ? refreshedVeto.team1_picked_maps 
                  : (refreshedVeto.team1_picked_maps ? [refreshedVeto.team1_picked_maps] : []);
                const team2Picks = Array.isArray(refreshedVeto.team2_picked_maps) 
                  ? refreshedVeto.team2_picked_maps 
                  : (refreshedVeto.team2_picked_maps ? [refreshedVeto.team2_picked_maps] : []);
                
                // Check if the map has the side saved
                const allPicks = [...team1Picks, ...team2Picks];
                const mapWithSide = allPicks.find((p: any) => p.map_id === mapId && p.side === side);
                
                // Get the action from the database to see what side was selected
                const { data: existingActionData } = await supabase
                  .from('match_map_veto_actions')
                  .select('side, map_id')
                  .eq('veto_id', veto.id)
                  .eq('action_number', currentActionNum)
                  .eq('action_type', 'pick_side')
                  .maybeSingle();
                
                const savedSide = existingActionData?.side;
                
                // If the action exists, the side should be saved (either in picked_maps or in the action itself)
                if (mapWithSide || savedSide) {
                  console.log('[MapVeto] Side already saved to map, checking if veto state needs to advance');
                  // The side is saved, check if veto state needs to advance
                  const currentVetoFormat = getVetoFormat(refreshedVeto.best_of || 1);
                  const sequence = VETO_SEQUENCES[currentVetoFormat];
                  const nextActionNumber = currentActionNum + 1;
                  const isComplete = nextActionNumber > sequence.length;
                  
                  // Always advance if the current action is still pick_side or action number hasn't advanced
                  // This ensures the veto state progresses even if the previous update failed
                  if (refreshedVeto.current_action === 'pick_side' || refreshedVeto.current_action_number === currentActionNum) {
                    console.log('[MapVeto] Advancing veto state after duplicate pick_side detection');
                    const nextAction = isComplete ? null : sequence[nextActionNumber - 1];
                    let nextTeamId: string | null = null;
                    
                    if (!isComplete && nextAction) {
                      if (nextAction === 'pick_side') {
                        // Get the side picker for the next pick
                        const nextPickActionNumber = nextActionNumber - 1;
                        nextTeamId = getSidePickerTeam(
                          nextPickActionNumber,
                          currentVetoFormat as 'bo1' | 'bo3' | 'bo5',
                          refreshedVeto.team1_id!,
                          refreshedVeto.team2_id!
                        );
                      } else {
                        nextTeamId = getTeamForAction(
                          nextActionNumber,
                          currentVetoFormat as 'bo1' | 'bo3' | 'bo5',
                          refreshedVeto.team1_id!,
                          refreshedVeto.team2_id!,
                          nextAction
                        );
                      }
                    }
                    
                    // Also ensure the side is saved to picked_maps if it's not already
                    let updateData: any = {
                      current_action_number: nextActionNumber,
                      current_action: nextAction,
                      current_team_id: nextTeamId,
                      status: isComplete ? 'completed' : 'in_progress',
                      completed_at: isComplete ? new Date().toISOString() : null,
                      updated_at: new Date().toISOString(),
                    };
                    
                    // If side is not saved to picked_maps, save it now
                    if (!mapWithSide && savedSide) {
                      // Find which team picked the map and update their picked_maps
                      const pickActionNumber = currentActionNum - 1;
                      const currentVetoFormatForTeam = getVetoFormat(refreshedVeto.best_of || 1);
                      const pickActionType = VETO_SEQUENCES[currentVetoFormatForTeam][pickActionNumber - 1];
                      const pickerTeamId = getTeamForAction(
                        pickActionNumber,
                        currentVetoFormatForTeam as 'bo1' | 'bo3' | 'bo5',
                        refreshedVeto.team1_id!,
                        refreshedVeto.team2_id!,
                        pickActionType
                      );
                      
                      if (pickerTeamId === refreshedVeto.team1_id) {
                        const updatedTeam1Picks = team1Picks.map((p: any) => 
                          p.map_id === mapId ? { ...p, side: savedSide } : p
                        );
                        updateData.team1_picked_maps = updatedTeam1Picks;
                      } else {
                        const updatedTeam2Picks = team2Picks.map((p: any) => 
                          p.map_id === mapId ? { ...p, side: savedSide } : p
                        );
                        updateData.team2_picked_maps = updatedTeam2Picks;
                      }
                    }
                    
                    // Update veto state to advance
                    const { data: advancedVeto } = await supabase
                      .from('match_map_vetos')
                      .update(updateData)
                      .eq('id', veto.id)
                      .select()
                      .single();
                    
                    if (advancedVeto) {
                      setVeto(advancedVeto as MatchMapVeto);
                      console.log('[MapVeto] Veto state advanced after duplicate pick_side');
                    }
                  } else {
                    setVeto(refreshedVeto as MatchMapVeto);
                  }
                } else {
                  // Side not saved yet - this shouldn't happen if action exists, but handle it
                  console.warn('[MapVeto] Action exists but side not saved, updating picked_maps');
                  setVeto(refreshedVeto as MatchMapVeto);
                }
              } else {
                setVeto(refreshedVeto as MatchMapVeto);
              }
            }
            return; // Silently succeed - real-time will handle the UI update
          }
          
          // For other actions, refetch and update state
          const { data: refreshedVeto } = await supabase
            .from('match_map_vetos')
            .select('*')
            .eq('id', veto.id)
            .single();
          
          if (refreshedVeto) {
            // Always update the state first to ensure UI reflects the latest turn
            console.log('[MapVeto] Updating veto state after duplicate action detection:', {
              oldActionNumber: currentActionNum,
              newActionNumber: refreshedVeto.current_action_number,
              oldAction: latestVeto.current_action,
              newAction: refreshedVeto.current_action,
              oldTeam: (latestVeto as any).current_team_id,
              newTeam: refreshedVeto.current_team_id,
              oldExpectedTeam: (currentActionNum % 2 === 1) ? veto.team1_id : veto.team2_id,
              newExpectedTeam: (refreshedVeto.current_action_number % 2 === 1) ? refreshedVeto.team1_id : refreshedVeto.team2_id,
            });
            
            // Force state update using functional update to ensure it's applied
            setVeto((prevVeto) => {
              if (prevVeto && prevVeto.id === refreshedVeto.id) {
                // Only update if the veto ID matches
                return refreshedVeto as MatchMapVeto;
              }
              return prevVeto || (refreshedVeto as MatchMapVeto);
            });
            
            // If action number has advanced, the action was already processed and turn should have rotated
            if (refreshedVeto.current_action_number !== currentActionNum) {
              console.log('[MapVeto] Action number changed from', currentActionNum, 'to', refreshedVeto.current_action_number, '- turn should have rotated to:', 
                (refreshedVeto.current_action_number % 2 === 1) ? 'Team 1' : 'Team 2');
            } else {
              console.log('[MapVeto] Action number is same but action exists - this might indicate a race condition. Waiting for real-time update.');
            }
            
            // Silently return - don't throw error, just let real-time handle the UI update
            // This prevents duplicate insertions and error toasts for legitimate duplicate clicks
            return;
          }
          // If we can't refetch, silently return
          return;
        } else {
          // Different action with same number - state is out of sync
          // This means another client already performed this action number with a different map/type
          // We need to refetch the veto state to get the correct current action number
          console.warn('[MapVeto] Different action with same number - state out of sync. Refetching...');
          const { data: refreshedVeto } = await supabase
            .from('match_map_vetos')
            .select('*')
            .eq('id', veto.id)
            .single();
          
          if (refreshedVeto) {
            setVeto(refreshedVeto as MatchMapVeto);
            const newActionNum = refreshedVeto.current_action_number || 1;
            
            if (newActionNum !== currentActionNum) {
              // Action number has changed - the action was already processed by another client
              console.log('[MapVeto] Action number changed from', currentActionNum, 'to', newActionNum);
              throw new Error('Another action was just performed. The page will update shortly.');
            } else {
              // Same action number but different action - this is a data inconsistency
              // Check if maybe we should use the next action number instead
              // Get all actions to see what the actual last action number is
              const { data: allActions } = await supabase
                .from('match_map_veto_actions')
                .select('action_number')
                .eq('veto_id', veto.id)
                .order('action_number', { ascending: false })
                .limit(1);
              
              if (allActions && allActions.length > 0) {
                const lastActionNumber = allActions[0].action_number;
                console.log('[MapVeto] Last action number in DB:', lastActionNumber, 'Current action number:', currentActionNum);
                
                if (lastActionNumber >= currentActionNum) {
                  // The action number should have advanced - there's a mismatch
                  // Calculate what the next action number should be
                  const expectedNextActionNum = lastActionNumber + 1;
                  console.warn('[MapVeto] Action number mismatch detected. Expected:', expectedNextActionNum, 'Got:', currentActionNum);
                  
                  // Update the veto state to use the correct action number
                  const { error: updateError } = await supabase
                    .from('match_map_vetos')
                    .update({ 
                      current_action_number: expectedNextActionNum,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', veto.id);
                  
                  if (!updateError) {
                    // Refetch to get the updated state
                    const { data: correctedVeto } = await supabase
                      .from('match_map_vetos')
                      .select('*')
                      .eq('id', veto.id)
                      .single();
                    
                    if (correctedVeto) {
                      setVeto(correctedVeto as MatchMapVeto);
                      console.log('[MapVeto] Corrected action number, retrying with new number:', expectedNextActionNum);
                      // Retry the action with the corrected action number
                      // But first, check if the action we're trying to do is still valid
                      const correctedActionNum = correctedVeto.current_action_number || expectedNextActionNum;
                      if (correctedActionNum === expectedNextActionNum) {
                        // The action number was corrected, but we need to recalculate everything
                        // Throw an error to let the user retry, but the UI should now be updated
                        throw new Error('State was corrected. Please try your action again.');
                      }
                    }
                  }
                }
              }
              
              // If we get here, the inconsistency couldn't be auto-corrected
              console.error('[MapVeto] Data inconsistency detected - same action number but different actions');
              throw new Error('State is out of sync. Please refresh the page.');
            }
          } else {
            throw new Error('Failed to refresh veto state. Please try again.');
          }
        }
      }

      const { error: actionError } = await supabase.from('match_map_veto_actions').insert({
        veto_id: veto.id,
        match_id: matchId,
        team_id: expectedTeamId,
        action_type: actionType, // This is now guaranteed to be non-null
        map_id: mapId,
        action_number: currentActionNum,
        side: side || null,
      });

      if (actionError) {
        // Handle duplicate key error specifically
        if (actionError.code === '23505') {
          // For pick_side, silently succeed - real-time will update UI
          if (actionType === 'pick_side') {
            console.log(`[MapVeto] ${actionType} action already exists, UI will update via real-time`);
            // Refetch veto to get latest state
            const { data: latestVeto } = await supabase
              .from('match_map_vetos')
              .select('*')
              .eq('id', veto.id)
              .single();
            if (latestVeto) {
              setVeto(latestVeto as MatchMapVeto);
            }
            return; // Silently succeed
          }
          throw new Error('This action has already been performed. Please refresh the page.');
        }
        throw actionError;
      }

      // Get the correct sequence based on best_of (use the one we already calculated)
      const nextActionNumber = currentActionNum + 1;
      const isComplete = nextActionNumber > currentSequence.length;

      let updateData: any = {
        current_action_number: nextActionNumber,
        turn_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (actionType === 'ban') {
        if (expectedTeamId === veto.team1_id) {
          updateData.team1_banned_maps = [...(latestVeto.team1_banned_maps || []), mapId];
        } else {
          updateData.team2_banned_maps = [...(latestVeto.team2_banned_maps || []), mapId];
        }
      } else if (actionType === 'pick') {
        // Pick a map (without side - side comes in next action)
        const pickedMap: PickedMap = { map_id: mapId, side: undefined };
        if (expectedTeamId === veto.team1_id) {
          const team1Picked = Array.isArray(latestVeto.team1_picked_maps) ? latestVeto.team1_picked_maps : (latestVeto.team1_picked_maps ? [latestVeto.team1_picked_maps] : []);
          updateData.team1_picked_maps = [...team1Picked, pickedMap];
        } else {
          const team2Picked = Array.isArray(latestVeto.team2_picked_maps) ? latestVeto.team2_picked_maps : (latestVeto.team2_picked_maps ? [latestVeto.team2_picked_maps] : []);
          updateData.team2_picked_maps = [...team2Picked, pickedMap];
        }
      } else if (actionType === 'pick_side') {
        // The map was picked in the previous action
        const pickActionNumber = currentActionNum - 1;
        
        // Use centralized helper to get the side picker team (opposite team from map picker)
        const sidePickerTeamId = getSidePickerTeam(
          pickActionNumber,
          currentVetoFormat,
          veto.team1_id!,
          veto.team2_id!
        );
        
        // Calculate pickActionTeamId for validation/logging (using centralized helper)
        const actionTypeForTeamCalc = 'pick';
        const pickActionTeamId = getTeamForAction(
          pickActionNumber,
          currentVetoFormat,
          veto.team1_id!,
          veto.team2_id!,
          actionTypeForTeamCalc
        );
        
        // Verify that expectedTeamId matches the calculated side picker team
        // This is a double-check to ensure the logic is correct
        if (expectedTeamId !== sidePickerTeamId) {
          console.error('[MapVeto] Team mismatch for side selection:', {
            expectedTeamId,
            sidePickerTeamId,
            pickActionTeamId,
            pickActionNumber,
            currentActionNum,
            actionType
          });
          throw new Error('Side selection must be performed by the correct team according to veto rules.');
        }
        
        // Check if this is the final pick_side for auto-assigned last map (BO3 action 9, BO5 action 11)
        const isFinalPickSide = 
          (currentVetoFormat === 'bo3' && currentActionNum === 9) ||
          (currentVetoFormat === 'bo5' && currentActionNum === 11);
        
        // Find the map that was picked by the pickActionTeamId
        // Use centralized helper to get the team that picked the map
        const pickActionType = currentSequence[pickActionNumber - 1];
        if (pickActionType !== 'pick' && !isFinalPickSide) {
          throw new Error(`Expected pick action before side selection, but found: ${pickActionType}`);
        }
        
        // Need to handle JSON arrays from database
        const team1Picks = Array.isArray(latestVeto.team1_picked_maps) 
          ? latestVeto.team1_picked_maps 
          : (latestVeto.team1_picked_maps ? [latestVeto.team1_picked_maps] : []);
        const team2Picks = Array.isArray(latestVeto.team2_picked_maps) 
          ? latestVeto.team2_picked_maps 
          : (latestVeto.team2_picked_maps ? [latestVeto.team2_picked_maps] : []);
        
        let pickerTeamPicks: any[];
        let isTeam1: boolean;
        let calculatedPickActionTeamId: string;
        
        if (isFinalPickSide) {
          // For final pick_side, the map is auto-assigned to the side picker's team
          // BO3: Map 3 assigned to Team 1, Team 1 picks side
          // BO5: Map 5 assigned to Team 1, Team 1 picks side (higher seed advantage)
          // So we look in the side picker's team array
          calculatedPickActionTeamId = sidePickerTeamId; // For final pick_side, the side picker is also the map owner
          pickerTeamPicks = sidePickerTeamId === latestVeto.team1_id ? team1Picks : team2Picks;
          isTeam1 = sidePickerTeamId === latestVeto.team1_id;
        } else {
          // Regular pick_side - find the map that was picked in the previous action
          calculatedPickActionTeamId = getTeamForAction(
            pickActionNumber,
            currentVetoFormat,
            latestVeto.team1_id!,
            latestVeto.team2_id!,
            pickActionType
          );
          
          // Find the map that was just picked
          // Try the expected team's picks first
          pickerTeamPicks = calculatedPickActionTeamId === latestVeto.team1_id ? team1Picks : team2Picks;
          isTeam1 = calculatedPickActionTeamId === latestVeto.team1_id;
        }
        
        // Find the map that was just picked - it's the last map in the team's picked_maps array
        // that doesn't have a side yet (side is undefined)
        let mapIndex = -1;
        for (let i = pickerTeamPicks.length - 1; i >= 0; i--) {
          const pickedMap = pickerTeamPicks[i] as any;
          if (pickedMap && pickedMap.map_id && (pickedMap.side === undefined || pickedMap.side === null)) {
            mapIndex = i;
            break;
          }
        }
        
        // If not found in expected team's array, check the other team's array
        // This handles cases where the map might have been saved to the wrong array (e.g., before a logic fix)
        if (mapIndex === -1) {
          const otherTeamPicks = isTeam1 ? team2Picks : team1Picks;
          for (let i = otherTeamPicks.length - 1; i >= 0; i--) {
            const pickedMap = otherTeamPicks[i] as any;
            if (pickedMap && pickedMap.map_id && (pickedMap.side === undefined || pickedMap.side === null)) {
              mapIndex = i;
              pickerTeamPicks = otherTeamPicks;
              isTeam1 = !isTeam1;
              break;
            }
          }
        }
        
        // If still not found, use the last map from either array
        if (mapIndex === -1) {
          if (team1Picks.length > 0) {
            mapIndex = team1Picks.length - 1;
            pickerTeamPicks = team1Picks;
            isTeam1 = true;
          } else if (team2Picks.length > 0) {
            mapIndex = team2Picks.length - 1;
            pickerTeamPicks = team2Picks;
            isTeam1 = false;
          }
        }
        
        console.log('[MapVeto] Side selection map lookup:', {
          pickActionNumber,
          pickActionTeamId,
          calculatedPickActionTeamId,
          pickerTeamPicksLength: pickerTeamPicks.length,
          mapIndex,
          team1PicksLength: team1Picks.length,
          team2PicksLength: team2Picks.length,
          currentVetoFormat,
          foundInTeam: isTeam1 ? 'Team 1' : 'Team 2',
          pickerTeamPicks: pickerTeamPicks.map((p: any) => ({ map_id: p?.map_id, side: p?.side })),
        });
        
        if (mapIndex < 0 || mapIndex >= pickerTeamPicks.length) {
          console.error('[MapVeto] Side selection map lookup failed:', {
            pickActionNumber,
            pickActionTeamId,
            calculatedPickActionTeamId,
            mapIndex,
            teamPicksLength: pickerTeamPicks.length,
            team1PicksLength: team1Picks.length,
            team2PicksLength: team2Picks.length,
            currentVetoFormat,
            sequence: currentSequence.slice(0, pickActionNumber),
            pickerTeamPicks: pickerTeamPicks.map((p: any) => ({ map_id: p?.map_id, side: p?.side })),
          });
          throw new Error(`No map found to assign side to. Map index: ${mapIndex}, Team picks length: ${pickerTeamPicks.length}`);
        }
        
        const pickedMap = pickerTeamPicks[mapIndex] as any;
        
        if (!pickedMap || !pickedMap.map_id) {
          console.error('[MapVeto] Invalid picked map:', { pickedMap, mapIndex, pickerTeamPicks });
          throw new Error('Invalid map data found.');
        }
        
        if (pickedMap && side) {
          const updatedPickedMap: PickedMap = { map_id: pickedMap.map_id, side };
          // Update the correct team's array based on where we found the map
          if (isTeam1) {
            const updatedTeam1Picks = Array.isArray(latestVeto.team1_picked_maps) ? [...latestVeto.team1_picked_maps] : (latestVeto.team1_picked_maps ? [latestVeto.team1_picked_maps] : []);
            updatedTeam1Picks[mapIndex] = updatedPickedMap as any;
            updateData.team1_picked_maps = updatedTeam1Picks as any;
          } else {
            const updatedTeam2Picks = Array.isArray(latestVeto.team2_picked_maps) ? [...latestVeto.team2_picked_maps] : (latestVeto.team2_picked_maps ? [latestVeto.team2_picked_maps] : []);
            updatedTeam2Picks[mapIndex] = updatedPickedMap as any;
            updateData.team2_picked_maps = updatedTeam2Picks as any;
          }
        } else {
          throw new Error('No map found to assign side to or side not provided');
        }
      }

      if (!isComplete) {
        const nextAction = currentSequence[nextActionNumber - 1];
        let nextTeamId: string;
        
        {
          // Use centralized helper functions to calculate next team
          if (nextAction === 'pick_side') {
            // Check if this is the final pick_side for auto-assigned last map (BO3 action 9, BO5 action 11)
            const isFinalPickSide = 
              (currentVetoFormat === 'bo3' && nextActionNumber === 9) ||
              (currentVetoFormat === 'bo5' && nextActionNumber === 11);
            
            if (isFinalPickSide) {
              // For the final pick_side, automatically assign the last remaining map
              // Get all available maps
              const allBannedMaps = [
                ...(updateData.team1_banned_maps || latestVeto.team1_banned_maps || []),
                ...(updateData.team2_banned_maps || latestVeto.team2_banned_maps || [])
              ];
              
              const allPickedMaps = [
                ...(updateData.team1_picked_maps || latestVeto.team1_picked_maps || []),
                ...(updateData.team2_picked_maps || latestVeto.team2_picked_maps || [])
              ];
              
              const allUsedMaps = [
                ...allBannedMaps,
                ...(allPickedMaps.map((p: any) => p?.map_id || p).filter(Boolean))
              ];
              
              // Find the last remaining map
              const remainingMaps = availableMaps
                .filter(m => !allUsedMaps.includes(m.id))
                .map(m => m.id);
              
              if (remainingMaps.length === 1) {
                const lastMapId = remainingMaps[0];
                // Get the team that should pick the side
                // BO3: Team 1 picks side (higher seed)
                // BO5: Team 1 picks side (higher seed advantage)
                nextTeamId = getSidePickerTeam(
                  currentActionNum, // Use current action number as reference
                  currentVetoFormat as 'bo1' | 'bo3' | 'bo5',
                  veto.team1_id!,
                  veto.team2_id!
                );
                
                // Auto-assign the last map to the side picker's team
                // BO3: Map 3 assigned to Team 1, Team 1 picks side
                // BO5: Map 5 assigned to Team 1, Team 1 picks side (higher seed advantage)
                const lastMap: PickedMap = { map_id: lastMapId, side: undefined };
                if (nextTeamId === veto.team1_id) {
                  const team1Picked = Array.isArray(updateData.team1_picked_maps || latestVeto.team1_picked_maps) 
                    ? (updateData.team1_picked_maps || latestVeto.team1_picked_maps) 
                    : (updateData.team1_picked_maps || latestVeto.team1_picked_maps ? [updateData.team1_picked_maps || latestVeto.team1_picked_maps] : []);
                  updateData.team1_picked_maps = [...team1Picked, lastMap] as any;
                } else {
                  const team2Picked = Array.isArray(updateData.team2_picked_maps || latestVeto.team2_picked_maps) 
                    ? (updateData.team2_picked_maps || latestVeto.team2_picked_maps) 
                    : (updateData.team2_picked_maps || latestVeto.team2_picked_maps ? [updateData.team2_picked_maps || latestVeto.team2_picked_maps] : []);
                  updateData.team2_picked_maps = [...team2Picked, lastMap] as any;
                }
                
                console.log('[performMapAction] Auto-assigned last map:', {
                  lastMapId,
                  nextTeamId,
                  isTeam1: nextTeamId === veto.team1_id,
                  currentVetoFormat,
                  nextActionNumber
                });
              } else {
                console.error('[performMapAction] Expected exactly 1 remaining map, but found:', remainingMaps.length);
              }
            } else {
              // Regular pick_side - the pick action is the one we just completed (currentActionNum)
              // Side is picked by the OPPOSITE team from the one that picked the map
              console.log('[performMapAction] Calculating side picker after pick action:', {
                currentActionNum,
                vetoFormat,
                team1Id: veto.team1_id,
                team2Id: veto.team2_id,
                actionType: actionType
              });
              nextTeamId = getSidePickerTeam(
                currentActionNum,
                vetoFormat as 'bo1' | 'bo3' | 'bo5',
                veto.team1_id!,
                veto.team2_id!
              );
              console.log('[performMapAction] Side picker calculated:', {
                nextTeamId,
                isTeam1: nextTeamId === veto.team1_id,
                isTeam2: nextTeamId === veto.team2_id
              });
            }
          } else {
            // Use centralized helper to get the team for the next action
            nextTeamId = getTeamForAction(
              nextActionNumber,
              vetoFormat as 'bo1' | 'bo3' | 'bo5',
              veto.team1_id!,
              veto.team2_id!,
              nextAction
            );
          }
          updateData.current_action = nextAction;
          updateData.current_team_id = nextTeamId;
        }
        
        updateData.veto_format = currentVetoFormat; // Update format to match BO
      } else {
        // Veto is complete - set selected_map_id to the last picked map
        const allPickedMaps = [
          ...(updateData.team1_picked_maps || veto.team1_picked_maps || []),
          ...(updateData.team2_picked_maps || veto.team2_picked_maps || []),
        ];
        if (allPickedMaps.length > 0) {
          const lastPickedMap = allPickedMaps[allPickedMaps.length - 1];
          updateData.selected_map_id = lastPickedMap.map_id;
        }
        
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
        updateData.current_team_id = null;
        updateData.current_action = null;
      }

      const { data: updatedVeto, error: updateError } = await supabase
        .from('match_map_vetos')
        .update(updateData)
        .eq('id', veto.id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (updatedVeto) {
        setVeto(updatedVeto as MatchMapVeto);
      }

      toast({
        title: 'Success',
        description: `Map ${actionType === 'ban' ? 'banned' : 'picked'} successfully${side ? ` (${side})` : ''}`,
      });

      if (isComplete && onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error('Error performing map action:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to perform action',
        variant: 'destructive',
      });
      throw error;
      }
  };

  // Auto-pick removed - teams now manually pick all maps

  const handleResetVeto = async () => {
    const effectiveIsOrganizer = isOrganizer || currentRole === 'organizer';
    if (!veto || !effectiveIsOrganizer) return;

    if (!confirm('Are you sure you want to reset the map veto? This will clear all picks and bans, and you will need to select the Best Of format again.')) {
      return;
    }

    setResetting(true);
    try {
      const { error } = await supabase.rpc('reset_match_veto', {
        p_match_id: matchId,
      });

      if (error) throw error;

      toast({
        title: 'Veto Reset',
        description: 'The veto process has been reset. Please select the Best Of format.',
      });

      // Refetch veto data to get updated state (real-time subscription will also update)
      await fetchVetoData();
      
      // Show BO selection dialog after reset
      setShowBODialog(true);
      setSelectedBO(null);
    } catch (error: any) {
      console.error('Error resetting veto:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset veto',
        variant: 'destructive',
      });
    } finally {
      setResetting(false);
    }
  };

  const handleSetBO = async (bo: number) => {
    const effectiveIsOrganizer = isOrganizer || currentRole === 'organizer';
    if (!veto || !effectiveIsOrganizer) return;

    // Validate map pool is selected
    if (selectedMapPool.length === 0) {
      toast({
        title: 'Map Pool Required',
        description: 'Please select at least one map for the veto pool.',
        variant: 'destructive',
      });
      return;
    }

    setSelectedBO(bo);
    
    try {
      // Update veto with best_of, selected_map_pool, and start it
      const vetoFormat = getVetoFormat(bo);
      const firstAction = VETO_SEQUENCES[vetoFormat][0];
      
      const { error: updateError } = await supabase
        .from('match_map_vetos')
        .update({
          best_of: bo,
          veto_format: vetoFormat,
          selected_map_pool: selectedMapPool, // Save selected map pool
          status: 'in_progress',
          started_at: new Date().toISOString(),
          turn_started_at: new Date().toISOString(),
          current_action: firstAction,
          current_action_number: 1,
          current_team_id: veto.team1_id, // Start with team1
        })
        .eq('id', veto.id);

      if (updateError) throw updateError;

      // Update availableMaps to only show selected pool
      const { data: gameMaps } = await supabase
        .from('game_maps')
        .select('*')
        .in('id', selectedMapPool)
        .eq('is_active', true)
        .order('map_name');

      if (gameMaps) {
        setAvailableMaps(gameMaps as GameMap[]);
      }

      const { data: updatedVeto } = await supabase
        .from('match_map_vetos')
        .select('*')
        .eq('id', veto.id)
        .single();

      if (updatedVeto) {
        setVeto(updatedVeto as MatchMapVeto);
        setShowBODialog(false);
        setDialogStep('map_pool'); // Reset dialog step for next time
        // Show toast immediately
        toast({
          title: `BO${bo} Selected`,
          description: `Map veto process started for Best of ${bo} with ${selectedMapPool.length} maps. You can now perform actions.`,
        });
      }
    } catch (error: any) {
      console.error('Error setting BO:', error);
      setSelectedBO(null);
      toast({
        title: 'Error',
        description: error.message || 'Failed to set BO format',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-700 border-t-blue-600"></div>
      </div>
    );
  }

  if (!veto) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No veto process found for this match.</p>
      </div>
    );
  }

  const allBannedMaps = [...(veto.team1_banned_maps || []), ...(veto.team2_banned_maps || [])];
  const availableMapsToShow = availableMaps.filter((m) => !allBannedMaps.includes(m.id));
  
  const allPickedMaps = [
    ...(veto.team1_picked_maps || []).map((p: PickedMap) => ({ ...p, team: 'team1', teamName: team1Name })),
    ...(veto.team2_picked_maps || []).map((p: PickedMap) => ({ ...p, team: 'team2', teamName: team2Name })),
  ];
  
  const getMapStatus = (mapId: string) => {
    const isBanned = allBannedMaps.includes(mapId);
    const isTeam1Ban = veto.team1_banned_maps?.includes(mapId);
    const isTeam2Ban = veto.team2_banned_maps?.includes(mapId);
    const pickedMap = allPickedMaps.find((p: any) => p.map_id === mapId);
    const isPicked = !!pickedMap || veto.selected_map_id === mapId;
    
    // Find which action picked this map and get the side picker team
    let sidePickerTeamId: string | null = null;
    let sidePickerTeamName: string | null = null;
    
    if (pickedMap) {
      // Find the pick action number for this map
      const sequence = VETO_SEQUENCES[vetoFormat];
      for (let actionIdx = 0; actionIdx < sequence.length; actionIdx++) {
        const action = sequence[actionIdx];
        const actionNumber = actionIdx + 1;
        
        if (action === 'pick') {
          // Check if this action picked the current map
          const mapPickerTeamId = getTeamForAction(
            actionNumber,
            vetoFormat as 'bo1' | 'bo3' | 'bo5',
            veto.team1_id!,
            veto.team2_id!,
            action
          );
          
          const team1Picks = Array.isArray(veto.team1_picked_maps) ? veto.team1_picked_maps : (veto.team1_picked_maps ? [veto.team1_picked_maps] : []);
          const team2Picks = Array.isArray(veto.team2_picked_maps) ? veto.team2_picked_maps : (veto.team2_picked_maps ? [veto.team2_picked_maps] : []);
          const pickerTeamPicks = mapPickerTeamId === veto.team1_id ? team1Picks : team2Picks;
          
          // Count picks up to this action
          let pickCount = 0;
          for (let i = 0; i < actionIdx; i++) {
            if (sequence[i] === 'pick' || sequence[i] === 'auto_pick') {
              pickCount++;
            }
          }
          
          if (pickerTeamPicks[pickCount]?.map_id === mapId) {
            // Found the action that picked this map - get the side picker
            sidePickerTeamId = getSidePickerTeam(
              actionNumber,
              vetoFormat as 'bo1' | 'bo3' | 'bo5',
              veto.team1_id!,
              veto.team2_id!
            );
            sidePickerTeamName = sidePickerTeamId === veto.team1_id ? team1Name : team2Name;
            break;
          }
        }
      }
    }
    
    return { 
      isBanned, 
      isTeam1Ban, 
      isTeam2Ban, 
      isPicked,
      pickedBy: pickedMap?.teamName, // Map picker (for reference, but not displayed)
      pickedSide: pickedMap?.side,
      sidePickerTeamId,
      sidePickerTeamName,
    };
  };

  // Use effective organizer status (check both state and context) - declare early
  const effectiveIsOrganizer = isOrganizer || currentRole === 'organizer';
  
  // Get the correct sequence based on best_of (use 1 as fallback only for display, not for logic)
  const currentBestOf = veto.best_of ?? bestOf ?? 1;
  const vetoFormat = getVetoFormat(currentBestOf);
  const sequence = VETO_SEQUENCES[vetoFormat];
  
  // Calculate expected team based on current action number (1-based)
  // For pick_side actions, the team is the OPPOSITE of the one that picked the map
  // For BO3, there's a special case: after Team A picks map 1 and Team B picks side,
  // Team B picks map 2 (not Team A). This breaks the simple odd/even pattern.
  const currentActionNum = veto.current_action_number || 1;
  
  // Calculate expectedTeamId using centralized helper functions
  let expectedTeamId: string;
  if (veto.current_action === 'pick_side') {
    // The pick action is always the one before pick_side
    const pickActionNumber = currentActionNum - 1;
    // Use centralized helper to get the side picker team (opposite of map picker)
    expectedTeamId = getSidePickerTeam(
      pickActionNumber,
      vetoFormat as 'bo1' | 'bo3' | 'bo5',
      veto.team1_id!,
      veto.team2_id!
    );
  } else {
    // Use centralized helper to get the team for this action
    const actionType = sequence[currentActionNum - 1];
    // For pick_side actions, use getSidePickerTeam (opposite team from map picker)
    // For other actions, use getTeamForAction
    if (actionType === 'pick_side') {
      const pickActionNumber = currentActionNum - 1; // The pick action is always before pick_side
      expectedTeamId = getSidePickerTeam(
        pickActionNumber,
        vetoFormat as 'bo1' | 'bo3' | 'bo5',
        veto.team1_id!,
        veto.team2_id!
      );
    } else {
      expectedTeamId = getTeamForAction(
        currentActionNum,
        vetoFormat as 'bo1' | 'bo3' | 'bo5',
        veto.team1_id!,
        veto.team2_id!,
        actionType
      );
    }
  }
  const currentTeamName = expectedTeamId === veto.team1_id ? team1Name : team2Name;
  const isUserTurn = !effectiveIsOrganizer && isCaptain && expectedTeamId === userTeamId;
  
  // Debug logging
  console.log('[MapVeto] Render state:', {
    vetoStatus: veto.status,
    bestOf: currentBestOf,
    vetoFormat,
    sequenceLength: sequence.length,
    isOrganizer,
    currentRole,
    effectiveIsOrganizer,
    isCaptain,
    userTeamId,
    vetoTeam1Id: veto.team1_id,
    vetoTeam2Id: veto.team2_id,
    expectedTeamId,
    isUserTurn,
    team1LinkToken: veto.team1_link_token ? 'exists' : 'missing',
    team2LinkToken: veto.team2_link_token ? 'exists' : 'missing',
    currentActionNumber: veto.current_action_number,
    currentAction: veto.current_action,
  });

  const boText = currentBestOf === 1 ? 'BO1' : currentBestOf === 3 ? 'BO3' : currentBestOf === 5 ? 'BO5' : `BO${currentBestOf}`;
  
  const handleRoleSwitch = async () => {
    const success = await switchRole('casual', 'Switching to player role to participate in map veto');
    if (success) {
      setShowRoleSwitchPrompt(false);
      // Refresh permissions after role switch without full page reload
      // Re-check user permissions
      if (user && (team1Id || team2Id)) {
        const teamIds = [team1Id, team2Id].filter(Boolean) as string[];
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('team_id, role')
          .in('team_id', teamIds)
          .eq('user_id', user.id)
          .eq('role', 'captain')
          .eq('is_active', true);
        
        const captainTeamIds = new Set((teamMembers || []).map((tm: any) => tm.team_id));
        const isTeam1Captain = team1Id ? captainTeamIds.has(team1Id) : false;
        const isTeam2Captain = team2Id ? captainTeamIds.has(team2Id) : false;
        
        setIsOrganizer(false); // No longer organizer after role switch
        if (isTeam1Captain) {
          setIsCaptain(true);
          setUserTeamId(team1Id!);
        } else if (isTeam2Captain) {
          setIsCaptain(true);
          setUserTeamId(team2Id!);
        } else {
          setIsCaptain(false);
          setUserTeamId(null);
        }
      }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-6 lg:py-8">
      {/* Minimalistic Header */}
      <div className="mb-6 sm:mb-8 lg:mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-5">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tighter">MAP VETO</h1>
          <Badge className="bg-white/10 text-white px-3 py-1 text-xs font-bold border border-white/20 rounded-full">{boText}</Badge>
          {veto.status === 'in_progress' && (
            <Badge className="bg-green-500/20 text-green-400 px-3 py-1 text-xs font-bold border border-green-500/30 rounded-full animate-pulse">
              ● LIVE
            </Badge>
          )}
        </div>
        
        {/* Reset Button - Minimalistic */}
        {(() => {
          const shouldShow = effectiveIsOrganizer && veto && veto.id;
          return shouldShow ? (
            <Button
              onClick={handleResetVeto}
              disabled={resetting}
              variant="outline"
              size="sm"
              className="gap-2 px-4 py-2 text-sm font-semibold border-white/20 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/30 transition-all"
            >
              <RotateCcw className={cn("h-4 w-4", resetting && "animate-spin")} />
              {resetting ? 'Resetting...' : 'Reset'}
            </Button>
          ) : null;
        })()}
      </div>

      {/* Teams Display - Minimalistic */}
      <div className="mb-4 sm:mb-6 lg:mb-10 flex items-center justify-center gap-3 sm:gap-6 lg:gap-12 px-2 sm:px-4 lg:px-8 py-3 sm:py-4 lg:py-6">
        <div className="flex flex-col items-center gap-1.5 sm:gap-2 lg:gap-3 flex-1 max-w-[100px] sm:max-w-[140px] lg:max-w-none">
          {team1Logo ? (
            <img 
              src={team1Logo} 
              alt={team1Name}
              className="max-w-12 max-h-12 sm:max-w-16 sm:max-h-16 md:max-w-20 md:max-h-20 lg:max-w-24 lg:max-h-24 w-auto h-auto object-contain"
            />
          ) : (
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 flex items-center justify-center bg-white/5 rounded-lg">
              <span className="text-white font-bold text-sm sm:text-base md:text-lg lg:text-xl">{team1Name.charAt(0)}</span>
            </div>
          )}
          <span className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-bold text-white text-center truncate w-full px-1">{team1Name}</span>
        </div>
        <div className="text-white/30 font-light text-base sm:text-lg md:text-xl lg:text-2xl px-1 sm:px-2">VS</div>
        <div className="flex flex-col items-center gap-1.5 sm:gap-2 lg:gap-3 flex-1 max-w-[100px] sm:max-w-[140px] lg:max-w-none">
          {team2Logo ? (
            <img 
              src={team2Logo} 
              alt={team2Name}
              className="max-w-12 max-h-12 sm:max-w-16 sm:max-h-16 md:max-w-20 md:max-h-20 lg:max-w-24 lg:max-h-24 w-auto h-auto object-contain"
            />
          ) : (
            <div className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 flex items-center justify-center bg-white/5 rounded-lg">
              <span className="text-white font-bold text-sm sm:text-base md:text-lg lg:text-xl">{team2Name.charAt(0)}</span>
            </div>
          )}
          <span className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-bold text-white text-center truncate w-full px-1">{team2Name}</span>
        </div>
      </div>

        {/* Selected Maps Section */}
        {((veto.status === 'completed') || (veto.status === 'in_progress' && allPickedMaps.length > 0)) && (
          <div className="mb-10">
            {/* Section Title */}
            <div className="text-sm sm:text-base font-bold text-white uppercase tracking-widest mb-6">
              SELECTED MAPS
            </div>
            
            {/* Maps Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 xl:gap-6">
              {(() => {
                // Build array of all picked maps with their side pickers
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
                
                const sequence = VETO_SEQUENCES[vetoFormat];
                const team1Picks = Array.isArray(veto.team1_picked_maps) ? veto.team1_picked_maps : (veto.team1_picked_maps ? [veto.team1_picked_maps] : []);
                const team2Picks = Array.isArray(veto.team2_picked_maps) ? veto.team2_picked_maps : (veto.team2_picked_maps ? [veto.team2_picked_maps] : []);
                
                // Collect all pick actions from the sequence with their action numbers
                const pickActions: Array<{ actionNumber: number; action: string; teamId: string }> = [];
                for (let actionIdx = 0; actionIdx < sequence.length; actionIdx++) {
                  const action = sequence[actionIdx];
                  const actionNumber = actionIdx + 1;
                  
                  if (action === 'pick') {
                    const mapPickerTeamId = getTeamForAction(
                      actionNumber,
                      vetoFormat as 'bo1' | 'bo3' | 'bo5',
                      veto.team1_id!,
                      veto.team2_id!,
                      action
                    );
                    pickActions.push({ actionNumber, action, teamId: mapPickerTeamId });
                  }
                }
                
                // Match picks to their action numbers in sequence order
                let mapNumber = 1;
                const usedMapIds = new Set<string>();
                
                for (const pickAction of pickActions) {
                  const pickerTeamPicks = pickAction.teamId === veto.team1_id ? team1Picks : team2Picks;
                  
                  for (const pickedMapData of pickerTeamPicks) {
                    const mapId = (pickedMapData as any)?.map_id;
                    if (mapId && !usedMapIds.has(mapId)) {
                      usedMapIds.add(mapId);
                      
                      const sidePickerTeamId = getSidePickerTeam(
                        pickAction.actionNumber,
                        vetoFormat as 'bo1' | 'bo3' | 'bo5',
                        veto.team1_id!,
                        veto.team2_id!
                      );
                      
                      const map = availableMaps.find(m => m.id === mapId);
                      if (map) {
                        mapsWithSides.push({
                          map_id: mapId,
                          map_name: map.map_name,
                          map_image_url: map.map_image_url,
                          side: (pickedMapData as any).side,
                          sidePickerTeamId,
                          sidePickerTeamName: sidePickerTeamId === veto.team1_id ? team1Name : team2Name,
                          mapPickerTeamId: pickAction.teamId,
                          mapPickerTeamName: pickAction.teamId === veto.team1_id ? team1Name : team2Name,
                          mapNumber: mapNumber++,
                          pickActionNumber: pickAction.actionNumber
                        });
                      }
                      break;
                    }
                  }
                }
                
                // For BO3 and BO5, add the final auto-assigned map if it exists
                if ((vetoFormat === 'bo3' || vetoFormat === 'bo5') && (veto.status === 'completed' || veto.status === 'in_progress')) {
                  const finalPickSideActionNumber = vetoFormat === 'bo3' ? 9 : 11;
                  const currentActionNum = veto.current_action_number || 0;
                  
                  if (currentActionNum >= finalPickSideActionNumber || veto.status === 'completed') {
                    const finalSidePickerTeamId = getSidePickerTeam(
                      finalPickSideActionNumber - 1,
                      vetoFormat as 'bo1' | 'bo3' | 'bo5',
                      veto.team1_id!,
                      veto.team2_id!
                    );
                    
                    const finalSidePickerPicks = finalSidePickerTeamId === veto.team1_id ? team1Picks : team2Picks;
                    
                    for (let i = finalSidePickerPicks.length - 1; i >= 0; i--) {
                      const pickedMapData = finalSidePickerPicks[i] as any;
                      const mapId = pickedMapData?.map_id;
                      
                      if (mapId && !usedMapIds.has(mapId)) {
                        usedMapIds.add(mapId);
                        
                        const map = availableMaps.find(m => m.id === mapId);
                        if (map) {
                          mapsWithSides.push({
                            map_id: mapId,
                            map_name: map.map_name,
                            map_image_url: map.map_image_url,
                            side: pickedMapData.side,
                            sidePickerTeamId: finalSidePickerTeamId,
                            sidePickerTeamName: finalSidePickerTeamId === veto.team1_id ? team1Name : team2Name,
                            mapPickerTeamId: finalSidePickerTeamId,
                            mapPickerTeamName: finalSidePickerTeamId === veto.team1_id ? team1Name : team2Name,
                            mapNumber: mapNumber++,
                            pickActionNumber: finalPickSideActionNumber
                          });
                        }
                        break;
                      }
                    }
                  }
                }
                
                return mapsWithSides.map((mapData, idx) => {
                  const mapImageUrl = mapData.map_image_url || `https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=300&fit=crop&q=80`;
                  
                  return (
                    <div
                      key={idx}
                      className="group relative bg-black border border-green-500 rounded-lg overflow-hidden shadow-xl transition-all duration-300 hover:border-green-400"
                    >
                      {/* Map Image Background - Compact Container */}
                      <div 
                        className="relative w-full h-[160px] sm:h-[180px] md:h-[200px] lg:h-[220px]"
                        style={{
                          backgroundImage: `url(${mapImageUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat'
                        }}
                      >
                        {/* Gradient Overlay - Smooth gradient for text contrast */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 via-black/40 to-transparent" />
                        
                        {/* Top Badges Row */}
                        <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 flex items-center justify-between z-20 gap-2">
                          {/* Map Number Badge - Green Rectangular */}
                          <div className="px-2 py-1 sm:px-3 sm:py-1.5 bg-green-500 rounded-md shadow-lg">
                            <span className="text-[10px] sm:text-xs font-black text-white tracking-tight">MAP {mapData.mapNumber}</span>
                          </div>
                          
                          {/* Attack/Defend Badge - Icon Only */}
                          {mapData.side && (
                            <div className={cn(
                              "p-1.5 sm:p-2 rounded-md flex items-center justify-center shadow-lg",
                              mapData.side === 'attack'
                                ? "bg-orange-500"
                                : "bg-blue-500"
                            )}>
                              {mapData.side === 'attack' ? (
                                <Sword className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 text-white flex-shrink-0" />
                              ) : (
                                <ShieldIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 lg:h-4 lg:w-4 text-white flex-shrink-0" />
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Map Name and Team Info - Positioned at bottom of image in gradient area */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-20 text-center">
                          <div className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-1 sm:mb-1.5" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>
                            {mapData.map_name}
                          </div>
                          {mapData.side && mapData.sidePickerTeamId && (
                            <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs md:text-sm text-white/90">
                              {mapData.side === 'attack' ? (
                                <Sword className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-orange-400 flex-shrink-0" />
                              ) : (
                                <ShieldIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-400 flex-shrink-0" />
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
        )}

      {/* Share Links - Show to Organizers AND Captains (show even if pending) */}
      {/* Always show links section if organizer or captain, even if tokens don't exist yet */}
      {veto && (veto.status === 'in_progress' || veto.status === 'pending') && (effectiveIsOrganizer || isCaptain) && (
        <div className="mb-6 p-5 bg-gray-900 rounded-xl border border-gray-800">
          <div className="flex items-center gap-2 mb-4">
            <Link2 className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Team Links</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Team 1 Link - Show to organizers or Team 1 captain */}
            {(effectiveIsOrganizer || (isCaptain && userTeamId === veto.team1_id)) && (
              <>
                {veto.team1_link_token ? (
              <div className={cn(
                "p-3 sm:p-4 rounded-lg border",
                isCaptain && userTeamId === veto.team1_id && !isOrganizer
                  ? "bg-blue-950 border-blue-600 ring-2 ring-blue-500"
                  : "bg-gray-800 border-gray-700"
              )}>
                {isCaptain && userTeamId === veto.team1_id && !effectiveIsOrganizer && (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-emerald-600 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 animate-pulse">NEW</Badge>
                    <span className="text-[10px] sm:text-xs font-bold text-emerald-400">Your Team Link</span>
                  </div>
                )}
                <div className="text-[10px] sm:text-xs font-bold text-blue-400 mb-2 uppercase">{team1Name}</div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 text-[10px] sm:text-xs font-mono text-gray-300 break-all bg-gray-950 px-2 sm:px-3 py-1.5 sm:py-2 rounded border border-gray-700 min-w-0">
                    {getTeamLink(veto.team1_link_token)}
                  </div>
                  <button
                    onClick={() => copyToClipboard(getTeamLink(veto.team1_link_token)!, 'team1')}
                    className={cn(
                      "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap",
                      copiedLink === 'team1'
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    )}
                  >
                    {copiedLink === 'team1' ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
                ) : (
                  <div className="p-4 rounded-lg border border-gray-700 bg-gray-800">
                    <div className="text-xs font-bold text-blue-400 mb-2 uppercase">{team1Name}</div>
                    <div className="text-xs text-gray-500">Link will be generated when veto starts...</div>
                  </div>
                )}
              </>
            )}
            {/* Team 2 Link - Show to organizers or Team 2 captain */}
            {(effectiveIsOrganizer || (isCaptain && userTeamId === veto.team2_id)) && (
              <>
                {veto.team2_link_token ? (
              <div className={cn(
                "p-3 sm:p-4 rounded-lg border",
                isCaptain && userTeamId === veto.team2_id && !isOrganizer
                  ? "bg-purple-950 border-purple-600 ring-2 ring-purple-500"
                  : "bg-gray-800 border-gray-700"
              )}>
                {isCaptain && userTeamId === veto.team2_id && !effectiveIsOrganizer && (
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-emerald-600 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 animate-pulse">NEW</Badge>
                    <span className="text-[10px] sm:text-xs font-bold text-emerald-400">Your Team Link</span>
                  </div>
                )}
                <div className="text-[10px] sm:text-xs font-bold text-purple-400 mb-2 uppercase">{team2Name}</div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 text-[10px] sm:text-xs font-mono text-gray-300 break-all bg-gray-950 px-2 sm:px-3 py-1.5 sm:py-2 rounded border border-gray-700 min-w-0">
                    {getTeamLink(veto.team2_link_token)}
                  </div>
                  <button
                    onClick={() => copyToClipboard(getTeamLink(veto.team2_link_token)!, 'team2')}
                    className={cn(
                      "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap",
                      copiedLink === 'team2'
                        ? "bg-emerald-600 text-white"
                        : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    )}
                  >
                    {copiedLink === 'team2' ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
                ) : (
                  <div className="p-4 rounded-lg border border-gray-700 bg-gray-800">
                    <div className="text-xs font-bold text-purple-400 mb-2 uppercase">{team2Name}</div>
                    <div className="text-xs text-gray-500">Link will be generated when veto starts...</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Turn Indicator - Black/White with Green/Red */}
      {(veto.status === 'in_progress' || (veto.status === 'pending' && veto.best_of !== null && veto.best_of !== undefined)) && (
        <div className={cn(
          "mb-4 sm:mb-6 p-3 sm:p-4 lg:p-6 rounded-xl border-2",
          isUserTurn 
            ? "bg-black border-green-500 shadow-lg shadow-green-500/20" 
            : "bg-black border-white/20"
        )}>
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 w-full">
              <div className={cn(
                "p-2 sm:p-3 lg:p-4 rounded-xl border-2 flex-shrink-0",
                isUserTurn ? "bg-green-500 border-green-400" : "bg-white/10 border-white/20"
              )}>
                {isUserTurn ? (
                  <Play className="h-4 w-4 sm:h-5 sm:w-5 lg:h-7 lg:w-7 text-white" fill="white" />
                ) : (
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5 lg:h-7 lg:w-7 text-white/60" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] sm:text-[10px] lg:text-xs font-bold text-white/60 uppercase tracking-wider mb-0.5 sm:mb-1">Current Turn</div>
                <div className={cn('text-base sm:text-lg lg:text-xl xl:text-2xl font-black truncate', isUserTurn ? 'text-green-500' : 'text-white')}>
                  {isUserTurn ? 'YOUR TURN' : `${currentTeamName.toUpperCase()}'S TURN`}
                </div>
              </div>
              <CheckCircle className={cn(
                "h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 flex-shrink-0",
                isUserTurn ? "text-green-500" : "text-white/40"
              )} />
            </div>
            {/* Action Button - Full width on mobile */}
            <div className="w-full">
              <div className={cn(
                "w-full px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-black flex items-center justify-center gap-1.5 sm:gap-2 border-2",
                veto.current_action === 'ban' 
                  ? "bg-red-500 text-white border-red-400"
                  : veto.current_action === 'pick_side'
                  ? "bg-white text-black border-white"
                  : "bg-green-500 text-white border-green-400"
              )}>
                {veto.current_action === 'ban' ? (
                  <>
                    <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>BAN</span>
                  </>
                ) : veto.current_action === 'pick_side' ? (
                  <>
                    <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>SIDE</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span>PICK</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Maps Grid - Modern Card Design */}
      {(veto.status === 'in_progress' || (veto.status === 'pending' && veto.best_of !== null && veto.best_of !== undefined)) && (
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
            // Show only the last picked map for side selection
            // The pick action is ALWAYS the one immediately before pick_side (currentActionNum - 1)
            (() => {
              const currentActionNum = veto.current_action_number || 1;
              const vetoFormat = getVetoFormat(veto.best_of || 1);
              const sequence = VETO_SEQUENCES[vetoFormat];
              
              // Check if this is the final pick_side for auto-assigned last map (BO3 action 9, BO5 action 11)
              const isFinalPickSide = 
                (vetoFormat === 'bo3' && currentActionNum === 9) ||
                (vetoFormat === 'bo5' && currentActionNum === 11);
              
              // The pick action is always the one immediately before pick_side (unless it's the final pick_side)
              const pickActionNumber = currentActionNum - 1;
              
              if (pickActionNumber < 1 || pickActionNumber > sequence.length) {
                return <div className="text-center py-8 text-gray-400">Invalid action number for side selection</div>;
              }
              
              // Verify that the previous action was indeed a pick (unless it's the final pick_side)
              const previousAction = sequence[pickActionNumber - 1];
              if (previousAction !== 'pick' && !isFinalPickSide) {
                return <div className="text-center py-8 text-gray-400">Expected pick action before side selection, but found: {previousAction}</div>;
              }
              
              // Get both team's picks arrays
              const team1Picks = Array.isArray(veto.team1_picked_maps) 
                ? veto.team1_picked_maps 
                : (veto.team1_picked_maps ? [veto.team1_picked_maps] : []);
              const team2Picks = Array.isArray(veto.team2_picked_maps) 
                ? veto.team2_picked_maps 
                : (veto.team2_picked_maps ? [veto.team2_picked_maps] : []);
              
              let pickedMap: any = null;
              let mapToShow: GameMap | null = null;
              
              if (isFinalPickSide) {
                // For final pick_side, find the auto-assigned map in the side picker's team array
                // The side picker is Team 1 (higher seed)
                const sidePickerTeamId = getSidePickerTeam(
                  pickActionNumber,
                  vetoFormat,
                  veto.team1_id!,
                  veto.team2_id!
                );
                
                const sidePickerPicks = sidePickerTeamId === veto.team1_id ? team1Picks : team2Picks;
                
                // Find the last map without a side in the side picker's array
                for (let i = sidePickerPicks.length - 1; i >= 0; i--) {
                  const pm = sidePickerPicks[i] as any;
                  if (pm && pm.map_id && (pm.side === undefined || pm.side === null)) {
                    pickedMap = pm;
                    mapToShow = availableMaps.find(m => m.id === pm.map_id) || null;
                    break;
                  }
                }
              } else {
                // Regular pick_side - find the map that was picked in the previous action
                const pickActionType = sequence[pickActionNumber - 1];
                const pickActionTeamId = getTeamForAction(
                  pickActionNumber,
                  vetoFormat,
                  veto.team1_id!,
                  veto.team2_id!,
                  pickActionType
                );
                
                // Try the expected team's picks first
                let teamPicks = pickActionTeamId === veto.team1_id ? team1Picks : team2Picks;
                let isTeam1 = pickActionTeamId === veto.team1_id;
                
                // Find the last map without a side in the expected team's array
                let mapIndex = -1;
                for (let i = teamPicks.length - 1; i >= 0; i--) {
                  const pm = teamPicks[i] as any;
                  if (pm && pm.map_id && (pm.side === undefined || pm.side === null)) {
                    mapIndex = i;
                    pickedMap = pm;
                    break;
                  }
                }
                
                // If not found in expected team's array, check the other team's array
                if (mapIndex === -1) {
                  const otherTeamPicks = isTeam1 ? team2Picks : team1Picks;
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
                console.error('[MapVeto] Map not found in available maps:', {
                  pickedMapId: pickedMap?.map_id,
                  availableMapIds: availableMaps.map(m => m.id),
                });
                return <div className="text-center py-8 text-gray-400">Map not found in available maps</div>;
              }

              const canInteract = isUserTurn && !actionLoading && (veto.status === 'in_progress' || (veto.status === 'pending' && veto.best_of !== null && veto.best_of !== undefined));
              const mapImageUrl = mapToShow.map_image_url || `https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=300&fit=crop&q=80`;

              return (
                <div className="grid grid-cols-1 gap-4 max-w-md mx-auto">
                  <div
                    className={cn(
                      'relative group rounded-lg overflow-hidden border-2 transition-colors duration-150',
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
                    onClick={() => {
                      if (canInteract) {
                        console.log('[MapVeto] Clicking map for side selection:', mapToShow.map_name);
                        handleMapAction(mapToShow.id);
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3 lg:gap-4">
              {availableMapsToShow.map((map) => {
                const mapStatus = getMapStatus(map.id);
                const canInteract = !mapStatus.isBanned && !mapStatus.isPicked && isUserTurn && !actionLoading && (veto.status === 'in_progress' || (veto.status === 'pending' && veto.best_of !== null && veto.best_of !== undefined));
              
              const mapImageUrl = map.map_image_url || `https://images.unsplash.com/photo-1557683316-973673baf926?w=400&h=300&fit=crop&q=80`;
              
              return (
                <div
                  key={map.id}
                  className={cn(
                    'relative group rounded-lg overflow-hidden border transition-all duration-200',
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
                    backgroundImage: `url(${mapImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    minHeight: '8rem'
                  }}
                  onClick={() => canInteract && handleMapAction(map.id)}
                >
                  {/* Base gradient overlay - only for unpicked/unbanned maps */}
                  {!mapStatus.isBanned && !mapStatus.isPicked && (
                    <div className="absolute inset-0 bg-black/40 z-0" />
                  )}
                  
                  {/* Map Image */}
                  <div className="relative w-full h-28 sm:h-36 md:h-40 lg:h-44">
                    
                    {/* Map Name - Hide when picked/banned (overlay shows info instead) */}
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

                  {/* Status Overlays */}
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
                        {/* Map Name */}
                        <div className="text-sm sm:text-base lg:text-lg font-black text-white text-center" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.9)' }}>
                          {map.map_name}
                        </div>
                        
                        {/* Green Checkmark and Team Name */}
                        {(() => {
                          const pickedTeamName = mapStatus.pickedBy || '';
                          
                          return (
                            <div className="flex flex-col items-center justify-center gap-1 sm:gap-2">
                              <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-green-500" />
                              <span className="text-[10px] sm:text-xs font-bold text-white/80 uppercase tracking-wide text-center">
                                {pickedTeamName}
                              </span>
                            </div>
                          );
                        })()}
                        
                        {/* Attack/Defense Icon Only - Minimalistic */}
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

                  {/* Hover Action - Red for Ban, Green for Pick */}
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
      )}

      {/* Role Switch Prompt for Organizer-Captain */}
      <Dialog open={showRoleSwitchPrompt} onOpenChange={setShowRoleSwitchPrompt}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-black">Switch Role Required</DialogTitle>
            <DialogDescription className="text-gray-400">
              You are currently in organizer mode, but you are also the captain of one of the teams in this match.
              To participate in the map veto process, you need to switch to player role.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-300 mb-4">
              As an organizer, you can only view the veto process. To make picks/bans, switch to player role.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setShowRoleSwitchPrompt(false)}
              variant="outline"
              className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
            >
              Stay as Organizer (View Only)
            </Button>
            <Button
              onClick={handleRoleSwitch}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Switch to Player Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BO Selection Dialog for Organizers - Two Steps: Map Pool, then BO */}
      <Dialog open={showBODialog} onOpenChange={(open) => {
        setShowBODialog(open);
        if (!open) {
          setDialogStep('map_pool'); // Reset to first step when closing
          setSelectedBO(null);
        }
      }}>
        <DialogContent className="bg-black border-2 border-white/20 max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0">
          {dialogStep === 'map_pool' ? (
            <>
              <DialogHeader className="px-8 pt-8 pb-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <DialogTitle className="text-white text-2xl font-black tracking-tight">Step 1: Select Map Pool</DialogTitle>
                  <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 rounded-full border border-white/10">
                    <span className="text-white/60 text-sm font-medium">Selected:</span>
                    <span className="text-green-400 text-sm font-bold">{selectedMapPool.length}</span>
                  </div>
                </div>
                <DialogDescription className="text-white/60 text-base leading-relaxed mt-2">
                  Select which maps are available for this match veto. Valorant rotates maps, so choose the current active map pool.
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(allAvailableMaps.length > 0 ? allAvailableMaps : availableMaps).map((map) => {
                    const isSelected = selectedMapPool.includes(map.id);
                    return (
                      <button
                        key={map.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedMapPool(prev => prev.filter(id => id !== map.id));
                          } else {
                            setSelectedMapPool(prev => [...prev, map.id]);
                          }
                        }}
                        className={cn(
                          "group relative rounded-xl border-2 transition-all duration-200 overflow-hidden",
                          "hover:scale-[1.02] hover:shadow-lg",
                          isSelected
                            ? "bg-green-500/10 border-green-500 shadow-lg shadow-green-500/20"
                            : "bg-black/50 border-white/20 hover:border-white/40 hover:bg-white/5"
                        )}
                      >
                        {map.map_image_url && (
                          <div className="relative w-full h-32 overflow-hidden">
                            <img
                              src={map.map_image_url}
                              alt={map.map_name}
                              className={cn(
                                "w-full h-full object-cover transition-all duration-200",
                                isSelected ? "brightness-110" : "brightness-75 group-hover:brightness-90"
                              )}
                            />
                            <div className={cn(
                              "absolute inset-0 transition-all duration-200",
                              isSelected ? "bg-green-500/20" : "bg-black/30 group-hover:bg-black/20"
                            )} />
                            {isSelected && (
                              <div className="absolute top-2 right-2">
                                <div className="bg-green-500 rounded-full p-1.5 shadow-lg">
                                  <CheckCircle className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "font-bold text-sm transition-colors",
                              isSelected ? "text-green-400" : "text-white group-hover:text-white/90"
                            )}>
                              {map.map_name}
                            </span>
                            {!map.map_image_url && isSelected && (
                              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {selectedMapPool.length === 0 && (
                  <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-400 text-sm font-medium text-center">
                      Please select at least one map to continue.
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter className="px-8 py-6 border-t border-white/10 bg-black/50 gap-3">
                <Button
                  onClick={() => setShowBODialog(false)}
                  variant="outline"
                  className="bg-transparent border-white/20 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/30 px-6"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (selectedMapPool.length > 0) {
                      setDialogStep('bo');
                    } else {
                      toast({
                        title: 'Map Pool Required',
                        description: 'Please select at least one map to continue.',
                        variant: 'destructive',
                      });
                    }
                  }}
                  disabled={selectedMapPool.length === 0}
                  className="bg-green-500 hover:bg-green-600 text-white font-semibold px-8 shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to BO Selection
                  <span className="ml-2 text-green-100">({selectedMapPool.length})</span>
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader className="px-8 pt-8 pb-6 border-b border-white/10">
                <DialogTitle className="text-white text-2xl font-black tracking-tight mb-2">Step 2: Select Best Of Format</DialogTitle>
                <DialogDescription className="text-white/60 text-base leading-relaxed">
                  Choose the format for this match. This will determine the map veto sequence.
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-white/40">Selected maps:</span>
                    <span className="text-green-400 font-bold">{selectedMapPool.length}</span>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="flex-1 overflow-y-auto px-8 py-8">
                <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
                  {[1, 3, 5].map((bo) => {
                    const isSelected = selectedBO === bo;
                    const isDisabled = selectedBO !== null && selectedBO !== bo;
                    return (
                      <button
                        key={bo}
                        onClick={() => handleSetBO(bo)}
                        disabled={isDisabled}
                        className={cn(
                          "relative p-8 rounded-xl border-2 transition-all duration-200",
                          "hover:scale-[1.02] hover:shadow-xl",
                          isSelected
                            ? "bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-500/30"
                            : isDisabled
                            ? "bg-black/30 border-white/10 text-white/30 cursor-not-allowed opacity-50"
                            : "bg-black/50 border-white/20 text-white hover:border-blue-500/50 hover:bg-white/5"
                        )}
                      >
                        <div className="text-center">
                          <div className="text-4xl font-black mb-3">BO{bo}</div>
                          <div className="text-xs text-white/60 font-medium uppercase tracking-wider">
                            {bo === 1 ? 'Pick 1 map' : bo === 3 ? '7 actions' : '11 actions'}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="absolute top-3 right-3">
                            <CheckCircle className="h-5 w-5 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
              <DialogFooter className="px-8 py-6 border-t border-white/10 bg-black/50 gap-3">
                <Button
                  onClick={() => setDialogStep('map_pool')}
                  variant="outline"
                  className="bg-transparent border-white/20 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/30 px-6"
                >
                  ← Back to Map Pool
                </Button>
                <Button
                  onClick={() => setShowBODialog(false)}
                  variant="outline"
                  className="bg-transparent border-white/20 text-white/80 hover:bg-white/10 hover:text-white hover:border-white/30 px-6"
                >
                  Cancel
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Pending Preview - Show message if BO not selected or organizer wants to change it */}
      {veto && veto.status === 'pending' && (isOrganizer || currentRole === 'organizer') && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg font-semibold mb-2">
            {veto.best_of ? `Current format: BO${veto.best_of}. ` : ''}Please select the Best Of format to start the veto process.
          </p>
          <p className="text-sm mb-4">The BO selection dialog should appear automatically. If it doesn't, click the button below.</p>
          <Button
            onClick={() => {
              console.log('[MapVeto] Manual BO dialog trigger');
              setShowBODialog(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {veto.best_of ? 'Change BO Format' : 'Select BO Format'}
          </Button>
        </div>
      )}
      
      {/* REMOVED: Duplicate maps section - maps are already shown in the main Maps Grid above when status is pending with best_of set */}

      {/* Side Selection Dialog */}
      <Dialog open={showSideDialog} onOpenChange={setShowSideDialog}>
        <DialogContent className="sm:max-w-md bg-black border-2 border-white/20">
          <DialogHeader>
            <DialogTitle className="text-white text-xl font-black uppercase tracking-wider">Select Starting Side</DialogTitle>
            <DialogDescription className="text-white/60">
              Choose which side you want to start on for <span className="text-white font-bold">{pendingMapId && availableMaps.find(m => m.id === pendingMapId)?.map_name}</span>
            </DialogDescription>
          </DialogHeader>
          
          {/* Team Name Display - No Logo, Just Text */}
          {(() => {
            // Always calculate sidePickerTeamId using centralized helper function
            const currentActionNum = veto.current_action_number || 1;
            const vetoFormat = getVetoFormat(veto.best_of || 1) as 'bo1' | 'bo3' | 'bo5';
            const pickActionNumber = currentActionNum - 1;
            
            // Use centralized helper to get the team that should pick the side
            const sidePickerTeamId = getSidePickerTeam(
              pickActionNumber,
              vetoFormat,
              veto.team1_id!,
              veto.team2_id!
            );
            
            const sidePickerTeamName = sidePickerTeamId === veto.team1_id ? team1Name : team2Name;
            
            return (
              <div className="flex items-center justify-center gap-2 py-4 border-y border-white/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <span className="text-white font-bold text-lg">{sidePickerTeamName}</span>
              </div>
            );
          })()}
          
          <div className="space-y-3 py-4">
            <Button
              onClick={async () => {
                if (pendingMapId) {
                  await performMapAction(pendingMapId, 'pick_side', 'attack');
                  setShowSideDialog(false);
                  setPendingMapId(null);
                }
              }}
              className="w-full h-20 bg-orange-600 hover:bg-orange-700 text-white text-lg font-black gap-3 border-2 border-white/20 flex items-center justify-center"
            >
              <Sword className="h-8 w-8" />
              <span className="text-xl">ATTACK</span>
            </Button>
            <Button
              onClick={async () => {
                if (pendingMapId) {
                  await performMapAction(pendingMapId, 'pick_side', 'defend');
                  setShowSideDialog(false);
                  setPendingMapId(null);
                }
              }}
              className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white text-lg font-black gap-3 border-2 border-white/20 flex items-center justify-center"
            >
              <ShieldIcon className="h-8 w-8" />
              <span className="text-xl">DEFEND</span>
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSideDialog(false);
                setPendingMapId(null);
                setActionLoading(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

