import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import MatchResultUpload from '@/components/tournament/MatchResultUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { UploadCloud, Eye, Clock, Settings, Radio, Copy, Check } from 'lucide-react';
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
  const [teamCount, setTeamCount] = useState<8 | 16 | 24 | 32>(8);
  const [bracketMatches, setBracketMatches] = useState<BracketMatch[]>([]);
  const isOrganizerRole = currentRole === 'organizer';
  const isOrganizerOwner = isOrganizerRole && !!(user?.id && (tournament as any)?.organizer_id && user.id === (tournament as any).organizer_id);
  const canView = useMemo(() => {
    if (isOrganizerOwner) return true;
    if (!user?.id) return false;
    return participants.some((p: any) => p.user_id === user.id || p.team_captain_id === user.id);
  }, [isOrganizerOwner, user?.id, participants]);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedBracketSize, setSelectedBracketSize] = useState<8 | 16 | 24 | 32>(8);
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
  const isUuid = (s?: string | null) => !!s && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

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

      // Fetch participants
      const { data: participantsData, error: participantsError } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('tournament_id', tournamentData.id);

      if (participantsError) throw participantsError;

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

  // Real-time sync: Subscribe to bracket changes
  useEffect(() => {
    if (!tournament?.id) return;

    console.log('[Brackets] Setting up realtime subscriptions for tournament:', tournament.id);

    // Subscribe to match changes (INSERT, UPDATE, DELETE)
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
          console.log('[Brackets] Match change detected:', payload.eventType, payload);
          
          // Refetch tournament data to ensure we have the latest state
          // This ensures we always have the correct state from the database
          fetchTournamentData();
        }
      )
      .subscribe();

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
        (payload) => {
          console.log('[Brackets] Match result change detected:', payload.eventType, payload);
          
          // Refetch to get updated results
          fetchTournamentData();
        }
      )
      .subscribe();

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
        (payload) => {
          console.log('[Brackets] Participant change detected:', payload.eventType, payload);
          
          // Refetch participants to update team name mappings
          fetchTournamentData();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount or tournament change
    return () => {
      console.log('[Brackets] Cleaning up realtime subscriptions');
      matchesChannel.unsubscribe();
      resultsChannel.unsubscribe();
      participantsChannel.unsubscribe();
    };
  }, [tournament?.id, fetchTournamentData]);

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


  // One-click: build strictly from registrations and persist immediately (no scheduler)
  const generateFromRegistrationsStrictAndSave = async (selectedSize?: 8 | 16 | 24 | 32, scheduleConfig?: { startTime: string; gapMinutes: number }) => {
    try {
      console.log('[Brackets] generateFromRegistrationsStrictAndSave called with selectedSize:', selectedSize, 'scheduleConfig:', scheduleConfig);
      // Use the provided size strictly - if user selected 8, use 8
      const bracketSize = selectedSize || 8;
      console.log('[Brackets] Using bracketSize:', bracketSize);
      
      // Build team list resolving missing team_ids from names
      const regTeams = await buildTeamsFromParticipants();
      if (regTeams.length < 2) {
        toast({ title: 'Not enough participants', description: 'Need at least 2 to generate a bracket.' });
        return;
      }
      
      // Use the selected bracket size STRICTLY (user's choice)
      // If user selected 8, use 8 - we'll only take the first N teams
      const minRequiredSize = regTeams.length <= 8 ? 8 : regTeams.length <= 16 ? 16 : regTeams.length <= 24 ? 24 : 32;
      let finalSize: 8 | 16 | 24 | 32;
      
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
      
      console.log('[Brackets] Generating bracket:', { 
        selectedSize: selectedSize, 
        registeredTeams: regTeams.length, 
        minRequired: minRequiredSize, 
        finalSize 
      });
      
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
      const round1Matches: BracketTeam[] = [];
      for (let i = 0; i < finalSize / 2; i++) {
        // Lower position teams (will be team1 in matches)
        const team1 = padded[i];
        // Higher position teams (will be team2 in matches) - opposite end
        const team2 = padded[finalSize - 1 - i];
        round1Matches.push(team1 ? { ...team1, seed: i + 1 } : team1); // Seed = match number
        round1Matches.push(team2 ? { ...team2, seed: finalSize - i } : team2); // Seed = N - match number + 1
      }
      
      const newMatches: BracketMatch[] = [];
      let matchId = 1;
      let currentRound = 1;
      
      // Create Round 1 matches
      for (let i = 0; i < round1Matches.length; i += 2) {
        newMatches.push({
          id: `match-${matchId++}`,
          round: currentRound,
          matchNumber: Math.floor(i / 2) + 1,
          team1: round1Matches[i] || null,
          team2: round1Matches[i + 1] || null,
          winner: null,
          score: null,
          status: 'pending',
        });
      }
      
      // Create subsequent rounds (Quarterfinals, Semifinals, Finals)
      // For 8 teams: Round 1 has 4 matches, Round 2 has 2 matches, Round 3 has 1 match
      // Total rounds = log2(teamCount)
      const totalRounds = Math.log2(finalSize);
      let remaining = finalSize / 2; // Number of matches in Round 2
      
      currentRound = 2;
      while (currentRound <= totalRounds && remaining >= 1) {
        for (let i = 0; i < remaining; i++) {
          newMatches.push({
            id: `match-${matchId++}`,
            round: currentRound,
            matchNumber: i + 1,
            team1: null,
            team2: null,
            winner: null,
            score: null,
            status: 'pending',
          });
        }
        remaining = Math.floor(remaining / 2);
        currentRound++;
      }
      
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
      
      // Refresh to show updated brackets with times
      setTimeout(() => {
        fetchTournamentData();
      }, 500);
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
      let ins = await supabase.from('tournament_matches').insert(payload).select('*');
      if (ins.error) {
        const msg = String(ins.error.message || '').toLowerCase();
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
          ins = await supabase.from('tournament_matches').insert(payloadWithMatchId).select('*');
          if (ins.error) throw ins.error;
        } else {
          throw ins.error;
        }
      }
      toast({ title: 'Brackets saved', description: 'Bracket matches have been stored. All users will see the updated bracket.' });
      // Real-time subscription will update UI automatically, but refresh to ensure consistency
      await fetchTournamentData();
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

  const clearBracketInDatabase = async () => {
    try {
      if (!tournament) return;
      
      // Confirm before clearing
      if (!confirm('Are you sure you want to clear all bracket matches? This action cannot be undone.')) {
        return;
      }
      
      setIsClearing(true);
      
      // Also clear match results associated with these matches
      const { data: matchIds } = await supabase
        .from('tournament_matches')
        .select('id')
        .eq('tournament_id', tournament.id);
      
      if (matchIds && matchIds.length > 0) {
        const ids = matchIds.map(m => m.id);
        await supabase
          .from('tournament_match_results')
          .delete()
          .in('match_id', ids);
      }
      
      const { error } = await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournament.id);
      
      if (error) throw error;
      
      toast({ title: 'Bracket cleared', description: 'All matches have been removed. All users will see the updated state.' });
      
      // Clear local state immediately
      setMatches([]);
      setBracketMatches([]);
      setDraftMatches(null);
      
      // Real-time subscription will also update, but refresh to ensure consistency
      setTimeout(() => {
        fetchTournamentData();
      }, 500);
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
                          <Button variant="destructive" onClick={clearBracketInDatabase} disabled={isClearing}>
                            {isClearing ? 'Clearing...' : 'Clear Bracket'}
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
            <CardContent>
              {bracketMatches.length > 0 ? (
                <div className="overflow-x-auto pb-4">
                  <BracketVisualization
                    matches={bracketMatches}
                    teamCount={teamCount}
                    tournamentId={tournament?.id}
                    isOrganizer={isOrganizerOwner}
                    isCaptain={isCaptain}
                    userTeamId={userTeamId}
                    onUploadResult={openUploadForMatch}
                    onRefresh={fetchTournamentData}
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
                          const { error: sError } = await supabase
                            .from('tournament_matches')
                            .update({ team1_id: sTeam1Id, team2_id: sTeam2Id, updated_at: new Date().toISOString() })
                            .eq('id', sDbId);
                          
                          if (sError) throw sError;
                          
                          const { error: tError } = await supabase
                            .from('tournament_matches')
                            .update({ team1_id: tTeam1Id, team2_id: tTeam2Id, updated_at: new Date().toISOString() })
                            .eq('id', tDbId);
                          
                          if (tError) throw tError;
                        } catch (error: any) {
                          console.error('Error persisting drag-and-drop:', error);
                          toast({ 
                            title: 'Error', 
                            description: 'Failed to save team swap. Please try again.', 
                            variant: 'destructive' 
                          });
                          // Revert UI state on error
                          fetchTournamentData();
                        }
                      }
                    }}
                  />
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
                    <Select value={selectedBracketSize.toString()} onValueChange={(value) => setSelectedBracketSize(parseInt(value) as 8 | 16 | 24 | 32)}>
                      <SelectTrigger className="bg-gaming-gray/20 border-gaming-gray/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="8">8 Teams</SelectItem>
                        <SelectItem value="16">16 Teams</SelectItem>
                        <SelectItem value="24">24 Teams</SelectItem>
                        <SelectItem value="32">32 Teams</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400 mt-1">
                      {participants.filter(p => p.participant_type === 'team').length} teams registered. 
                      Bracket will be padded with BYEs if needed.
                    </p>
                  </div>
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
                  <p className="text-sm text-gray-400 mt-1">Choose a start date & time. We’ll assign each match a slot with your selected gap.</p>
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
      <Footer />
    </div>
  );
};

