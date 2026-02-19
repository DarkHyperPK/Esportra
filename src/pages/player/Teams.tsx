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
import { Link } from 'react-router-dom';
import TeamCreationWizard from '@/components/player/TeamCreationWizard';
import { Plus, Users, Settings, Crown, Trash2, UserMinus, UserPlus, Calendar, Trophy, Gamepad2, Edit, X, Upload, Save, Shield } from 'lucide-react';
import esportsGames from '@/data/esportsGames.json';
import PlayerCard from '@/components/player/PlayerCard';
import { sendEmail } from '@/hooks/useEmail';
import { rawgSearchGames } from '@/lib/rawgProxy';

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
  const [showTeamAnnouncement, setShowTeamAnnouncement] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [showTeamStats, setShowTeamStats] = useState(false);
  const [showMemberRoles, setShowMemberRoles] = useState(false);
  const [showTournamentManagement, setShowTournamentManagement] = useState(false);
  const [showTeamSettings, setShowTeamSettings] = useState(false);
  const [showTeamCreationWizard, setShowTeamCreationWizard] = useState(false);
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
          const searchName = String(g).trim().toLowerCase() === 'cs2' ? 'Counter-Strike 2' : g;
          const data = await rawgSearchGames(searchName, 1);
          if (data?.results?.length > 0) {
            newImages[g] = data.results[0].background_image || '';
          }
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

    let matches = 0;
    let wins = 0;
    let winRate = 0;
    let tournamentWins = 0;

    try {
      // 1. Fetch Match Stats
      try {
        const { data, error } = await supabase
          .from('brkt_matches')
          .select('winner_id, status')
          .or(`team1_id.eq.${currentTeam.id},team2_id.eq.${currentTeam.id}`)
          .eq('status', 'completed');

        if (!error && data) {
          matches = data.length;
          wins = data.filter(m => m.winner_id === currentTeam.id).length;
          winRate = matches > 0 ? Math.round((wins / matches) * 100) : 0;
        }
      } catch (matchErr) {
        console.error('Error fetching matches:', matchErr);
      }

      // 2. Fetch Trophies (Independently)
      try {
        const { count, error: twError } = await supabase
          .from('tournaments')
          .select('*', { count: 'exact', head: true })
          .eq('winner_id', currentTeam.id);

        if (!twError) {
          tournamentWins = count || 0;
        }
      } catch (e) {
        console.error('Error fetching trophies:', e);
      }

      setTeamStats({ matches, wins, winRate, tournamentWins });
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
    const batchSize = 4;
    const games = esportsGames.games;

    for (let i = 0; i < games.length; i += batchSize) {
      const batch = games.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (game: any) => {
          try {
            const searchName = game.name.trim().toLowerCase() === 'cs2' ? 'Counter-Strike 2' : game.name;
            const data = await rawgSearchGames(searchName, 1);
            if (data?.results?.length > 0) {
              images[game.name] = data.results[0].background_image || '';
            }
          } catch {
            // ignore individual failures
          }
        })
      );
      setGameImages({ ...images });
      if (i + batchSize < games.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    setImagesLoading(false);
  };

  // Initialize edit form with current team data
  const initializeEditForm = () => {
    if (currentTeam) {
      setEditTeamName(currentTeam.name);
      setEditTeamTag(currentTeam.tag);
      setEditTeamLogoUrl(currentTeam.logo_url);
      setEditTeamLogoFile(null);
    }
  };

  // Handle logo change for edit
  const handleEditLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEditTeamLogoFile(e.target.files[0]);
      setEditTeamLogoUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  // Upload team logo for edit
  const uploadTeamLogo = async (file: File): Promise<string | null> => {
    if (!file) return null;

    try {
      console.log('=== LOGO UPLOAD DEBUG ===');
      console.log('File:', file);
      console.log('File name:', file.name);
      console.log('File size:', file.size);
      console.log('File type:', file.type);

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error('File size must be less than 5MB');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `team-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = fileName;

      console.log('Uploading to path:', filePath);
      console.log('User ID:', user?.id);

      // Try uploading to team-logos bucket
      const { error } = await supabase.storage
        .from('teams.logos')
        .upload(filePath, file);

      if (error) {
        console.error('Upload error:', error);

        // If it's an RLS policy error, provide helpful message
        if (error.message.includes('row-level security policy')) {
          throw new Error('Storage permissions not configured. Please contact support to set up storage policies.');
        }

        throw error;
      }

      console.log('File uploaded successfully');

      const { data } = supabase.storage
        .from('teams.logos')
        .getPublicUrl(filePath);

      console.log('Public URL:', data.publicUrl);
      console.log('========================');

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      // Provide more helpful error messages
      if (errorMessage.includes('row-level security policy')) {
        toast({
          title: 'Storage Permissions Issue',
          description: 'Logo upload is not configured. Please contact support to enable logo uploads.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Logo Upload Failed',
          description: `Failed to upload team logo: ${errorMessage}`,
          variant: 'destructive',
        });
      }

      return null;
    }
  };

  // Handle team edit submission
  const handleEditTeam = async () => {
    if (!currentTeam || !editTeamName || !editTeamTag) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setEditSubmitting(true);

    try {
      // Upload new logo if provided
      let logoUrl = currentTeam.logo_url;
      if (editTeamLogoFile) {
        console.log('=== ATTEMPTING LOGO UPLOAD ===');
        console.log('User:', user?.id);
        console.log('File:', editTeamLogoFile.name);

        const newLogoUrl = await uploadTeamLogo(editTeamLogoFile);
        if (newLogoUrl) {
          logoUrl = newLogoUrl;
          console.log('Logo upload successful:', newLogoUrl);
        } else {
          console.log('Logo upload failed, keeping existing logo');
        }
      }

      // Update team in database
      const { error } = await supabase
        .from('teams')
        .update({
          name: editTeamName,
          tag: editTeamTag,
          logo_url: logoUrl,
        })
        .eq('id', currentTeam.id);

      if (error) throw error;

      // Show success message
      if (editTeamLogoFile && logoUrl === currentTeam.logo_url) {
        toast({
          title: 'Team Updated',
          description: 'Team information updated successfully. Logo upload failed, but you can try again later.',
          variant: 'default',
        });
      } else {
        toast({
          title: 'Team Updated',
          description: 'Your team has been updated successfully',
          variant: 'default',
        });
      }

      // Refresh team data
      await fetchUserTeams();
      setShowEditTeam(false);
    } catch (error) {
      console.error('Error updating team:', error);
      toast({
        title: 'Update Failed',
        description: 'Failed to update team. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setEditSubmitting(false);
    }
  };


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

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ card_image_url: publicUrl })
        .eq('id', memberId);

      if (updateError) throw updateError;

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
      // Add a small delay to prevent race conditions and allow team data to settle
      const timer = setTimeout(() => {
        // Parallelize fetches for better performance
        Promise.all([
          fetchTeamRegistrations(),
          fetchRosters(),
          isCaptain ? fetchTeamPendingInvites() : Promise.resolve()
        ]);
      }, 200);
      // Fetch captain profile for display
      (async () => {
        try {
          if (currentTeam?.owner_id) {
            const { data } = await supabase
              .from('profiles')
              .select('username, email, avatar_url, card_image_url')
              .eq('id', currentTeam.owner_id)
              .maybeSingle();
            setOwnerProfile((data as any) || null);
          } else {
            setOwnerProfile(null);
          }
        } catch {
          setOwnerProfile(null);
        }
      })();
      // Fetch full team members for display
      (async () => {
        try {
          if (!currentTeam?.id) { setTeamMembers([]); return; }
          const { data, error } = await supabase
            .rpc('get_team_members', { t_id: currentTeam.id });
          if (error) { setTeamMembers([]); return; }

          const rawMembers = (data as any[]) || [];

          // Fetch Riot accounts for these members
          const userIds = rawMembers.map(m => m.user_id);
          const { data: riotAccounts } = await supabase
            .from('riot_accounts')
            .select('user_id, puuid, game_name, tag_line')
            .in('user_id', userIds);

          // Fetch cached stats for these members
          const { data: cachedStats } = await supabase
            .from('valorant_player_stats')
            .select('*')
            .in('user_id', userIds);

          const riotMap = new Map();
          (riotAccounts || []).forEach(ra => riotMap.set(ra.user_id, ra));

          const statsMap = new Map();
          (cachedStats || []).forEach(cs => statsMap.set(cs.user_id, cs));

          const membersWithRiot = rawMembers.map(r => {
            const riotInfo = riotMap.get(r.user_id);
            const cache = statsMap.get(r.user_id);
            return {
              id: r.user_id,
              user_id: r.user_id,
              username: r.username,
              email: r.email,
              avatar_url: r.avatar_url,
              card_image_url: r.card_image_url,
              role: r.role,
              riot_puuid: riotInfo?.puuid,
              riot_game_name: riotInfo?.game_name,
              riot_tag_line: riotInfo?.tag_line,
              stats: cache ? {
                kd: cache.kd,
                winRate: cache.win_rate,
                hs: cache.hs_percent,
                latest_match_id: cache.latest_match_id
              } : undefined
            };
          });

          setTeamMembers(membersWithRiot);

          // Now fetch stats for those with linked accounts
          fetchStatsForMembers(membersWithRiot);
        } catch (err) {
          console.error("Error fetching team members with riot info:", err);
          setTeamMembers([]);
        }
      })();
      return () => clearTimeout(timer);
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
        // 1. Get region/shard
        const shardData = await supabase.functions.invoke('riot-match-proxy', {
          body: { endpoint: `/riot/account/v1/active-shards/by-game/val/by-puuid/${member.riot_puuid}`, region: 'americas' }
        });

        const shard = shardData.data?.activeShard?.toLowerCase();
        let valRegion = 'ap';
        if (['na', 'br', 'latam'].includes(shard)) { valRegion = 'na'; }
        else if (['eu'].includes(shard)) { valRegion = 'eu'; }

        // 2. Get match history (latest first)
        const historyData = await supabase.functions.invoke('riot-match-proxy', {
          body: { endpoint: `/val/match/v1/matchlists/by-puuid/${member.riot_puuid}`, region: valRegion }
        });

        if (!historyData.data?.history || historyData.data.history.length === 0) continue;

        const latestMatchId = historyData.data.history[0]?.matchId;

        // CHECK CACHE: If latest match ID hasn't changed, skip re-calculation
        if (member.stats?.latest_match_id === latestMatchId) {
          console.log(`[Stats] No new matches for ${member.username}, using cache.`);
          continue;
        }

        console.log(`[Stats] Updating for ${member.username} (New match ${latestMatchId})`);

        const latestMatches = historyData.data.history.slice(0, 5);
        let totalKills = 0, totalDeaths = 0, totalWins = 0, totalHeadshots = 0, totalHits = 0;

        for (const mInfo of latestMatches) {
          const detail = await supabase.functions.invoke('riot-match-proxy', {
            body: { endpoint: `/val/match/v1/matches/${mInfo.matchId}`, region: valRegion }
          });
          const match = detail.data;
          if (!match || match.error) continue;

          const p = match.players.find((pl: any) => pl.puuid === member.riot_puuid);
          if (!p) continue;

          totalKills += p.stats.kills;
          totalDeaths += p.stats.deaths;

          const teamDetails = match.teams.find((t: any) => t.teamId === p.teamId);
          if (teamDetails?.won) totalWins++;

          match.roundResults?.forEach((round: any) => {
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

        // Cache persistent stats in Supabase
        await supabase
          .from('valorant_player_stats')
          .upsert({
            user_id: member.user_id,
            puuid: member.riot_puuid,
            kd: calculatedStats.kd,
            win_rate: calculatedStats.winRate,
            hs_percent: calculatedStats.hs,
            latest_match_id: latestMatchId,
            last_updated: new Date().toISOString()
          });

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
      // Base invite rows
      const base = await supabase
        .from('team_invitations' as any)
        .select('id, team_id, roster_id, invited_email')
        .or(`invited_user_id.eq.${user.id},invited_email.eq.${user.email}`)
        .eq('status', 'pending');
      const rows: any[] = (base.data as any[]) || [];

      if (rows.length === 0) { setPendingInvites([]); return; }

      // Fetch team and roster names in bulk to avoid relationship issues
      const teamIds = Array.from(new Set(rows.map(r => r.team_id).filter(Boolean)));
      const rosterIds = Array.from(new Set(rows.map(r => r.roster_id).filter(Boolean)));

      const [teamsRes, rostersRes] = await Promise.all([
        teamIds.length > 0 ? supabase.from('teams').select('id,name').in('id', teamIds) : Promise.resolve({ data: [] } as any),
        rosterIds.length > 0 ? supabase.from('team_rosters' as any).select('id,name').in('id', rosterIds) : Promise.resolve({ data: [] } as any),
      ]);

      const teamNameById = new Map<string, string>();
      ((teamsRes.data as any[]) || []).forEach(t => teamNameById.set(t.id, t.name));
      const rosterNameById = new Map<string, string>();
      ((rostersRes.data as any[]) || []).forEach(r => rosterNameById.set(r.id, r.name));

      const list = rows.map(r => ({
        id: r.id,
        team_id: r.team_id,
        roster_id: r.roster_id,
        team_name: teamNameById.get(r.team_id) || null,
        roster_name: r.roster_id ? (rosterNameById.get(r.roster_id) || null) : null,
      }));
      setPendingInvites(list);
    };
    fetchInvites();
  }, [user?.id, user?.email]);

  const fetchTeamPendingInvites = async () => {
    if (!currentTeam?.id) return;
    const { data } = await supabase
      .from('team_invitations' as any)
      .select('id, invited_email, invited_user_id, created_at')
      .eq('team_id', currentTeam.id)
      .is('roster_id', null)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setTeamInvites((data as any[]) || []);
  };

  const fetchRosters = async () => {
    if (!currentTeam?.id) return;
    const { data } = await supabase
      .from('team_rosters' as any)
      .select('id, name, game, format, team_size')
      .eq('team_id', currentTeam.id)
      .order('created_at', { ascending: false });

    const rosterList: Roster[] = (data as any[])?.map(r => ({
      id: r.id, name: r.name, game: r.game, format: r.format, team_size: r.team_size, members: []
    })) || [];

    if (rosterList.length > 0) {
      // fetch roster members with profiles
      const { data: membersData } = await supabase
        .from('team_roster_members' as any)
        .select('roster_id, user_id, is_starter, profiles:user_id(username, avatar_url, card_image_url)')
        .in('roster_id', rosterList.map(r => r.id));

      const rosterMembersMap = new Map<string, RosterMember[]>();
      (membersData || []).forEach((row: any) => {
        const list = rosterMembersMap.get(row.roster_id) || [];
        list.push({
          user_id: row.user_id,
          username: row.profiles?.username || 'Unknown',
          avatar_url: row.profiles?.avatar_url || null,
          card_image_url: row.profiles?.card_image_url || null,
          is_starter: row.is_starter ?? true
        });
        rosterMembersMap.set(row.roster_id, list);
      });

      // Fetch owner profile if not already available
      let currentOwnerProfile = ownerProfile;
      if (!currentOwnerProfile && currentTeam.owner_id) {
        const { data: op } = await supabase.from('profiles').select('username, avatar_url, card_image_url').eq('id', currentTeam.owner_id).maybeSingle();
        if (op) {
          currentOwnerProfile = op;
          setOwnerProfile(op);
        }
      }

      rosterList.forEach(r => {
        const members = rosterMembersMap.get(r.id) || [];
        // Add captain if they are not already in the list
        if (currentTeam.owner_id && !members.some(m => m.user_id === currentTeam.owner_id)) {
          members.unshift({
            user_id: currentTeam.owner_id,
            username: currentOwnerProfile?.username || 'Captain',
            avatar_url: currentOwnerProfile?.avatar_url || null,
            card_image_url: currentOwnerProfile?.card_image_url || null
          });
        }
        r.members = members;
        r.member_count = members.length;
      });

      // No longer filtering rosters by membership - all team members should see all rosters.
      // This ensures rosters don't "vanish" for members or after captaincy transfer.
    }
    setRosters(rosterList);
  };

  const fetchUpcomingTournaments = async () => {
    try {
      // Attempt with start_date first
      let query = supabase
        .from('tournaments')
        .select('*')
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(5);

      let { data, error } = await query;

      if (error) {
        // Fallback: some schemas use 'date' instead of 'start_date'
        const fallback = await supabase
          .from('tournaments')
          .select('*')
          .gte('date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(5);
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        // Final fallback: no date filter, just most recent
        const latest = await supabase
          .from('tournaments')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        if (latest.error) throw latest.error;
        setUpcomingTournaments(latest.data || []);
        return;
      }

      setUpcomingTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      setUpcomingTournaments([]);
    }
  };

  const fetchTeamRegistrations = async () => {
    if (!currentTeam || !currentTeam.id) {
      console.log('No current team or team ID, skipping team registrations fetch');
      setTeamRegistrations([]);
      return;
    }

    console.log('Fetching team registrations for team:', currentTeam.id);

    try {
      // Preferred source: tournament_participants (new canonical)
      const { data: participants, error: partsError } = await supabase
        .from('tournament_participants')
        .select('*')
        .eq('team_id', currentTeam.id);

      console.log('Participants query result:', { participants, partsError });

      if (!partsError && participants && participants.length > 0) {
        const tournamentIds = participants.map(p => p.tournament_id).filter(Boolean);
        if (tournamentIds.length > 0) {
          const { data: tournaments, error: tournamentError } = await supabase
            .from('tournaments')
            .select('id, name, start_date, game, prize_pool, slug, winner_id, status')
            .in('id', tournamentIds);
          console.log('Tournaments for participants:', { tournaments, tournamentError });
          if (!tournamentError && tournaments) {
            const combined = participants.map(reg => ({
              ...reg,
              tournaments: tournaments.find(t => t.id === reg.tournament_id)
            }));
            setTeamRegistrations(combined as any);
          } else {
            setTeamRegistrations(participants as any);
          }
          return;
        } else {
          setTeamRegistrations([]);
          return;
        }
      }

      // Skip name-based fallback to avoid showing stale registrations from deleted teams

      // Fallback B: legacy table tournament_participants (deprecated - kept for backwards compatibility only)
      // Note: This table is no longer used. All registrations are in tournament_participants.
      let registrations = null;
      let regError = null;
      try {
        const result = await supabase
          .from('tournament_participants')
          .select('*')
          .eq('team_id', currentTeam.id);
        registrations = result.data;
        regError = result.error;
      } catch (e) {
        // Table may not exist if migration has run
        regError = e;
      }

      console.log('Basic registrations (legacy) result:', { registrations, regError });

      if (regError) {
        console.error('Error with legacy registrations query:', regError);

        // Check if it's a table not found error
        if (regError.message?.includes('relation') || regError.message?.includes('does not exist')) {
          console.log('Tournament registrations table does not exist, setting empty array');
          setTeamRegistrations([]);
          return;
        }

        // Try alternative table names
        const { data: altRegistrations, error: altRegError } = await supabase
          .from('tournament_teams')
          .select('*')
          .eq('team_id', currentTeam.id);

        console.log('Alternative registrations (tournament_teams) result:', { altRegistrations, altRegError });

        if (altRegError) {
          console.error('Both registration table queries failed:', { regError, altRegError });
          setTeamRegistrations([]);
          return;
        }

        setTeamRegistrations(altRegistrations || []);
        return;
      }

      // If basic query works, try to get tournament details separately
      if (registrations && registrations.length > 0) {
        const tournamentIds = registrations.map(reg => reg.tournament_id).filter(Boolean);

        if (tournamentIds.length > 0) {
          const { data: tournaments, error: tournamentError } = await supabase
            .from('tournaments')
            .select('id, name, start_date, game, prize_pool, slug, winner_id, status')
            .in('id', tournamentIds);

          console.log('Tournaments query result:', { tournaments, tournamentError });

          if (!tournamentError && tournaments) {
            // Combine the data
            const combinedData = registrations.map(reg => ({
              ...reg,
              tournaments: tournaments.find(t => t.id === reg.tournament_id)
            }));
            setTeamRegistrations(combinedData);
          } else {
            setTeamRegistrations(registrations);
          }
        } else {
          setTeamRegistrations(registrations);
        }
      } else {
        setTeamRegistrations([]);
      }

      console.log('Set team registrations (fallback path)');
    } catch (error) {
      console.error('Error fetching team registrations:', error);
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
      const ins = await supabase
        .from('team_rosters' as any)
        .insert({
          team_id: currentTeam.id,
          name: newRosterName,
          game: newRosterGame,
          format: newRosterFormat || null,
          team_size: newRosterTeamSize,
        })
        .select('id')
        .single();
      if (ins.error) throw ins.error;
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
    // load current members and pending invites in parallel
    const [membersRes, invitesRes] = await Promise.all([
      supabase
        .from('team_roster_members' as any)
        .select('user_id, is_starter')
        .eq('roster_id', r.id),
      supabase
        .from('team_invitations' as any)
        .select('id, invited_email, invited_user_id, created_at, profiles:invited_user_id(username, avatar_url)')
        .eq('team_id', currentTeam?.id)
        .eq('roster_id', r.id)
        .eq('status', 'pending')
    ]);

    const members = (membersRes.data || []) as any[];
    setManageMembers(members.map(x => x.user_id));
    const statusMap: Record<string, boolean> = {};
    members.forEach(x => {
      statusMap[x.user_id] = x.is_starter ?? true;
    });
    setManageMemberStatuses(statusMap);
    setRosterInvites((invitesRes.data as any[]) || []);
    setManageRosterModalOpen(true);
  };
  const addInviteeByEmail = async () => {
    if (!inviteInput || !manageRoster || !currentTeam) return;
    const email = inviteInput.trim();
    try {
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('id, email, username')
        .ilike('email', email)
        .maybeSingle();
      if (error || !prof) {
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
      let sent = 0;
      for (const prof of selectedInvitees) {
        // prevent duplicate pending
        const { data: pending } = await supabase
          .from('team_invitations' as any)
          .select('id')
          .eq('team_id', currentTeam.id)
          .eq('roster_id', manageRoster.id)
          .eq('invited_user_id', prof.id)
          .eq('status', 'pending')
          .maybeSingle();
        if (pending) continue;

        // Check if user is already on a team (not a free agent)
        const { data: existingMembership } = await supabase
          .from('team_members')
          .select('id')
          .eq('user_id', prof.id)
          .eq('is_active', true)
          .maybeSingle();
        if (existingMembership) continue; // Skip users already on a team

        const inserted = await supabase.from('team_invitations' as any).insert({
          team_id: currentTeam.id,
          roster_id: manageRoster.id,
          invited_user_id: prof.id,
          invited_email: prof.email,
          invited_by_user_id: user?.id,
          invited_by: user?.id, // Legacy column support
          status: 'pending'
        }).select('id, invited_email, invited_user_id, created_at').single();
        if (!inserted.error && inserted.data) {
          setRosterInvites(prev => [{
            id: inserted.data.id,
            invited_email: inserted.data.invited_email,
            invited_user_id: inserted.data.invited_user_id,
            created_at: inserted.data.created_at,
            profiles: { username: (prof as any).username, avatar_url: (prof as any).avatar_url }
          }, ...prev]);
          sent++;

          // Dispatch Email
          sendEmail({
            type: 'TEAM_INVITE',
            email: prof.email,
            data: {
              teamName: currentTeam.name,
              invitedBy: user?.user_metadata?.username || 'A player',
            }
          }).then(res => {
            if (!res.success) console.error('[BatchInvite] Email failed:', res.error);
            else console.log('[BatchInvite] Email sent to:', prof.email);
          });
        }
      }
      setSelectedInvitees([]);
      if (sent > 0) toast({ title: `Sent ${sent} invite${sent > 1 ? 's' : ''}` });
      else toast({ title: 'No invites sent', description: 'Users may already have pending invites.' });
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
        const { data } = await supabase
          .from('profiles')
          .select('id, email, username')
          .or(`email.ilike.%${q}%,username.ilike.%${q}%`)
          .limit(8);
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
    if (!manageRoster) return;
    try {
      const { error } = await supabase.from('team_roster_members' as any).insert({
        roster_id: manageRoster.id,
        user_id: userId
      });
      if (error) throw error;
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
      const { error: rosterErr } = await supabase.from('team_roster_members' as any)
        .delete()
        .eq('roster_id', manageRoster.id)
        .eq('user_id', userId);
      if (rosterErr) throw rosterErr;

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

  const handleToggleStarter = async (userId: string, currentStatus: boolean) => {
    if (!manageRoster) return;
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('team_roster_members' as any)
        .update({ is_starter: newStatus })
        .eq('roster_id', manageRoster.id)
        .eq('user_id', userId);

      if (error) throw error;

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
    if (!manageRoster || !editRosterName) return;
    try {
      if (editRosterName !== manageRoster.name) {
        await supabase.from('team_rosters' as any).update({ name: editRosterName }).eq('id', manageRoster.id);
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
      // Delete roster (cascade will handle roster members and invitations)
      const { error } = await supabase
        .from('team_rosters' as any)
        .delete()
        .eq('id', roster.id);

      if (error) throw error;

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
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('id, email')
        .ilike('email', email)
        .maybeSingle();
      if (error || !prof) {
        toast({ title: 'User not found', description: 'No account with that email.', variant: 'destructive' });
        return;
      }
      const userId = prof.id;

      // Avoid duplicate pending invites
      const { data: pending } = await supabase
        .from('team_invitations' as any)
        .select('id')
        .eq('team_id', currentTeam.id)
        .eq('roster_id', manageRoster.id)
        .eq('invited_user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();
      if (pending) {
        toast({ title: 'Invite already pending' });
        return;
      }

      // Check if user is already on a team (not a free agent)
      const { data: existingMembership } = await supabase
        .from('team_members')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle();
      if (existingMembership) {
        toast({ title: 'Player unavailable', description: 'This player is already on a team and cannot receive invitations.', variant: 'destructive' });
        return;
      }

      // Create invitation (member will be added to team/roster only after acceptance)
      const inserted = await supabase.from('team_invitations' as any).insert({
        team_id: currentTeam.id,
        roster_id: manageRoster.id,
        invited_user_id: userId,
        invited_email: email,
        invited_by_user_id: user?.id,
        invited_by: user?.id, // Legacy column support
        status: 'pending'
      }).select('id, invited_email, invited_user_id, created_at').single();
      if (!inserted.error && inserted.data) {
        setRosterInvites(prev => [{ id: inserted.data.id, invited_email: inserted.data.invited_email, invited_user_id: inserted.data.invited_user_id, created_at: inserted.data.created_at }, ...prev]);
        setInviteSearch('');
      }
      // Notify invited user
      try {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'team_invite',
          title: 'Team Invitation',
          message: `You have been invited to join ${currentTeam.name}${manageRoster ? ` (${manageRoster.name})` : ''}.`,
          link: '/player/teams',
          data: { team_id: currentTeam.id, roster_id: manageRoster?.id || null }
        } as any);
      } catch { }


      // Dispatch Email
      await sendEmail({
        type: 'TEAM_INVITE',
        email: email,
        data: {
          teamName: currentTeam.name,
          invitedBy: user?.user_metadata?.username || 'A player',
        }
      }).then(res => {
        if (!res.success) {
          console.error('[InviteByEmail] Email failed:', res.error);
          toast({ title: 'Invite sent, but email failed', description: res.error, variant: 'destructive' });
        } else {
          console.log('[InviteByEmail] Email sent to:', email);
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
      await supabase.rpc('accept_team_invite', { invite_id: inviteId });
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
      await supabase.rpc('decline_team_invite', { invite_id: inviteId });
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

  const handleSendAnnouncement = async () => {
    if (!currentTeam || !announcementText.trim()) return;

    try {
      // Send announcement to all team members
      const { data: members } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', currentTeam.id);

      if (members) {
        const notifications = members.map(member => ({
          user_id: member.user_id,
          type: 'team_announcement',
          title: 'Team Announcement',
          message: announcementText,
          data: { team_id: currentTeam.id, team_name: currentTeam.name }
        }));

        await supabase.from('notifications').insert(notifications);
      }

      toast({
        title: "Success",
        description: "Announcement sent to all team members.",
      });
      setShowTeamAnnouncement(false);
      setAnnouncementText('');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send announcement",
        variant: "destructive",
      });
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      // Build exclusion list: current user + everyone already in this team
      const excludedIds = new Set<string>();
      if (user?.id) excludedIds.add(user.id);
      if (currentTeam?.owner_id) excludedIds.add(currentTeam.owner_id);
      if (currentTeam?.members) {
        currentTeam.members.forEach((m: any) => {
          if (m?.user_id) excludedIds.add(m.user_id);
        });
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, email, avatar_url')
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(50);

      if (error) throw error;
      // Exclude team members/current user client-side for reliability
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

  // Refresh team data (useful after tournament registration)
  const refreshTeamData = async () => {
    await fetchUserTeams();
    await fetchTeamRegistrations();
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
                    onClick={() => setShowTeamCreationWizard(true)}
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
                      className="w-full h-full object-contain p-2"
                    />
                  ) : (
                    <Users className="w-10 h-10 text-white/20" />
                  )}
                </div>
                {isCaptain && (
                  <button
                    onClick={() => {
                      initializeEditForm();
                      setShowEditTeam(true);
                    }}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {r.members?.map((member) => (
                    <PlayerCard
                      key={`${r.id}-${member.user_id}`}
                      member={{
                        user_id: member.user_id,
                        username: member.username,
                        avatar_url: member.avatar_url || undefined,
                        card_image_url: member.card_image_url || undefined,
                        role: member.user_id === currentTeam?.owner_id ? 'captain' : 'member',
                        stats: teamMembers.find(tm => tm?.user_id === member.user_id)?.stats,
                        game: r.game
                      }}
                      isOwner={member.user_id === currentTeam?.owner_id}
                      isCurrentUser={member.user_id === user?.id}
                      className="transition-all duration-500 hover:scale-[1.05] hover:z-10"
                    />
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
                        <div className="text-right">
                          <div className={`font-mono text-lg ${isChampion ? 'text-yellow-400' : 'text-white/60'}`}>
                            ${registration.tournaments?.prize_pool}
                          </div>
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
          <Button
            onClick={refreshTeamData}
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Refresh Data
          </Button>

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
                onClick={() => setShowTeamAnnouncement(true)}
                variant="outline"
                className="border-blue-400 text-blue-400 hover:bg-blue-400/20"
              >
                <Settings className="w-4 h-4 mr-2" />
                Send Announcement
              </Button>
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
                  // re-use inviteByEmail with no roster context
                  if (!inviteSearch || !inviteSearch.includes('@') || !currentTeam?.id) return;
                  try {
                    setInvitingUserId('team');
                    const { data: prof, error: profErr } = await supabase
                      .from('profiles')
                      .select('id, email, username')
                      .or(`email.ilike.${inviteSearch.trim()},username.ilike.${inviteSearch.trim()}`)
                      .maybeSingle();
                    if (profErr) { toast({ title: 'Lookup failed', description: profErr.message, variant: 'destructive' }); setInvitingUserId(null); return; }
                    if (!prof) { toast({ title: 'User not found', description: 'No account with that email/username.', variant: 'destructive' }); setInvitingUserId(null); return; }
                    const userId = prof.id;

                    // Check if user is already on a team (not a free agent)
                    const { data: existingMembership, error: memberErr } = await supabase
                      .from('team_members')
                      .select('id, team_id')
                      .eq('user_id', userId)
                      .eq('is_active', true)
                      .maybeSingle();
                    if (memberErr) { toast({ title: 'Check failed', description: memberErr.message, variant: 'destructive' }); setInvitingUserId(null); return; }
                    if (existingMembership) {
                      toast({ title: 'Player unavailable', description: 'This player is already on a team and cannot receive invitations.', variant: 'destructive' });
                      setInvitingUserId(null);
                      return;
                    }

                    // avoid duplicate pending
                    const { data: pending, error: pendErr } = await supabase
                      .from('team_invitations' as any)
                      .select('id')
                      .eq('team_id', currentTeam.id)
                      .is('roster_id', null)
                      .eq('invited_user_id', userId)
                      .eq('status', 'pending')
                      .maybeSingle();
                    if (pendErr) { toast({ title: 'Check failed', description: pendErr.message, variant: 'destructive' }); setInvitingUserId(null); return; }
                    if (pending) { toast({ title: 'Invite already pending' }); setInvitingUserId(null); return; }
                    const inserted = await supabase.from('team_invitations' as any).insert({
                      team_id: currentTeam.id,
                      roster_id: null,
                      invited_user_id: userId,
                      invited_email: inviteSearch.trim(),
                      invited_by_user_id: user?.id,
                      status: 'pending'
                    }).select('id, invited_email, invited_user_id, created_at').single();
                    if (inserted.error) {
                      toast({ title: 'Invite failed', description: inserted.error.message, variant: 'destructive' });
                    } else if (inserted.data) {
                      setTeamInvites(prev => [{ id: inserted.data.id, invited_email: inserted.data.invited_email, invited_user_id: inserted.data.invited_user_id, created_at: inserted.data.created_at }, ...prev]);
                      setInviteSearch('');
                      toast({ title: 'Invitation sent' });
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
                        await supabase.from('team_invitations' as any).delete().eq('id', inv.id);
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
                            <img src={getGameLogo(g.name)} alt="" className="w-5 h-5 rounded-sm object-cover opacity-80" />
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
                  {currentTeam && ownerProfile && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.06] border border-white/10 relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent" />
                      <div className="flex items-center gap-4 relative z-10">
                        <div className="relative">
                          <Avatar className="w-10 h-10 border-2 border-indigo-500/50 shadow-xl">
                            <AvatarImage src={ownerProfile.avatar_url} />
                            <AvatarFallback className="text-xs bg-indigo-900 text-indigo-200">{ownerProfile.username?.charAt(0) || '?'}</AvatarFallback>
                          </Avatar>
                          <Crown className="absolute -top-1 -right-1 w-4 h-4 text-yellow-500 bg-[#0a0a0a] rounded-full p-0.5 border border-white/10" />
                        </div>
                        <div>
                          <span className="text-sm font-heading font-medium text-white block">{ownerProfile.username || 'Captain'}</span>
                          <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">Team Captain</span>
                        </div>
                      </div>
                      <Badge className="bg-white/5 border-white/10 text-white/40 text-[8px] uppercase tracking-tighter relative z-10">Permanent</Badge>
                    </div>
                  )}

                  {manageMembers.length === 0 && !ownerProfile ? (
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

      <Dialog open={showTeamAnnouncement} onOpenChange={setShowTeamAnnouncement}>
        <DialogContent className="bg-black/95 backdrop-blur-2xl border border-white/10 text-white max-w-lg shadow-[0_0_60px_rgba(0,0,0,0.6)] rounded-3xl p-0 overflow-hidden relative">
          <div className="pointer-events-none absolute inset-0 opacity-[0.03] overflow-hidden"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
          <DialogHeader className="p-8 pb-4 relative z-10">
            <DialogTitle className="text-2xl font-heading font-light uppercase tracking-[0.2em] text-white">Broadcast</DialogTitle>
            <DialogDescription className="text-white/40 text-[10px] uppercase tracking-widest mt-1">Send an announcement to all members</DialogDescription>
          </DialogHeader>

          <div className="p-8 pt-4 space-y-6 relative z-10">
            <div>
              <Label htmlFor="announcement" className="text-[10px] uppercase tracking-widest text-white/40 mb-3 block">Message Content</Label>
              <textarea
                id="announcement"
                placeholder="Enter your message to the team..."
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                className="w-full h-40 p-4 bg-white/[0.03] border border-white/10 rounded-2xl text-white resize-none focus:outline-none focus:border-indigo-500/50 transition-all font-light placeholder:text-white/10 scrollbar-hide"
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowTeamAnnouncement(false)}
                variant="outline"
                className="flex-1 border-white/10 text-white/60 hover:text-white hover:bg-white/5 h-12 rounded-xl font-heading tracking-widest text-xs"
              >
                DISCARD
              </Button>
              <Button
                onClick={handleSendAnnouncement}
                disabled={!announcementText.trim()}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white h-12 rounded-xl font-heading font-bold tracking-widest text-xs shadow-xl transition-all hover:scale-[1.02] disabled:opacity-30"
              >
                SEND ANNOUNCEMENT
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditTeam} onOpenChange={setShowEditTeam}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-black/95 backdrop-blur-3xl border border-white/10 text-white rounded-3xl p-0 scrollbar-hide relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 opacity-[0.03] overflow-hidden"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />

          <DialogHeader className="p-8 pb-4 relative z-10">
            <DialogTitle className="text-3xl font-heading font-light uppercase tracking-[0.2em] text-white">
              Identity & Ops
            </DialogTitle>
            <DialogDescription className="text-white/40 text-[10px] uppercase tracking-widest mt-1">
              Configure team foundations and branding
            </DialogDescription>
          </DialogHeader>

          <div className="p-8 pt-4 space-y-10 relative z-10">
            {/* Team Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="editTeamName" className="text-[10px] uppercase tracking-widest text-white/40 mb-3 block">Team Name</Label>
                  <Input
                    id="editTeamName"
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    placeholder="Enter team name"
                    className="bg-white/[0.03] border-white/10 text-white focus:border-indigo-500/50 h-12 rounded-xl px-4 font-heading tracking-wide"
                  />
                </div>

                <div>
                  <Label htmlFor="editTeamTag" className="text-[10px] uppercase tracking-widest text-white/40 mb-3 block">Official Tag</Label>
                  <Input
                    id="editTeamTag"
                    value={editTeamTag}
                    onChange={(e) => setEditTeamTag(e.target.value.toUpperCase())}
                    placeholder="3-6 characters"
                    maxLength={6}
                    className="bg-white/[0.03] border-white/10 text-white focus:border-indigo-500/50 h-12 rounded-xl px-4 font-mono tracking-[0.3em] uppercase"
                  />
                </div>

                <div>
                  <Label htmlFor="editTeamLogo" className="text-[10px] uppercase tracking-widest text-white/40 mb-3 block">Branding Assets</Label>
                  <div className="space-y-4">
                    <div className="relative group cursor-pointer">
                      <Input
                        id="editTeamLogo"
                        type="file"
                        accept="image/*"
                        onChange={handleEditLogoChange}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      />
                      <div className="h-12 border border-dashed border-white/20 rounded-xl flex items-center justify-center gap-3 bg-white/[0.02] group-hover:bg-white/[0.05] transition-all">
                        <Upload className="w-4 h-4 text-white/30" />
                        <span className="text-xs text-white/40">Upload New Mark</span>
                      </div>
                    </div>
                    {editTeamLogoUrl && (
                      <div className="flex items-center gap-4 bg-white/[0.02] p-3 rounded-2xl border border-white/[0.05]">
                        <div className="w-16 h-16 bg-black/40 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden">
                          <img
                            src={editTeamLogoUrl}
                            alt="Logo Preview"
                            className="w-full h-full object-contain p-1"
                          />
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-white/20">
                          Primary Shield
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Game Selection can go here or in another section */}
              <div className="bg-white/[0.02] rounded-3xl border border-white/[0.05] p-6 flex flex-col items-center justify-center gap-3">
                <Settings className="w-10 h-10 text-white/10" />
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/20 text-center">Operational Settings<br /><span className="text-[8px] opacity-50 italic">More options coming soon</span></p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 border-t border-white/5 pt-8">
              <Button
                variant="outline"
                onClick={() => setShowEditTeam(false)}
                className="flex-1 border-white/10 text-white/60 hover:text-white hover:bg-white/5 h-12 rounded-xl font-heading tracking-widest text-xs"
              >
                DISCARD
              </Button>
              <Button
                onClick={handleEditTeam}
                disabled={editSubmitting || !editTeamName || !editTeamTag}
                className="flex-1 bg-white text-black hover:bg-white/90 h-12 rounded-xl font-heading font-bold tracking-widest text-xs shadow-2xl transition-all hover:scale-[1.02] disabled:opacity-20 flex items-center justify-center gap-2"
              >
                {editSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                    UPDATING...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    COMMIT CHANGES
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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