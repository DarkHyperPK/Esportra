// @ts-nocheck
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import MatchResultUpload from '@/components/tournament/MatchResultUpload';
import { MapVeto } from '@/components/tournament/MapVeto';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { UploadCloud, Eye, Settings, Radio, Copy, Check, Map as MapIcon } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { Tournament } from '@/hooks/useTournaments';
import { supabase } from '@/lib/supabase';

interface Participant {
  id: string;
  user_id?: string | null;
  team_id?: string | null;
  team_name?: string | null;
  gamer_tag?: string | null;
  participant_type?: 'solo' | 'team' | null;
  tournament_id: string;
  created_at: string;
}

interface Match {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id: string | null;
  score: string | null;
  status: 'pending' | 'in_progress' | 'completed';
}

interface BracketTeam {
  id: string;
  name: string;
  seed: number;
  eliminated?: boolean;
  logo_url?: string | null;
}

interface BracketMatch {
  id: string;
  round: number;
  matchNumber: number;
  team1: BracketTeam | null;
  team2: BracketTeam | null;
  winner: BracketTeam | null;
  score: string | null;
  team1_score: number | null;
  team2_score: number | null;
  status: 'pending' | 'in_progress' | 'completed';
  scheduledTime?: string;
  bestOf?: number;
  resultImages?: string[];
  resultComments?: string[];
  partyCode?: string | null;
}

// Helper to check power of two
const isPowerOf2 = (n: number): boolean => n > 0 && (n & (n - 1)) === 0;

