import React, { useState, useEffect, useCallback } from 'react';
import { motion } from "framer-motion";
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { useTeamManagement } from '@/hooks/useTeamManagement';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { Link } from 'react-router-dom';
import TeamCreationWizard from '@/components/player/TeamCreationWizard';
import CaptainJourneyTour from '@/components/player/CaptainJourneyTour';
import { hasSeenTour, markTourSeen } from '@/lib/onboardingFlags';
import { Plus, Users, Settings, Crown, Trash2, UserMinus, UserPlus, Calendar, Trophy, Gamepad2, Edit, X, Upload, Save, Shield } from 'lucide-react';
import esportsGames from '@/data/esportsGames.json';
import EditTeamDialog from '@/components/player/EditTeamDialog';
import PlayerCard from '@/components/player/PlayerCard';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { sendEmail } from '@/hooks/useEmail';
import { fetchGameData } from '@/hooks/useRawgGame';

// Sortable wrapper for PlayerCard (drag-and-drop reorder)
const SortablePlayerCard: React.FC<{
  id: string;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ id, disabled, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: disabled ? 'default' : 'grab',
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
};

const TeamsPage = () => {
  const { user, profile } = useAuth();
  const { canCreateTeams, currentRole } = useRole();
  const {
    userTeams,
    fetchUserTeams,
    createTeam,
    inviteUserToTeam,
    removeMemberFromTeam,
    transferCaptaincy,
    changeRole,
    disbandTeam,
    leaveTeam,
    revokeTeamInvite,
    fetchingTeam
  } = useTeamManagement();
  const { toast } = useToast();

  // State for team management
  const [showRemoveMember, setShowRemoveMember] = useState(false);
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamTag, setEditTeamTag] = useState('');
  const [editTeamLogoFile, setEditTeamLogoFile] = useState<File | null>(null);
  const [editTeamLogoUrl, setEditTeamLogoUrl] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Game images for edit modal
  const [gameImages, setGameImages] = useState<Record<string, string>>({});
  const [imagesLoading, setImagesLoading] = useState(true);

  type TeamMember = {
    id: string;
    user_id: string;
    username: string;
    email?: string;
    avatar_url?: string;
    card_image_url?: string;
    role?: string;
    verified?: boolean;
    riot_puuid?: string;
    riot_game_name?: string;
    riot_tag_line?: string;
    stats?: {
      kd: string;
      winRate: string;
      hs: string;
    };
  } | null;
  const [memberToRemove, setMemberToRemove] = useState<TeamMember>(null);
  const [showTransferCaptaincy, setShowTransferCaptaincy] = useState(false);
  const [showDisbandTeam, setShowDisbandTeam] = useState(false);

  const [showTeamStats, setShowTeamStats] = useState(false);
  const [showMemberRoles, setShowMemberRoles] = useState(false);
  const [showTournamentManagement, setShowTournamentManagement] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [showTeamCreationWizard, setShowTeamCreationWizard] = useState(false);
  const [showJourneyTour, setShowJourneyTour] = useState(false);
  const [showTeamInviteModal, setShowTeamInviteModal] = useState(false);
  const [teamLogo, setTeamLogo] = useState<File | null>(null);
  const [teamBio, setTeamBio] = useState('');
  const [teamColors, setTeamColors] = useState({ primary: '#3B82F6', secondary: '#1E40AF' });
  const [pendingInvites, setPendingInvites] = useState<Array<{ id: string; team_id: string; roster_id?: string | null; team_name?: string; roster_name?: string }>>([]);
  const [teamInvites, setTeamInvites] = useState<Array<{ id: string; invited_email?: string | null; invited_user_id?: string | null; created_at?: string }>>([]);
  const [ownerProfile, setOwnerProfile] = useState<{ username?: string; email?: string; avatar_url?: string; card_image_url?: string } | null>(null);
  const [refreshingAfterAccept, setRefreshingAfterAccept] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Rosters
  type RosterMember = { user_id: string; username: string; avatar_url: string | null; card_image_url?: string | null; is_starter?: boolean };
  type Roster = {
    id: string;
    name: string;
    game: string;
    format: string | null;
    team_size: number;
    member_count?: number;
    members?: RosterMember[];
  };
  const [rosters, setRosters] = useState<Roster[]>([]);
  const [rosterModalOpen, setRosterModalOpen] = useState(false);
  const [newRosterName, setNewRosterName] = useState('');
  const [newRosterGame, setNewRosterGame] = useState('');
  const [newRosterFormat, setNewRosterFormat] = useState<string>('');
  const [newRosterTeamSize, setNewRosterTeamSize] = useState<number>(5);
  const [newRosterMembers, setNewRosterMembers] = useState<string[]>([]);
  const [rosterSubmitting, setRosterSubmitting] = useState(false);
  const [manageRosterModalOpen, setManageRosterModalOpen] = useState(false);
  const [manageRoster, setManageRoster] = useState<Roster | null>(null);
  const [manageMembers, setManageMembers] = useState<string[]>([]);
  const [manageMemberStatuses, setManageMemberStatuses] = useState<Record<string, boolean>>({});
  const [editRosterName, setEditRosterName] = useState('');
  const [editRosterGame, setEditRosterGame] = useState('');
  const [editRosterFormat, setEditRosterFormat] = useState('');
  const [editRosterTeamSize, setEditRosterTeamSize] = useState<number>(5);
  const [inviteSearch, setInviteSearch] = useState('');
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [rosterInvites, setRosterInvites] = useState<Array<{ id: string; invited_email?: string | null; invited_user_id?: string | null; created_at?: string; profiles?: { username: string; avatar_url: string } | null }>>([]);
  const [inviteInput, setInviteInput] = useState('');
  const [selectedInvitees, setSelectedInvitees] = useState<Array<{ id: string; email: string; username?: string }>>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<Array<{ id: string; email: string; username?: string }>>([]);
  const [isSearchingInvitee, setIsSearchingInvitee] = useState(false);
  const [teamStats, setTeamStats] = useState({ matches: 0, wins: 0, winRate: 0, tournamentWins: 0 });
  const [selectedTournament, setSelectedTournament] = useState<any>(null);
  const [isTournamentModalOpen, setIsTournamentModalOpen] = useState(false);

  // Simple game logo resolver (uses bundled esportsGames.json)
  const getGameLogo = useCallback((gameName: string): string => {
    if (!gameName) return '';
    try {
      const apiImage = (gameImages as any)?.[gameName] || '';
      const game = (esportsGames as any)?.games?.find((g: any) => String(g.name).toLowerCase() === String(gameName).toLowerCase());
      const staticImage = game?.logo || '';
      // Prefer API image; fall back to static; then placeholder
      return apiImage || staticImage || '/placeholder.svg';
    } catch {
      return '/placeholder.svg';
    }
  }, [gameImages]);

  // Ensure API images exist for any roster games not in the preloaded list
  useEffect(() => {
    const fetchMissing = async () => {
      const missing = Array.from(new Set((rosters || []).map(r => r.game).filter(g => g && !(gameImages as any)?.[g])));
      if (missing.length === 0) return;
      const newImages: Record<string, string> = {};
      await Promise.all(missing.map(async (g) => {
        try {
          const cached = await fetchGameData(g);
          if (cached.gameLogo) newImages[g] = cached.gameLogo;
        } catch {/* ignore */ }
      }));
      if (Object.keys(newImages).length > 0) {
        setGameImages(prev => ({ ...prev, ...newImages }));
      }
    };
    fetchMissing();
  }, [rosters, gameImages]);

  // State for member invitation
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  type SimpleUser = { id: string; username: string; email?: string; avatar_url?: string };
  const [searchResults, setSearchResults] = useState<SimpleUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<SimpleUser[]>([]);
  const [inviteMessage, setInviteMessage] = useState('');

  // State for tournaments
  type RegistrationWithTournament = {
    id: string;
    tournaments?: { name: string; start_date: string; prize_pool: string; slug?: string; game?: string; winner_id?: string | null; status?: string } | null;
  };
  const [upcomingTournaments, setUpcomingTournaments] = useState<any[]>([]);
  const [teamRegistrations, setTeamRegistrations] = useState<RegistrationWithTournament[]>([]);

  const currentTeam = userTeams?.[0];
  const isCaptain = currentTeam?.owner_id === user?.id;

  // Debug logging
  // Debug logging removed for production safety

  useEffect(() => {
    if (user?.id) {
      fetchUserTeams();
      fetchUpcomingTournaments();
      fetchGameImages();
    }
  }, [user?.id, fetchUserTeams]);

  useEffect(() => {
    if (currentTeam?.id) {
      fetchTeamStats();
    }
  }, [currentTeam?.id]);

  const fetchTeamStats = async () => {
    if (!currentTeam?.id) return;
    try {
      const stats = await apiClient.get<{ matches: number; wins: number; winRate: number; tournamentWins: number }>(
        `/api/teams/${currentTeam.id}/stats`
      );
      setTeamStats(stats);
    } catch (err) {
      console.error('Error in fetchTeamStats:', err);
    }
  };

  // Listen for team invite acceptance events
  useEffect(() => {
    const handleTeamInviteAccepted = () => {
      console.log('Team invite accepted, refreshing teams...');
      fetchUserTeams();
    };

    window.addEventListener('teamInviteAccepted', handleTeamInviteAccepted);

    return () => {
      window.removeEventListener('teamInviteAccepted', handleTeamInviteAccepted);
    };
  }, [fetchUserTeams]);

  // Fetch game images for edit modal
  const fetchGameImages = async () => {
    setImagesLoading(true);
    const images: Record<string, string> = {};
    const games = esportsGames.games;

    await Promise.all(
      games.map(async (game: any) => {
        try {
          const cached = await fetchGameData(game.name);
          if (cached.gameLogo) images[game.name] = cached.gameLogo;
        } catch {
          // ignore individual failures
        }
      })
    );
    setGameImages({ ...images });
    setImagesLoading(false);
  };

  // Editing logic removed in favor of EditTeamDialog component


  // Test storage access (for debugging)
  const testStorageAccess = async () => {
    try {
      console.log('=== STORAGE ACCESS TEST ===');
      console.log('Testing direct upload to team-logos bucket...');

      // Create a small test file
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testFile = new File([testBlob], 'test.txt', { type: 'text/plain' });

      const { error } = await supabase.storage
        .from('teams.logos')
        .upload(`test-${Date.now()}.txt`, testFile);

      if (error) {
        console.error('Storage test failed:', error);
        console.log('Error details:', {
          message: error.message,
          // Use type assertion for potential missing fields in current SDK version
          statusCode: (error as any).statusCode,
          error: (error as any).error
        });
      } else {
        console.log('Storage test successful! Bucket is accessible.');
      }
      console.log('===========================');
    } catch (error) {
      console.error('Storage test error:', error);
    }
  };

  // Expose test function to window for debugging
  if (typeof window !== 'undefined') {
    (window as any).testStorageAccess = testStorageAccess;
  };

  const handlePlayerCardUpload = async (file: File, teamName: string, memberId: string, username: string) => {
    if (!file || !user) return;

    // Sanitize team name for folder path
    const sanitizedTeamName = teamName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const sanitizedUsername = username.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const fileExt = file.name.split('.').pop();
    const fileName = `${sanitizedUsername}_${memberId}_${Date.now()}.${fileExt}`;
    const filePath = `player cards/${sanitizedTeamName}/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('users.avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('users.avatars')
        .getPublicUrl(filePath);

      // Update team member's avatar in profiles table if it's the user's own card
      // OR if we want to store it specifically for this team context?
      // The user request implies "player cards", which usually means the profile picture 
      // used in the card. For now, we update the profile avatar_url to keep it simple
      // unless we have a specific team_member_avatar column.
      // Based on previous code, PlayerCard uses member.avatar_url from profile.

      await apiClient.put(`/api/profiles/${memberId}/card-image`, { url: publicUrl });

      // Refresh data
      toast({
        title: "Player Card Updated",
        description: "Your new player card image has been uploaded successfully.",
      });

      // Trigger refresh
      window.dispatchEvent(new Event('teamAppsUpdated')); // Using existing event or creating new one
      // Or just force re-fetch
      setRefreshKey(prev => prev + 1);

    } catch (error: any) {
      console.error('Error uploading player card:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Could not upload player card image.",
        variant: "destructive"
      });
    }
  };

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (user?.id) fetchUserTeams();
  }, [user?.id, refreshKey]);

  useEffect(() => {
    if (currentTeam) {
      let cancelled = false;
      const teamId = currentTeam.id;

      // Parallelize fetches
      Promise.all([
        fetchTeamRegistrations(),
        fetchRosters(),
        isCaptain ? fetchTeamPendingInvites() : Promise.resolve()
      ]);

      // Fetch captain profile for display
      (async () => {
        try {
          if (currentTeam?.owner_id) {
            const data = await apiClient.get<any>(`/api/profiles/${currentTeam.owner_id}`);
            if (!cancelled) setOwnerProfile(data || null);
          } else {
            if (!cancelled) setOwnerProfile(null);
          }
        } catch {
          if (!cancelled) setOwnerProfile(null);
        }
      })();

      // Fetch full team members with riot/stats in one API call
      (async () => {
        try {
          if (!teamId) { if (!cancelled) setTeamMembers([]); return; }
          const rawMembers = await apiClient.get<any[]>(`/api/teams/${teamId}/members/detailed`);
          if (cancelled) return;

          const membersWithRiot = (rawMembers || []).map((r: any) => ({
            id: r.user_id,
            user_id: r.user_id,
            username: r.username,
            email: r.email,
            avatar_url: r.avatar_url,
            card_image_url: r.card_image_url,
            role: r.role,
            riot_puuid: r.riot_puuid,
            riot_game_name: r.riot_game_name,
            riot_tag_line: r.riot_tag_line,
            stats: r.kd ? {
              kd: r.kd,
              winRate: r.win_rate,
              hs: r.hs_percent,
              latest_match_id: r.latest_match_id
            } : undefined
          }));

          setTeamMembers(membersWithRiot);
        } catch (err) {
          console.error("Error fetching team members:", err);
          if (!cancelled) setTeamMembers([]);
        }
      })();

      return () => { cancelled = true; };
    } else {
      // Clear registrations when no team
      setTeamRegistrations([]);
      setRosters([]);
      setTeamInvites([]);
      setOwnerProfile(null);
      setTeamMembers([]);
    }
  }, [currentTeam, isCaptain]);

  const fetchStatsForMembers = async (members: TeamMember[]) => {
    const membersWithPuuid = members.filter(m => m?.riot_puuid);
    if (membersWithPuuid.length === 0) return;

    for (const member of membersWithPuuid) {
      if (!member) continue;
      try {
        // 1. Get region/shard via .NET proxy
        const shardData = await apiClient.post<any>('/api/integrations/riot/proxy', {
          endpoint: `/riot/account/v1/active-shards/by-game/val/by-puuid/${member.riot_puuid}`, region: 'americas'
        });

        const shard = shardData?.activeShard?.toLowerCase();
        let valRegion = 'ap';
        if (['na', 'br', 'latam'].includes(shard)) { valRegion = 'na'; }
        else if (['eu'].includes(shard)) { valRegion = 'eu'; }

        // 2. Get match history
        const historyData = await apiClient.post<any>('/api/integrations/riot/proxy', {
          endpoint: `/val/match/v1/matchlists/by-puuid/${member.riot_puuid}`, region: valRegion
        });

        if (!historyData?.history || historyData.history.length === 0) continue;

        const latestMatchId = historyData.history[0]?.matchId;

        if (member.stats?.latest_match_id === latestMatchId) continue;

        const latestMatches = historyData.history.slice(0, 5);
        let totalKills = 0, totalDeaths = 0, totalWins = 0, totalHeadshots = 0, totalHits = 0;

        for (const mInfo of latestMatches) {
          const detail = await apiClient.post<any>('/api/integrations/riot/proxy', {
            endpoint: `/val/match/v1/matches/${mInfo.matchId}`, region: valRegion
          });
          if (!detail || detail.error) continue;

          const p = detail.players.find((pl: any) => pl.puuid === member.riot_puuid);
          if (!p) continue;

          totalKills += p.stats.kills;
          totalDeaths += p.stats.deaths;

          const teamDetails = detail.teams.find((t: any) => t.teamId === p.teamId);
          if (teamDetails?.won) totalWins++;

          detail.roundResults?.forEach((round: any) => {
            const ps = round.playerStats.find((s: any) => s.puuid === member.riot_puuid);
            ps?.damage?.forEach((d: any) => {
              totalHeadshots += d.headshots;
              totalHits += (d.headshots + d.bodyshots + d.legshots);
            });
          });
        }

        const calculatedStats = {
          kd: (totalKills / Math.max(1, totalDeaths)).toFixed(2),
          winRate: Math.round((totalWins / latestMatches.length) * 100) + '%',
          hs: totalHits > 0 ? Math.round((totalHeadshots / totalHits) * 100) + '%' : '0%',
          latest_match_id: latestMatchId
        };

        // Stats calculation done — update local state only (no backend persistence)

        setTeamMembers(prev => prev.map(m =>
          m?.user_id === member.user_id ? { ...m, stats: calculatedStats } : m
        ));
      } catch (err) {
        console.error(`Failed to fetch stats for ${member.username}:`, err);
      }
    }
  };

  useEffect(() => {
    const fetchInvites = async () => {
      if (!user?.id) { setPendingInvites([]); return; }
      try {
        const list = await apiClient.get<any[]>('/api/teams/me/pending-invites');
        setPendingInvites(list || []);
      } catch {
        setPendingInvites([]);
      }
    };
    fetchInvites();
  }, [user?.id]);

  const fetchTeamPendingInvites = async () => {
    if (!currentTeam?.id) return;
    try {
      const data = await apiClient.get<any[]>(`/api/teams/${currentTeam.id}/invites`);
      // Filter to team-level invites (no roster_id)
      setTeamInvites((data || []).filter((i: any) => !i.roster_id));
    } catch {
      setTeamInvites([]);
    }
  };

  const fetchRosters = async () => {
    if (!userTeams || userTeams.length === 0) return;
    try {
      const allRosters: Roster[] = [];
      for (const team of userTeams) {
        try {
          const data = await apiClient.get<any[]>(`/api/teams/${team.id}/rosters`);
          const rosterList: Roster[] = (data || []).map((r: any) => {
            const members: RosterMember[] = (typeof r.members === 'string' ? JSON.parse(r.members) : r.members || [])
              .map((m: any) => ({
                user_id: m.user_id,
                username: m.username || 'Unknown',
                avatar_url: m.avatar_url || null,
                card_image_url: m.card_image_url || null,
                is_starter: m.is_starter ?? true
              }));

            // Add captain if not already in members (use team.members data, no external state dependency)
            if (team.owner_id && !members.some(m => m.user_id === team.owner_id)) {
              const ownerMember = team.members?.find((m: any) => m.id === team.owner_id || m.user_id === team.owner_id);
              members.unshift({
                user_id: team.owner_id,
                username: ownerMember?.username || 'Captain',
                avatar_url: ownerMember?.avatar_url || null,
                card_image_url: ownerMember?.card_image_url || null
              });
            }

            return {
              id: r.id, name: r.name, game: r.game, format: r.format, team_size: r.team_size,
              members, member_count: members.length
            };
          });
          allRosters.push(...rosterList);
        } catch (err) {
          console.error(`Error fetching rosters for team ${team.id}:`, err);
        }
      }
      setRosters(allRosters);
    } catch (err) {
      console.error('Error in fetchRosters:', err);
      setRosters([]);
    }
  };

  const fetchUpcomingTournaments = async () => {
    try {
      const data = await apiClient.get<any[]>('/api/tournaments/upcoming');
      setUpcomingTournaments(data || []);
    } catch {
      setUpcomingTournaments([]);
    }
  };

  const fetchTeamRegistrations = async () => {
    if (!currentTeam || !currentTeam.id) {
      setTeamRegistrations([]);
      return;
    }
    try {
      const data = await apiClient.get<any[]>(`/api/teams/${currentTeam.id}/registrations`);
      // Parse tournaments JSON if returned as string
      const parsed = (data || []).map((r: any) => ({
        ...r,
        tournaments: typeof r.tournaments === 'string' ? JSON.parse(r.tournaments) : r.tournaments
      }));
      setTeamRegistrations(parsed);
    } catch {
      setTeamRegistrations([]);
    }
  };

  const handleLeaveTeam = async () => {
    if (!currentTeam) return;

    try {
      await leaveTeam(currentTeam.id);

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('teamLeft'));

      toast({
        title: "Success",
        description: "You have left the team successfully.",
      });
      fetchUserTeams();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to leave team",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove || !currentTeam) return;

    try {
      console.log('Removing member:', memberToRemove.username, 'from team:', currentTeam.id);
      const success = await removeMemberFromTeam(currentTeam.id, memberToRemove.user_id);

      if (success) {
        // If the removed member is the current user, dispatch teamLeft event
        if (memberToRemove.user_id === user?.id) {
          window.dispatchEvent(new CustomEvent('teamLeft'));
        }

        toast({
          title: "Success",
          description: `${memberToRemove.username} has been removed from the team.`,
        });
        setShowRemoveMember(false);
        setMemberToRemove(null);
        // Refresh teams data
        await fetchUserTeams();
      } else {
        throw new Error('Failed to remove member');
      }
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    }
  };

  const handleTransferCaptaincy = async () => {
    if (!currentTeam || !memberToRemove) return;

    // Prevent transferring captaincy to yourself
    if (memberToRemove.user_id === user?.id) {
      toast({
        title: "Invalid Action",
        description: "You cannot transfer captaincy to yourself.",
        variant: "destructive",
      });
      setShowTransferCaptaincy(false);
      setMemberToRemove(null);
      return;
    }

    try {
      const success = await transferCaptaincy(currentTeam.id, memberToRemove.user_id);
      setShowTransferCaptaincy(false);
      setMemberToRemove(null);
      if (!success) return;
      // The hook already shows a toast and calls fetchUserTeams().
      // The useEffect on [currentTeam, isCaptain] will re-fetch rosters & ownerProfile.
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to transfer captaincy",
        variant: "destructive",
      });
    }
  };

  const handleDisbandTeam = async () => {
    if (!currentTeam) return;

    try {
      await disbandTeam(currentTeam.id);

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('teamLeft'));

      toast({
        title: "Success",
        description: "Team has been disbanded successfully.",
      });
      setShowDisbandTeam(false);
      fetchUserTeams();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disband team",
        variant: "destructive",
      });
    }
  };

  const openCreateRoster = () => {
    setNewRosterName('');
    setNewRosterGame('');
    setNewRosterFormat('');
    setNewRosterTeamSize(5);
    setNewRosterMembers([]);
    setRosterModalOpen(true);
  };

  const createRosterNow = async () => {
    if (!currentTeam?.id || !newRosterName || !newRosterGame || !newRosterTeamSize) return;
    // Enforce: max 3 rosters per team
    if (rosters.length >= 3) {
      toast({ title: 'Roster limit reached', description: 'A team can have at most 3 rosters.', variant: 'destructive' });
      return;
    }
    // Enforce: unique game per roster
    if (rosters.some(r => (r.game || '').toLowerCase() === newRosterGame.toLowerCase())) {
      toast({ title: 'Duplicate game', description: 'You already have a roster for this game.', variant: 'destructive' });
      return;
    }
    const maxAllowed = newRosterTeamSize === 5 ? 7 : newRosterTeamSize;
    // Creation no longer requires full members; allow 0..max (members can be added later)
    setRosterSubmitting(true);
    try {
      await apiClient.post(`/api/teams/${currentTeam.id}/rosters`, {
        name: newRosterName,
        game: newRosterGame,
        format: newRosterFormat || null,
        teamSize: newRosterTeamSize,
      });
      // Members can be added later through the Manage Roster dialog
      await fetchRosters();
      setRosterModalOpen(false);
    } catch (e) {
      console.error('Failed to create roster', e);
      toast({ title: 'Failed to create roster', variant: 'destructive' });
    } finally {
      setRosterSubmitting(false);
    }
  };

  const openManageRoster = async (r: Roster) => {
    setManageRoster(r);
    // Set editable fields (only name is editable)
    setEditRosterName(r.name);
    // Load roster members from the roster data we already have
    const rosterMembers = (r.members || []).filter((m: any) => m.user_id !== currentTeam?.owner_id);
    setManageMembers(rosterMembers.map((x: any) => x.user_id));
    const statusMap: Record<string, boolean> = {};
    rosterMembers.forEach((x: any) => {
      statusMap[x.user_id] = x.is_starter ?? true;
    });
    setManageMemberStatuses(statusMap);

    // Fetch roster-specific invites
    try {
      const allInvites = await apiClient.get<any[]>(`/api/teams/${currentTeam?.id}/invites`);
      setRosterInvites((allInvites || []).filter((i: any) => i.roster_id === r.id));
    } catch {
      setRosterInvites([]);
    }
    setManageRosterModalOpen(true);
  };
  const addInviteeByEmail = async () => {
    if (!inviteInput || !manageRoster || !currentTeam) return;
    const email = inviteInput.trim();
    try {
      const results = await apiClient.get<any[]>(`/api/profiles/search?q=${encodeURIComponent(email)}`);
      const prof = (results || []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (!prof) {
        toast({ title: 'User not found', description: 'No account with that email.', variant: 'destructive' });
        return;
      }
      if (prof.id === user?.id) {
        toast({ title: 'Invalid Selection', description: 'You cannot invite yourself.', variant: 'destructive' });
        return;
      }
      if (manageMembers.includes(prof.id)) {
        toast({ title: 'Already in Roster', description: 'User is already a member of this roster.', variant: 'destructive' });
        return;
      }
      if (selectedInvitees.some(p => p.id === prof.id)) {
        toast({ title: 'Already selected' });
        return;
      }
      setSelectedInvitees(prev => [...prev, { id: prof.id, email: prof.email, username: (prof as any).username }]);
      setInviteInput('');
    } catch (e: any) {
      toast({ title: 'Lookup failed', description: e?.message || '', variant: 'destructive' });
    }
  };

  const sendBatchRosterInvites = async () => {
    if (!manageRoster || !currentTeam) return;
    if (selectedInvitees.length === 0) return;
    try {
      const result = await apiClient.post<{ sent: number }>(`/api/teams/${currentTeam.id}/rosters/${manageRoster.id}/invite-batch`, {
        invitees: selectedInvitees.map(p => ({ userId: p.id, email: p.email }))
      });

      // Send emails for each invitee
      for (const prof of selectedInvitees) {
        sendEmail({
          type: 'TeamInvite',
          email: prof.email,
          data: {
            teamName: currentTeam.name,
            invitedBy: user?.user_metadata?.username || 'A player',
          }
        }).catch(() => {});
      }

      setSelectedInvitees([]);
      if (result.sent > 0) toast({ title: `Sent ${result.sent} invite${result.sent > 1 ? 's' : ''}` });
      else toast({ title: 'No invites sent', description: 'Users may already have pending invites.' });

      // Refresh invites
      const allInvites = await apiClient.get<any[]>(`/api/teams/${currentTeam.id}/invites`);
      setRosterInvites((allInvites || []).filter((i: any) => i.roster_id === manageRoster.id));
    } catch (e: any) {
      toast({ title: 'Invite failed', description: e?.message || '', variant: 'destructive' });
    }
  };

  // typeahead search for invitees
  useEffect(() => {
    const run = async () => {
      const q = inviteInput.trim();
      if (!q || q.length < 2 || !manageRoster) {
        setSuggestedUsers([]);
        return;
      }
      try {
        setIsSearchingInvitee(true);
        const data = await apiClient.get<any[]>(`/api/profiles/search?q=${encodeURIComponent(q)}`);
        const existingRosterIds = new Set(manageMembers);
        const toShow = (data || [])
          .filter((u: any) => u.id !== user?.id && !existingRosterIds.has(u.id) && !selectedInvitees.some(s => s.id === u.id))
          .map((u: any) => ({ id: u.id, email: u.email, username: u.username }));
        setSuggestedUsers(toShow);
      } finally {
        setIsSearchingInvitee(false);
      }
    };
    run();
  }, [inviteInput, manageRoster, currentTeam?.members, selectedInvitees]);

  const handleAddMemberToRoster = async (userId: string) => {
    if (!manageRoster || !currentTeam) return;
    try {
      await apiClient.post(`/api/teams/${currentTeam.id}/rosters/${manageRoster.id}/members`, { userId });
      setManageMembers(prev => [...prev, userId]);
      toast({ title: 'Member added to roster' });
      // update roster counts locally
      setRosters(prev => prev.map(r => r.id === manageRoster.id ? { ...r, member_count: (r.member_count || 0) + 1 } : r));
    } catch (e: any) {
      toast({ title: 'Failed to add member', description: e.message, variant: 'destructive' });
    }
  };

  const handleRemoveFromRoster = async (userId: string) => {
    if (!manageRoster || !currentTeam) return;
    try {
      // 1. Remove from the specific roster
      await apiClient.delete(`/api/teams/${currentTeam.id}/rosters/${manageRoster.id}/members/${userId}`);

      // 2. Remove from the entire team (as requested: roster removal = team kick)
      const success = await removeMemberFromTeam(currentTeam.id, userId);

      if (success) {
        setManageMembers(prev => prev.filter(id => id !== userId));
        // update roster counts locally for the current view
        setRosters(prev => prev.map(r => r.id === manageRoster.id ? { ...r, member_count: Math.max(0, (r.member_count || 0) - 1) } : r));

        toast({
          title: 'Member Kicked',
          description: 'User has been removed from the roster and the team.'
        });
      } else {
        throw new Error('Roster entry removed, but team removal failed. Please refresh.');
      }
    } catch (e: any) {
      toast({ title: 'Removal Failed', description: e.message, variant: 'destructive' });
    }
  };

  // Drag-and-drop sensors for playercard reordering
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = async (event: DragEndEvent, roster: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !currentTeam?.id) return;

    const members = roster.members || [];
    const oldIndex = members.findIndex((m: any) => m.user_id === active.id);
    const newIndex = members.findIndex((m: any) => m.user_id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    // Don't allow moving anything to position 0 (captain) or moving captain
    if (members[oldIndex]?.user_id === currentTeam.owner_id) return;
    if (newIndex === 0 && members[0]?.user_id === currentTeam.owner_id) return;

    // Reorder locally
    const reordered = [...members];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    // Optimistic update
    setRosters(prev => prev.map(r =>
      r.id === roster.id ? { ...r, members: reordered } : r
    ));

    // Persist order
    try {
      const order = reordered.map((m: any, i: number) => ({ userId: m.user_id, displayOrder: i }));
      await apiClient.put(`/api/teams/${currentTeam.id}/members/order`, { order });
    } catch {
      toast({ title: 'Failed to save order', variant: 'destructive' });
    }
  };

  const handleToggleStarter = async (userId: string, currentStatus: boolean) => {
    if (!manageRoster || !currentTeam) return;
    try {
      const newStatus = !currentStatus;
      await apiClient.put(`/api/teams/${currentTeam.id}/rosters/${manageRoster.id}/members/${userId}/starter`, { isStarter: newStatus });

      // Update local state
      setManageMemberStatuses(prev => ({ ...prev, [userId]: newStatus }));
      setRosters(prev => prev.map(r => {
        if (r.id === manageRoster.id) {
          return {
            ...r,
            members: r.members?.map(m => m.user_id === userId ? { ...m, is_starter: newStatus } : m)
          };
        }
        return r;
      }));

      toast({
        title: "Status Updated",
        description: `Player is now ${newStatus ? 'Active' : 'Benched'}`
      });
    } catch (e: any) {
      toast({ title: "Update Failed", description: e.message, variant: "destructive" });
    }
  };

  const saveManageRoster = async () => {
    if (!manageRoster || !editRosterName || !currentTeam) return;
    try {
      if (editRosterName !== manageRoster.name) {
        await apiClient.put(`/api/teams/${currentTeam.id}/rosters/${manageRoster.id}`, { name: editRosterName });
        manageRoster.name = editRosterName; // update local ref
        setRosters(prev => prev.map(r => r.id === manageRoster.id ? { ...r, name: editRosterName } : r));
      }
      toast({ title: 'Roster updated' });
      setManageRosterModalOpen(false);
    } catch (e) {
      console.error('Failed to update roster', e);
    }
  };

  const deleteRoster = async (roster: Roster) => {
    if (!roster || !currentTeam) return;
    if (!confirm(`Are you sure you want to delete the roster "${roster.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await apiClient.delete(`/api/teams/${currentTeam.id}/rosters/${roster.id}`);

      await fetchRosters();
      toast({ title: 'Roster deleted', description: `Roster "${roster.name}" has been deleted.` });
    } catch (e: any) {
      console.error('Failed to delete roster:', e);
      toast({ title: 'Failed to delete roster', description: e?.message || 'Could not delete roster.', variant: 'destructive' });
    }
  };

  const inviteByEmail = async () => {
    if (!manageRoster || !currentTeam) return;
    const email = (inviteSearch || '').trim();
    if (!email || !email.includes('@')) {
      toast({ title: 'Enter a valid email', variant: 'destructive' });
      return;
    }
    const maxAllowed = manageRoster.team_size === 5 ? 7 : manageRoster.team_size;
    if (manageMembers.length >= maxAllowed) {
      toast({ title: 'Roster is full', description: `Max ${maxAllowed} members for this roster.`, variant: 'destructive' });
      return;
    }
    try {
      setInvitingUserId('invite');
      // Find user by email
      const results = await apiClient.get<any[]>(`/api/profiles/search?q=${encodeURIComponent(email)}`);
      const prof = (results || []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (!prof) {
        toast({ title: 'User not found', description: 'No account with that email.', variant: 'destructive' });
        return;
      }

      // Create invitation via API (handles duplicate/team checks + notification server-side)
      const invite = await apiClient.post<any>(`/api/teams/${currentTeam.id}/rosters/${manageRoster.id}/invite`, {
        userId: prof.id, email
      });

      if (invite) {
        setRosterInvites(prev => [{ id: invite.id, invited_email: invite.invited_email, invited_user_id: invite.invited_user_id, created_at: invite.created_at }, ...prev]);
        setInviteSearch('');
      }

      // Dispatch Email
      await sendEmail({
        type: 'TeamInvite',
        email: email,
        data: {
          teamName: currentTeam.name,
          invitedBy: user?.user_metadata?.username || 'A player',
        }
      }).then(res => {
        if (!res.success) {
          console.error('[InviteByEmail] Email failed:', res.error);
        }
      });

      toast({ title: 'Invitation sent' });
    } catch (e: any) {
      toast({ title: 'Invite failed', description: e?.message || 'Could not invite user', variant: 'destructive' });
    } finally {
      setInvitingUserId(null);
    }
  };

  const acceptInvite = async (inviteId: string) => {
    try {
      setRefreshingAfterAccept(true);
      await apiClient.post(`/api/teams/invites/${inviteId}/accept`);
      // Refresh team/rosters in parallel
      await Promise.all([
        fetchUserTeams(),
        fetchRosters()
      ]);
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
      toast({ title: 'Invitation accepted' });
      // allow hook to refresh before showing UI
      setTimeout(() => setRefreshingAfterAccept(false), 800);
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message || 'Could not accept invite', variant: 'destructive' });
      setRefreshingAfterAccept(false);
    }
  };

  const declineInvite = async (inviteId: string) => {
    try {
      await apiClient.post(`/api/teams/invites/${inviteId}/decline`);
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
      toast({ title: 'Invitation declined' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message || 'Could not decline invite', variant: 'destructive' });
    }
  };

  const cancelRosterInvite = async (inviteId: string) => {
    if (!isCaptain) return;
    try {
      const success = await revokeTeamInvite(inviteId);
      if (success) {
        setRosterInvites(prev => prev.filter(i => i.id !== inviteId));
        setTeamInvites(prev => prev.filter(i => i.id !== inviteId));
        setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
      }
    } catch (e: any) {
      // Error is handled in hook, but we catch here just in case
      console.error('Error in cancelRosterInvite:', e);
    }
  };



  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const excludedIds = new Set<string>();
      if (user?.id) excludedIds.add(user.id);
      if (currentTeam?.owner_id) excludedIds.add(currentTeam.owner_id);
      if (currentTeam?.members) {
        currentTeam.members.forEach((m: any) => {
          if (m?.user_id) excludedIds.add(m.user_id);
        });
      }

      const data = await apiClient.get<any[]>(`/api/profiles/search?q=${encodeURIComponent(query)}`);
      const selectedIds = new Set(selectedUsers.map(u => u.id));
      const excludeIds = new Set<string>([...excludedIds, ...selectedIds]);
      setSearchResults(((data || []) as any[]).filter(u => !excludeIds.has(u.id)) as any);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    }
  };

  const sendInvites = async () => {
    if (!currentTeam || selectedUsers.length === 0) return;

    try {
      for (const user of selectedUsers) {
        await inviteUserToTeam(currentTeam.id, user.id, inviteMessage);
      }

      toast({
        title: "Success",
        description: `Invitations sent to ${selectedUsers.length} user(s).`,
      });

      setShowInviteModal(false);
      setSelectedUsers([]);
      setSearchQuery('');
      setSearchResults([]);
      setInviteMessage('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send invitations",
        variant: "destructive",
      });
    }
  };

  const toggleUserSelection = (user: any) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const removeFromSelection = (userId: string) => {
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  };



  // Check if user can access teams (only players can create/manage teams)
  if (!canCreateTeams) {
    return (
      <div className="min-h-screen bg-esports-dark flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl flex items-center justify-center">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <div className="text-esports-primary text-xl font-semibold mb-2">
            {currentRole === 'organizer' ? 'Organizer Mode' : currentRole === 'venue_owner' ? 'Venue Owner Mode' : 'Restricted'}
          </div>
          <div className="text-esports-secondary text-sm mb-4">
            {currentRole === 'organizer'
              ? "You're currently in Organizer mode. Switch to Player mode to create and manage teams."
              : currentRole === 'venue_owner'
                ? "You're currently in Venue Owner mode. Switch to Player mode to create and manage teams."
                : 'Switch to Player mode to create and manage teams.'}
          </div>
          <div className="text-xs text-gray-500">
            {currentRole === 'organizer'
              ? 'As an organizer, you can create tournaments but not teams.'
              : currentRole === 'venue_owner'
                ? 'As a venue owner, you can manage venues but not teams.'
                : 'Team features are only available in Player mode.'} Switch roles to access team features.
          </div>
        </div>
      </div>
    );
  }

  if (fetchingTeam) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center overflow-hidden relative">
        {/* Background ambience */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black opacity-50" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px] opacity-20" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Logo/Icon Pulse */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse" />
            <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent" />
              <Users className="w-8 h-8 text-white/80 animate-pulse" />
            </div>
            {/* Corner accents */}
            <div className="absolute -top-1 -left-1 w-2 h-2 border-t border-l border-indigo-500/50" />
            <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b border-r border-indigo-500/50" />
          </div>

          <div className="space-y-3 text-center">
            <h2 className="text-2xl font-heading font-light uppercase tracking-[0.2em] text-white flex items-center justify-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.15s' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0.3s' }} />
            </h2>
            <p className="text-white/30 text-xs font-mono tracking-widest uppercase animate-pulse">
              Synchronizing Roster Data
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentTeam) {
    if (refreshingAfterAccept) {
      return (
        <div className="min-h-screen bg-esports-dark flex items-center justify-center text-white">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 border-2 border-esports-accent border-t-transparent rounded-full animate-spin" />
            <div className="text-esports-secondary">Updating your team…</div>
          </div>
        </div>
      );
    }
    return (
      <div className="relative min-h-screen text-white font-sans pt-20">

        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Header */}
          <div className="text-center mb-16">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-6xl font-heading font-light uppercase tracking-[0.1em] text-white"
            >
              Start Your Legacy
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-4 text-lg text-white/60 font-light tracking-wide max-w-2xl mx-auto"
            >
              Create a team. Recruit players. Dominate the bracket.
            </motion.p>
          </div>

          {/* Pending invitations */}
          {pendingInvites.length > 0 && (
            <div className="mx-auto max-w-3xl mb-12">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden">
                <div className="px-6 py-6">
                  <h2 className="text-lg font-heading uppercase tracking-widest text-white/80 mb-6">Pending Invites</h2>
                  <div className="space-y-4">
                    {pendingInvites.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-xl hover:bg-white/10 transition-colors">
                        <div className="text-white/90">
                          <span className="font-semibold">{inv.team_name || 'Unknown Team'}</span>
                          <span className="text-white/50 text-sm ml-2">invites you to join</span>
                          {inv.roster_name && (
                            <span className="text-indigo-400 text-sm font-semibold ml-1">({inv.roster_name})</span>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <Button size="sm" className="bg-emerald-500/80 hover:bg-emerald-500 text-white rounded-full px-6" onClick={() => acceptInvite(inv.id)}>JOIN</Button>
                          <Button size="sm" variant="ghost" className="text-white/40 hover:text-white hover:bg-white/10 rounded-full" onClick={() => declineInvite(inv.id)}>DECLINE</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CTA Card */}
          <div className="mx-auto max-w-4xl">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 md:p-12 text-center overflow-hidden">

                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                    <Users className="w-8 h-8 text-white" />
                  </div>

                  <h2 className="text-3xl md:text-4xl font-heading font-light uppercase tracking-widest text-white mb-4">
                    Establish Your Team
                  </h2>
                  <p className="text-white/60 text-lg max-w-xl mb-10 leading-relaxed">
                    Every champion starts somewhere. Register your team name, upload your logo, and begin your journey to the top of the leaderboard.
                  </p>

                  <Button
                    size="lg"
                    className="h-14 px-10 bg-white text-black hover:bg-white/90 rounded-full font-heading font-bold uppercase tracking-widest text-sm transition-all hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.3)]"
                    onClick={() => {
                      if (!hasSeenTour('captain')) {
                        setShowJourneyTour(true);
                      } else {
                        setShowTeamCreationWizard(true);
                      }
                    }}
                  >
                    Create Team
                  </Button>
                </div>

                {/* Decorative Grid */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
              </div>
            </div>
          </div>
        </div>

        {/* Captain Journey Tour */}
        {showJourneyTour && (
          <CaptainJourneyTour onComplete={() => {
            markTourSeen('captain');
            setShowJourneyTour(false);
            setShowTeamCreationWizard(true);
          }} />
        )}

        {/* Team Creation Wizard Modal */}
        {showTeamCreationWizard && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex-center p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#0F1115] border border-white/10 rounded-3xl shadow-2xl">
              <TeamCreationWizard onClose={() => {
                setShowTeamCreationWizard(false);
                fetchUserTeams();
              }} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen text-white font-sans pt-20">

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Team Header */}
        <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 mb-8 relative overflow-hidden group">
          {/* Subtle gradient glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between mb-8">
            <div className="flex items-center gap-8">

              <div className="relative">
                <div className="w-24 h-24 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center overflow-hidden shadow-2xl">
                  {currentTeam.logo_url ? (
                    <img
                      src={currentTeam.logo_url}
                      alt={`${currentTeam.name} logo`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Users className="w-10 h-10 text-white/20" />
                  )}
                </div>
                {isCaptain && (
                  <button
                    onClick={() => setShowEditTeam(true)}
                    className="absolute -bottom-2 -right-2 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div>
                <h1 className="text-4xl font-heading font-light uppercase tracking-widest text-white mb-2">{currentTeam.name}</h1>
                <div className="flex items-center flex-wrap gap-4">
                  <div className="flex items-center space-x-3">
                    <Badge variant="secondary" className="bg-white/10 text-white border-0 font-mono">
                      {currentTeam.tag}
                    </Badge>
                    <Badge variant="outline" className="border-white/20 text-white/60">
                      {currentTeam.members?.length || 0} MEMBERS
                    </Badge>
                    {isCaptain && (
                      <Badge variant="outline" className="border-white/20 text-white/80 bg-white/5">
                        <Crown className="w-3 h-3 mr-1" />
                        CAPTAIN
                      </Badge>
                    )}
                  </div>

                  {/* Stats Bar */}
                  <div className="flex items-center gap-6 pl-6 border-l border-white/10">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Total Matches</span>
                      <span className="text-xl font-mono text-white font-medium">{teamStats.matches}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Wins</span>
                      <span className="text-xl font-mono text-emerald-400 font-medium">{teamStats.wins}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Win Rate</span>
                      <span className="text-xl font-mono text-indigo-400 font-medium">{teamStats.winRate}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-white/40 mb-1">Tournament Won</span>
                      <span className="text-xl font-mono text-yellow-400 font-medium flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {teamStats.tournamentWins || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Team Games */}
          {currentTeam.games && currentTeam.games.length > 0 && (
            <div className="mb-4 pt-6 border-t border-white/5">
              <h3 className="text-xs font-heading font-medium uppercase tracking-widest text-white/40 mb-3">Supported Games</h3>
              <div className="flex flex-wrap gap-2">
                {currentTeam.games.map((game: string, index: number) => (
                  <Badge key={index} variant="outline" className="border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors uppercase tracking-wider py-1.5 pl-2 pr-3">
                    <Gamepad2 className="w-3 h-3 mr-2 opacity-50" />
                    {game}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Team Description */}
          {currentTeam.description && (
            <p className="text-white/60 text-lg font-light leading-relaxed max-w-3xl mt-6">{currentTeam.description}</p>
          )}
        </div>




        {/* Pending Invitations for current user */}
        {pendingInvites.length > 0 && (
          <div className="w-full bg-[#121214]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6 mb-8 hover:border-indigo-500/30 transition-colors">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Pending Invitations
            </h2>
            <div className="space-y-3">
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                  <div className="text-white font-medium">
                    Team invite <span className="text-indigo-400">{inv.team_name || inv.team_id.slice(0, 8)}</span>
                    {inv.roster_name ? (
                      <span className="text-white/80 ml-2 italic">
                        joining <span className="text-indigo-300 font-bold">{inv.roster_name}</span>
                      </span>
                    ) : (
                      <span className="text-white/60 ml-2">· General Invite</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white border-0" onClick={() => acceptInvite(inv.id)}>Accept</Button>
                    <Button size="sm" variant="ghost" className="text-white/40 hover:text-red-400 hover:bg-red-500/10" onClick={() => declineInvite(inv.id)}>Decline</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Core Roster Cards Section */}
        {rosters.length > 0 && (
          <div className="space-y-12 mb-12">
            {rosters.map((r) => (
              <div key={`core-${r.id}`} className="w-full">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  <h2 className="text-sm font-heading font-bold uppercase tracking-[0.3em] text-white/40 whitespace-nowrap bg-white/5 px-6 py-2 rounded-full border border-white/5 backdrop-blur-sm">
                    CORE ROSTER ( <span className="text-indigo-400">{r.name}</span> : <span className="text-white/60">{r.game}</span> )
                  </h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>

                <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, r)}>
                  <SortableContext items={(r.members || []).map((m: any) => m.user_id)} strategy={rectSortingStrategy}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {r.members?.map((member) => (
                        <SortablePlayerCard
                          key={`${r.id}-${member.user_id}`}
                          id={member.user_id}
                          disabled={member.user_id === currentTeam?.owner_id}
                        >
                          <PlayerCard
                            member={{
                              user_id: member.user_id,
                              username: member.username,
                              avatar_url: member.avatar_url || undefined,
                              card_image_url: member.card_image_url || undefined,
                              role: member.user_id === currentTeam?.owner_id ? 'captain' : (teamMembers.find(tm => tm?.user_id === member.user_id)?.role || 'member'),
                              stats: teamMembers.find(tm => tm?.user_id === member.user_id)?.stats,
                              game: r.game
                            }}
                            isOwner={member.user_id === currentTeam?.owner_id}
                            isCurrentUser={member.user_id === user?.id}
                            className="transition-all duration-500 hover:scale-[1.05] hover:z-10"
                          />
                        </SortablePlayerCard>
                      ))}
                      {/* Vacant Slots */}
                      {Array.from({ length: Math.max(0, (r.team_size === 5 ? 5 : r.team_size) - (r.members?.length || 0)) }).map((_, i) => (
                        <div
                          key={`vacant-${r.id}-${i}`}
                          className="relative w-full aspect-[3/4] rounded-2xl border border-dashed border-white/5 bg-white/[0.02] flex flex-col items-center justify-center group/vacant hover:bg-white/[0.04] transition-all duration-500"
                        >
                          <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mb-3 group-hover/vacant:border-white/20 transition-colors">
                            <Users className="w-6 h-6 text-white/10 group-hover/vacant:text-white/20" />
                          </div>
                          <span className="text-[10px] uppercase tracking-widest text-white/10 group-hover/vacant:text-white/20 font-bold">Vacant Slot</span>
                        </div>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            ))}
          </div>
        )}

        {/* Rosters */}
        <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 mb-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-heading font-light uppercase tracking-widest text-white flex items-center gap-3">
              <Gamepad2 className="w-5 h-5 text-white/60" />
              Active Rosters
            </h2>
            {isCaptain && (
              <Button onClick={openCreateRoster} className="bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-full px-6">
                <Plus className="w-4 h-4 mr-2" />
                CREATE ROSTER
              </Button>
            )}
          </div>

          {rosters.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/5">
              <div className="text-white/40 font-light tracking-wide">NO ACTIVE ROSTERS FOUND</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rosters.map((r) => (
                <div key={r.id} className="group relative bg-[#0a0a0a]/40 backdrop-blur-sm border border-white/10 hover:border-white/20 rounded-xl p-6 transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <div className="font-heading font-medium text-white tracking-wide">{r.name}</div>
                    <Badge variant="secondary" className="bg-white/5 text-white/60 border-0 font-mono text-xs">
                      {r.member_count || 0}/{r.team_size === 5 ? 7 : r.team_size}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-white/50 text-sm font-light mb-6">
                    {getGameLogo(r.game) && (
                      <img
                        src={getGameLogo(r.game)}
                        alt={`${r.game} logo`}
                        className="w-4 h-4 object-contain grayscale opacity-60"
                      />
                    )}
                    <span className="uppercase tracking-wider">{r.game}</span>
                    <span className="w-1 h-1 rounded-full bg-white/20" />
                    <span>{r.format || 'Standard'}</span>
                  </div>

                  {isCaptain && (
                    <div className="flex gap-2 pt-4 border-t border-white/5">
                      <Button size="sm" variant="ghost" className="h-9 flex-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 uppercase text-xs tracking-wider" onClick={() => openManageRoster(r)}>Manage</Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-9 w-9 p-0 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => deleteRoster(r)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Campaigns */}
        <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 mb-8">
          <h2 className="text-xl font-heading font-light uppercase tracking-widest text-white mb-8 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-white/60" />
            Active Campaigns
          </h2>

          {teamRegistrations.filter(r => r.tournaments?.status !== 'completed').length > 0 ? (
            <div className="space-y-4">
              {teamRegistrations.filter(r => r.tournaments?.status !== 'completed').map((registration) => (
                <div
                  key={registration.id}
                  onClick={() => {
                    setSelectedTournament(registration.tournaments);
                    setIsTournamentModalOpen(true);
                  }}
                  className="group flex items-center justify-between p-6 bg-black/40 backdrop-blur-md border border-white/10 hover:border-indigo-500/50 hover:bg-black/60 rounded-2xl transition-all duration-500 cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 group-hover:scale-110 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/20 transition-all duration-500">
                      <Trophy className="w-7 h-7 text-white/40 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-xl font-heading font-medium text-white tracking-wide group-hover:text-indigo-300 transition-colors">
                        {registration.tournaments?.name || 'Tournament'}
                      </h3>
                      <div className="flex items-center gap-3 mt-2">
                        <Badge variant="outline" className="text-[10px] bg-white/5 border-white/10 text-white/40 uppercase tracking-widest px-2 py-0.5">
                          Starts {registration.tournaments?.start_date ? new Date(registration.tournaments.start_date).toLocaleDateString() : 'TBD'}
                        </Badge>
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-[10px] text-white/30 uppercase tracking-widest">Entry Confirmed</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right relative z-10">
                    <div className="text-white font-mono text-2xl group-hover:text-indigo-400 transition-colors">
                      ${registration.tournaments?.prize_pool}
                    </div>
                    <div className="text-white/20 text-[10px] uppercase tracking-[0.2em] mt-1">Total Prize</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/5">
              <div className="text-white/40 font-light tracking-wide">NO ACTIVE CAMPAIGNS</div>
              <p className="text-white/20 text-sm mt-2">Register for tournaments to compete</p>
            </div>
          )}
        </div>

        {/* Tournament History Timeline */}
        <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-8 mb-8">
          <h2 className="text-xl font-heading font-light uppercase tracking-widest text-white mb-8 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-white/60" />
            Tournament History
          </h2>

          {teamRegistrations.filter(r => r.tournaments?.status === 'completed').length > 0 ? (
            <div className="relative pl-8 border-l-2 border-white/10 space-y-8">
              {teamRegistrations
                .filter(r => r.tournaments?.status === 'completed')
                .sort((a, b) => {
                  const dateA = a.tournaments?.start_date ? new Date(a.tournaments.start_date).getTime() : 0;
                  const dateB = b.tournaments?.start_date ? new Date(b.tournaments.start_date).getTime() : 0;
                  return dateB - dateA; // Most recent first
                })
                .map((registration) => {
                  const isChampion = registration.tournaments?.winner_id === currentTeam?.id;
                  return (
                    <div
                      key={registration.id}
                      onClick={() => {
                        setSelectedTournament(registration.tournaments);
                        setIsTournamentModalOpen(true);
                      }}
                      className={`group relative p-5 rounded-xl cursor-pointer transition-all duration-300 ${isChampion ? 'bg-yellow-500/10 border border-yellow-500/30 hover:border-yellow-400/50' : 'bg-black/30 border border-white/5 hover:border-white/20'}`}
                    >
                      {/* Timeline Dot */}
                      <div className={`absolute -left-[41px] top-6 w-4 h-4 rounded-full border-2 ${isChampion ? 'bg-yellow-500 border-yellow-400' : 'bg-white/20 border-white/30'}`} />

                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] text-white/30 uppercase tracking-widest">
                              {registration.tournaments?.start_date ? new Date(registration.tournaments.start_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : 'Unknown'}
                            </span>
                            {registration.tournaments?.game && (
                              <Badge variant="outline" className="text-[9px] bg-white/5 border-white/10 text-white/40 uppercase tracking-widest px-1.5 py-0">
                                {registration.tournaments.game}
                              </Badge>
                            )}
                          </div>
                          <h3 className={`text-lg font-heading font-medium tracking-wide ${isChampion ? 'text-yellow-300' : 'text-white'}`}>
                            {registration.tournaments?.name || 'Tournament'}
                          </h3>
                          {isChampion && (
                            <div className="flex items-center gap-1.5 mt-2">
                              <Crown className="w-4 h-4 text-yellow-400" />
                              <span className="text-xs text-yellow-400 uppercase tracking-widest font-bold">Champion</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div className={`font-mono text-lg ${isChampion ? 'text-yellow-400' : 'text-white/60'}`}>
                            ${registration.tournaments?.prize_pool}
                          </div>
                          {registration.tournaments?.slug && (
                            <Link
                              to={`/tournaments/${registration.tournaments.slug}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] uppercase font-bold tracking-widest text-indigo-400 hover:text-indigo-300 border border-indigo-500/30 hover:border-indigo-500/60 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-full transition-all"
                            >
                              View Brackets
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl bg-white/5">
              <div className="text-white/40 font-light tracking-wide">NO TOURNAMENT HISTORY</div>
              <p className="text-white/20 text-sm mt-2">Completed tournaments will appear here</p>
            </div>
          )}
        </div>

        {/* Team Actions */}
        <div className="flex justify-center space-x-4">
          {!isCaptain && (
            <Button
              onClick={handleLeaveTeam}
              variant="outline"
              className="border-red-400 text-red-400 hover:bg-red-400/20"
            >
              <UserMinus className="w-4 h-4 mr-2" />
              Leave Team
            </Button>
          )}

          {isCaptain && (
            <>
              <Button
                onClick={() => setShowDisbandTeam(true)}
                variant="outline"
                className="border-red-400 text-red-400 hover:bg-red-400/20"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Disband Team
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Invite Members Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="bg-black/95 backdrop-blur-xl border border-white/10 text-white max-w-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[1050] max-h-[85vh] overflow-y-auto custom-scrollbar relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-[0.03] overflow-hidden"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-3xl font-heading font-light uppercase tracking-widest text-white mb-2">Invite Members</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label htmlFor="search" className="text-[10px] uppercase tracking-widest text-white/40 mb-2 block">Search Users</Label>
              <Input
                id="search"
                placeholder="Search by username or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="bg-white/5 border-white/10 text-white focus:border-indigo-500/50 focus:bg-white/10 transition-all font-heading tracking-wide"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8 border border-white/10">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback className="bg-indigo-600 text-[10px] text-white">{user.username?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-white group-hover:text-indigo-400 transition-colors text-sm">{user.username}</p>
                        <p className="text-white/30 text-xs">{user.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => toggleUserSelection(user)}
                      variant={selectedUsers.some(u => u.id === user.id) ? "default" : "outline"}
                      className={selectedUsers.some(u => u.id === user.id)
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white border-0 shadow-[0_0_15px_rgba(79,70,229,0.3)]"
                        : "border-white/10 text-white/60 hover:text-white hover:bg-white/10 hover:border-white/30"}
                    >
                      {selectedUsers.some(u => u.id === user.id) ? "Selected" : "Select"}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {selectedUsers.length > 0 && (
              <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                <Label className="text-[10px] uppercase tracking-widest text-white/40 mb-3 block">Selected Members</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-3 py-1 animate-in fade-in"
                    >
                      <span className="text-indigo-300 text-xs font-medium">{user.username}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromSelection(user.id)}
                        className="text-indigo-400 hover:text-white p-0 h-4 w-4 rounded-full"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="message" className="text-[10px] uppercase tracking-widest text-white/40 mb-2 block">Invite Message (Optional)</Label>
              <Input
                id="message"
                placeholder="Add a personal message..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                className="bg-white/5 border-white/10 text-white focus:border-indigo-500/50"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                onClick={() => setShowInviteModal(false)}
                variant="outline"
                className="border-white/10 text-white/60 hover:text-white hover:bg-white/5"
              >
                Cancel
              </Button>
              <Button
                onClick={sendInvites}
                disabled={selectedUsers.length === 0}
                className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:shadow-none"
              >
                Send Invites ({selectedUsers.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Invite Modal */}
      <Dialog open={showTeamInviteModal} onOpenChange={setShowTeamInviteModal}>
        <DialogContent className="bg-black/95 backdrop-blur-xl border border-white/10 text-white max-w-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[1050] max-h-[85vh] overflow-y-auto custom-scrollbar relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-[0.03] overflow-hidden"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-2xl font-heading font-light uppercase tracking-widest text-white">Invite Members to Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <Label className="text-[10px] uppercase tracking-widest text-white/40 mb-2 block">Invite by Email</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="member@example.com"
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                  className="bg-white/5 border-white/10 text-white flex-1 focus:border-indigo-500/50"
                />
                <Button onClick={async () => {
                  if (!inviteSearch || !inviteSearch.includes('@') || !currentTeam?.id) return;
                  try {
                    setInvitingUserId('team');
                    // Lookup user by email
                    const results = await apiClient.get<any[]>(`/api/profiles/search?q=${encodeURIComponent(inviteSearch.trim())}`);
                    const prof = (results || []).find((u: any) => u.email?.toLowerCase() === inviteSearch.trim().toLowerCase() || u.username?.toLowerCase() === inviteSearch.trim().toLowerCase());
                    if (!prof) { toast({ title: 'User not found', description: 'No account with that email/username.', variant: 'destructive' }); setInvitingUserId(null); return; }

                    // Use the hook's inviteUserToTeam which handles all server-side checks
                    const success = await inviteUserToTeam(currentTeam.id, prof.id);
                    if (success) {
                      setInviteSearch('');
                      await fetchTeamPendingInvites();
                    }
                  } catch (e: any) {
                    toast({ title: 'Invite failed', description: e?.message || 'Could not invite user', variant: 'destructive' });
                  } finally {
                    setInvitingUserId(null);
                  }
                }} disabled={!!invitingUserId} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                  {invitingUserId ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-widest text-white/40 mb-2 block">Pending Team Invites</Label>
              {teamInvites.length === 0 ? (
                <div className="text-white/30 text-sm italic py-2">No pending invitations</div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {teamInvites.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10">
                      <div className="text-white text-sm">
                        <span className="text-indigo-300 font-mono">{inv.invited_email || inv.invited_user_id?.slice(0, 8)}</span>
                        <span className="text-white/30 text-xs ml-2">{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : ''}</span>
                      </div>
                      <Button size="sm" variant="ghost" className="text-white/40 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0" onClick={async () => {
                        await revokeTeamInvite(inv.id);
                        setTeamInvites(prev => prev.filter(i => i.id !== inv.id));
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Create Roster Modal */}
      <Dialog open={rosterModalOpen} onOpenChange={setRosterModalOpen}>
        <DialogContent className="bg-black/95 backdrop-blur-2xl border border-white/10 text-white max-w-xl shadow-[0_0_60px_rgba(0,0,0,0.6)] rounded-3xl z-[1050] max-h-[85vh] overflow-y-auto custom-scrollbar p-0">
          <div className="pointer-events-none absolute inset-0 opacity-[0.05] overflow-hidden"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />

          <DialogHeader className="p-8 pb-4 relative z-10">
            <DialogTitle className="text-3xl font-heading font-light uppercase tracking-[0.15em] text-white">Create Roster</DialogTitle>
            <DialogDescription className="text-white/40 text-[10px] uppercase tracking-widest mt-1">Initialize a new competitive lineup</DialogDescription>
          </DialogHeader>

          <div className="p-8 pt-4 space-y-8 relative z-10">
            <div className="space-y-6">
              <div>
                <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 block">Roster Name</Label>
                <Input
                  value={newRosterName}
                  onChange={(e) => setNewRosterName(e.target.value)}
                  className="bg-white/[0.03] border-white/10 text-white focus:border-indigo-500/50 focus:bg-white/[0.06] transition-all h-12 rounded-xl px-4 font-heading tracking-wide placeholder:text-white/10"
                  placeholder="e.g., VALORANT MAIN, CS2 ACADEMY"
                />
              </div>

              <div>
                <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 block">Target Game</Label>
                <Select
                  value={newRosterGame}
                  onValueChange={(val) => {
                    setNewRosterGame(val);
                    const game = (esportsGames as any).games.find((g: any) => g.name === val);
                    if (game) {
                      setNewRosterFormat(game.defaultFormat);
                      const fmt = game.formats.find((f: any) => f.value === game.defaultFormat) || game.formats[0];
                      setNewRosterTeamSize(fmt?.teamSize || 5);
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-white/[0.03] border-white/10 text-white hover:bg-white/[0.06] hover:border-white/20 transition-all h-12 rounded-xl focus:ring-0 px-4">
                    <SelectValue placeholder="Select competitive game" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="bg-[#0f1115] border-white/10 text-white rounded-xl shadow-2xl backdrop-blur-xl z-[1100]">
                    {(esportsGames as any).games.map((g: any) => (
                      <SelectItem key={g.name} value={g.name} className="hover:bg-white/5 focus:bg-white/10 transition-colors py-3 cursor-pointer">
                        <div className="flex items-center gap-3">
                          {getGameLogo(g.name) ? (
                            <img src={getGameLogo(g.name)} loading="lazy" alt="" className="w-5 h-5 rounded-sm object-cover opacity-80" />
                          ) : (
                            <Gamepad2 className="w-4 h-4 text-indigo-400/60" />
                          )}
                          <span className="font-medium">{g.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newRosterGame && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-2 gap-6"
                >
                  <div>
                    <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 block">Format</Label>
                    <Select
                      value={newRosterFormat}
                      onValueChange={(val) => {
                        setNewRosterFormat(val);
                        const game = (esportsGames as any).games.find((g: any) => g.name === newRosterGame);
                        const fmt = game?.formats.find((f: any) => f.value === val);
                        const fmtSize = (val === '5v5') ? 5 : (fmt?.teamSize || 5);
                        setNewRosterTeamSize(fmtSize);
                      }}
                    >
                      <SelectTrigger className="w-full bg-white/[0.03] border-white/10 text-white hover:bg-white/[0.06] hover:border-white/20 transition-all h-12 rounded-xl focus:ring-0 px-4">
                        <SelectValue placeholder="Format" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4} className="bg-[#0f1115] border-white/10 text-white rounded-xl shadow-2xl backdrop-blur-xl z-[1100]">
                        {((esportsGames as any).games.find((g: any) => g.name === newRosterGame)?.formats || []).map((f: any) => (
                          <SelectItem key={f.value} value={f.value} className="hover:bg-white/5 py-3 cursor-pointer">{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3 block">Capacity</Label>
                    <div className="h-12 flex items-center px-4 bg-white/[0.02] border border-white/[0.05] rounded-xl text-white/60 font-mono text-sm">
                      {newRosterTeamSize} Members
                    </div>
                    <p className="text-[9px] text-white/20 mt-2 uppercase tracking-widest leading-relaxed">
                      {newRosterTeamSize === 5 ? 'Includes 2 Substitutes/Reserves' : 'Fixed size recruitment'}
                    </p>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                variant="outline"
                className="flex-1 border-white/10 text-white/60 hover:text-white hover:bg-white/5 h-12 rounded-xl font-heading tracking-widest text-[10px]"
                onClick={() => setRosterModalOpen(false)}
              >
                DISCARD
              </Button>
              <Button
                onClick={createRosterNow}
                disabled={rosterSubmitting || !newRosterName || !newRosterGame}
                className="flex-1 bg-white text-black hover:bg-white/90 h-12 rounded-xl font-heading font-bold tracking-widest text-[10px] shadow-[0_0_30px_rgba(255,255,255,0.1)] disabled:opacity-20 transition-all hover:scale-[1.02]"
              >
                {rosterSubmitting ? 'INITIALIZING...' : 'CREATE ROSTER'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Roster Modal */}
      <Dialog open={manageRosterModalOpen} onOpenChange={setManageRosterModalOpen}>
        <DialogContent className="bg-black/95 backdrop-blur-xl border border-white/10 text-white max-w-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] z-[1050] max-h-[90vh] overflow-y-auto custom-scrollbar">
          <div className="pointer-events-none absolute inset-0 opacity-[0.03] overflow-hidden"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />
          <DialogHeader className="mb-4 relative z-10">
            <DialogTitle className="text-3xl font-heading font-light uppercase tracking-widest text-white">Manage Roster</DialogTitle>
          </DialogHeader>
          {manageRoster && (
            <div className="space-y-6">
              {/* Editable Roster Details */}
              <div className="space-y-5 pb-6 border-b border-white/5">
                <div>
                  <Label className="text-[10px] uppercase tracking-widest text-white/40 mb-2 block">Roster Name</Label>
                  <Input
                    value={editRosterName}
                    onChange={(e) => setEditRosterName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white focus:border-indigo-500/50 focus:bg-white/10 transition-all font-heading tracking-wide"
                    placeholder="e.g., Valorant Main, CS2 Academy"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 flex items-center gap-2">
                    {getGameLogo(manageRoster.game) ? (
                      <img
                        src={getGameLogo(manageRoster.game)}
                        alt={`${manageRoster.game} logo`}
                        className="w-4 h-4 rounded-sm object-cover opacity-80"
                      />
                    ) : (
                      <Gamepad2 className="w-3.5 h-3.5 text-indigo-400" />
                    )}
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase tracking-widest text-white/30 leading-none mb-0.5">Game</span>
                      <span className="text-xs font-medium text-white/80 leading-none">{manageRoster.game}</span>
                    </div>
                  </div>

                  {manageRoster.format && (
                    <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 flex items-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-[9px] uppercase tracking-widest text-white/30 leading-none mb-0.5">Format</span>
                        <span className="text-xs font-medium text-white/80 leading-none">{manageRoster.format}</span>
                      </div>
                    </div>
                  )}

                  <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 flex items-center gap-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] uppercase tracking-widest text-white/30 leading-none mb-0.5">Size</span>
                      <span className="text-xs font-medium text-white/80 leading-none">{manageRoster.team_size === 5 ? '7 (5+2)' : manageRoster.team_size}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Roster Members Management */}
              <div className="pb-6 border-b border-white/5 space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 block mb-1">Current Lineup</Label>
                    <h3 className="text-xl font-heading font-light text-white tracking-tight">Active Roster</h3>
                  </div>
                  <Badge variant="outline" className="bg-white/5 border-white/10 text-white/60 font-mono py-1 px-3">
                    {(() => {
                      const uniqueMembers = new Set([currentTeam?.owner_id, ...manageMembers].filter(Boolean));
                      return uniqueMembers.size;
                    })()} / {manageRoster.team_size === 5 ? 7 : manageRoster.team_size}
                  </Badge>
                </div>

                {/* Member List - Premium Glassmorphic Items */}
                <div className="space-y-3 max-h-56 overflow-y-auto custom-scrollbar pr-2">
                  {/* Captain (Implicit Member) */}
                  {currentTeam && (() => {
                    const captainData = ownerProfile
                      || currentTeam.members?.find((m: any) => m.id === currentTeam.owner_id || m.user_id === currentTeam.owner_id)
                      || { username: 'Captain', avatar_url: undefined };
                    return (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.06] border border-white/10 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent" />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="relative">
                          <Avatar className="w-10 h-10 border-2 border-indigo-500/50 shadow-xl">
                            <AvatarImage src={captainData.avatar_url} />
                            <AvatarFallback className="text-xs bg-indigo-900 text-indigo-200">{captainData.username?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500 bg-[#0a0a0a] rounded-full p-0.5 border border-white/10" />
                        </div>
                        <div>
                          <span className="text-sm font-heading font-medium text-white block">{captainData.username || 'Captain'}</span>
                          <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">Team Captain</span>
                        </div>
                      </div>
                      <Badge className="bg-white/5 border-white/10 text-white/40 text-[8px] uppercase tracking-tighter relative z-10">Permanent</Badge>
                    </div>
                    );
                  })()}

                  {manageMembers.length === 0 && !currentTeam ? (
                    <div className="flex flex-col items-center justify-center py-8 px-4 border border-dashed border-white/10 rounded-2xl bg-white/[0.02]">
                      <Users className="w-8 h-8 text-white/10 mb-2" />
                      <p className="text-white/20 text-xs font-light tracking-wide uppercase">Roster is currently empty</p>
                    </div>
                  ) : (
                    manageMembers
                      .filter(uid => uid !== currentTeam?.owner_id) // Deduplicate owner from list
                      .map(uid => {
                        const member = teamMembers.find(m => m.user_id === uid);
                        if (!member) return null;
                        return (
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={uid}
                            className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.08] hover:border-white/10 transition-all group relative overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="flex items-center gap-4 relative z-10">
                              <div className="relative">
                                <Avatar className="w-10 h-10 border-2 border-white/10 shadow-xl group-hover:border-indigo-500/50 transition-colors">
                                  <AvatarImage src={member.avatar_url} />
                                  <AvatarFallback className="text-xs bg-indigo-900/50 text-indigo-200">{member.username?.charAt(0) || '?'}</AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0a0a0a]" />
                              </div>
                              <div>
                                <span className="text-sm font-heading font-medium text-white/90 group-hover:text-white transition-colors block">{member.username || 'Unknown User'}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleStarter(uid, manageMemberStatuses[uid] ?? true);
                                    }}
                                    className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border transition-all ${(manageMemberStatuses[uid] ?? true)
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                      : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20'
                                      }`}
                                  >
                                    {(manageMemberStatuses[uid] ?? true) ? 'STARTER' : 'BENCH'}
                                  </button>
                                  {isCaptain && uid !== currentTeam?.owner_id && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        const currentRole = teamMembers.find(m => m.user_id === uid)?.role;
                                        const newRole = currentRole === 'coach' ? 'member' : 'coach';
                                        if (currentTeam?.id) {
                                          const ok = await changeRole(currentTeam.id, uid, newRole);
                                          if (ok) {
                                            setTeamMembers(prev => prev.map(m => m.user_id === uid ? { ...m, role: newRole } : m));
                                          }
                                        }
                                      }}
                                      className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border transition-all ${
                                        teamMembers.find(m => m.user_id === uid)?.role === 'coach'
                                          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
                                          : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10 hover:text-white/50'
                                      }`}
                                    >
                                      {teamMembers.find(m => m.user_id === uid)?.role === 'coach' ? 'COACH' : 'SET COACH'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 relative z-10 opacity-0 group-hover:opacity-100 transition-all">
                              {isCaptain && uid !== currentTeam?.owner_id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-white/20 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-full transition-all"
                                  title="Transfer Captaincy"
                                  onClick={() => {
                                    setMemberToRemove(member as any);
                                    setShowTransferCaptaincy(true);
                                  }}
                                >
                                  <Shield className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-all"
                                onClick={() => handleRemoveFromRoster(uid)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </motion.div>
                        );
                      })
                  )}
                </div>

                {/* Team Members NOT in this roster */}
                {isCaptain && teamMembers.some(m => !manageMembers.includes(m.user_id) && m.user_id !== currentTeam?.owner_id) && (
                  <div className="space-y-3 mt-6">
                    <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 block">Add Team Members</Label>
                    <div className="grid grid-cols-1 gap-2">
                      {teamMembers
                        .filter(m => !manageMembers.includes(m.user_id) && m.user_id !== currentTeam?.owner_id)
                        .map(member => (
                          <div key={`add-${member.user_id}`} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] transition-all">
                            <div className="flex items-center gap-3">
                              <Avatar className="w-8 h-8 border border-white/10">
                                <AvatarImage src={member.avatar_url} />
                                <AvatarFallback className="text-[10px] bg-indigo-900/50 text-indigo-300">{member.username?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-white/70">{member.username}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-3 text-[10px] text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 uppercase tracking-widest"
                              onClick={() => handleAddMemberToRoster(member.user_id)}
                            >
                              Add to Lineup
                            </Button>
                          </div>
                        ))}
                    </div>
                  </div>
                )}


              </div>

              {/* Invite to this roster */}
              <div className="space-y-4">
                <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 block">External Recruitment</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="player@example.com"
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    className="bg-white/[0.03] border-white/10 text-white flex-1 focus:border-indigo-500/50 h-12 rounded-xl px-4"
                  />
                  <Button size="icon" onClick={addInviteeByEmail} className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] w-12 h-12 rounded-xl transition-all hover:scale-105 active:scale-95">
                    <Plus className="w-6 h-6" />
                  </Button>
                </div>

                {/* Typeahead suggestions */}
                {inviteInput && suggestedUsers.length > 0 && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-white/10 bg-[#0f1115] shadow-2xl backdrop-blur-xl z-50 relative">
                    {suggestedUsers.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        className="w-full text-left px-4 py-3 hover:bg-white/5 text-white flex items-center justify-between group transition-colors border-b border-white/[0.05] last:border-0"
                        onClick={() => {
                          setSelectedInvitees(prev => [...prev, { id: u.id, email: u.email, username: u.username }]);
                          setInviteInput('');
                          setSuggestedUsers([]);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8 border border-white/10">
                            <AvatarImage src={(u as any).avatar_url} />
                            <AvatarFallback className="text-xs bg-indigo-900/50 text-indigo-300">{u.username?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="group-hover:text-indigo-400 transition-colors font-medium text-sm">{u.username || u.email}</span>
                        </div>
                        <span className="text-[10px] text-white/20 tracking-tighter">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedInvitees.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedInvitees.map(p => (
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        key={p.id}
                        className="pl-3 pr-2 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-xs text-indigo-300 flex items-center gap-2 group hover:bg-indigo-500/20 transition-colors"
                      >
                        <span>{p.username || p.email}</span>
                        <button onClick={() => setSelectedInvitees(prev => prev.filter(x => x.id !== p.id))} className="text-indigo-400 hover:text-white transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="flex justify-between items-center bg-white/[0.02] border border-white/[0.05] p-4 rounded-xl">
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-medium">
                    Lineup Capacity: <span className="text-indigo-400">{manageRoster.team_size === 5 ? '7 Slots' : `${manageRoster.team_size} Slots`}</span>
                  </p>
                  <Button
                    size="sm"
                    onClick={sendBatchRosterInvites}
                    disabled={selectedInvitees.length === 0}
                    className="bg-emerald-500/80 hover:bg-emerald-500 text-white px-6 h-9 rounded-full font-heading uppercase tracking-widest text-[10px] transition-all disabled:opacity-30"
                  >
                    Send Invites ({selectedInvitees.length})
                  </Button>
                </div>
              </div>


              {/* Pending roster invites (owner view) */}
              {isCaptain && rosterInvites.length > 0 && (
                <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
                  <Label className="text-[10px] uppercase tracking-[0.2em] text-white/40 block">Pending Inbound</Label>
                  <div className="space-y-2">
                    {rosterInvites.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/[0.05] group">
                        <div className="flex flex-col">
                          <span className="text-sm text-white/80 font-medium">{(inv as any).profiles?.username || inv.invited_email || inv.invited_user_id?.slice(0, 8)}</span>
                          <span className="text-[10px] text-white/20 uppercase tracking-tight">{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : ''} at {inv.created_at ? new Date(inv.created_at).toLocaleTimeString() : ''}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400/50 hover:text-red-400 hover:bg-red-500/10 rounded-full h-8 px-4 text-[10px] uppercase tracking-widest"
                          onClick={() => cancelRosterInvite(inv.id)}
                        >
                          Revoke
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-6">
                <Button variant="outline" className="flex-1 border-white/10 text-white/60 hover:text-white hover:bg-white/5 h-12 rounded-xl font-heading tracking-widest text-xs" onClick={() => setManageRosterModalOpen(false)}>DISMISS</Button>
                <Button onClick={saveManageRoster} className="flex-1 bg-white text-black hover:bg-white/90 h-12 rounded-xl font-heading font-bold tracking-widest text-xs shadow-xl transition-all hover:scale-[1.02]">SAVE CHANGES</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={showRemoveMember} onOpenChange={setShowRemoveMember}>
        <AlertDialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-black/95 backdrop-blur-2xl border border-white/10 text-white max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-3xl p-8 z-[1100] max-h-[85vh] overflow-y-auto custom-scrollbar overflow-x-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-[0.03] overflow-hidden"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />
          <AlertDialogHeader className="relative z-10">
            <AlertDialogTitle className="text-2xl font-heading font-light uppercase tracking-widest text-white">Remove Member</AlertDialogTitle>
            <AlertDialogDescription className="text-white/40 text-sm leading-relaxed mt-4">
              Are you sure you want to remove <span className="text-red-400 font-medium">{memberToRemove?.username}</span> from the team? This action is permanent and cannot be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10 h-11 rounded-xl px-6 transition-all">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-red-600/80 hover:bg-red-600 text-white h-11 rounded-xl px-6 font-heading tracking-widest text-xs transition-all hover:scale-105"
            >
              CONFIRM REMOVAL
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Captaincy Confirmation */}
      <AlertDialog open={showTransferCaptaincy} onOpenChange={setShowTransferCaptaincy}>
        <AlertDialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-black/95 backdrop-blur-2xl border border-white/10 text-white max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-3xl p-8 z-[1100] max-h-[85vh] overflow-y-auto custom-scrollbar overflow-x-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-[0.03] overflow-hidden"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />
          <AlertDialogHeader className="relative z-10">
            <AlertDialogTitle className="text-2xl font-heading font-light uppercase tracking-widest text-white">Transfer Captaincy</AlertDialogTitle>
            <AlertDialogDescription className="text-white/40 text-sm leading-relaxed mt-4">
              Are you sure you want to transfer leadership to <span className="text-indigo-400 font-medium">{memberToRemove?.username}</span>? You will relinquish all captain permissions for this team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10 h-11 rounded-xl px-6 transition-all">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransferCaptaincy}
              className="bg-white text-black hover:bg-white/90 h-11 rounded-xl px-6 font-heading font-bold tracking-widest text-xs transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              TRANSFER CONTROL
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disband Team Confirmation */}
      <AlertDialog open={showDisbandTeam} onOpenChange={setShowDisbandTeam}>
        <AlertDialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-black/95 backdrop-blur-2xl border border-white/10 text-white max-w-md shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-3xl p-8 z-[1100] max-h-[85vh] overflow-y-auto custom-scrollbar overflow-x-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-[0.03] overflow-hidden"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />
          <AlertDialogHeader className="relative z-10">
            <AlertDialogTitle className="text-2xl font-heading font-light uppercase tracking-widest text-white text-red-500">Disband Team</AlertDialogTitle>
            <AlertDialogDescription className="text-white/40 text-sm leading-relaxed mt-4">
              Are you sure you want to disband this team? This will <span className="text-red-400 font-medium whitespace-nowrap">permanently delete</span> all rosters and remove all members. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel className="bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10 h-11 rounded-xl px-6 transition-all">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisbandTeam}
              className="bg-red-600 hover:bg-red-500 text-white h-11 rounded-xl px-6 font-heading font-bold tracking-widest text-xs transition-all hover:scale-105 shadow-[0_0_30px_rgba(239,68,68,0.2)]"
            >
              DISBAND TEAM
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>



      <EditTeamDialog
        open={showEditTeam}
        onOpenChange={setShowEditTeam}
        team={currentTeam}
      />
      {/* Tournament Details Modal */}
      <Dialog open={isTournamentModalOpen} onOpenChange={setIsTournamentModalOpen}>
        <DialogContent className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] bg-black/95 backdrop-blur-3xl border border-white/10 text-white max-w-2xl shadow-[0_0_80px_rgba(0,0,0,0.8)] rounded-3xl p-0 overflow-hidden z-[1100]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.05] overflow-hidden"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />

          {selectedTournament && (
            <div className="relative z-10">
              <div className="h-48 bg-gradient-to-b from-indigo-900/20 to-transparent flex items-end p-8">
                <div className="w-20 h-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center mb-[-40px] shadow-2xl relative z-20">
                  <Trophy className="w-10 h-10 text-indigo-400" />
                </div>
              </div>

              <div className="p-8 pt-16">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-3xl font-heading font-light uppercase tracking-widest text-white mb-2">{selectedTournament.name}</h2>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20">
                        {new Date(selectedTournament.start_date).toLocaleDateString()}
                      </Badge>
                      <Badge variant="outline" className="border-white/10 text-white/40">
                        PRIZE: ${selectedTournament.prize_pool}
                      </Badge>
                    </div>
                  </div>
                  <Link
                    to={selectedTournament.slug ? `/tournaments/${selectedTournament.slug}` : '#'}
                    className="bg-white text-black hover:bg-white/90 px-6 py-3 rounded-xl font-heading font-bold tracking-widest text-xs transition-all hover:scale-105 shadow-xl"
                  >
                    GO TO TOURNAMENT
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl group hover:border-indigo-500/30 transition-colors">
                    <div className="text-[10px] uppercase tracking-widest text-white/20 mb-2">Tournament Status</div>
                    <div className="text-lg text-white font-medium flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Active Entry
                    </div>
                  </div>
                  <div className="p-6 bg-white/[0.02] border border-white/[0.05] rounded-2xl group hover:border-indigo-500/30 transition-colors">
                    <div className="text-[10px] uppercase tracking-widest text-white/20 mb-2">Team Allocation</div>
                    <div className="text-lg text-white font-medium">Main Roster</div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  <p className="text-white/40 text-sm leading-relaxed">
                    Your team is registered and confirmed for this event. Ensure all roster members are checked in 30 minutes prior to the start time.
                  </p>
                </div>
              </div>

              <div className="p-8 border-t border-white/5 bg-white/[0.01]">
                <Button
                  variant="outline"
                  className="w-full border-white/10 text-white/40 hover:text-white hover:bg-white/5 h-12 rounded-xl font-heading tracking-widest text-xs"
                  onClick={() => setIsTournamentModalOpen(false)}
                >
                  DISMISS
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamsPage;