type SwapPayload = { source: { round: number; matchNumber: number; slot: 'team1'|'team2' }, target: { round: number; matchNumber: number; slot: 'team1'|'team2' } };
const BracketVisualization: React.FC<{ matches: BracketMatch[]; teamCount: number; tournamentId?: string | null; isOrganizer?: boolean; isCaptain?: boolean; userTeamId?: string; onUploadResult?: (matchId: string) => void; onSwapTeam?: (p: SwapPayload) => void; onRefresh?: () => void }> = ({ matches, teamCount, tournamentId, isOrganizer, isCaptain, userTeamId, onUploadResult, onSwapTeam, onRefresh }) => {
  const { toast } = useToast();
  const rounds = Math.log2(teamCount);
  const [scoreDraft, setScoreDraft] = React.useState<Record<string, { t1: string; t2: string }>>({});
  const [resultsOpen, setResultsOpen] = React.useState(false);
  const [resultsList, setResultsList] = React.useState<Array<{ image_url: string | null; comment: string | null; created_at: string; reporter_user_id: string }>>([]);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editDraft, setEditDraft] = React.useState<{ scheduled_at: string; best_of: string; status: 'pending'|'in_progress'|'completed' } | null>(null);
  const [editMatchId, setEditMatchId] = React.useState<string | null>(null);
  const [partyCodeOpen, setPartyCodeOpen] = React.useState(false);
  const [partyCodeMatch, setPartyCodeMatch] = React.useState<BracketMatch | null>(null);
  const [copiedCode, setCopiedCode] = React.useState(false);
  const [goLiveDialogOpen, setGoLiveDialogOpen] = React.useState(false);
  const [goLiveMatch, setGoLiveMatch] = React.useState<BracketMatch | null>(null);
  const [partyCodeInput, setPartyCodeInput] = React.useState('');
  
  const getRoundName = (round: number) => {
    const totalRounds = Math.log2(teamCount);
    const currentRound = round;
    
    // Finals (last round)
    if (currentRound === totalRounds) {
      return 'Finals';
    }
    // Semifinals (second to last)
    if (currentRound === totalRounds - 1) {
      return 'Semifinals';
    }
    // Quarterfinals (third to last)
    if (currentRound === totalRounds - 2) {
      return 'Quarterfinals';
    }
    // First round - use "Round of X" where X = teamCount
    if (currentRound === 1) {
      return `Round of ${teamCount}`;
    }
    // Other rounds - use "Round X"
    return `Round ${round}`;
  };

  const getMatchesByRound = (round: number) => {
    return matches.filter(match => match.round === round);
  };

  const onDragStart = (e: React.DragEvent, m: BracketMatch, slot: 'team1'|'team2') => {
    if (!isOrganizer || m.status !== 'pending') return;
    const payload = JSON.stringify({ round: m.round, matchNumber: m.matchNumber, slot });
    e.dataTransfer.setData('application/json', payload);
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  const onDrop = (e: React.DragEvent, m: BracketMatch, slot: 'team1'|'team2') => {
    if (!isOrganizer || !onSwapTeam || m.status !== 'pending') return;
    try {
      const src = JSON.parse(e.dataTransfer.getData('application/json')) as { round: number; matchNumber: number; slot: 'team1'|'team2' };
      onSwapTeam({ source: src, target: { round: m.round, matchNumber: m.matchNumber, slot } });
    } catch {}
  };

  const saveScoreAndAdvance = async (m: BracketMatch) => {
    if (!tournamentId || !String(m.id).startsWith('db-')) return;
    const dbId = String(m.id).replace('db-','');
    const draft = scoreDraft[dbId] || { t1: '', t2: '' };
    const s1 = parseInt(draft.t1 as any, 10);
    const s2 = parseInt(draft.t2 as any, 10);
    if (!Number.isFinite(s1) || !Number.isFinite(s2)) {
      toast({ title: 'Invalid scores', description: 'Please enter valid numbers for both teams.', variant: 'destructive' });
      return;
    }
    if (s1 === s2) {
      toast({ title: 'Tie not allowed', description: 'Scores cannot be equal. Please enter different scores.', variant: 'destructive' });
      return;
    }
    
    const winnerTeamId = s1 > s2 ? (m.team1?.id || null) : (m.team2?.id || null);
    
    // Get current team IDs from UI state (which may have been manually changed via drag-and-drop)
    const team1Id = m.team1?.id && !m.team1.id.startsWith('bye-') && !m.team1.id.startsWith('name:') ? m.team1.id : null;
    const team2Id = m.team2?.id && !m.team2.id.startsWith('bye-') && !m.team2.id.startsWith('name:') ? m.team2.id : null;
    
    try {
      // Use a transaction-like approach: update current match first
      // IMPORTANT: Also update team1_id and team2_id to persist any manual drag-and-drop changes
      const { error: matchError } = await supabase
        .from('tournament_matches')
        .update({
          team1_id: team1Id,
          team2_id: team2Id,
          team1_score: s1,
          team2_score: s2,
          status: 'completed',
          winner_team_id: winnerTeamId,
          updated_at: new Date().toISOString()
        })
        .eq('id', dbId);
      
      if (matchError) throw matchError;
      
      // Advance winner to next round
      if (winnerTeamId) {
        const nextRound = m.round + 1;
        const nextMatchNumber = Math.ceil(m.matchNumber / 2);
        const goesToSlot: 'team1_id' | 'team2_id' = (m.matchNumber % 2 === 1) ? 'team1_id' : 'team2_id';
        
        // Find the next match
        const { data: nextMatches, error: findError } = await supabase
          .from('tournament_matches')
          .select('id')
          .eq('tournament_id', tournamentId)
          .eq('round', nextRound)
          .eq('match_number', nextMatchNumber)
          .maybeSingle();
        
        if (findError) throw findError;
        
        if (nextMatches) {
          const { error: advanceError } = await supabase
            .from('tournament_matches')
            .update({ 
              [goesToSlot]: winnerTeamId,
              updated_at: new Date().toISOString()
            })
            .eq('id', nextMatches.id);
          
          if (advanceError) throw advanceError;
        }
      }
      
      // Clear the score draft
      setScoreDraft(prev => {
        const next = { ...prev };
        delete next[dbId];
        return next;
      });
      
      // Real-time subscription will automatically update the UI
      // But we can also trigger a manual refresh for immediate feedback
      toast({ title: 'Score saved', description: 'Match result has been saved and winner advanced.' });
      
      // Small delay to let the database update propagate, then refresh
      if (onRefresh) {
        setTimeout(() => {
          onRefresh();
        }, 500);
      }
    } catch (error: any) {
      console.error('Error saving score:', error);
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to save match result', 
        variant: 'destructive' 
      });
    }
  };

  const openResults = async (m: BracketMatch) => {
    if (!tournamentId || !String(m.id).startsWith('db-')) return;
    const dbId = String(m.id).replace('db-','');
    const { data } = await supabase
      .from('tournament_match_results')
      .select('image_url, comment, created_at, reporter_user_id')
      .eq('tournament_id', tournamentId)
      .eq('match_id', dbId)
      .order('created_at', { ascending: false });
    setResultsList((data as any) || []);
    setResultsOpen(true);
  };

  const openEdit = async (m: BracketMatch) => {
    if (!tournamentId || !String(m.id).startsWith('db-')) return;
    const dbId = String(m.id).replace('db-','');
    setEditMatchId(dbId);
    
    // Find the match in the matches array to get the raw scheduled_at value
    let iso = '';
    if (m.id && String(m.id).startsWith('db-')) {
      const matchId = String(m.id).replace('db-', '');
      // Fetch the match from database to get the raw scheduled_at
      const { data, error } = await supabase
        .from('tournament_matches')
        .select('scheduled_at')
        .eq('id', matchId)
        .maybeSingle();
      
      if (!error && data?.scheduled_at) {
        const date = new Date(data.scheduled_at);
        iso = date.toISOString().slice(0, 16);
      }
    }
    
    setEditDraft({ scheduled_at: iso, best_of: String(m.bestOf || 1), status: m.status });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editMatchId || !editDraft) return;
    
    try {
      const payload: any = {
        best_of: parseInt(editDraft.best_of, 10) || 1,
        status: editDraft.status || 'pending', // Always update status
        updated_at: new Date().toISOString()
      };
      
      // If status is set to pending, also clear party_code
      if (editDraft.status === 'pending') {
        payload.party_code = null;
      }
      
      if (editDraft.scheduled_at) {
        payload.scheduled_at = new Date(editDraft.scheduled_at).toISOString();
      }
      
      const { error } = await supabase
        .from('tournament_matches')
        .update(payload)
        .eq('id', editMatchId);
      
      if (error) throw error;
      
      toast({ title: 'Match updated', description: 'Match details have been saved.' });
      setEditOpen(false);
      
      // Real-time subscription will update UI automatically
      if (onRefresh) {
        setTimeout(() => {
          onRefresh();
        }, 300);
      }
    } catch (error: any) {
      console.error('Error saving match edit:', error);
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to update match', 
        variant: 'destructive' 
      });
    }
  };

  const openGoLiveDialog = (m: BracketMatch) => {
    // Check if both teams are filled
    if (!m.team1 || !m.team2 || m.team1.name === 'TBD' || m.team2.name === 'TBD') {
      toast({ 
        title: 'Cannot go live', 
        description: 'Both teams must be filled before going live.', 
        variant: 'destructive' 
      });
      return;
    }
    setGoLiveMatch(m);
    setPartyCodeInput(m.partyCode || '');
    setGoLiveDialogOpen(true);
  };

  const goLive = async () => {
    if (!tournamentId || !goLiveMatch || !String(goLiveMatch.id).startsWith('db-')) return;
    if (!partyCodeInput.trim()) {
      toast({ 
        title: 'Party code required', 
        description: 'Please enter a party code.', 
        variant: 'destructive' 
      });
      return;
    }
    
    const dbId = String(goLiveMatch.id).replace('db-','');
    
    try {
      // Update match to in_progress and set party code
      const { error } = await supabase
        .from('tournament_matches')
        .update({
          status: 'in_progress',
          party_code: partyCodeInput.trim().toUpperCase(),
          updated_at: new Date().toISOString()
        })
        .eq('id', dbId);
      
      if (error) throw error;
      
      toast({ title: 'Match is now live', description: 'Party code has been set and shared with team captains.' });
      
      setGoLiveDialogOpen(false);
      setGoLiveMatch(null);
      setPartyCodeInput('');
      
      // Refresh to show updated status
      if (onRefresh) {
        setTimeout(() => {
          onRefresh();
        }, 300);
      }
    } catch (error: any) {
      console.error('Error going live:', error);
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to go live', 
        variant: 'destructive' 
      });
    }
  };

  const openPartyCode = (m: BracketMatch) => {
    setPartyCodeMatch(m);
    setPartyCodeOpen(true);
    setCopiedCode(false);
  };

  const copyPartyCode = async () => {
    if (!partyCodeMatch?.partyCode) return;
    try {
      await navigator.clipboard.writeText(partyCodeMatch.partyCode);
      setCopiedCode(true);
      toast({ title: 'Copied!', description: 'Party code copied to clipboard.' });
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to copy code', variant: 'destructive' });
    }
  };

  const advanceWinner = async (m: BracketMatch, winner: 'team1' | 'team2') => {
    if (!tournamentId || !String(m.id).startsWith('db-')) return;
    const dbId = String(m.id).replace('db-','');
    const winnerTeamId = winner === 'team1' ? m.team1?.id : m.team2?.id;
    if (!winnerTeamId) return;
    // Parse next slot
    const nextRound = m.round + 1;
    const nextMatchNumber = Math.ceil(m.matchNumber / 2);
    const goesToSlot: 'team1_id' | 'team2_id' = (m.matchNumber % 2 === 1) ? 'team1_id' : 'team2_id';
    // Update current match with scores/status/winner
    await supabase.from('tournament_matches').update({
      winner_team_id: winnerTeamId,
      status: 'completed'
    }).eq('id', dbId);
    // Place winner into next round
    await supabase.from('tournament_matches').update({ [goesToSlot]: winnerTeamId }).match({
      tournament_id: tournamentId,
      round: nextRound,
      match_number: nextMatchNumber
    });
  };

  return (
    <div className="flex gap-12 min-w-max py-8">
      {Array.from({ length: rounds }, (_, i) => i + 1).map(round => {
        const roundMatches = getMatchesByRound(round);
        return (
          <div key={round} className="flex flex-col gap-6 min-w-[300px] relative">
            <div className="sticky top-0 z-10 bg-gaming-dark/80 backdrop-blur supports-[backdrop-filter]:bg-gaming-dark/60 border-b border-gaming-gray/20 py-2 text-center">
              <h3 className="text-lg font-bold text-gaming-purple">{getRoundName(round)}</h3>
              <p className="text-sm text-gray-400">{roundMatches.length} matches</p>
            </div>
            <div className="space-y-4">
              {roundMatches.map((match, index) => (
                <div key={match.id} className="bg-gaming-gray/20 rounded-xl p-4 border border-gaming-gray/30 hover:border-gaming-purple/40 transition-colors relative">
                  {/* right connector stub */}
                  <div className="hidden lg:block absolute right-[-24px] top-1/2 w-6 h-0.5 bg-gaming-gray/40" />
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-gray-400">Match {match.matchNumber}</span>
                    <span className="text-xs text-gray-400">{match.scheduledTime || 'TBD'}</span>
                  </div>
                  <div className="space-y-3">
                    <div
                      className={`flex items-center gap-2 p-2 rounded-lg ${
                      match.team1?.eliminated ? 'bg-red-900/20 text-red-400' : 'bg-gaming-gray/10'
                    }`}
                      draggable={!!(isOrganizer && match.status === 'pending' && match.team1 && !(match.team1.id || '').startsWith('bye-'))}
                      onDragStart={(e) => onDragStart(e, match, 'team1')}
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, match, 'team1')}
                    >
                      {match.team1?.logo_url ? (
                        <img 
                          src={match.team1.logo_url} 
                          alt={match.team1.name} 
                          className="w-[54px] h-[54px] object-contain flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-[54px] h-[54px] bg-gaming-gray/30 flex-shrink-0 flex items-center justify-center">
                          <span className="text-lg text-gray-500 font-bold">
                            {match.team1?.name ? match.team1.name.charAt(0).toUpperCase() : '?'}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-semibold truncate flex-1">{match.team1?.name || 'TBD'}</span>
                      {match.team1_score !== null && (
                        <span className="text-sm font-bold text-gaming-purple min-w-[24px] text-right">
                          {match.team1_score}
                        </span>
                      )}
                    </div>
                    <div className="text-center text-[10px] tracking-widest uppercase text-gray-500">vs</div>
                    <div
                      className={`flex items-center gap-2 p-2 rounded-lg ${
                      match.team2?.eliminated ? 'bg-red-900/20 text-red-400' : 'bg-gaming-gray/10'
                    }`}
                      draggable={!!(isOrganizer && match.status === 'pending' && match.team2 && !(match.team2.id || '').startsWith('bye-'))}
                      onDragStart={(e) => onDragStart(e, match, 'team2')}
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, match, 'team2')}
                    >
                      {match.team2?.logo_url ? (
                        <img 
                          src={match.team2.logo_url} 
                          alt={match.team2.name} 
                          className="w-[54px] h-[54px] object-contain flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-[54px] h-[54px] bg-gaming-gray/30 flex-shrink-0 flex items-center justify-center">
                          <span className="text-lg text-gray-500 font-bold">
                            {match.team2?.name ? match.team2.name.charAt(0).toUpperCase() : '?'}
                          </span>
                        </div>
                      )}
                      <span className="text-sm font-semibold truncate flex-1">{match.team2?.name || 'TBD'}</span>
                      {match.team2_score !== null && (
                        <span className="text-sm font-bold text-gaming-purple min-w-[24px] text-right">
                          {match.team2_score}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-end">
                      <span className={`text-xs px-2 py-1 rounded ${
                        match.status === 'completed' ? 'bg-green-900/20 text-green-400' :
                        match.status === 'in_progress' ? 'bg-yellow-900/20 text-yellow-400' :
                        'bg-gray-900/20 text-gray-400'
                      }`}>
                        {match.status === 'completed' ? 'Completed' :
                         match.status === 'in_progress' ? 'Live' : 'Pending'}
                      </span>
                    </div>
                    {(match.resultImages && match.resultImages.length > 0) && (
                      <div className="mt-3">
                        <div className="text-xs text-gray-400 mb-1">Submitted results</div>
                        <div className="flex gap-2 overflow-x-auto">
                          {match.resultImages.slice(0,4).map((img, idx) => (
                            <a key={idx} href={img} target="_blank" className="block w-16 h-12 rounded overflow-hidden border border-gaming-gray/30">
                              <img src={img} alt="result" className="w-full h-full object-cover" loading="lazy" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {tournamentId && String(match.id).startsWith('db-') && isCaptain && !isOrganizer && userTeamId && (match.team1?.id === userTeamId || match.team2?.id === userTeamId) && (
                      <div className="mt-3 flex gap-2 justify-end">
                        {match.status === 'in_progress' && match.partyCode && (
                          <button
                            title="View party code"
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-600/20 hover:bg-green-600/30 border border-green-600/40 text-green-400"
                            onClick={() => openPartyCode(match)}
                          >
                            <Radio className="w-3 h-3" /> Party Code
                          </button>
                        )}
                        {onUploadResult && (
                          <button
                            title="Upload result (captain only)"
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gaming-blue/20 hover:bg-gaming-blue/30 border border-gaming-blue/30"
                            onClick={() => onUploadResult(String(match.id).replace('db-',''))}
                          >
                            <UploadCloud className="w-3 h-3" /> Upload result
                          </button>
                        )}
                      </div>
                    )}
                    {isOrganizer && String(match.id).startsWith('db-') && (
                      <div className="mt-3 border-t border-gaming-gray/30 pt-3">
                        <div className="flex flex-col gap-3">
                          <div className="flex gap-2 flex-wrap">
                            {match.status === 'pending' && match.team1 && match.team2 && match.team1.name !== 'TBD' && match.team2.name !== 'TBD' && (
                              <button
                                className="text-xs px-3 py-1.5 rounded bg-green-600/20 hover:bg-green-600/30 border border-green-600/40 text-green-400 transition-colors"
                                onClick={() => openGoLiveDialog(match)}
                              >
                                <Radio className="w-3 h-3 inline mr-1.5" /> Go Live
                              </button>
                            )}
                            <button
                              className="text-xs px-3 py-1.5 rounded bg-gaming-gray/20 hover:bg-gaming-gray/30 border border-gaming-gray/40 transition-colors"
                              onClick={() => openResults(match)}
                            >
                              <Eye className="w-3 h-3 inline mr-1.5" /> View results
                            </button>
                            <button
                              className="text-xs px-3 py-1.5 rounded bg-gaming-gray/20 hover:bg-gaming-gray/30 border border-gaming-gray/40 transition-colors"
                              onClick={() => openEdit(match)}
                            >
                              <Settings className="w-3 h-3 inline mr-1.5" /> Edit match
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              className="w-16 bg-[#16161d] border border-[#2a2a35] rounded px-2 py-1 text-xs"
                              placeholder="T1"
                              value={scoreDraft[String(match.id).replace('db-','')]?.t1 || ''}
                              onChange={(e) => {
                                const id = String(match.id).replace('db-','');
                                setScoreDraft(prev => ({ ...prev, [id]: { t1: e.target.value, t2: prev[id]?.t2 || '' } }));
                              }}
                            />
                            <span className="text-xs text-gray-400">-</span>
                            <input
                              type="number"
                              className="w-16 bg-[#16161d] border border-[#2a2a35] rounded px-2 py-1 text-xs"
                              placeholder="T2"
                              value={scoreDraft[String(match.id).replace('db-','')]?.t2 || ''}
                              onChange={(e) => {
                                const id = String(match.id).replace('db-','');
                                setScoreDraft(prev => ({ ...prev, [id]: { t1: prev[id]?.t1 || '', t2: e.target.value } }));
                              }}
                            />
                            <button
                              className="ml-2 text-xs px-3 py-1.5 rounded bg-gaming-purple/60 hover:bg-gaming-purple/80 border border-gaming-purple/40 transition-colors"
                              onClick={() => saveScoreAndAdvance(match)}
                              disabled={!(match.team1 && match.team2)}
                            >
                              Save result & advance
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {/* vertical rails to hint tree flow */}
            <div className="hidden lg:block absolute right-[-24px] top-[76px] bottom-0 w-0.5 bg-gaming-gray/20" />
          </div>
        );
      })}
      {/* Results modal */}
      <Dialog open={resultsOpen} onOpenChange={setResultsOpen}>
        <DialogContent className="sm:max-w-[720px] bg-gaming-dark border border-gaming-gray/40">
          <DialogHeader>
            <DialogTitle className="text-white">Submitted Results</DialogTitle>
            <DialogDescription className="text-gray-400">Images and comments submitted by teams for this match.</DialogDescription>
          </DialogHeader>
          {resultsList.length === 0 ? (
            <div className="text-gray-400 text-sm">No results submitted yet.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {resultsList.map((r, i) => (
                <div key={i} className="bg-gaming-gray/20 rounded border border-gaming-gray/30 overflow-hidden">
                  {r.image_url ? (
                    <a href={r.image_url} target="_blank" className="block">
                      <img src={r.image_url} alt="result" className="w-full h-32 object-cover" />
                    </a>
                  ) : (
                    <div className="w-full h-32 flex items-center justify-center text-xs text-gray-400">No image</div>
                  )}
                  <div className="p-2">
                    <div className="text-[10px] text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                    {r.comment && <div className="text-xs text-gray-300 mt-1 whitespace-pre-wrap">{r.comment}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit match modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[520px] bg-gaming-dark border border-gaming-gray/40">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Match</DialogTitle>
            <DialogDescription className="text-gray-400">Set match time, status, and best-of.</DialogDescription>
          </DialogHeader>
          {editDraft && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Scheduled time</label>
                <input
                  type="datetime-local"
                  value={editDraft.scheduled_at}
                  onChange={(e) => setEditDraft({ ...editDraft, scheduled_at: e.target.value })}
                  className="w-full bg-[#16161d] border border-[#2a2a35] rounded px-3 py-2 text-sm text-white"
                  style={{ colorScheme: 'dark' }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Best of</label>
                  <select
                    value={editDraft.best_of}
                    onChange={(e) => setEditDraft({ ...editDraft, best_of: e.target.value })}
                    className="w-full bg-[#16161d] border border-[#2a2a35] rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="1">BO1</option>
                    <option value="3">BO3</option>
                    <option value="5">BO5</option>
                    <option value="7">BO7</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-400 mb-2">Status</label>
                  <select
                    value={editDraft.status}
                    onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value as any })}
                    className="w-full bg-[#16161d] border border-[#2a2a35] rounded px-3 py-2 text-sm text-white"
                  >
                    <option value="pending">Pending</option>
                    <option value="in_progress">Live</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="text-right">
                <button
                  className="text-xs px-3 py-2 rounded bg-gaming-purple/70 hover:bg-gaming-purple/80 border border-gaming-purple/40"
                  onClick={saveEdit}
                >
                  Save changes
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Go Live Dialog - for organizer to enter party code */}
      <Dialog open={goLiveDialogOpen} onOpenChange={setGoLiveDialogOpen}>
        <DialogContent className="sm:max-w-[420px] bg-gaming-dark border border-gaming-gray/40">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-green-400" />
              Go Live - Enter Party Code
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Enter the party code from your in-game custom lobby. This will be shared with team captains.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">Party Code</label>
              <input
                type="text"
                value={partyCodeInput}
                onChange={(e) => setPartyCodeInput(e.target.value.toUpperCase())}
                placeholder="Enter party code (e.g., ABC123)"
                className="w-full bg-[#16161d] border border-[#2a2a35] rounded-lg px-4 py-3 text-lg font-mono text-center tracking-widest text-white uppercase"
                maxLength={20}
                style={{ colorScheme: 'dark' }}
                autoFocus
              />
              <p className="text-xs text-gray-400 mt-2">
                This code will be visible to team captains only.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={goLive}
                className="flex-1 bg-green-600 hover:bg-green-700"
                variant="default"
                disabled={!partyCodeInput.trim()}
              >
                <Radio className="w-4 h-4 mr-2" /> Go Live
              </Button>
              <Button
                onClick={() => {
                  setGoLiveDialogOpen(false);
                  setGoLiveMatch(null);
                  setPartyCodeInput('');
                }}
                variant="outline"
                className="border-gaming-gray/40"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Party Code modal - only visible to captains */}
      <Dialog open={partyCodeOpen} onOpenChange={setPartyCodeOpen}>
        <DialogContent className="sm:max-w-[420px] bg-gaming-dark border border-gaming-gray/40">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-green-400" />
              Match Party Code
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Use this code to join the custom lobby in-game.
            </DialogDescription>
          </DialogHeader>
          {partyCodeMatch?.partyCode && (
            <div className="space-y-4">
              <div className="bg-gaming-gray/20 rounded-lg p-6 border border-gaming-gray/30">
                <div className="text-center">
                  <div className="text-3xl font-bold tracking-widest text-green-400 mb-2 font-mono">
                    {partyCodeMatch.partyCode}
                  </div>
                  <p className="text-xs text-gray-400">Match is currently LIVE</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={copyPartyCode}
                  className="flex-1 bg-gaming-purple hover:bg-gaming-purple/80"
                  variant="default"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-4 h-4 mr-2" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" /> Copy Code
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setPartyCodeOpen(false)}
                  variant="outline"
                  className="border-gaming-gray/40"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentBrackets; 