const TournamentBrackets = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { currentRole } = useRole();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  // Support dynamic bracket sizes: powers of 2 up to 512, plus 24 for flexibility
  type BracketSize = 8 | 16 | 24 | 32 | 64 | 128 | 256 | 512;
  const [teamCount, setTeamCount] = useState<BracketSize>(8);
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([]);
  const [useGroupStages, setUseGroupStages] = useState(false);
  const [groupSize, setGroupSize] = useState<8 | 16>(8);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set([1]));
  const [currentRound, setCurrentRound] = useState<number>(1);
  const isOrganizerRole = currentRole === 'organizer';
  const isOrganizerOwner = useMemo(() => 
    isOrganizerRole && !!(user?.id && (tournament as any)?.organizer_id && user.id === (tournament as any).organizer_id),
    [isOrganizerRole, user?.id, (tournament as any)?.organizer_id]
  );
  const canView = useMemo(() => {
    if (isOrganizerOwner) return true;
    if (!user?.id) return false;
    return participants.some((p: any) => p.user_id === user.id || p.team_captain_id === user.id);
  }, [isOrganizerOwner, user?.id, participants]);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedBracketSize, setSelectedBracketSize] = useState<BracketSize>(8);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showSchedulerModal, setShowSchedulerModal] = useState(false);
  const [scheduleStart, setScheduleStart] = useState<string>("");
  const [isClearing, setIsClearing] = useState(false);
  const [draftMatches, setDraftMatches] = useState<BracketMatch[] | null>(null);
  const [isCaptain, setIsCaptain] = useState(false);
  const [userTeamId, setUserTeamId] = useState<string | undefined>(undefined);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMatchId, setUploadMatchId] = useState<string | undefined>(undefined);
  const [showEditBracket, setShowEditBracket] = useState(false);
  const [mapVetoOpen, setMapVetoOpen] = useState(false);
  const [mapVetoMatchId, setMapVetoMatchId] = useState<string | null>(null);
  const [mapVetoMatch, setMapVetoMatch] = useState<BracketMatch | null>(null);
  const [matchVetoLinks, setMatchVetoLinks] = useState<Map<string, { team1Link?: string; team2Link?: string }>>(new Map());

  const toggleRound = (round: number) => {
    setExpandedRounds(prev => {
      const next = new Set(prev);
      if (next.has(round)) {
        next.delete(round);
      } else {
        next.add(round);
      }
      return next;
    });
  };

  // Calculate total rounds for navigation
  const totalRounds = isPowerOf2(teamCount) ? Math.log2(teamCount) : Math.ceil(Math.log2(teamCount));

  const navigateToRound = (round: number) => {
    if (round >= 1 && round <= totalRounds) {
      setCurrentRound(round);
    }
  };

  const goToPreviousRound = () => {
    navigateToRound(Math.max(1, currentRound - 1));
  };

  const goToNextRound = () => {
    navigateToRound(Math.min(totalRounds, currentRound + 1));
  };
  const isUuid = (s?: string | null) => !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

  // Debug: Log map veto state changes
  useEffect(() => {
    console.log('[Brackets] Map Veto state:', { mapVetoOpen, mapVetoMatchId, hasMatch: !!mapVetoMatch });
  }, [mapVetoOpen, mapVetoMatchId, mapVetoMatch]);

  // Define fetchTournamentData first before any useEffect that uses it
  const fetchTournamentData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch tournament details - try by slug first, then by id
      let tournamentData: any = null;
      let tournamentError: any = null;

      const { data: bySlug, error: errSlug } = await supabase
        .from('tournaments')
        .select('*')
        .eq('slug', slug)
        .single();
      if (!errSlug && bySlug) {
        tournamentData = bySlug;
      } else {
        const { data: byId, error: errId } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', slug)
          .single();
        if (!errId && byId) {
          tournamentData = byId;
        } else {
          tournamentError = errSlug || errId;
        }
      }

      if (tournamentError) throw tournamentError;

      // Fetch participants and bans in parallel
      const [participantsResponse, bansResponse] = await Promise.all([
        supabase
          .from('tournament_participants')
          .select('*')
          .eq('tournament_id', tournamentData.id),
        supabase
          .from('tournament_bans')
          .select('user_id, team_id')
          .eq('tournament_id', tournamentData.id)
          .eq('is_active', true)
      ]);

      if (participantsResponse.error) throw participantsResponse.error;

      // Get banned user_ids and team_ids
      const bannedUserIds = new Set((bansResponse.data || []).filter(b => b.user_id).map(b => b.user_id));
      const bannedTeamIds = new Set((bansResponse.data || []).filter(b => b.team_id).map(b => b.team_id));
      
      // Filter out banned participants
      const participantsData = (participantsResponse.data || []).filter((p: any) => {
        if (p.user_id && bannedUserIds.has(p.user_id)) return false;
        if (p.team_id && bannedTeamIds.has(p.team_id)) return false;
        return true;
      });

      // Fetch matches (schema uses match_number and supports team slots/schedule now)
      const { data: matchesData, error: matchesError } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournamentData.id)
        .order('round', { ascending: true })
        .order('match_number', { ascending: true });
      // Fetch results (images/comments per match)
      const { data: resultsData } = await supabase
        .from('tournament_match_results')
        .select('match_id, image_url, comment')
        .eq('tournament_id', tournamentData.id);
      const resultsByMatch: Record<string, { images: string[]; comments: string[] }> = {};
      (resultsData || []).forEach((r: any) => {
        const key = r.match_id;
        if (!key) return;
        if (!resultsByMatch[key]) resultsByMatch[key] = { images: [], comments: [] };
        if (r.image_url) resultsByMatch[key].images.push(r.image_url);
        if (r.comment) resultsByMatch[key].comments.push(r.comment);
      });

      if (matchesError) throw matchesError;

      setTournament(tournamentData);
      setParticipants(participantsData);
      setMatches(matchesData || []);

      // If there are saved matches in DB, convert them to visualization format for everyone (players too)
      if (matchesData && matchesData.length > 0) {
        const maxRound = Math.max(...matchesData.map((m: any) => Number(m.round || 1)));
        // Calculate team count from Round 1 matches: teamCount = matchesInRound1 * 2
        // For 32 teams: Round 1 has 16 matches, so 16 * 2 = 32
        // For 8 teams: Round 1 has 4 matches, so 4 * 2 = 8
        const round1Matches = matchesData.filter((m: any) => Number(m.round || 1) === 1);
        const matchesInRound1 = round1Matches.length;
        const inferredTeamCount = matchesInRound1 > 0 ? matchesInRound1 * 2 : Math.pow(2, Math.max(1, maxRound));
        // Always use inferred count from database matches (this is the source of truth)
        // The bracket size is determined by the number of matches in Round 1
        setTeamCount((inferredTeamCount as 8 | 16 | 24 | 32) || 8);
        // Build a comprehensive map of team_id -> display name and logo from tournament participants
        // This ensures we get the correct team names from the tournament's registrations
        const teamNameById = new Map<string, string>();
        const teamLogoById = new Map<string, string | null>();
        // Also build a reverse map: team name -> team_id for fallback matching
        const teamIdByName = new Map<string, string>();
        
        // First: Map from tournament participants (most accurate for this tournament)
        const participantTeamIds = new Set<string>();
        (participantsData || []).forEach((p: any) => {
          if (p.team_id) {
            participantTeamIds.add(p.team_id);
            // Prefer team_name over roster_name (roster represents team, so show team name)
            const display = p.team_name || p.roster_name;
            if (display) {
              teamNameById.set(p.team_id, display);
              // Store logo from participants if available
              if (p.team_logo) teamLogoById.set(p.team_id, p.team_logo);
              // Store both roster_name and team_name mappings for fallback
              if (p.roster_name) teamIdByName.set(p.roster_name.toLowerCase().trim(), p.team_id);
              if (p.team_name) teamIdByName.set(p.team_name.toLowerCase().trim(), p.team_id);
              console.log('[Brackets] Mapped team from participants:', p.team_id, '->', display);
            }
          }
        });
        
        // Fetch team names and logos for all participant teams from teams table
        if (participantTeamIds.size > 0) {
          const participantIdsArray = Array.from(participantTeamIds);
          const { data: participantTeams } = await supabase
            .from('teams')
            .select('id, name, logo_url')
            .in('id', participantIdsArray);
          
          (participantTeams || []).forEach((t: any) => {
            if (t.id) {
              // Update team name from teams table (prefer actual team name)
              if (t.name) {
                teamNameById.set(t.id, t.name);
                console.log('[Brackets] Updated team name from teams table:', t.id, '->', t.name);
              }
              // Update logo if not already set
              if (!teamLogoById.has(t.id)) {
                teamLogoById.set(t.id, t.logo_url || null);
                console.log('[Brackets] Fetched logo for participant team:', t.id, '->', t.logo_url || 'null');
              }
            }
          });
        }
        
        // Second: For any team_ids in matches that aren't in participants, fetch from teams table
        const matchTeamIds = new Set<string>();
        matchesData.forEach((m: any) => {
          if (m.team1_id) matchTeamIds.add(m.team1_id);
          if (m.team2_id) matchTeamIds.add(m.team2_id);
          if (m.winner_team_id) matchTeamIds.add(m.winner_team_id);
        });
        
        const missingTeamIds = Array.from(matchTeamIds).filter(id => !teamNameById.has(id) && !id.startsWith('bye-'));
        if (missingTeamIds.length > 0 && tournamentData?.id) {
          console.log('[Brackets] Fetching missing team names for:', missingTeamIds);
          
          // Fetch team names and logos directly from teams table
          const { data: missingTeams } = await supabase
            .from('teams')
            .select('id, name, logo_url')
            .in('id', missingTeamIds);
          
          (missingTeams || []).forEach((t: any) => {
            if (t.id && t.name) {
              teamNameById.set(t.id, t.name);
              if (t.logo_url) teamLogoById.set(t.id, t.logo_url);
              teamIdByName.set(t.name.toLowerCase().trim(), t.id);
              console.log('[Brackets] Mapped team from teams table:', t.id, '->', t.name);
            }
          });
          
          // Also double-check tournament_participants for any we still missed
          const stillMissing = missingTeamIds.filter(id => !teamNameById.has(id));
          if (stillMissing.length > 0) {
            // Try to find participants by team_id first
            const { data: extraParticipants } = await supabase
              .from('tournament_participants')
              .select('team_id, roster_name, team_name')
              .eq('tournament_id', tournamentData.id)
              .in('team_id', stillMissing)
              .not('team_id', 'is', null);
            
            (extraParticipants || []).forEach((p: any) => {
              if (p.team_id) {
                const display = p.team_name || p.roster_name;
                if (display) {
                  teamNameById.set(p.team_id, display);
                  console.log('[Brackets] Mapped team from extra participants:', p.team_id, '->', display);
                }
              }
            });
            
            // If still missing, try to find by fetching ALL participants and matching team_ids
            // This handles cases where team_id might be stored differently
            const stillStillMissing = stillMissing.filter(id => !teamNameById.has(id));
            if (stillStillMissing.length > 0) {
              console.log('[Brackets] Still missing team names, fetching all participants to find matches:', stillStillMissing);
              const { data: allParticipants } = await supabase
                .from('tournament_participants')
                .select('team_id, roster_name, team_name')
                .eq('tournament_id', tournamentData.id)
                .not('team_id', 'is', null);
              
              // Try to match by checking if any participant's team_id matches (case-insensitive string comparison)
              (allParticipants || []).forEach((p: any) => {
                if (p.team_id && stillStillMissing.includes(p.team_id)) {
                  const display = p.team_name || p.roster_name;
                  if (display) {
                    teamNameById.set(p.team_id, display);
                    console.log('[Brackets] Found match in all participants:', p.team_id, '->', display);
                  }
                }
              });
            }
          }
        }
        
        const mapDbToLocalStatus = (s: string | null | undefined): 'pending' | 'in_progress' | 'completed' => {
          if (!s) return 'pending';
          const v = String(s);
          if (v === 'scheduled' || v === 'pending' || v === 'not_started') return 'pending';
          if (v === 'in_progress' || v === 'live' || v === 'ongoing') return 'in_progress';
          return 'completed';
        };

        // Log all available team mappings for debugging
        console.log('[Brackets] Team name mappings:', Array.from(teamNameById.entries()));
        console.log('[Brackets] All participants:', (participantsData || []).map((p: any) => ({
          team_id: p.team_id,
          roster_name: p.roster_name,
          team_name: p.team_name
        })));
        
        // Calculate seeds for teams based on bracket position
        // In Round 1, seeds are: match 1 = (1, N), match 2 = (2, N-1), etc.
        const calculateSeed = (round: number, matchNumber: number, slot: 'team1' | 'team2', bracketSize: number): number => {
          if (round === 1) {
            // Round 1: seeds follow standard bracket pairing
            if (slot === 'team1') {
              return matchNumber;
            } else {
              return bracketSize - matchNumber + 1;
            }
          }
          // For later rounds, seeds are inherited from winners (0 indicates winner from previous round)
          return 0;
        };
        
        const converted: BracketMatch[] = matchesData.map((m: any) => {
          const t1Id = m.team1_id as string | null;
          const t2Id = m.team2_id as string | null;
          const t1Name = t1Id ? (teamNameById.get(t1Id) || (t1Id.startsWith('bye-') ? 'BYE' : null)) : null;
          const t2Name = t2Id ? (teamNameById.get(t2Id) || (t2Id.startsWith('bye-') ? 'BYE' : null)) : null;
          const winnerName = m.winner_team_id ? (teamNameById.get(m.winner_team_id) || null) : null;
          const round = Number(m.round || 1);
          const matchNum = Number(m.match_number || 1);
          
          // Log if we can't find a team name with more details
          if (t1Id && !t1Name && !t1Id.startsWith('bye-')) {
            console.warn('[Brackets] Could not resolve team name for team1_id:', t1Id, 'in match', m.id);
            console.warn('[Brackets] Available team IDs:', Array.from(teamNameById.keys()));
            // Try to find a participant with this team_id
            const found = (participantsData || []).find((p: any) => p.team_id === t1Id);
            if (found) {
              console.warn('[Brackets] Found participant but no name:', found);
            } else {
              console.warn('[Brackets] No participant found with team_id:', t1Id);
            }
          }
          if (t2Id && !t2Name && !t2Id.startsWith('bye-')) {
            console.warn('[Brackets] Could not resolve team name for team2_id:', t2Id, 'in match', m.id);
            console.warn('[Brackets] Available team IDs:', Array.from(teamNameById.keys()));
            // Try to find a participant with this team_id
            const found = (participantsData || []).find((p: any) => p.team_id === t2Id);
            if (found) {
              console.warn('[Brackets] Found participant but no name:', found);
            } else {
              console.warn('[Brackets] No participant found with team_id:', t2Id);
            }
          }
          
          // Calculate seeds for Round 1 matches
          const t1Seed = (round === 1 && t1Id && !t1Id.startsWith('bye-')) ? calculateSeed(round, matchNum, 'team1', inferredTeamCount) : 0;
          const t2Seed = (round === 1 && t2Id && !t2Id.startsWith('bye-')) ? calculateSeed(round, matchNum, 'team2', inferredTeamCount) : 0;
          
          return ({
            id: `db-${m.id}`,
            round: round,
            matchNumber: matchNum,
            team1: t1Id ? { id: t1Id, name: t1Name || 'Team', seed: t1Seed, logo_url: teamLogoById.get(t1Id) || null } : null,
            team2: t2Id ? { id: t2Id, name: t2Name || 'Team', seed: t2Seed, logo_url: teamLogoById.get(t2Id) || null } : null,
            winner: m.winner_team_id ? { id: m.winner_team_id, name: winnerName || 'Winner', seed: 0, logo_url: teamLogoById.get(m.winner_team_id) || null } : null,
            score: (typeof m.team1_score === 'number' && typeof m.team2_score === 'number') ? `${m.team1_score}-${m.team2_score}` : m.score || null,
            team1_score: typeof m.team1_score === 'number' ? m.team1_score : null,
            team2_score: typeof m.team2_score === 'number' ? m.team2_score : null,
            status: mapDbToLocalStatus(m.status),
            scheduledTime: (m.scheduled_at || m.scheduled_time) ? (() => {
              const date = new Date(m.scheduled_at || m.scheduled_time);
              // Format: DD/MM/YYYY at HH:MM AM/PM
              const day = String(date.getDate()).padStart(2, '0');
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const year = date.getFullYear();
              const dateStr = `${day}/${month}/${year}`;
              const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
              return `${dateStr} at ${timeStr}`;
            })() : undefined,
            bestOf: m.best_of || undefined,
            resultImages: resultsByMatch[m.id]?.images || [],
            resultComments: resultsByMatch[m.id]?.comments || [],
            partyCode: m.party_code || null,
          });
        });
        setBracketMatches(converted);
      }
    } catch (error: any) {
      console.error('Error fetching tournament data:', error?.message || error, error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load tournament data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [slug, toast]);

  useEffect(() => {
    console.log('Brackets page loaded with slug:', slug);
    if (slug) {
      fetchTournamentData();
    }
  }, [slug, fetchTournamentData]);

  // Removed refresh trigger - real-time subscriptions handle all updates

  // Fetch veto links for matches where user is captain
  useEffect(() => {
    if (!isCaptain || !userTeamId || !tournament?.id || matches.length === 0) {
      setMatchVetoLinks(new Map());
      return;
    }

    let mounted = true;

    const fetchVetoLinks = async () => {
      if (!mounted) return;

      try {
        // Get all matches for this tournament
        const matchIds = matches
          .filter(m => String(m.id).startsWith('db-'))
          .map(m => String(m.id).replace('db-', ''))
          .filter(id => isUuid(id));

        if (matchIds.length === 0 || !mounted) return;

        // Fetch veto records for these matches
        const { data: vetos, error } = await supabase
          .from('valorant_match_map_vetos')
          .select('match_id, team1_id, team2_id, team1_link_token, team2_link_token, status')
          .in('match_id', matchIds)
          .eq('status', 'in_progress');

        if (error || !mounted) {
          if (error) console.error('[Brackets] Error fetching veto links:', error);
          return;
        }

        // Build map of match_id -> links
        const linksMap = new Map<string, { team1Link?: string; team2Link?: string }>();
        
        (vetos || []).forEach((veto: any) => {
          const matchId = veto.match_id;
          const hasUserTeamLink = 
            (veto.team1_id === userTeamId && veto.team1_link_token) ||
            (veto.team2_id === userTeamId && veto.team2_link_token);

          if (hasUserTeamLink) {
            linksMap.set(matchId, {
              team1Link: veto.team1_id === userTeamId ? veto.team1_link_token : undefined,
              team2Link: veto.team2_id === userTeamId ? veto.team2_link_token : undefined,
            });
          }
        });

        if (mounted) {
          setMatchVetoLinks(linksMap);
        }
      } catch (error) {
        console.error('[Brackets] Error in fetchVetoLinks:', error);
      }
    };

    fetchVetoLinks();

    // Set up realtime subscription for veto link updates
    const channel = supabase
      .channel(`veto-links-${tournament.id}-${userTeamId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_map_vetos',
          filter: `team1_id=eq.${userTeamId}`,
        },
        () => {
          if (mounted) fetchVetoLinks();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_map_vetos',
          filter: `team2_id=eq.${userTeamId}`,
        },
        () => {
          if (mounted) fetchVetoLinks();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [isCaptain, userTeamId, tournament?.id, matches.length]); // Only depend on matches.length, not matches array

  // Helper function to convert DB match to BracketMatch format
  const convertDbMatchToBracketMatch = async (dbMatch: any, teamNameById: Map<string, string>, teamLogoById: Map<string, string | null>, teamCount: number): Promise<BracketMatch | null> => {
    const mapDbToLocalStatus = (s: string | null | undefined): 'pending' | 'in_progress' | 'completed' => {
      if (!s) return 'pending';
      const v = String(s);
      if (v === 'scheduled' || v === 'pending' || v === 'not_started') return 'pending';
      if (v === 'in_progress' || v === 'live' || v === 'ongoing') return 'in_progress';
      return 'completed';
    };

    const calculateSeed = (round: number, matchNumber: number, slot: 'team1' | 'team2', bracketSize: number): number => {
      if (round === 1) {
        if (slot === 'team1') {
          return matchNumber;
        } else {
          return bracketSize - matchNumber + 1;
        }
      }
      return 0;
    };

    const t1Id = dbMatch.team1_id as string | null;
    const t2Id = dbMatch.team2_id as string | null;
    const t1Name = t1Id ? (teamNameById.get(t1Id) || (t1Id.startsWith('bye-') ? 'BYE' : null)) : null;
    const t2Name = t2Id ? (teamNameById.get(t2Id) || (t2Id.startsWith('bye-') ? 'BYE' : null)) : null;
    const winnerName = dbMatch.winner_team_id ? (teamNameById.get(dbMatch.winner_team_id) || null) : null;
    const round = Number(dbMatch.round || 1);
    const matchNum = Number(dbMatch.match_number || 1);

    // If team names are missing, try to fetch them
    const missingTeamIds: string[] = [];
    if (t1Id && !t1Name && !t1Id.startsWith('bye-')) missingTeamIds.push(t1Id);
    if (t2Id && !t2Name && !t2Id.startsWith('bye-')) missingTeamIds.push(t2Id);
    if (dbMatch.winner_team_id && !winnerName) missingTeamIds.push(dbMatch.winner_team_id);

    if (missingTeamIds.length > 0) {
      const { data: missingTeams } = await supabase
        .from('teams')
        .select('id, name, logo_url')
        .in('id', missingTeamIds);
      
      (missingTeams || []).forEach((t: any) => {
        if (t.id && t.name) {
          teamNameById.set(t.id, t.name);
          if (t.logo_url) teamLogoById.set(t.id, t.logo_url);
        }
      });
    }

    const finalT1Name = t1Id ? (teamNameById.get(t1Id) || (t1Id.startsWith('bye-') ? 'BYE' : 'Team')) : null;
    const finalT2Name = t2Id ? (teamNameById.get(t2Id) || (t2Id.startsWith('bye-') ? 'BYE' : 'Team')) : null;
    const finalWinnerName = dbMatch.winner_team_id ? (teamNameById.get(dbMatch.winner_team_id) || 'Winner') : null;

    const t1Seed = (round === 1 && t1Id && !t1Id.startsWith('bye-')) ? calculateSeed(round, matchNum, 'team1', teamCount) : 0;
    const t2Seed = (round === 1 && t2Id && !t2Id.startsWith('bye-')) ? calculateSeed(round, matchNum, 'team2', teamCount) : 0;

    // Fetch results for this match
    const { data: resultsData } = await supabase
      .from('tournament_match_results')
      .select('image_url, comment')
      .eq('match_id', dbMatch.id);
    
    const resultImages: string[] = [];
    const resultComments: string[] = [];
    (resultsData || []).forEach((r: any) => {
      if (r.image_url) resultImages.push(r.image_url);
      if (r.comment) resultComments.push(r.comment);
    });

    return {
      id: `db-${dbMatch.id}`,
      round: round,
      matchNumber: matchNum,
      team1: t1Id ? { id: t1Id, name: finalT1Name || 'Team', seed: t1Seed, logo_url: teamLogoById.get(t1Id) || null } : null,
      team2: t2Id ? { id: t2Id, name: finalT2Name || 'Team', seed: t2Seed, logo_url: teamLogoById.get(t2Id) || null } : null,
      winner: dbMatch.winner_team_id ? { id: dbMatch.winner_team_id, name: finalWinnerName || 'Winner', seed: 0, logo_url: teamLogoById.get(dbMatch.winner_team_id) || null } : null,
      score: (typeof dbMatch.team1_score === 'number' && typeof dbMatch.team2_score === 'number') 
        ? `${dbMatch.team1_score}-${dbMatch.team2_score}` 
        : null,
      team1_score: typeof dbMatch.team1_score === 'number' ? dbMatch.team1_score : null,
      team2_score: typeof dbMatch.team2_score === 'number' ? dbMatch.team2_score : null,
      status: mapDbToLocalStatus(dbMatch.status),
      scheduledTime: (dbMatch.scheduled_at || dbMatch.scheduled_time) ? (() => {
        const date = new Date(dbMatch.scheduled_at || dbMatch.scheduled_time);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const dateStr = `${day}/${month}/${year}`;
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        return `${dateStr} at ${timeStr}`;
      })() : undefined,
      bestOf: dbMatch.best_of || undefined,
      resultImages: resultImages,
      resultComments: resultComments,
      partyCode: dbMatch.party_code || null,
    };
  };

  // Build team name/logo mappings from current participants
  const buildTeamMappings = useCallback(async (participantsData: any[]): Promise<{ teamNameById: Map<string, string>, teamLogoById: Map<string, string | null> }> => {
    const teamNameById = new Map<string, string>();
    const teamLogoById = new Map<string, string | null>();

    // Map from tournament participants
    const participantTeamIds = new Set<string>();
    (participantsData || []).forEach((p: any) => {
      if (p.team_id) {
        participantTeamIds.add(p.team_id);
        const display = p.team_name || p.roster_name;
        if (display) {
          teamNameById.set(p.team_id, display);
          if (p.team_logo) teamLogoById.set(p.team_id, p.team_logo);
        }
      }
    });

    // Fetch team names and logos from teams table
    if (participantTeamIds.size > 0) {
      const participantIdsArray = Array.from(participantTeamIds);
      const { data: participantTeams } = await supabase
        .from('teams')
        .select('id, name, logo_url')
        .in('id', participantIdsArray);
      
      (participantTeams || []).forEach((t: any) => {
        if (t.id) {
          if (t.name) teamNameById.set(t.id, t.name);
          if (!teamLogoById.has(t.id)) {
            teamLogoById.set(t.id, t.logo_url || null);
          }
        }
      });
    }

    return { teamNameById, teamLogoById };
  }, []);

  // Real-time sync: Subscribe to bracket changes
  useEffect(() => {
    if (!tournament?.id) return;

    console.log('[Brackets] Setting up realtime subscriptions for tournament:', tournament.id);

    // Update local state directly from real-time events for instant updates
    const handleMatchUpdate = async (payload: any) => {
      console.log('[Brackets] handleMatchUpdate called:', {
        eventType: payload.eventType,
        table: payload.table,
        new: payload.new,
        old: payload.old,
        timestamp: new Date().toISOString()
      });
      
      if (payload.eventType === 'UPDATE' && payload.new) {
        const updatedMatch = payload.new;
        // Get current participants for team mappings
        const currentParticipants = participants;
        const teamMappings = await buildTeamMappings(currentParticipants);
        
        // Update local state immediately
        setBracketMatches(prevMatches => 
          prevMatches.map(match => {
            const matchDbId = String(match.id).replace('db-', '');
            if (matchDbId === updatedMatch.id) {
              // Check if team IDs changed (from drag-and-drop or other updates)
              const team1IdChanged = updatedMatch.team1_id !== (match.team1?.id || null);
              const team2IdChanged = updatedMatch.team2_id !== (match.team2?.id || null);
              
              // If team IDs changed, rebuild team objects with latest data
              let updatedTeam1 = match.team1;
              let updatedTeam2 = match.team2;
              
              if (team1IdChanged) {
                if (updatedMatch.team1_id) {
                  const teamName = teamMappings.teamNameById.get(updatedMatch.team1_id) || 'Team';
                  const teamLogo = teamMappings.teamLogoById.get(updatedMatch.team1_id) || null;
                  updatedTeam1 = {
                    id: updatedMatch.team1_id,
                    name: teamName,
                    seed: match.team1?.seed || 0,
                    logo_url: teamLogo,
                  };
                } else {
                  updatedTeam1 = null;
                }
              }
              
              if (team2IdChanged) {
                if (updatedMatch.team2_id) {
                  const teamName = teamMappings.teamNameById.get(updatedMatch.team2_id) || 'Team';
                  const teamLogo = teamMappings.teamLogoById.get(updatedMatch.team2_id) || null;
                  updatedTeam2 = {
                    id: updatedMatch.team2_id,
                    name: teamName,
                    seed: match.team2?.seed || 0,
                    logo_url: teamLogo,
                  };
                } else {
                  updatedTeam2 = null;
                }
              }
              
              // When match is reset to pending, also clear result images and comments
              const isResetToPending = updatedMatch.status === 'pending' && match.status !== 'pending';
              
              return {
                ...match,
                team1: updatedTeam1,
                team2: updatedTeam2,
                status: (updatedMatch.status === 'pending' ? 'pending' : 
                        updatedMatch.status === 'in_progress' ? 'in_progress' : 'completed') as 'pending' | 'in_progress' | 'completed',
                team1_score: typeof updatedMatch.team1_score === 'number' ? updatedMatch.team1_score : match.team1_score,
                team2_score: typeof updatedMatch.team2_score === 'number' ? updatedMatch.team2_score : match.team2_score,
                score: (typeof updatedMatch.team1_score === 'number' && typeof updatedMatch.team2_score === 'number') 
                  ? `${updatedMatch.team1_score}-${updatedMatch.team2_score}` 
                  : match.score,
                bestOf: updatedMatch.best_of || match.bestOf,
                partyCode: updatedMatch.party_code || match.partyCode,
                // Clear results when match is reset to pending
                resultImages: isResetToPending ? [] : match.resultImages,
                resultComments: isResetToPending ? [] : match.resultComments,
              };
            }
            return match;
          })
        );
        
        // Also update matches state
        setMatches(prevMatches => 
          prevMatches.map((m: any) => {
            if (m.id === updatedMatch.id) {
              return { ...m, ...updatedMatch };
            }
            return m;
          })
        );
      } else if (payload.eventType === 'INSERT' && payload.new) {
        // New match inserted - convert and add to state directly
        const newMatch = payload.new;
        // Get current participants for team mappings
        const currentParticipants = participants;
        const teamMappings = await buildTeamMappings(currentParticipants);
        const convertedMatch = await convertDbMatchToBracketMatch(newMatch, teamMappings.teamNameById, teamMappings.teamLogoById, teamCount);
        if (convertedMatch) {
          setBracketMatches(prevMatches => {
            // Check if match already exists (avoid duplicates)
            const exists = prevMatches.some(m => m.id === convertedMatch.id);
            if (exists) return prevMatches;
            return [...prevMatches, convertedMatch].sort((a, b) => {
              if (a.round !== b.round) return a.round - b.round;
              return a.matchNumber - b.matchNumber;
            });
          });
          setMatches(prevMatches => {
            const exists = prevMatches.some((m: any) => m.id === newMatch.id);
            if (exists) return prevMatches;
            return [...prevMatches, newMatch];
          });
        }
      } else if (payload.eventType === 'DELETE' && payload.old) {
        // Match deleted - remove from state directly
        // Note: When clearing brackets, multiple DELETE events fire (one per match)
        // Each event is processed individually to remove matches from state
        const deletedMatch = payload.old;
        const deletedMatchId = deletedMatch.id;
        const deletedTournamentId = deletedMatch.tournament_id;
        
        console.log('[Brackets] Processing DELETE event:', {
          deletedMatchId,
          tournamentId: deletedTournamentId,
          currentTournamentId: tournament.id
        });
        
        // Only process if it's for the current tournament
        if (deletedTournamentId !== tournament.id) {
          console.log('[Brackets] Ignoring DELETE event for different tournament');
          return;
        }
        
        // Remove the deleted match from state using functional updates
        setBracketMatches(prevMatches => {
          const filtered = prevMatches.filter(match => {
            const matchDbId = String(match.id).replace('db-', '');
            const shouldKeep = matchDbId !== deletedMatchId;
            if (!shouldKeep) {
              console.log('[Brackets] Removing match from bracketMatches state:', matchDbId);
            }
            return shouldKeep;
          });
          
          console.log('[Brackets] After DELETE filter (bracketMatches):', {
            before: prevMatches.length,
            after: filtered.length,
            deletedId: deletedMatchId
          });
          
          return filtered;
        });
        
        setMatches(prevMatches => {
          const filtered = prevMatches.filter((m: any) => {
            const shouldKeep = m.id !== deletedMatchId;
            if (!shouldKeep) {
              console.log('[Brackets] Removing match from matches state:', m.id);
            }
            return shouldKeep;
          });
          
          console.log('[Brackets] After DELETE filter (matches):', {
            before: prevMatches.length,
            after: filtered.length
          });
          
          return filtered;
        });
      }
    };

    // Subscribe to match changes (INSERT, UPDATE, DELETE)
    // Note: For DELETE events, Supabase sends individual events for each deleted row
    // When clearing brackets, multiple DELETE events will fire, and we process each one
    const matchesChannel = supabase
      .channel(`tournament_matches_${tournament.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_matches',
          filter: `tournament_id=eq.${tournament.id}`,
        },
        (payload) => {
          console.log('[Brackets] Real-time event received:', {
            eventType: payload.eventType,
            table: payload.table,
            old: payload.old,
            new: payload.new,
            timestamp: new Date().toISOString()
          });
          handleMatchUpdate(payload);
        }
      )
      .subscribe((status) => {
        console.log('[Brackets] Subscription status for tournament_matches:', status);
        if (status === 'SUBSCRIBED') {
          console.log('[Brackets] Successfully subscribed to tournament_matches real-time updates for tournament:', tournament.id);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Brackets] Error subscribing to tournament_matches:', status);
        } else if (status === 'TIMED_OUT') {
          console.warn('[Brackets] Subscription timed out, may retry...');
        }
      });

    // Subscribe to match results changes
    const resultsChannel = supabase
      .channel(`tournament_results_${tournament.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_match_results',
          filter: `tournament_id=eq.${tournament.id}`,
        },
        async (payload) => {
          console.log('[Brackets] Real-time match result event received:', payload.eventType, payload);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            // New result added - update specific match's results directly
            const newResult = payload.new;
            const matchId = newResult.match_id;
            
            setBracketMatches(prevMatches => 
              prevMatches.map(match => {
                const matchDbId = String(match.id).replace('db-', '');
                if (matchDbId === matchId) {
                  const currentImages = match.resultImages || [];
                  const currentComments = match.resultComments || [];
                  return {
                    ...match,
                    resultImages: newResult.image_url ? [...currentImages, newResult.image_url] : currentImages,
                    resultComments: newResult.comment ? [...currentComments, newResult.comment] : currentComments,
                  };
                }
                return match;
              })
            );
          } else if (payload.eventType === 'DELETE' && payload.old) {
            // Result deleted - handle both individual and bulk deletions
            const deletedResult = payload.old;
            const matchId = deletedResult.match_id;
            
            setBracketMatches(prevMatches => 
              prevMatches.map(match => {
                const matchDbId = String(match.id).replace('db-', '');
                if (matchDbId === matchId) {
                  // If image_url or comment is null/undefined, it means all results were deleted (bulk deletion)
                  // Otherwise, remove the specific result
                  if (!deletedResult.image_url && !deletedResult.comment) {
                    // Bulk deletion - clear all results for this match
                    return {
                      ...match,
                      resultImages: [],
                      resultComments: [],
                    };
                  } else {
                    // Individual deletion - remove specific result
                    const currentImages = match.resultImages || [];
                    const currentComments = match.resultComments || [];
                    return {
                      ...match,
                      resultImages: deletedResult.image_url 
                        ? currentImages.filter(img => img !== deletedResult.image_url)
                        : currentImages,
                      resultComments: deletedResult.comment
                        ? currentComments.filter(comment => comment !== deletedResult.comment)
                        : currentComments,
                    };
                  }
                }
                return match;
              })
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('[Brackets] Subscription status for tournament_match_results:', status);
      });

    // Subscribe to participant changes (in case teams are added/removed)
    const participantsChannel = supabase
      .channel(`tournament_participants_${tournament.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_participants',
          filter: `tournament_id=eq.${tournament.id}`,
        },
        async (payload) => {
          console.log('[Brackets] Real-time participant event received:', payload.eventType, payload);
          
          // Update participants state and rebuild team mappings in a single operation
          // Use functional update to get latest participants state and avoid double renders
          setParticipants(prevParticipants => {
            // Calculate updated participants
            const updatedParticipants = payload.eventType === 'INSERT' && payload.new
              ? (() => {
                  const exists = prevParticipants.some((p: any) => p.id === payload.new.id);
                  return exists ? prevParticipants : [...prevParticipants, payload.new];
                })()
              : payload.eventType === 'DELETE' && payload.old
              ? prevParticipants.filter((p: any) => p.id !== payload.old.id)
              : payload.eventType === 'UPDATE' && payload.new
              ? prevParticipants.map((p: any) => p.id === payload.new.id ? payload.new : p)
              : prevParticipants;
            
            // Rebuild mappings with updated participants
            buildTeamMappings(updatedParticipants).then(newMappings => {
              // Update matches that reference the affected team
              const affectedTeamId = payload.new?.team_id || payload.old?.team_id;
              if (affectedTeamId) {
                setBracketMatches(prevMatches => 
                  prevMatches.map(match => {
                    const needsUpdate = 
                      (match.team1?.id === affectedTeamId) ||
                      (match.team2?.id === affectedTeamId) ||
                      (match.winner?.id === affectedTeamId);
                    
                    if (needsUpdate) {
                      const updateTeam = (team: BracketTeam | null) => {
                        if (!team || team.id !== affectedTeamId) return team;
                        return {
                          ...team,
                          name: newMappings.teamNameById.get(team.id) || team.name,
                          logo_url: newMappings.teamLogoById.get(team.id) ?? team.logo_url,
                        };
                      };
                      
                      return {
                        ...match,
                        team1: updateTeam(match.team1),
                        team2: updateTeam(match.team2),
                        winner: updateTeam(match.winner),
                      };
                    }
                    return match;
                  })
                );
              }
            });
            
            return updatedParticipants;
          });
        }
      )
      .subscribe((status) => {
        console.log('[Brackets] Subscription status for tournament_participants:', status);
      });

    // Cleanup subscriptions on unmount or tournament change
    return () => {
      console.log('[Brackets] Cleaning up realtime subscriptions for tournament:', tournament.id);
      matchesChannel.unsubscribe();
      resultsChannel.unsubscribe();
      participantsChannel.unsubscribe();
    };
  }, [tournament?.id, buildTeamMappings]); // Removed participants and teamCount - they're only used inside handlers

  // Ensure scheduler has a sensible default when opened
  useEffect(() => {
    if ((showSchedulerModal || showScheduleDialog) && !scheduleStart) {
      const now = new Date();
      const rounded = new Date(Math.ceil(now.getTime() / (15 * 60000)) * (15 * 60000));
      setScheduleStart(rounded.toISOString().slice(0,16));
    }
  }, [showSchedulerModal, showScheduleDialog]);

  // Determine current user's team and captain status for this tournament
  useEffect(() => {
    const run = async () => {
      try {
        if (!user?.id || !tournament?.id) { setIsCaptain(false); setUserTeamId(undefined); return; }
        const { data: reg } = await supabase
          .from('tournament_participants')
          .select('*')
          .eq('tournament_id', tournament.id)
          .or(`user_id.eq.${user.id},team_captain_id.eq.${user.id}`)
          .maybeSingle();
        const teamId = (reg as any)?.team_id as string | undefined;
        setUserTeamId(teamId);
        if (!teamId) { setIsCaptain(false); return; }
        const { data: teamRow } = await supabase
          .from('teams')
          .select('owner_id')
          .eq('id', teamId)
          .maybeSingle();
        if (teamRow?.owner_id === user.id) { setIsCaptain(true); return; }
        const { data: member } = await supabase
          .from('team_members')
          .select('role')
          .eq('team_id', teamId)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        setIsCaptain(!!(member && (member as any).role === 'captain'));
      } catch {
        setIsCaptain(false);
      }
    };
    run();
  }, [user?.id, tournament?.id]);

  const openUploadForMatch = (matchId: string) => {
    setUploadMatchId(matchId);
    setUploadOpen(true);
  };

  // Organizer: generate bracket from registered participants
  const buildTeamsFromParticipants = async (): Promise<BracketTeam[]> => {
    // Include teams with UUIDs
    const teamEntries = (participants as any[]).filter((p: any) => isUuid(p.team_id));
    const seen = new Set<string>();
    const uniqueWithId = teamEntries.filter(p => {
      const id = String(p.team_id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    
    // Also include teams without UUIDs but with team names - resolve them
    const needResolve = (participants as any[]).filter((p: any) => 
      (p as any).participant_type === 'team' && 
      !isUuid(p.team_id) && 
      (p.team_name || p.roster_name)
    );
    
    const resolved: { id: string; name: string; logo_url?: string | null }[] = [];
    if (needResolve.length > 0) {
      const names = Array.from(new Set(needResolve.map((p: any) => p.team_name || p.roster_name).filter(Boolean)));
      if (names.length > 0) {
        // Try exact name matches - also fetch logos
        const { data: teamRows } = await supabase.from('teams').select('id, name, logo_url').in('name', names);
        const mapByName = new Map<string, { id: string; logo_url?: string | null }>();
        (teamRows || []).forEach((t: any) => mapByName.set(t.name, { id: t.id, logo_url: t.logo_url || null }));
        
        // Resolve by name (prefer team_name)
        for (const p of needResolve) {
          const teamName = p.team_name || p.roster_name;
          if (!teamName) continue;
          const match = mapByName.get(teamName);
          if (match) {
            resolved.push({ id: match.id, name: teamName, logo_url: match.logo_url });
          } else {
            // Fuzzy match - also fetch logo
            const { data: fuzzy } = await supabase
              .from('teams')
              .select('id, name, logo_url')
              .ilike('name', `%${teamName}%`)
              .limit(1)
              .maybeSingle();
            if (fuzzy?.id && !resolved.find(r => r.id === fuzzy.id)) {
              resolved.push({ id: fuzzy.id, name: fuzzy.name, logo_url: fuzzy.logo_url || null });
            }
          }
        }
      }
    }
    
    // Fetch team names and logos for teams with UUIDs from teams table
    const teamIds = uniqueWithId.map((p: any) => String(p.team_id));
    const logoMap = new Map<string, string | null>();
    const teamNameMap = new Map<string, string>();
    if (teamIds.length > 0) {
      // First try to get logos from participants
      uniqueWithId.forEach((p: any) => {
        if (p.team_logo) logoMap.set(String(p.team_id), p.team_logo);
      });
      
      // Fetch team names and logos from teams table (prefer actual team name)
      const { data: teamData } = await supabase
        .from('teams')
        .select('id, name, logo_url')
        .in('id', teamIds);
      
      (teamData || []).forEach((t: any) => {
        if (t.id) {
          // Always use team name from teams table (most accurate)
          if (t.name) teamNameMap.set(t.id, t.name);
          // Update logo if not already set from participants
          if (!logoMap.has(t.id)) {
            logoMap.set(t.id, t.logo_url || null);
          }
        }
      });
    }
    
    // Combine both and deduplicate
    const allTeams = [
      ...uniqueWithId.map((p: any) => ({ 
        id: String(p.team_id), 
        // Prefer team name from teams table, fallback to team_name, then roster_name
        name: teamNameMap.get(String(p.team_id)) || p.team_name || p.roster_name || 'Team',
        logo_url: logoMap.get(String(p.team_id)) || null
      })),
      ...resolved
    ];
    
    const finalSeen = new Set<string>();
    const finalUnique = allTeams.filter(t => {
      if (finalSeen.has(t.id)) return false;
      finalSeen.add(t.id);
      return true;
    });
    
    return finalUnique.map((t, i: number) => ({
      id: t.id,
      name: t.name || `Team ${i + 1}`,
      seed: i + 1,
      logo_url: t.logo_url || null
    }));
  };

  const randomizeArray = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };


  // Helper function to round up to next power of 2 (or 24)
  const roundToBracketSize = (teamCount: number): BracketSize => {
    if (teamCount <= 8) return 8;
    if (teamCount <= 16) return 16;
    if (teamCount <= 24) return 24;
    if (teamCount <= 32) return 32;
    if (teamCount <= 64) return 64;
    if (teamCount <= 128) return 128;
    if (teamCount <= 256) return 256;
    return 512;
  };

  // Helper to check if a number is a power of 2
  const isPowerOf2 = (n: number): boolean => {
    return n > 0 && (n & (n - 1)) === 0;
  };

  // One-click: build strictly from registrations and persist immediately (no scheduler)
  const generateFromRegistrationsStrictAndSave = async (selectedSize?: BracketSize, scheduleConfig?: { startTime: string; gapMinutes: number }, useGroups?: boolean, groupSizeParam?: 8 | 16) => {
    try {
      console.log('[Brackets] generateFromRegistrationsStrictAndSave called with selectedSize:', selectedSize, 'scheduleConfig:', scheduleConfig, 'useGroups:', useGroups);
      // Build team list resolving missing team_ids from names
      const regTeams = await buildTeamsFromParticipants();
      if (regTeams.length < 2) {
        toast({ title: 'Not enough participants', description: 'Need at least 2 to generate a bracket.' });
        return;
      }

      // Determine if we should use group stages (for 64+ teams or if explicitly requested)
      const shouldUseGroups = useGroups || (regTeams.length >= 64 && !selectedSize);
      const actualGroupSize = groupSizeParam || 8;

      let finalSize: BracketSize;
      let groupStageMatches: BracketMatch[] = [];
      
      if (shouldUseGroups && regTeams.length >= 64) {
        // Group stage mode: split teams into groups, top teams advance to playoffs
        const numGroups = Math.ceil(regTeams.length / actualGroupSize);
        const teamsPerGroup = Math.ceil(regTeams.length / numGroups);
        const shuffled = randomizeArray(regTeams);
        
        // Create groups
        const groups: BracketTeam[][] = [];
        for (let g = 0; g < numGroups; g++) {
          const groupTeams = shuffled.slice(g * teamsPerGroup, (g + 1) * teamsPerGroup);
          groups.push(groupTeams.map((t, i) => ({ ...t, seed: i + 1 })));
        }

        // Generate matches for each group (round-robin within groups)
        let matchId = 1;
        for (let groupIdx = 0; groupIdx < groups.length; groupIdx++) {
          const group = groups[groupIdx];
          // Round-robin: each team plays every other team once
          for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) {
              groupStageMatches.push({
                id: `group-${groupIdx + 1}-match-${matchId++}`,
                round: 0, // Round 0 = group stage
                matchNumber: matchId - 1,
                team1: group[i],
                team2: group[j],
                winner: null,
                score: null,
                status: 'pending',
              });
            }
          }
        }

        // Top 2 from each group advance to playoffs
        // Playoff size = numGroups * 2 (top 2 from each group)
        const playoffSize = numGroups * 2;
        finalSize = roundToBracketSize(playoffSize) as BracketSize;
        
        toast({
          title: 'Group Stage Created',
          description: `${regTeams.length} teams split into ${numGroups} groups. Top 2 from each group advance to ${finalSize}-team playoffs.`,
        });
      } else {
        // Standard single elimination
        const bracketSize = selectedSize || roundToBracketSize(regTeams.length);
        console.log('[Brackets] Using bracketSize:', bracketSize);
        
        // Use the selected bracket size STRICTLY (user's choice)
        // If user selected 8, use 8 - we'll only take the first N teams
        const minRequiredSize = roundToBracketSize(regTeams.length);
        
        if (selectedSize) {
          // User made a selection - use it strictly
          finalSize = selectedSize;
          // Warn if we have more teams than bracket size (we'll only use first N teams)
          if (regTeams.length > selectedSize) {
            toast({ 
              title: 'Info', 
              description: `Using first ${selectedSize} teams for ${selectedSize}-team bracket. ${regTeams.length - selectedSize} teams will not be included.`,
            });
          }
        } else {
          // No selection - calculate minimum required
          finalSize = minRequiredSize;
        }
      }
      
      console.log('[Brackets] Generating bracket:', { 
        selectedSize: selectedSize, 
        registeredTeams: regTeams.length, 
        finalSize 
      });
      
      // If we have group stages, we need to handle playoff bracket generation differently
      if (shouldUseGroups && groupStageMatches.length > 0) {
        // For group stages, we'll save group matches first, then generate playoff bracket later
        // For now, save group matches and set up playoff structure
        await persistMatches(groupStageMatches);
        setTeamCount(finalSize);
        toast({
          title: 'Group Stage Generated',
          description: `Group stage matches created. Playoff bracket will be ${finalSize} teams.`,
        });
        return; // Exit early - playoff bracket will be generated after group stage completion
      }

      // Standard single elimination bracket generation
      // Auto seeding: randomize teams and assign seeds based on bracket position
      // Standard bracket seeding: match 1 = (seed 1, seed N), match 2 = (seed 2, seed N-1), etc.
      // Only use first N teams if we have more than bracket size
      const teamsToUse = regTeams.slice(0, finalSize);
      const shuffled = randomizeArray(teamsToUse);
      setTeamCount(finalSize);
      const padded: BracketTeam[] = [];
      
      // Create teams array with BYEs if needed
      for (let i = 0; i < finalSize; i++) {
        if (i < shuffled.length) {
          padded.push(shuffled[i]);
        } else {
          // BYE slots
          padded.push({ id: `bye-${i + 1}`, name: 'BYE', seed: 0, eliminated: true });
        }
      }
      
      // Pair teams for Round 1: randomize position, then assign seeds based on match position
      // Match 1: team1 gets seed 1, team2 gets seed N
      // Match 2: team1 gets seed 2, team2 gets seed N-1, etc.
      // IMPORTANT: Each team should only appear once in Round 1
      const round1Matches: BracketTeam[] = [];
      const usedTeamIds = new Set<string>(); // Track teams already assigned
      
      // Deduplicate teams before pairing (ensure each team appears only once)
      const uniqueTeams: BracketTeam[] = [];
      const seenTeamIds = new Set<string>();
      for (const team of padded) {
        if (team && team.id && !team.id.startsWith('bye-')) {
          if (!seenTeamIds.has(team.id)) {
            uniqueTeams.push(team);
            seenTeamIds.add(team.id);
          } else {
            console.warn('[Brackets] Skipping duplicate team in padded array:', team.id, team.name);
          }
        } else {
          // BYE slots are always included
          uniqueTeams.push(team);
        }
      }
      
      // Fill remaining slots with BYEs if needed
      while (uniqueTeams.length < finalSize) {
        uniqueTeams.push({ id: `bye-${uniqueTeams.length + 1}`, name: 'BYE', seed: 0, eliminated: true });
      }
      
      for (let i = 0; i < finalSize / 2; i++) {
        // Lower position teams (will be team1 in matches)
        const team1 = uniqueTeams[i];
        // Higher position teams (will be team2 in matches) - opposite end
        const team2 = uniqueTeams[finalSize - 1 - i];
        
        // Final verification: ensure teams aren't the same (unless one is BYE)
        if (team1 && team2 && team1.id === team2.id && !team1.id.startsWith('bye-')) {
          console.error('[Brackets] ERROR: Same team in both slots for match', i + 1, ':', team1.id, team1.name);
          // Replace team2 with BYE to prevent duplicate
          const byeTeam: BracketTeam = { id: `bye-${i + 1}`, name: 'BYE', seed: 0, eliminated: true };
          round1Matches.push(team1 ? { ...team1, seed: i + 1 } : team1);
          round1Matches.push(byeTeam);
          continue;
        }
        
        // Verify teams aren't duplicates across matches
        if (team1 && team1.id && !team1.id.startsWith('bye-')) {
          if (usedTeamIds.has(team1.id)) {
            console.error('[Brackets] Duplicate team detected in Round 1 generation:', team1.id, team1.name);
            // Replace with BYE to prevent duplicate
            const byeTeam: BracketTeam = { id: `bye-${i + 1}`, name: 'BYE', seed: 0, eliminated: true };
            round1Matches.push(byeTeam);
            round1Matches.push(team2 ? { ...team2, seed: finalSize - i } : team2);
            continue;
          }
          usedTeamIds.add(team1.id);
        }
        if (team2 && team2.id && !team2.id.startsWith('bye-')) {
          if (usedTeamIds.has(team2.id)) {
            console.error('[Brackets] Duplicate team detected in Round 1 generation:', team2.id, team2.name);
            // Replace with BYE to prevent duplicate
            const byeTeam: BracketTeam = { id: `bye-${finalSize - i}`, name: 'BYE', seed: 0, eliminated: true };
            round1Matches.push(team1 ? { ...team1, seed: i + 1 } : team1);
            round1Matches.push(byeTeam);
            continue;
          }
          usedTeamIds.add(team2.id);
        }
        
        round1Matches.push(team1 ? { ...team1, seed: i + 1 } : team1); // Seed = match number
        round1Matches.push(team2 ? { ...team2, seed: finalSize - i } : team2); // Seed = N - match number + 1
      }
      
      console.log('[Brackets] Generated Round 1 matches:', {
        totalTeams: padded.length,
        matchesToCreate: finalSize / 2,
        uniqueTeamsUsed: usedTeamIds.size,
        round1MatchesLength: round1Matches.length
      });
      
      const newMatches: BracketMatch[] = [];
      let matchId = 1;
      let currentRound = 1;
      
      // Create Round 1 matches
      for (let i = 0; i < round1Matches.length; i += 2) {
        const matchNumber = Math.floor(i / 2) + 1;
        const team1 = round1Matches[i] || null;
        const team2 = round1Matches[i + 1] || null;
        
        // Final check for duplicates before creating match
        if (team1 && team2 && team1.id === team2.id && !team1.id.startsWith('bye-')) {
          console.error('[Brackets] ERROR: Same team in both slots for match', matchNumber, ':', team1.id);
        }
        
        newMatches.push({
          id: `match-${matchId++}`,
          round: currentRound,
          matchNumber: matchNumber,
          team1: team1,
          team2: team2,
          winner: null,
          score: null,
          team1_score: null,
          team2_score: null,
          status: 'pending',
        });
      }
      
      // Create subsequent rounds (Quarterfinals, Semifinals, Finals)
      // For 8 teams: Round 1 has 4 matches, Round 2 has 2 matches, Round 3 has 1 match
      // Total rounds = log2(teamCount) - but handle non-power-of-2 sizes
      const totalRounds = isPowerOf2(finalSize) ? Math.log2(finalSize) : Math.ceil(Math.log2(finalSize));
      // Round 2 starts with finalSize / 4 matches (half of Round 1 matches)
      let remaining = finalSize / 4; // Number of matches in Round 2
      
      console.log('[Brackets] Generating subsequent rounds:', {
        finalSize,
        totalRounds,
        round1Matches: newMatches.filter(m => m.round === 1).length,
        remainingForRound2: remaining
      });
      
      currentRound = 2;
      while (currentRound <= totalRounds && remaining >= 1) {
        const matchesInThisRound = Math.floor(remaining);
        console.log(`[Brackets] Creating Round ${currentRound} with ${matchesInThisRound} matches`);
        for (let i = 0; i < matchesInThisRound; i++) {
          newMatches.push({
            id: `match-${matchId++}`,
            round: currentRound,
            matchNumber: i + 1,
            team1: null,
            team2: null,
            winner: null,
            score: null,
            team1_score: null,
            team2_score: null,
            status: 'pending',
          });
        }
        remaining = Math.floor(remaining / 2);
        currentRound++;
      }
      
      console.log('[Brackets] Total matches generated:', {
        total: newMatches.length,
        byRound: {
          round1: newMatches.filter(m => m.round === 1).length,
          round2: newMatches.filter(m => m.round === 2).length,
          round3: newMatches.filter(m => m.round === 3).length,
          round4: newMatches.filter(m => m.round === 4).length,
        }
      });
      
      // Apply schedule if provided during generation
      if (scheduleConfig && scheduleConfig.startTime) {
        const start = new Date(scheduleConfig.startTime);
        const updatedMatches = newMatches.map((m, idx) => {
          const scheduledDate = new Date(start.getTime() + idx * scheduleConfig.gapMinutes * 60000);
          return {
            ...m,
            scheduledTime: scheduledDate.toISOString() // Store as ISO string for consistency
          };
        });
        await persistMatches(updatedMatches);
        console.log('[Brackets] Generated bracket with schedule:', updatedMatches.length, 'matches with times');
      } else {
        await persistMatches(newMatches);
      }
      
      // State is updated immediately in persistMatches - no need to wait for real-time
    } catch (e: any) {
      toast({ title: 'Generation failed', description: e?.message || 'Could not generate bracket', variant: 'destructive' });
    }
  };

  const persistMatches = async (matchesToSave: BracketMatch[]) => {
    try {
      if (!tournament) return;
      // clear existing matches first
      const del = await supabase.from('tournament_matches').delete().eq('tournament_id', tournament.id);
      if (del.error) throw del.error;
      // Resolve any placeholder team IDs (e.g., 'name:xyz') to real team IDs using teams table or participants
      const placeholderTeams = new Map<string, string>(); // key: placeholder id, value: team name
      matchesToSave.forEach(m => {
        if (m.team1?.id && m.team1.id.startsWith('name:')) placeholderTeams.set(m.team1.id, m.team1.name);
        if (m.team2?.id && m.team2.id.startsWith('name:')) placeholderTeams.set(m.team2.id, m.team2.name);
      });

      const resolvedIdByPlaceholder = new Map<string, string>();
      // Resolve using in-memory participants first (no RLS issues)
      if (placeholderTeams.size > 0) {
        const nameToTeamId = new Map<string, string>();
        (participants || []).forEach((p: any) => {
          if (p.team_id) {
            const keyA = String(p.team_name || '').trim().toLowerCase();
            const keyB = String(p.roster_name || '').trim().toLowerCase();
            if (keyA) nameToTeamId.set(keyA, p.team_id);
            if (keyB) nameToTeamId.set(keyB, p.team_id);
          }
        });
        for (const [ph, nm] of placeholderTeams.entries()) {
          const key = String(nm || '').trim().toLowerCase();
          const found = key ? nameToTeamId.get(key) : undefined;
          if (found) resolvedIdByPlaceholder.set(ph, found);
        }
      }
      if (placeholderTeams.size > 0) {
        const names = Array.from(new Set(Array.from(placeholderTeams.values()).filter(Boolean)));
        // 1) Exact name matches from teams table
        if (names.length > 0) {
          const { data: exactTeams } = await supabase
            .from('teams')
            .select('id, name')
            .in('name', names);
          (exactTeams || []).forEach((row: any) => {
            // find placeholders that used this name
            for (const [ph, nm] of placeholderTeams.entries()) {
              if (!resolvedIdByPlaceholder.has(ph) && nm === row.name) resolvedIdByPlaceholder.set(ph, row.id);
            }
          });
        }
        // 2) Fallback to participants with team_id
        const unresolvedNames = Array.from(new Set(Array.from(placeholderTeams.entries())
          .filter(([ph]) => !resolvedIdByPlaceholder.has(ph))
          .map(([ph, nm]) => nm)));
        if (unresolvedNames.length > 0) {
          const { data: partRows } = await supabase
            .from('tournament_participants')
            .select('team_id, team_name, roster_name')
            .eq('tournament_id', tournament.id)
            .in('team_name', unresolvedNames);
          (partRows || []).forEach((row: any) => {
            if (!row?.team_id) return;
            for (const [ph, nm] of placeholderTeams.entries()) {
              if (resolvedIdByPlaceholder.has(ph)) continue;
              if (nm === row.team_name || nm === row.roster_name) resolvedIdByPlaceholder.set(ph, row.team_id);
            }
          });
          // Also try ilike on roster_name if necessary
          if (unresolvedNames.length > 0) {
            const { data: partRows2 } = await supabase
              .from('tournament_participants')
              .select('team_id, team_name, roster_name')
              .eq('tournament_id', tournament.id);
            (partRows2 || []).forEach((row: any) => {
              if (!row?.team_id) return;
              for (const [ph, nm] of placeholderTeams.entries()) {
                if (resolvedIdByPlaceholder.has(ph)) continue;
                const key = String(nm || '').toLowerCase();
                if (String(row.team_name || '').toLowerCase() === key || String(row.roster_name || '').toLowerCase() === key) {
                  resolvedIdByPlaceholder.set(ph, row.team_id);
                }
              }
            });
          }
        }
        // 3) Last resort: fuzzy search teams by ilike, one by one
        for (const [ph, nm] of placeholderTeams.entries()) {
          if (resolvedIdByPlaceholder.has(ph) || !nm) continue;
          const fuzzy = await supabase
            .from('teams')
            .select('id, name')
            .ilike('name', `%${nm}%`)
            .limit(1)
            .maybeSingle();
          if (fuzzy.data?.id) {
            resolvedIdByPlaceholder.set(ph, fuzzy.data.id);
          }
        }
      }

      // insert with team slots and schedule if present
      const payload = matchesToSave.map(m => {
        const team1IdRaw = m.team1?.id || null;
        const team2IdRaw = m.team2?.id || null;
        const t1 = (team1IdRaw && team1IdRaw.startsWith('name:')) ? (resolvedIdByPlaceholder.get(team1IdRaw) || null) : team1IdRaw;
        const t2 = (team2IdRaw && team2IdRaw.startsWith('name:')) ? (resolvedIdByPlaceholder.get(team2IdRaw) || null) : team2IdRaw;
        const safeT1 = (t1 && !t1.startsWith('bye-') && !t1.startsWith('name:')) ? t1 : null;
        const safeT2 = (t2 && !t2.startsWith('bye-') && !t2.startsWith('name:')) ? t2 : null;
        return {
        tournament_id: tournament.id,
        round: m.round,
        match_number: m.matchNumber,
        team1_id: safeT1,
        team2_id: safeT2,
        scheduled_at: m.scheduledTime ? new Date(m.scheduledTime) : null,
        best_of: m.bestOf || 1,
        };
      });
      console.log('[Brackets] persistMatches: Inserting', payload.length, 'matches into database');
      let ins = await supabase.from('tournament_matches').insert(payload).select('*');
      if (ins.error) {
        const msg = String(ins.error.message || '').toLowerCase();
        console.error('[Brackets] persistMatches: Insert error:', ins.error);
        // Some schemas require a non-null match_id column on tournament_matches
        if (msg.includes('match_id') && (msg.includes('not-null') || msg.includes('null value'))) {
          const genId = () => {
            try { return (crypto as any)?.randomUUID?.() || null; } catch { return null; }
          };
          const payloadWithMatchId = matchesToSave.map(m => ({
            tournament_id: tournament.id,
            round: m.round,
            match_number: m.matchNumber,
            team1_id: (m.team1?.id && !m.team1.id.startsWith('bye-') && !m.team1.id.startsWith('name:')) ? m.team1.id : null,
            team2_id: (m.team2?.id && !m.team2.id.startsWith('bye-') && !m.team2.id.startsWith('name:')) ? m.team2.id : null,
            scheduled_at: m.scheduledTime ? new Date(m.scheduledTime) : null,
            best_of: m.bestOf || 1,
            // Try UUID first; if DB expects text it will still accept UUID as text in many schemas
            match_id: genId() || `${tournament.id}:${m.round}:${m.matchNumber}`,
          }));
          console.log('[Brackets] persistMatches: Retrying with match_id, payload length:', payloadWithMatchId.length);
          ins = await supabase.from('tournament_matches').insert(payloadWithMatchId).select('*');
          if (ins.error) {
            console.error('[Brackets] persistMatches: Retry insert error:', ins.error);
            throw ins.error;
          }
        } else {
          throw ins.error;
        }
      }
      
      console.log('[Brackets] persistMatches: Successfully inserted', ins.data?.length || 0, 'matches');
      
      // Immediately update local state with the inserted matches for instant UI update
      if (ins.data && ins.data.length > 0) {
        const teamMappings = await buildTeamMappings(participants || []);
        const convertedMatches = await Promise.all(
          ins.data.map((dbMatch: any) => 
            convertDbMatchToBracketMatch(dbMatch, teamMappings.teamNameById, teamMappings.teamLogoById, teamCount)
          )
        );
        const validMatches = convertedMatches.filter((m): m is BracketMatch => m !== null);
        
        console.log('[Brackets] persistMatches: Converted', validMatches.length, 'matches, updating state');
        
        // Update state immediately
        setBracketMatches(validMatches);
        setMatches(ins.data);
      } else {
        console.warn('[Brackets] persistMatches: No data returned from insert, matches may not have been saved');
      }
      
      toast({ title: 'Brackets saved', description: `Bracket matches have been stored (${ins.data?.length || 0} matches). All users will see the updated bracket.` });
    } catch (e: any) {
      console.error('Failed to save brackets:', e);
      toast({ title: 'Save failed', description: e?.message || 'Could not save brackets', variant: 'destructive' });
    }
  };

  const saveBracketToDatabase = async () => {
    const toSave = (draftMatches && draftMatches.length > 0) ? draftMatches : bracketMatches;
    if (!toSave || toSave.length === 0) {
      toast({ title: 'Nothing to save', description: 'Generate or edit the bracket before saving.' });
      return;
    }
    
    try {
      await persistMatches(toSave);
      // Clear draft matches after successful save
      setDraftMatches(null);
    } catch (error: any) {
      console.error('Error saving bracket:', error);
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to save bracket changes', 
        variant: 'destructive' 
      });
    }
  };

  const clearBracketCompletely = async () => {
    try {
      if (!tournament) return;
      
      // Confirm before clearing
      if (!confirm('Are you sure you want to DELETE all bracket matches? This will completely remove the bracket and you will need to regenerate it.')) {
        return;
      }
      
      setIsClearing(true);
      
      // Get all match IDs before deleting matches
      const { data: matchIds } = await supabase
        .from('tournament_matches')
        .select('id')
        .eq('tournament_id', tournament.id);
      
      const ids = matchIds?.map(m => m.id) || [];
      
      // Delete match results associated with these matches BEFORE deleting matches
      if (ids.length > 0) {
        const { error: resultsDeleteError } = await supabase
          .from('tournament_match_results')
          .delete()
          .in('match_id', ids);
        
        if (resultsDeleteError) {
          console.error('[Brackets] Error deleting match results:', resultsDeleteError);
          // Continue anyway - matches will be deleted
        } else {
          console.log('[Brackets] Deleted match results for', ids.length, 'matches');
        }
      }
      
      // Delete all matches for this tournament
      const { error: deleteError } = await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournament.id);
      
      if (deleteError) {
        console.error('[Brackets] Error deleting matches:', deleteError);
        throw deleteError;
      }
      
      // Clear local state
      setMatches([]);
      setBracketMatches([]);
      
      toast({ 
        title: 'Bracket Cleared', 
        description: 'All matches have been deleted. You can now generate a new bracket.' 
      });
      
    } catch (e: any) {
      console.error('Error clearing bracket:', e);
      toast({ 
        title: 'Clear failed', 
        description: e?.message || 'Could not clear matches', 
        variant: 'destructive' 
      });
    } finally {
      setIsClearing(false);
    }
  };

  const clearBracketInDatabase = async () => {
    try {
      if (!tournament) return;
      
      // Confirm before resetting
      if (!confirm('Are you sure you want to reset all bracket matches? This will reset all match statuses, scores, and winners, but keep the bracket structure.')) {
        return;
      }
      
      setIsClearing(true);
      
      // Get all matches for this tournament
      const { data: matchIds, error: fetchError } = await supabase
        .from('tournament_matches')
        .select('id')
        .eq('tournament_id', tournament.id);
      
      if (fetchError) {
        console.error('[Brackets] Error fetching matches:', fetchError);
        throw fetchError;
      }
      
      if (!matchIds || matchIds.length === 0) {
        toast({ title: 'No matches', description: 'There are no matches to reset.' });
        setIsClearing(false);
        return;
      }
      
      const ids = matchIds.map(m => m.id);
      
      // Delete match results associated with these matches
      // Delete by match_id first (more specific)
      const { error: resultsDeleteError } = await supabase
        .from('tournament_match_results')
        .delete()
        .in('match_id', ids);
      
      if (resultsDeleteError) {
        console.error('[Brackets] Error deleting match results by match_id:', resultsDeleteError);
        // Try deleting by tournament_id as fallback
        const { error: tournamentResultsDeleteError } = await supabase
          .from('tournament_match_results')
          .delete()
          .eq('tournament_id', tournament.id);
        
        if (tournamentResultsDeleteError) {
          console.error('[Brackets] Error deleting match results by tournament_id:', tournamentResultsDeleteError);
        } else {
          console.log('[Brackets] Deleted match results by tournament_id');
        }
      } else {
        console.log('[Brackets] Deleted match results for', ids.length, 'matches');
      }
      
      // Reset map veto for each match using the same RPC function that the map veto component uses
      // Then also clear best_of and selected_map_pool to start from scratch
      console.log('[Brackets] Resetting map vetos for', ids.length, 'matches');
      for (const matchId of ids) {
        try {
          // First, find the veto ID if it exists
          const { data: existingVeto } = await supabase
            .from('valorant_match_map_vetos')
            .select('id')
            .eq('match_id', matchId)
            .maybeSingle();
          
          if (existingVeto) {
            // Delete all actions first
            const { error: deleteActionsError } = await supabase
              .from('valorant_match_map_veto_actions')
              .delete()
              .eq('veto_id', existingVeto.id);
            
            if (deleteActionsError) {
              console.error(`[Brackets] Error deleting veto actions for match ${matchId}:`, deleteActionsError);
            }
            
            // Then call the RPC function to reset the veto state
            const { error: vetoResetError } = await supabase.rpc('reset_match_veto', {
              p_match_id: matchId,
            });
            
            if (vetoResetError) {
              // If veto doesn't exist for this match, that's okay - just log and continue
              if (vetoResetError.code !== 'P0001' && !vetoResetError.message?.includes('not found')) {
                console.error(`[Brackets] Error resetting veto for match ${matchId}:`, vetoResetError);
              }
            } else {
              // After reset, also clear best_of and selected_map_pool to start from scratch
              // This ensures the flow goes: map pool selection -> BO selection -> map pick/ban
              const { error: clearError } = await supabase
                .from('valorant_match_map_vetos')
                .update({
                  best_of: null,
                  selected_map_pool: null,
                  updated_at: new Date().toISOString()
                })
                .eq('match_id', matchId);
              
              if (clearError) {
                console.error(`[Brackets] Error clearing best_of/selected_map_pool for match ${matchId}:`, clearError);
              } else {
                console.log(`[Brackets] Successfully reset veto for match ${matchId}`);
              }
            }
          } else {
            console.log(`[Brackets] No veto found for match ${matchId}, skipping reset`);
          }
        } catch (error: any) {
          // If RPC function doesn't exist or match has no veto, that's okay - continue
          console.log(`[Brackets] Could not reset veto for match ${matchId} (may not exist):`, error?.message || error);
        }
      }
      
      // Reset all matches: set status to 'pending', clear scores, clear winners, clear party codes
      console.log('[Brackets] resetBracketInDatabase: Resetting all matches for tournament:', tournament.id);
      
      const { error: updateError } = await supabase
        .from('tournament_matches')
        .update({
          status: 'pending',
          team1_score: 0,
          team2_score: 0,
          winner_team_id: null,
          party_code: null,
          updated_at: new Date().toISOString()
        })
        .eq('tournament_id', tournament.id);
      
      if (updateError) {
        console.error('[Brackets] Error resetting matches:', updateError);
        throw updateError;
      }
      
      const resetCount = matchIds.length;
      console.log('[Brackets] resetBracketInDatabase: Reset', resetCount, 'matches');
      
      // Update local state immediately to reflect reset
      setMatches(prevMatches => 
        prevMatches.map(match => ({
          ...match,
          status: 'pending' as const,
          team1_score: 0,
          team2_score: 0,
          winner_id: null,
          score: '0-0',
          partyCode: null
        }))
      );
      
      setBracketMatches(prevBracketMatches =>
        prevBracketMatches.map(match => ({
          ...match,
          status: 'pending' as const,
          team1_score: 0,
          team2_score: 0,
          score: '0-0',
          winner: null,
          partyCode: null,
          resultImages: [], // Clear submitted result images
          resultComments: [] // Clear submitted result comments
        }))
      );
      
      toast({ 
        title: 'Bracket Reset', 
        description: `All ${resetCount} matches have been reset to pending status. Scores, winners, and submitted results have been cleared.` 
      });
      
      // Real-time subscription will update UI automatically for other browsers
    } catch (e: any) {
      console.error('Error resetting bracket:', e);
      toast({ 
        title: 'Reset failed', 
        description: e?.message || 'Could not reset matches', 
        variant: 'destructive' 
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleGenerateBracket = async () => {
    setShowGenerateDialog(false);
    // After generating bracket, show schedule dialog
    setShowScheduleDialog(true);
  };
  
  const handleGenerateAndSchedule = async () => {
    try {
      // Generate bracket with schedule if provided
      console.log('[Brackets] handleGenerateAndSchedule called with selectedBracketSize:', selectedBracketSize);
      
      if (scheduleStart) {
        const select = document.getElementById('schedule-gap-select') as HTMLSelectElement | null;
        const gapMinutes = select ? parseInt(select.value) : 30;
        // Generate bracket with schedule included
        await generateFromRegistrationsStrictAndSave(selectedBracketSize, { 
          startTime: scheduleStart, 
          gapMinutes 
        });
        toast({ title: 'Bracket generated', description: 'Bracket has been created and scheduled successfully.' });
      } else {
        // Generate bracket without schedule
        await generateFromRegistrationsStrictAndSave(selectedBracketSize);
        toast({ title: 'Bracket generated', description: 'Bracket has been created successfully. You can schedule matches later.' });
      }
    } catch (error: any) {
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to generate bracket', 
        variant: 'destructive' 
      });
    }
  };

  const applyAutoSchedule = async (gapMinutes = 30) => {
    if (!scheduleStart) {
      toast({ title: 'Error', description: 'Please select a start date and time', variant: 'destructive' });
      return;
    }
    
    const base = (draftMatches && draftMatches.length > 0) ? draftMatches : bracketMatches;
    if (!base || base.length === 0) { 
      setShowSchedulerModal(false); 
      setDraftMatches(null); 
      return; 
    }
    
    try {
      const start = new Date(scheduleStart);
      const updated = base.map((m, idx) => ({
        ...m,
        scheduledTime: new Date(start.getTime() + idx * gapMinutes * 60000).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
      }));
      setBracketMatches(updated);
      setDraftMatches(null);
      setShowSchedulerModal(false);
      // Auto-persist so players can see brackets immediately
      await persistMatches(updated);
      toast({ title: 'Schedule applied', description: 'Match times have been scheduled and saved.' });
    } catch (error: any) {
      console.error('Error applying schedule:', error);
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to apply schedule', 
        variant: 'destructive' 
      });
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-esports-dark text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 bg-gaming-gray/20 rounded"></div>
            <div className="h-64 bg-gaming-gray/20 rounded"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-esports-dark text-white">
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Tournament not found</h1>
            <Button
              onClick={() => navigate('/organizer/tournaments')}
              className="bg-gaming-purple hover:bg-gaming-purple/80"
            >
              Back to Tournaments
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Restrict viewing to registered players or organizer-owner
  if (!isOrganizerOwner && !canView) {
  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <main className="container mx-auto px-4 py-8">
          <div className="max-w-[800px] mx-auto text-center">
            <h1 className="text-2xl font-bold mb-3">Brackets unavailable</h1>
            <p className="text-gray-400 mb-6">You must be registered in this tournament to view brackets.</p>
            <Button onClick={() => navigate(`/tournaments/${(tournament as any)?.slug || tournament.id}`)} className="bg-gaming-purple hover:bg-gaming-purple/80">View Tournament</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">{tournament.name}</h1>
              <p className="text-gray-400">{tournament.game}</p>
            </div>
            <Button
              onClick={() => navigate(`/organizer/tournament/${slug}`)}
              variant="outline"
              className="border-gaming-gray/30"
            >
              Back to Tournament
            </Button>
          </div>

          <Card className="bg-gaming-dark border-gaming-gray/30">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl">Tournament Brackets</CardTitle>
                <div className="flex gap-2 items-center flex-wrap justify-end">
                  {isOrganizerOwner && (
                    <>
                      {bracketMatches.length === 0 ? (
                        <>
                          <Button 
                            variant="default" 
                            className="bg-blue-600 hover:bg-blue-700" 
                            onClick={() => setShowGenerateDialog(true)}
                            disabled={participants.filter(p => p.participant_type === 'team').length < 2}
                          >
                            Generate Bracket
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="w-32 px-3 py-2 text-sm bg-gaming-gray/10 border border-gaming-gray/20 rounded text-gray-300 text-center select-none">
                            {teamCount} Teams
                          </div>
                          <Button 
                            variant="outline" 
                            className="border-gaming-gray/30" 
                            onClick={() => setShowEditBracket(!showEditBracket)}
                          >
                            {showEditBracket ? 'Hide Edit Options' : 'Edit Bracket'}
                          </Button>
                          {showEditBracket && (
                            <Button variant="outline" className="border-gaming-gray/30" onClick={() => setShowSchedulerModal(true)}>
                              Schedule Matches
                            </Button>
                          )}
                          <Button variant="outline" className="border-gaming-gray/30" onClick={saveBracketToDatabase}>
                            Save Bracket
                          </Button>
                          {/* Clear Bracket button - deletes all matches */}
                          <Button 
                            variant="destructive" 
                            onClick={clearBracketCompletely} 
                            disabled={isClearing}
                            className="font-semibold border-2 border-red-600/50"
                            title="Delete all matches completely (requires regeneration)"
                          >
                            {isClearing ? 'Clearing...' : 'ðŸ—‘ï¸ Clear Bracket'}
                          </Button>
                          {/* Reset Bracket button - resets statuses but keeps structure */}
                          <Button 
                            variant="outline" 
                            onClick={clearBracketInDatabase} 
                            disabled={isClearing}
                            className="font-semibold border-2 border-orange-600/50 text-orange-400 hover:text-orange-300"
                            title="Reset all match statuses, scores, and winners (keeps bracket structure)"
                          >
                            {isClearing ? 'Resetting...' : 'ðŸ”„ Reset Bracket'}
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  {!isOrganizerOwner && (
                    <div className="w-32 px-3 py-2 text-sm bg-gaming-gray/10 border border-gaming-gray/20 rounded text-gray-300 text-center select-none">
                      {teamCount} Teams
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {bracketMatches.length > 0 ? (
                <div className="space-y-6">
                  {/* Round Navigation */}
                  <div className="flex items-center justify-between bg-gaming-gray/10 rounded-xl p-4 border border-gaming-gray/20">
                    <Button
                      variant="outline"
                      onClick={goToPreviousRound}
                      disabled={currentRound === 1}
                      className="border-gaming-gray/30 hover:border-gaming-purple/50 disabled:opacity-50"
                    >
                      â† Previous Round
                    </Button>

                    <div className="flex items-center gap-4">
                      <span className="text-sm text-gray-400">Round</span>
                      <Select
                        value={currentRound.toString()}
                        onValueChange={(value) => setCurrentRound(parseInt(value))}
                      >
                        <SelectTrigger className="w-48 bg-gaming-gray/20 border-gaming-gray/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: totalRounds }, (_, i) => i + 1).map(round => {
                            const roundMatches = bracketMatches.filter(m => m.round === round);
                            return (
                              <SelectItem key={round} value={round.toString()}>
                                Round {round}: {roundMatches.length} {roundMatches.length === 1 ? 'match' : 'matches'}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button
                      variant="outline"
                      onClick={goToNextRound}
                      disabled={currentRound === totalRounds}
                      className="border-gaming-gray/30 hover:border-gaming-purple/50 disabled:opacity-50"
                    >
                      Next Round â†’
                    </Button>
                  </div>

                  {/* Round Overview */}
                  <div className="bg-gaming-dark/50 rounded-lg p-4 border border-gaming-gray/20">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-white">
                          {getRoundName(currentRound)}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {bracketMatches.filter(m => m.round === currentRound).length} matches â€¢
                          Round {currentRound} of {totalRounds}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gaming-purple">
                          {bracketMatches.filter(m => m.round === currentRound && m.status === 'completed').length}
                          <span className="text-sm text-gray-400"> / </span>
                          {bracketMatches.filter(m => m.round === currentRound).length}
                        </div>
                        <div className="text-xs text-gray-400">Matches Completed</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gaming-gray/30 rounded-full h-2">
                      <div
                        className="bg-gaming-purple h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${(bracketMatches.filter(m => m.round === currentRound && m.status === 'completed').length /
                                  bracketMatches.filter(m => m.round === currentRound).length) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Single Round Bracket View */}
                  <div className="w-full">
                    <div className="min-w-0 max-w-full">
                      <BracketVisualization
                        matches={bracketMatches}
                        teamCount={teamCount}
                        tournamentId={tournament?.id}
                        isOrganizer={isOrganizerOwner}
                        isCaptain={isCaptain}
                        searchQuery={searchQuery}
                        expandedRounds={expandedRounds}
                        onToggleRound={toggleRound}
                        currentRound={currentRound}
                        userTeamId={userTeamId}
                    matches={bracketMatches}
                    teamCount={teamCount}
                    tournamentId={tournament?.id}
                    isOrganizer={isOrganizerOwner}
                    isCaptain={isCaptain}
                    searchQuery={searchQuery}
                    expandedRounds={expandedRounds}
                    onToggleRound={toggleRound}
                        userTeamId={userTeamId}
                        matchVetoLinks={matchVetoLinks}
                    onUploadResult={openUploadForMatch}
                    onOpenMapVeto={(match, matchId) => {
                      setMapVetoMatch(match);
                      setMapVetoMatchId(matchId);
                      setMapVetoOpen(true);
                      // Remove notification badge after opening
                      setMatchVetoLinks(prev => {
                        const newMap = new Map(prev);
                        newMap.delete(matchId);
                        return newMap;
                      });
                    }}
                    onSwapTeam={async ({ source, target }) => {
                      // Restrict DnD to Round 1 and pending matches to avoid integrity issues
                      if (source.round !== 1 || target.round !== 1) return;
                      const next = bracketMatches.map(m => ({ ...m }));
                      const sIdx = next.findIndex(m => m.round === source.round && m.matchNumber === source.matchNumber);
                      const tIdx = next.findIndex(m => m.round === target.round && m.matchNumber === target.matchNumber);
                      if (sIdx === -1 || tIdx === -1) return;
                      const sMatch = next[sIdx];
                      const tMatch = next[tIdx];
                      if (sMatch.status !== 'pending' || tMatch.status !== 'pending') return;
                      const sTeam = source.slot === 'team1' ? sMatch.team1 : sMatch.team2;
                      const tTeam = target.slot === 'team1' ? tMatch.team1 : tMatch.team2;
                      // Prevent dragging BYE or null
                      if (!sTeam || (sTeam.id || '').startsWith('bye-')) return;
                      
                      // Swap in UI state first for immediate feedback
                      if (source.slot === 'team1') sMatch.team1 = tTeam || null; else sMatch.team2 = tTeam || null;
                      if (target.slot === 'team1') tMatch.team1 = sTeam; else tMatch.team2 = sTeam;
                      setBracketMatches(next);
                      
                      // Persist changes to database immediately
                      if (tournament?.id && String(sMatch.id).startsWith('db-') && String(tMatch.id).startsWith('db-')) {
                        const sDbId = String(sMatch.id).replace('db-', '');
                        const tDbId = String(tMatch.id).replace('db-', '');
                        
                        const sTeam1Id = sMatch.team1?.id && !sMatch.team1.id.startsWith('bye-') && !sMatch.team1.id.startsWith('name:') ? sMatch.team1.id : null;
                        const sTeam2Id = sMatch.team2?.id && !sMatch.team2.id.startsWith('bye-') && !sMatch.team2.id.startsWith('name:') ? sMatch.team2.id : null;
                        const tTeam1Id = tMatch.team1?.id && !tMatch.team1.id.startsWith('bye-') && !tMatch.team1.id.startsWith('name:') ? tMatch.team1.id : null;
                        const tTeam2Id = tMatch.team2?.id && !tMatch.team2.id.startsWith('bye-') && !tMatch.team2.id.startsWith('name:') ? tMatch.team2.id : null;
                        
                        try {
                          console.log('[Brackets] onSwapTeam: Saving team swap to database', {
                            sourceMatch: { id: sDbId, team1_id: sTeam1Id, team2_id: sTeam2Id },
                            targetMatch: { id: tDbId, team1_id: tTeam1Id, team2_id: tTeam2Id }
                          });
                          
                          const { error: sError, data: sData } = await supabase
                            .from('tournament_matches')
                            .update({ team1_id: sTeam1Id, team2_id: sTeam2Id, updated_at: new Date().toISOString() })
                            .eq('id', sDbId)
                            .select();
                          
                          if (sError) {
                            console.error('[Brackets] onSwapTeam: Error updating source match:', sError);
                            throw sError;
                          }
                          console.log('[Brackets] onSwapTeam: Source match updated:', sData);
                          
                          const { error: tError, data: tData } = await supabase
                            .from('tournament_matches')
                            .update({ team1_id: tTeam1Id, team2_id: tTeam2Id, updated_at: new Date().toISOString() })
                            .eq('id', tDbId)
                            .select();
                          
                          if (tError) {
                            console.error('[Brackets] onSwapTeam: Error updating target match:', tError);
                            throw tError;
                          }
                          console.log('[Brackets] onSwapTeam: Target match updated:', tData);
                          
                          toast({
                            title: 'Teams swapped',
                            description: 'Team positions have been updated. Other users will see the change shortly.',
                          });
                        } catch (error: any) {
                          console.error('[Brackets] Error persisting drag-and-drop:', error);
                          toast({ 
                            title: 'Error', 
                            description: error?.message || 'Failed to save team swap. Please try again.', 
                            variant: 'destructive' 
                          });
                          // Revert local state on error
                          setBracketMatches(bracketMatches);
                          // Real-time subscription will update UI automatically
                        }
                      }
                    }}
                  />
                  </div>
                </div>
              ) : matches.length > 0 ? (
                <div className="space-y-8">
                  <p className="text-gray-400">Saved brackets detected. Rendering from stored matches will be enabled in the next step.</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No matches have been generated yet.</p>
                  {tournament.status === 'upcoming' && isOrganizerOwner && (
                    <div className="flex flex-col gap-3 items-center">
                      {participants.filter(p => p.participant_type === 'team').length < 2 ? (
                        <p className="text-yellow-400 mb-2">At least 2 teams must register before generating brackets.</p>
                      ) : (
                        <>
                          <p className="text-gray-400 mb-2">Generate brackets from {participants.filter(p => p.participant_type === 'team').length} registered teams</p>
                    <Button
                            onClick={() => setShowGenerateDialog(true)} 
                            className="bg-blue-600 hover:bg-blue-700"
                    >
                            Generate Bracket
                    </Button>
                        </>
                  )}
                </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          {/* Generate Bracket Dialog */}
          {isOrganizerOwner && showGenerateDialog && (
            <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
              <DialogContent className="bg-gaming-dark border-gaming-gray/30">
                <DialogHeader>
                  <DialogTitle>Generate Bracket</DialogTitle>
                  <DialogDescription>
                    Configure bracket settings before generating.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Bracket Size</label>
                    <Select value={selectedBracketSize.toString()} onValueChange={(value) => setSelectedBracketSize(parseInt(value) as BracketSize)}>
                      <SelectTrigger className="bg-gaming-gray/20 border-gaming-gray/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8">8 Teams</SelectItem>
                        <SelectItem value="16">16 Teams</SelectItem>
                        <SelectItem value="24">24 Teams</SelectItem>
                        <SelectItem value="32">32 Teams</SelectItem>
                        <SelectItem value="64">64 Teams</SelectItem>
                        <SelectItem value="128">128 Teams</SelectItem>
                        <SelectItem value="256">256 Teams</SelectItem>
                        <SelectItem value="512">512 Teams</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400 mt-1">
                      {participants.filter(p => p.participant_type === 'team').length} teams registered. 
                      {selectedBracketSize >= 64 && (
                        <span className="text-yellow-400"> Consider using Group Stages for better organization.</span>
                      )}
                    </p>
                  </div>
                  {selectedBracketSize >= 64 && (
                    <div>
                      <label className="flex items-center gap-2 text-sm font-semibold mb-2">
                        <input
                          type="checkbox"
                          checked={useGroupStages}
                          onChange={(e) => setUseGroupStages(e.target.checked)}
                          className="rounded"
                        />
                        Use Group Stages (Recommended for 64+ teams)
                      </label>
                      {useGroupStages && (
                        <div className="ml-6 mt-2">
                          <label className="block text-xs text-gray-400 mb-1">Teams per Group</label>
                          <Select value={groupSize.toString()} onValueChange={(value) => setGroupSize(parseInt(value) as 8 | 16)}>
                            <SelectTrigger className="bg-gaming-gray/20 border-gaming-gray/30 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="8">8 Teams per Group</SelectItem>
                              <SelectItem value="16">16 Teams per Group</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500 mt-1">
                            Teams will be split into groups. Top 2 from each group advance to playoffs.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
                    Cancel
                  </Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={handleGenerateBracket}
                  >
                    Generate Bracket
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {/* Schedule Dialog - shown after bracket generation */}
          {isOrganizerOwner && showScheduleDialog && (
            <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
              <DialogContent className="bg-gaming-dark border-gaming-gray/30">
                <DialogHeader>
                  <DialogTitle>Schedule Matches</DialogTitle>
                  <DialogDescription>
                    Set the tournament start time and match intervals. You can edit this later.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      className="w-full bg-gaming-gray/20 border border-gaming-gray/30 rounded-lg px-3 py-2 text-sm text-white"
                      value={scheduleStart}
                      onChange={e => setScheduleStart(e.target.value)}
                      style={{ colorScheme: 'dark' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Match Gap (minutes)</label>
                    <select
                      className="w-full bg-gaming-gray/20 border border-gaming-gray/30 rounded-lg px-3 py-2 text-sm text-white"
                      defaultValue="30"
                      id="schedule-gap-select"
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="45">45 minutes</option>
                      <option value="60">60 minutes</option>
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setShowScheduleDialog(false); handleGenerateAndSchedule(); }}>
                    Skip Scheduling
                  </Button>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      const select = document.getElementById('schedule-gap-select') as HTMLSelectElement | null;
                      const gap = select ? parseInt(select.value) : 30;
                      setShowScheduleDialog(false);
                      handleGenerateAndSchedule();
                    }}
                  >
                    Generate & Schedule
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          {isOrganizerOwner && showSchedulerModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
              <div className="w-full max-w-lg bg-gaming-dark rounded-2xl border border-gaming-gray/40 shadow-2xl">
                <div className="px-5 pt-5 pb-3 border-b border-gaming-gray/30">
                  <h3 className="text-xl font-extrabold tracking-tight">Schedule matches</h3>
                  <p className="text-sm text-gray-400 mt-1">Choose a start date & time. Weâ€™ll assign each match a slot with your selected gap.</p>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Start date & time</label>
                      <input
                        type="datetime-local"
                        className="w-full bg-[#16161d] border border-[#2a2a35] focus:border-gaming-purple/50 focus:ring-0 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-400 caret-gaming-purple"
                        value={scheduleStart}
                        onChange={e => setScheduleStart(e.target.value)}
                        placeholder="YYYY-MM-DD HH:MM"
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Gap</label>
                      <select
                        className="w-full bg-[#16161d] border border-[#2a2a35] focus:border-gaming-purple/50 focus:ring-0 rounded-lg px-3 py-2 text-sm text-white"
                        defaultValue="30"
                        id="gap-select"
                        style={{ colorScheme: 'dark' }}
                      >
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">60 minutes</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-5">
                    <Button variant="outline" className="border-gaming-gray/40" onClick={() => { setShowSchedulerModal(false); setDraftMatches(null); }}>Cancel</Button>
                    <Button
                      className="bg-gaming-purple hover:bg-gaming-purple/80"
                      onClick={() => {
                        const select = document.getElementById('gap-select') as HTMLSelectElement | null;
                        const gap = select ? parseInt(select.value) : 30;
                        applyAutoSchedule(gap);
                      }}
                    >
                      Apply gap
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      {/* Upload modal embedded on bracket page */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="sm:max-w-[520px] bg-gaming-dark border border-gaming-gray/40">
          <DialogHeader>
            <DialogTitle className="text-white">Upload Match Result</DialogTitle>
            <DialogDescription className="text-gray-400">Attach a screenshot and optional comment. Only captains can submit.</DialogDescription>
          </DialogHeader>
          {tournament?.id && uploadMatchId && (
            <MatchResultUpload
              tournamentId={tournament.id}
              matchId={uploadMatchId}
              teamId={userTeamId}
              isCaptain={isCaptain}
              onSuccess={() => {
                setUploadOpen(false);
                setUploadMatchId(undefined);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      {/* Map Veto Dialog */}
      <Dialog open={mapVetoOpen} onOpenChange={(open) => {
        console.log('[Brackets] Map Veto dialog onOpenChange:', open, { mapVetoOpen, mapVetoMatchId, mapVetoMatch: !!mapVetoMatch });
        setMapVetoOpen(open);
        if (!open) {
          // Reset state when dialog closes
          setMapVetoMatchId(null);
          setMapVetoMatch(null);
        }
      }}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-[900px] bg-gaming-dark border border-gaming-gray/40 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-3 sm:p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-white">Map Veto</DialogTitle>
                <DialogDescription className="text-gray-400">
                  {mapVetoMatch?.team1?.name || 'Team 1'} vs {mapVetoMatch?.team2?.name || 'Team 2'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
            {tournament && mapVetoMatchId && mapVetoMatch ? (
              <MapVeto
                matchId={mapVetoMatchId}
                tournamentId={tournament.id}
                team1Id={mapVetoMatch.team1?.id || null}
                team2Id={mapVetoMatch.team2?.id || null}
                team1Name={mapVetoMatch.team1?.name || 'Team 1'}
                team2Name={mapVetoMatch.team2?.name || 'Team 2'}
                game={tournament.game}
                bestOf={mapVetoMatch.bestOf || 1}
                matchStatus={mapVetoMatch.status}
                onComplete={() => {
                  console.log('[Brackets] Map Veto completed');
                  // Don't close the dialog - let organizer see the result
                  // Just update the local state via real-time subscription
                  // setMapVetoOpen(false);
                  // setMapVetoMatchId(null);
                  // setMapVetoMatch(null);
                  // Don't trigger refresh - real-time will handle it
                  // setRefreshTrigger(prev => prev + 1);
                }}
              />
            ) : (
            <div className="text-center py-8 text-gray-400">
              {!tournament ? 'Loading tournament...' : !mapVetoMatchId ? `No match selected (mapVetoMatchId: ${mapVetoMatchId})` : `Loading match details... (matchId: ${mapVetoMatchId})`}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

type SwapPayload = { source: { round: number; matchNumber: number; slot: 'team1'|'team2' }, target: { round: number; matchNumber: number; slot: 'team1'|'team2' } };
type BracketVisualizationProps = {
  matches: BracketMatch[];
  teamCount: number;
  tournamentId?: string | null;
  isOrganizer?: boolean;
  isCaptain?: boolean;
  userTeamId?: string;
  matchVetoLinks?: Map<string, { team1Link?: string; team2Link?: string }>;
  onUploadResult?: (matchId: string) => void;
  onSwapTeam?: (p: SwapPayload) => void;
  onOpenMapVeto?: (match: BracketMatch, matchId: string) => void;
  searchQuery?: string;
  expandedRounds?: Set<number>;
  onToggleRound?: (round: number) => void;
  currentRound?: number;
};

const BracketVisualization: React.FC<BracketVisualizationProps> = React.memo(({
  matches,
  teamCount,
  tournamentId,
  isOrganizer,
  isCaptain,
  userTeamId,
  matchVetoLinks = new Map(),
  onUploadResult,
  onSwapTeam,
  onOpenMapVeto,
  searchQuery = '',
  expandedRounds = new Set([1]),
  onToggleRound,
  currentRound = 1,
}) => {
  const { toast } = useToast();
  const rounds = isPowerOf2(teamCount) ? Math.log2(teamCount) : Math.ceil(Math.log2(teamCount));

  const filteredMatches = useMemo(() => {
    if (!searchQuery.trim()) return matches;
    const query = searchQuery.toLowerCase().trim();
    return matches.filter(m =>
      m.team1?.name?.toLowerCase().includes(query) ||
      m.team2?.name?.toLowerCase().includes(query) ||
      m.winner?.name?.toLowerCase().includes(query)
    );
  }, [matches, searchQuery]);

  const getMatchesByRound = (round: number) => {
    const roundMatches = filteredMatches.filter(m => m.round === round);
    return roundMatches.sort((a, b) => a.matchNumber - b.matchNumber);
  };

  const getRoundName = (round: number) => {
    const totalRounds = Math.log2(teamCount);
    const currentRound = round;

    if (currentRound === totalRounds) {
      return 'Finals';
    }
    if (currentRound === totalRounds - 1) {
      return 'Semifinals';
    }
    if (currentRound === totalRounds - 2) {
      return 'Quarterfinals';
    }
    if (currentRound === 1) {
      return `Round of ${teamCount}`;
    }
    return `Round ${round}`;
  };

  const roundMatches = getMatchesByRound(currentRound);

  return (
    <div className="w-full py-4 sm:py-6 lg:py-8">
      <div className="flex flex-col gap-6">
        <div className="bg-gradient-to-b from-gaming-dark via-gaming-dark/95 to-gaming-dark/80 backdrop-blur-md supports-[backdrop-filter]:bg-gaming-dark/60 border-b-2 border-gaming-purple/30 py-4 px-4 text-center shadow-lg rounded-xl">
          <h3 className="text-xl sm:text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gaming-purple via-purple-400 to-gaming-purple drop-shadow-lg">
            {getRoundName(currentRound)}
          </h3>
          <p className="text-sm sm:text-base text-gray-400 mt-2 font-medium">
            {roundMatches.length} {roundMatches.length === 1 ? 'match' : 'matches'} in this round
          </p>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {roundMatches.map((match, index) => (
            <div
              key={match.id}
              className={`group relative bg-gradient-to-br from-gaming-gray/30 via-gaming-gray/20 to-gaming-gray/10 rounded-2xl p-4 sm:p-5 border-2 transition-all duration-300 ${
                match.status === 'in_progress'
                  ? 'border-yellow-500/50 shadow-lg shadow-yellow-500/20 ring-2 ring-yellow-500/30'
                  : match.status === 'completed'
                  ? 'border-green-500/50 shadow-lg shadow-green-500/20'
                  : 'border-gaming-gray/40 hover:border-gaming-purple/60 hover:shadow-xl hover:shadow-gaming-purple/20'
              }`}
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4 pb-2 border-b border-gaming-gray/30">
                <span className="text-xs sm:text-sm font-bold text-gaming-purple/80">Match {match.matchNumber}</span>
                <span className="text-[10px] sm:text-xs text-gray-400 truncate ml-2 font-medium">{match.scheduledTime || 'TBD'}</span>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-gaming-gray/15 to-gaming-gray/5 border border-gaming-gray/20">
                  <div className="relative flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16">
                    {match.team1?.logo_url ? (
                      <img src={match.team1.logo_url} alt={match.team1.name} className="w-full h-full object-contain rounded-lg bg-gaming-gray/20 p-1 border border-gaming-gray/30" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gaming-gray/40 to-gaming-gray/20 flex items-center justify-center rounded-lg border border-gaming-gray/30">
                        <span className="text-lg sm:text-xl text-gray-400 font-bold">
                          {match.team1?.name ? match.team1.name.charAt(0).toUpperCase() : '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 min-w-[36px] sm:min-w-[40px] flex items-center justify-center">
                    {(typeof match.team1_score === 'number') ? (
                      <span className="text-lg sm:text-xl font-extrabold text-white bg-gradient-to-r from-gaming-purple/20 to-purple-400/20 px-2 py-1 rounded">
                        {match.team1_score}
                      </span>
                    ) : (
                      <span className="text-gray-500/50">-</span>
                    )}
                  </div>
                  <span className="text-sm sm:text-base font-bold truncate flex-1 text-white">{match.team1?.name || 'TBD'}</span>
                </div>

                <div className="flex items-center justify-center py-1">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gaming-purple/40 to-transparent"></div>
                  <span className="px-3 text-xs sm:text-sm font-extrabold text-gaming-purple/60 tracking-widest uppercase">VS</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gaming-purple/40 to-transparent"></div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-gradient-to-r from-gaming-gray/15 to-gaming-gray/5 border border-gaming-gray/20">
                  <div className="relative flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16">
                    {match.team2?.logo_url ? (
                      <img src={match.team2.logo_url} alt={match.team2.name} className="w-full h-full object-contain rounded-lg bg-gaming-gray/20 p-1 border border-gaming-gray/30" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gaming-gray/40 to-gaming-gray/20 flex items-center justify-center rounded-lg border border-gaming-gray/30">
                        <span className="text-lg sm:text-xl text-gray-400 font-bold">
                          {match.team2?.name ? match.team2.name.charAt(0).toUpperCase() : '?'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0 min-w-[36px] sm:min-w-[40px] flex items-center justify-center">
                    {(typeof match.team2_score === 'number') ? (
                      <span className="text-lg sm:text-xl font-extrabold text-white bg-gradient-to-r from-gaming-purple/20 to-purple-400/20 px-2 py-1 rounded">
                        {match.team2_score}
                      </span>
                    ) : (
                      <span className="text-gray-500/50">-</span>
                    )}
                  </div>
                  <span className="text-sm sm:text-base font-bold truncate flex-1 text-white">{match.team2?.name || 'TBD'}</span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-gaming-gray/20">
                  <span className={`text-xs sm:text-sm px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5 ${
                    match.status === 'completed'
                      ? 'bg-gradient-to-r from-green-500/20 to-green-600/20 text-green-400 border border-green-500/30'
                      : match.status === 'in_progress'
                      ? 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 text-yellow-400 border border-yellow-500/30 animate-pulse'
                      : 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-400 border border-gray-500/30'
                  }`}>
                    {match.status === 'completed' ? (
                      <>✓ Completed</>
                    ) : match.status === 'in_progress' ? (
                      <>● Live</>
                    ) : (
                      <>○ Pending</>
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

BracketVisualization.displayName = 'BracketVisualization';

export default TournamentBrackets;