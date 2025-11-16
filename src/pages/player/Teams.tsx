import React, { useState, useEffect, useCallback } from 'react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import TeamCreationWizard from '@/components/player/TeamCreationWizard';
import { Plus, Users, Settings, Crown, Trash2, UserMinus, UserPlus, Calendar, Trophy, Gamepad2, Edit, X, Upload, Save } from 'lucide-react';
import esportsGames from '@/data/esportsGames.json';

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
    fetchingTeam 
  } = useTeamManagement();
  const { toast } = useToast();

  // State for team management
  const [showRemoveMember, setShowRemoveMember] = useState(false);
  const [showEditTeam, setShowEditTeam] = useState(false);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamTag, setEditTeamTag] = useState('');
  const [editTeamGames, setEditTeamGames] = useState<string[]>([]);
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
    role?: string;
    verified?: boolean;
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
  const [ownerProfile, setOwnerProfile] = useState<{ username?: string; email?: string; avatar_url?: string } | null>(null);
  const [refreshingAfterAccept, setRefreshingAfterAccept] = useState(false);
  const [teamMembers, setTeamMembers] = useState<Array<{ user_id: string; username?: string; email?: string; avatar_url?: string }>>([]);

  // Rosters
  type Roster = { id: string; name: string; game: string; format: string | null; team_size: number; member_count?: number };
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
  const [inviteSearch, setInviteSearch] = useState('');
  const [invitingUserId, setInvitingUserId] = useState<string | null>(null);
  const [rosterInvites, setRosterInvites] = useState<Array<{ id: string; invited_email?: string | null; invited_user_id?: string | null; created_at?: string }>>([]);
  const [inviteInput, setInviteInput] = useState('');
  const [selectedInvitees, setSelectedInvitees] = useState<Array<{ id: string; email: string; username?: string }>>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<Array<{ id: string; email: string; username?: string }>>([]);
  const [isSearchingInvitee, setIsSearchingInvitee] = useState(false);

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
          const response = await fetch(`https://api.rawg.io/api/games?key=55e8210bf73448108b7f3c6707739206&search=${encodeURIComponent(searchName)}&page_size=1`);
          const data = await response.json();
          if (data?.results?.length > 0) {
            newImages[g] = data.results[0].background_image || '';
          }
        } catch {/* ignore */}
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
    tournaments?: { name: string; start_date: string; prize_pool: string } | null;
  };
  const [upcomingTournaments, setUpcomingTournaments] = useState<any[]>([]);
  const [teamRegistrations, setTeamRegistrations] = useState<RegistrationWithTournament[]>([]);

  const currentTeam = userTeams?.[0];
  const isCaptain = currentTeam?.owner_id === user?.id;
  
  // Debug logging
  console.log('=== TEAM DEBUG ===');
  console.log('Current user ID:', user?.id);
  console.log('Team owner_id:', currentTeam?.owner_id);
  console.log('Is captain:', isCaptain);
  console.log('Team members:', currentTeam?.members);
  console.log('Members count:', currentTeam?.members?.length);
  console.log('Team logo_url:', currentTeam?.logo_url);
  console.log('Team data:', currentTeam);

  useEffect(() => {
    if (user) {
      fetchUserTeams();
      fetchUpcomingTournaments();
      fetchGameImages();
    }
  }, [user, fetchUserTeams]);

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
            const response = await fetch(`https://api.rawg.io/api/games?key=55e8210bf73448108b7f3c6707739206&search=${encodeURIComponent(searchName)}&page_size=1`);
            const data = await response.json();
            if (data && data.results && data.results.length > 0) {
              images[game.name] = data.results[0].background_image || '';
            }
          } catch (error) {
            console.error(`Failed to fetch image for ${game.name}:`, error);
          }
        })
      );
      setGameImages({...images});
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
      setEditTeamGames(currentTeam.games || []);
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
        .from('team-logos')
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
        .from('team-logos')
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
          games: editTeamGames,
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

  // Handle game toggle for edit
  const handleEditGameToggle = (gameName: string) => {
    setEditTeamGames(prev => 
      prev.includes(gameName) 
        ? prev.filter(g => g !== gameName)
        : [...prev, gameName]
    );
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
        .from('team-logos')
        .upload(`test-${Date.now()}.txt`, testFile);
      
      if (error) {
        console.error('Storage test failed:', error);
        console.log('Error details:', {
          message: error.message,
          statusCode: error.statusCode,
          error: error.error
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
  }

  useEffect(() => {
    if (currentTeam) {
      // Add a small delay to prevent race conditions and allow team data to settle
      const timer = setTimeout(() => {
        fetchTeamRegistrations();
        fetchRosters();
        if (isCaptain) fetchTeamPendingInvites();
      }, 200);
      // Fetch captain profile for display
      (async () => {
        try {
          if (currentTeam?.owner_id) {
            const { data } = await supabase
              .from('profiles')
              .select('username, email, avatar_url')
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
          const rows = (data as any[]) || [];
          setTeamMembers(rows.map(r => ({
            user_id: r.user_id,
            username: r.username,
            email: r.email,
            avatar_url: r.avatar_url
          })));
        } catch {
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
  }, [user?.id]);

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
      id: r.id, name: r.name, game: r.game, format: r.format, team_size: r.team_size,
    })) || [];
    // fetch member counts (including team owner/captain)
    if (rosterList.length > 0) {
      const { data: counts } = await supabase
        .from('team_roster_members' as any)
        .select('roster_id, user_id')
        .in('roster_id', rosterList.map(r => r.id));
      const countMap = new Map<string, number>();
      (counts || []).forEach((row: any) => countMap.set(row.roster_id, (countMap.get(row.roster_id) || 0) + 1));
      // Add 1 to each count to include the team owner/captain (who is always part of the roster)
      rosterList.forEach(r => (r.member_count = (countMap.get(r.id) || 0) + 1));
      // If not captain, only show rosters the current user belongs to
      if (!isCaptain && user?.id) {
        const mine = new Set<string>((counts || []).filter((m: any) => m.user_id === user.id).map((m: any) => m.roster_id));
        setRosters(rosterList.filter(r => mine.has(r.id)));
        return;
      }
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
            .select('id, name, start_date, game, prize_pool, slug')
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

      // Fallback B: legacy table tournament_registrations (deprecated - kept for backwards compatibility only)
      // Note: This table is no longer used. All registrations are in tournament_participants.
      let registrations = null;
      let regError = null;
      try {
        const result = await supabase
          .from('tournament_registrations')
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
            .select('id, name, start_date, game, prize_pool, slug')
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
      await transferCaptaincy(currentTeam.id, memberToRemove.user_id);
      toast({
        title: "Success",
        description: "Captaincy transferred successfully.",
      });
      setShowTransferCaptaincy(false);
      setMemberToRemove(null);
      fetchUserTeams();
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
      const rosterId = ins.data.id;
      // add members if provided (optional at creation)
      const uniqueMemberIds = Array.from(new Set(newRosterMembers)).slice(0, maxAllowed);
      if (rosterId && uniqueMemberIds.length > 0) {
        const rows = uniqueMemberIds.map(uid => ({ roster_id: rosterId, user_id: uid }));
        await supabase.from('team_roster_members' as any).insert(rows);
      }
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
    // load current members
    const { data } = await supabase
      .from('team_roster_members' as any)
      .select('user_id')
      .eq('roster_id', r.id);
    setManageMembers(((data || []) as any[]).map(x => x.user_id));
    // load pending invites for this roster
    const inv = await supabase
      .from('team_invitations' as any)
      .select('id, invited_email, invited_user_id, created_at')
      .eq('team_id', currentTeam?.id)
      .eq('roster_id', r.id)
      .eq('status', 'pending');
    setRosterInvites((inv.data as any[]) || []);
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
        const inserted = await supabase.from('team_invitations' as any).insert({
          team_id: currentTeam.id,
          roster_id: manageRoster.id,
          invited_user_id: prof.id,
          invited_email: prof.email,
          invited_by_user_id: user?.id,
          status: 'pending'
        }).select('id, invited_email, invited_user_id, created_at').single();
        if (!inserted.error && inserted.data) {
          setRosterInvites(prev => [{ id: inserted.data.id, invited_email: inserted.data.invited_email, invited_user_id: inserted.data.invited_user_id, created_at: inserted.data.created_at }, ...prev]);
          sent++;
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
        const existingIds = new Set((currentTeam?.members || []).map((m: any) => m.user_id));
        const toShow = (data || [])
          .filter((u: any) => !existingIds.has(u.id) && !selectedInvitees.some(s => s.id === u.id))
          .map((u: any) => ({ id: u.id, email: u.email, username: u.username }));
        setSuggestedUsers(toShow);
      } finally {
        setIsSearchingInvitee(false);
      }
    };
    run();
  }, [inviteInput, manageRoster, currentTeam?.members, selectedInvitees]);

  const saveManageRoster = async () => {
    if (!manageRoster) return;
    const maxAllowed = manageRoster.team_size === 5 ? 7 : manageRoster.team_size;
    // Allow saving with any member count up to the cap; DB trigger will enforce max on insert
    try {
      const { data: existing } = await supabase
        .from('team_roster_members' as any)
        .select('user_id')
        .eq('roster_id', manageRoster.id);
      const currentSet = new Set<string>((existing || []).map((x: any) => x.user_id));
      const desiredSet = new Set<string>(manageMembers);
      const toAdd = Array.from(desiredSet).filter(x => !currentSet.has(x)).map(uid => ({ roster_id: manageRoster.id, user_id: uid }));
      const toRemove = Array.from(currentSet).filter(x => !desiredSet.has(x));
      if (toAdd.length > 0) {
        await supabase.from('team_roster_members' as any).insert(toAdd);
      }
      if (toRemove.length > 0) {
        await supabase.from('team_roster_members' as any).delete().eq('roster_id', manageRoster.id).in('user_id', toRemove);
      }
      await fetchRosters();
      setManageRosterModalOpen(false);
      toast({ title: 'Roster updated' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Failed to update roster', variant: 'destructive' });
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

      // Create invitation (member will be added to team/roster only after acceptance)
      const inserted = await supabase.from('team_invitations' as any).insert({
        team_id: currentTeam.id,
        roster_id: manageRoster.id,
        invited_user_id: userId,
        invited_email: email,
        invited_by_user_id: user?.id,
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
          data: { team_id: currentTeam.id, roster_id: manageRoster?.id || null }
        } as any);
      } catch {}
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
      // Refresh team/rosters in case this adds the team to the user
      await fetchUserTeams();
      await fetchRosters();
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
      await supabase.from('team_invitations' as any).delete().eq('id', inviteId);
      setRosterInvites(prev => prev.filter(i => i.id !== inviteId));
      toast({ title: 'Invitation cancelled' });
    } catch (e: any) {
      toast({ title: 'Failed', description: e?.message || 'Could not cancel invite', variant: 'destructive' });
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
      (currentTeam?.members || []).forEach((m: any) => {
        if (m?.user_id) excludedIds.add(m.user_id);
      });

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
      <div className="min-h-screen bg-esports-dark flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-esports-blue to-esports-cyan rounded-xl flex items-center justify-center">
            <Users className="h-8 w-8 text-white animate-pulse" />
          </div>
          <div className="text-esports-primary text-xl font-semibold">Loading teams...</div>
          <div className="text-esports-secondary text-sm mt-2">Please wait while we fetch your team data</div>
        </div>
      </div>
    );
  }

  if (!currentTeam) {
    if (refreshingAfterAccept || fetchingTeam) {
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
      <div className="min-h-screen bg-esports-dark text-white">
        <div className="relative max-w-5xl mx-auto px-4 py-16">
          {/* Decorative background */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-32 -left-40 w-[36rem] h-[36rem] bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-cyan-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -right-40 w-[32rem] h-[32rem] bg-gradient-to-tr from-cyan-500/10 via-blue-600/10 to-purple-600/20 rounded-full blur-3xl" />
          </div>

          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs tracking-wide uppercase text-white/70">Get Started</div>
            <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight text-white">Create your esports team</h1>
            <p className="mt-3 text-lg text-white/70">Form a squad, invite teammates, and register for tournaments in seconds.</p>
          </div>

          {/* Pending invitations for users without a team */}
          {pendingInvites.length > 0 && (
            <div className="mx-auto max-w-3xl mb-8">
              <div className="p-[1px] rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600">
                <div className="rounded-2xl bg-[#0F1115] px-6 py-6 border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
                  <h2 className="text-xl font-semibold text-white mb-4">Pending invitations</h2>
                  <div className="space-y-3">
                    {pendingInvites.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="text-white/90 text-sm">
                          {inv.team_name ? inv.team_name : `Team ${String(inv.team_id).slice(0,8)}`}
                          {inv.roster_id ? ` · ${inv.roster_name ? inv.roster_name : `roster ${String(inv.roster_id).slice(0,8)}`}` : ''}
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => acceptInvite(inv.id)}>Accept</Button>
                          <Button size="sm" variant="outline" className="border-red-400 text-red-400 hover:bg-red-400/20" onClick={() => declineInvite(inv.id)}>Decline</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* CTA Card */}
          <div className="mx-auto max-w-3xl">
            <div className="p-[1px] rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500">
              <div className="rounded-2xl bg-[#0F1115] px-6 py-7 md:px-10 md:py-9 border border-white/10 shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
                <div className="flex items-center gap-6">
                  <div className="shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600/90 border border-white/10 flex items-center justify-center">
                    <Users className="w-9 h-9 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl md:text-3xl font-bold text-white">Create Your Esports Team</h2>
                    <p className="mt-2 text-white/70">You’ll be the captain. Add a logo, choose your games, and invite players with a shareable link.</p>
                    <div className="mt-5 flex items-center gap-3">
                      <Button 
                        size="lg"
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold px-6 md:px-8"
                        onClick={() => setShowTeamCreationWizard(true)}
                      >
                        <Plus className="w-5 h-5 mr-2" />
                        Create Team
                      </Button>
                      <span className="text-xs text-white/50">Takes less than a minute</span>
                    </div>
                  </div>
                </div>
                {/* Features */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-white/70">
                    <Gamepad2 className="w-4 h-4 text-cyan-400" />
                    Select supported games
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <Users className="w-4 h-4 text-blue-400" />
                    Invite and manage members
                  </div>
                  <div className="flex items-center gap-2 text-white/70">
                    <Trophy className="w-4 h-4 text-purple-400" />
                    Register for tournaments
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Team Creation Wizard Modal */}
        {showTeamCreationWizard && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex-center p-4">
            <div className="card-esports max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <TeamCreationWizard onClose={() => {
                setShowTeamCreationWizard(false);
                // Refresh team data when wizard closes
                fetchUserTeams();
              }} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-esports-dark text-white">
      <div className="container-professional spacing-section">
        {/* Team Header */}
        <div className="card-esports spacing-card mb-8 cv-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-20 h-20 bg-esports-card border-2 border-white/20 rounded-xl flex items-center justify-center overflow-hidden group hover:border-esports-accent/50 transition-all duration-300">
                  {currentTeam.logo_url ? (
                    <img
                      src={currentTeam.logo_url}
                      alt={`${currentTeam.name} logo`}
                      className="w-full h-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        console.log('Team logo failed to load:', currentTeam.logo_url);
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling.style.display = 'flex';
                      }}
                      onLoad={() => {
                        console.log('Team logo loaded successfully:', currentTeam.logo_url);
                      }}
                    />
                  ) : null}
                  {/* Fallback content - always present but hidden when image loads */}
                  <div 
                    className={`w-full h-full flex flex-col items-center justify-center text-center ${
                      currentTeam.logo_url ? 'hidden' : 'flex'
                    }`}
                  >
                    <Users className="h-8 w-8 text-gray-400 mb-1" />
                    <div className="text-xs text-gray-400 font-medium">No Logo</div>
                  </div>
                </div>
                {isCaptain && (
                  <button
                    onClick={() => {
                      initializeEditForm();
                      setShowEditTeam(true);
                    }}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-esports-accent text-white rounded-full flex items-center justify-center text-xs hover:bg-cyan-600 transition-all duration-200 hover:scale-110 shadow-lg"
                    title={currentTeam.logo_url ? "Edit team" : "Add team logo"}
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">{currentTeam.name}</h1>
                <div className="flex items-center space-x-4">
                  <Badge variant="secondary" className="bg-blue-500/20 text-blue-200 border-blue-400">
                    {currentTeam.tag}
                  </Badge>
                  <Badge variant="outline" className="border-white/30 text-white">
                    {currentTeam.members?.length || 0} members
                  </Badge>
                  {isCaptain && (
                    <Badge variant="outline" className="border-yellow-400 text-yellow-200 bg-yellow-500/20">
                      <Crown className="w-3 h-3 mr-1" />
                      Team Captain
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            
            {/* Invite moved into Roster management to keep members per roster */}
            {isCaptain && (
              <div className="flex space-x-2">
                <Button
                  onClick={() => setShowTeamInviteModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Members
                </Button>
              </div>
            )}
          </div>

          {/* Team Games */}
          {currentTeam.games && currentTeam.games.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white mb-2">Games</h3>
              <div className="flex flex-wrap gap-2">
                {currentTeam.games.map((game: string, index: number) => (
                  <Badge key={index} variant="outline" className="border-white/30 text-white">
                    <Gamepad2 className="w-3 h-3 mr-1" />
                    {game}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Team Description */}
          {currentTeam.description && (
            <p className="text-white/80 text-lg">{currentTeam.description}</p>
          )}
        </div>

        {/* Team Captain */}
        <div className="card-esports spacing-card mb-8 cv-auto">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <Crown className="w-6 h-6 mr-2 text-yellow-400" />
            Team Captain
          </h2>
          {(() => {
            // Try to find captain in members list first
            let captainMember = currentTeam.members?.find((member: any) => member.user_id === currentTeam.owner_id || member.id === currentTeam.owner_id);
            
            // If not found in members, create a captain object from current user data
            if (!captainMember && isCaptain) {
              captainMember = {
                user_id: user?.id,
                username: profile?.username || 'Captain',
                email: user?.email || '',
                avatar_url: profile?.avatar_url,
                role: 'captain'
              };
            }
            // Fallback to fetched owner profile
            if (!captainMember && ownerProfile) {
              captainMember = {
                user_id: currentTeam.owner_id,
                username: ownerProfile.username || 'Captain',
                email: ownerProfile.email || '',
                avatar_url: ownerProfile.avatar_url,
                role: 'captain'
              };
            }
            
            console.log('=== CAPTAIN SECTION DEBUG ===');
            console.log('Captain member found:', captainMember);
            console.log('Is captain:', isCaptain);
            console.log('Current user ID:', user?.id);
            console.log('Team owner_id:', currentTeam.owner_id);
            console.log('================================');
            
            return captainMember ? (
              <div className="bg-yellow-500/10 border border-yellow-400/30 shadow-lg shadow-yellow-500/10 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="ring-2 ring-yellow-400">
                      <AvatarImage src={captainMember.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white">
                        {captainMember.username?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1">
                      <Crown className="w-3 h-3 text-yellow-900" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xl font-bold text-white">
                        {captainMember.username}
                      </h3>
                      <div className="flex items-center space-x-1 bg-yellow-500/20 px-3 py-1 rounded-full border border-yellow-400/30">
                        <Crown className="w-4 h-4 text-yellow-400" />
                        <span className="text-sm font-medium text-yellow-300">Captain</span>
                      </div>
                    </div>
                    <p className="text-white/60">
                      {captainMember.email}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-white/60 py-8">
                <Crown className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Captain information not found</p>
                <p className="text-sm">User ID: {user?.id}, Team owner_id: {currentTeam?.owner_id}</p>
              </div>
            );
          })()}
        </div>

        {/* Team Members */}
        <div className="card-esports spacing-card mb-8">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <Users className="w-6 h-6 mr-2" />
            Team Members
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMembers.filter(m => m.user_id !== currentTeam.owner_id).map((member) => (
              <div key={member.user_id} className="rounded-lg p-4 border bg-white/5 border-white/10">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback>{(member.username || member.email || 'U').charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{member.username || member.email}</h3>
                    <p className="text-white/60 text-sm">{member.email || ''}</p>
                  </div>
                  {isCaptain && member.user_id !== user?.id && (
                    <div className="flex space-x-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMemberToRemove(member as any);
                          setShowTransferCaptaincy(true);
                        }}
                        className="text-yellow-400 border-yellow-400 hover:bg-yellow-400/20"
                        title="Transfer Captaincy"
                      >
                        <Crown className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setMemberToRemove(member as any);
                          setShowRemoveMember(true);
                        }}
                        className="text-red-400 border-red-400 hover:bg-red-400/20"
                        title="Remove Member"
                      >
                        <UserMinus className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {teamMembers.filter(m => m.user_id !== currentTeam.owner_id).length === 0 && (
            <div className="text-center text-white/60 py-8">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No other team members yet</p>
              <p className="text-sm">Invite members to join your team</p>
            </div>
          )}
        </div>

        {/* Pending Invitations for current user */}
        {pendingInvites.length > 0 && (
          <div className="card-esports spacing-card mb-8 cv-auto">
            <h2 className="text-2xl font-bold text-white mb-4">Pending Invitations</h2>
            <div className="space-y-3">
              {pendingInvites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="text-white">
                    Team invite {inv.team_id.slice(0, 8)}{inv.roster_id ? ` · roster ${String(inv.roster_id).slice(0, 8)}` : ''}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => acceptInvite(inv.id)}>Accept</Button>
                    <Button size="sm" variant="outline" className="border-red-400 text-red-400 hover:bg-red-400/20" onClick={() => declineInvite(inv.id)}>Decline</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rosters */}
        <div className="card-esports spacing-card mb-8 cv-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Rosters</h2>
            {isCaptain && (
              <Button onClick={openCreateRoster} className="bg-gaming-purple hover:bg-gaming-purple/80 text-white">
                Create Roster
              </Button>
            )}
          </div>
          {rosters.length === 0 ? (
            <div className="text-white/60">No rosters yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rosters.map((r) => (
                <div key={r.id} className="bg-gradient-to-br from-[#111216] to-[#161821] border border-white/10 rounded-xl p-5 hover:border-esports-accent/40 transition-all hover:shadow-[0_8px_30px_rgba(0,212,255,0.15)]">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-white">{r.name}</div>
                    <div className="text-xs text-white/60">
                      {r.member_count || 0}/{r.team_size === 5 ? 7 : r.team_size}
                    </div>
                  </div>
                  <div className="text-white/80 text-sm flex items-center gap-2">
                    {getGameLogo(r.game) && (
                      <img
                        src={getGameLogo(r.game)}
                        alt={`${r.game} logo`}
                        className="w-5 h-5 rounded-sm object-cover"
                        loading="lazy"
                      />
                    )}
                    <span>{r.game}{r.format ? ` · ${r.format}` : ''}</span>
                  </div>
                  {isCaptain && (
                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline" className="border-esports-accent/40 text-esports-accent hover:bg-esports-accent/10" onClick={() => openManageRoster(r)}>Manage</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Registered Tournaments */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8 border border-white/20 cv-auto">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
            <Trophy className="w-6 h-6 mr-2" />
            Registered Tournaments
          </h2>
          {teamRegistrations.length > 0 ? (
            <div className="space-y-4">
              {teamRegistrations.map((registration) => (
                <div key={registration.id} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white hover:text-esports-accent transition-colors">
                        <Link to={registration.tournaments?.slug ? `/tournaments/${registration.tournaments.slug}` : '#'}>
                          {registration.tournaments?.name || 'Tournament'}
                        </Link>
                      </h3>
                      <p className="text-white/60">
                        {new Date(registration.tournaments?.start_date).toLocaleDateString()}
                      </p>
                      <Badge variant="outline" className="border-green-400 text-green-200 mt-1">
                        Registered
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-white/60">Prize Pool</p>
                      <p className="text-white font-semibold">${registration.tournaments?.prize_pool}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-white/60 py-8">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No registered tournaments yet</p>
              <p className="text-sm">Register your team for upcoming tournaments</p>
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
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Invite Members</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <Label htmlFor="search" className="text-white">Search Users</Label>
              <Input
                id="search"
                placeholder="Search by username or email..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchUsers(e.target.value);
                }}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            {searchResults.length > 0 && (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-600"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>{user.username?.charAt(0) || 'U'}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-white">{user.username}</p>
                        <p className="text-gray-400 text-sm">{user.email}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => toggleUserSelection(user)}
                      variant={selectedUsers.some(u => u.id === user.id) ? "default" : "outline"}
                      className={selectedUsers.some(u => u.id === user.id) ? "bg-green-600" : ""}
                    >
                      {selectedUsers.some(u => u.id === user.id) ? "Selected" : "Select"}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {selectedUsers.length > 0 && (
              <div>
                <Label className="text-white">Selected Members</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center space-x-2 bg-green-600/20 border border-green-400 rounded-lg px-3 py-2"
                    >
                      <span className="text-green-200">{user.username}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeFromSelection(user.id)}
                        className="text-green-200 hover:text-red-400 p-0 h-auto"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="message" className="text-white">Invite Message (Optional)</Label>
              <Input
                id="message"
                placeholder="Add a personal message..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                onClick={() => setShowInviteModal(false)}
                variant="outline"
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={sendInvites}
                disabled={selectedUsers.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Send Invites ({selectedUsers.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Invite Modal */}
      <Dialog open={showTeamInviteModal} onOpenChange={setShowTeamInviteModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Invite Members to Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">Invite by Email</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="member@example.com"
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white flex-1"
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
                }} disabled={!!invitingUserId} className="bg-green-600 hover:bg-green-700 text-white">
                  {invitingUserId ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-white">Pending Team Invites</Label>
              {teamInvites.length === 0 ? (
                <div className="text-white/60 text-sm mt-2">No pending invites.</div>
              ) : (
                <div className="mt-2 space-y-2">
                  {teamInvites.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-2 bg-gray-800 rounded border border-gray-700">
                      <div className="text-white text-sm">
                        {inv.invited_email || inv.invited_user_id?.slice(0,8)} · {inv.created_at ? new Date(inv.created_at).toLocaleString() : ''}
                      </div>
                      <Button size="sm" variant="outline" className="border-red-400 text-red-400 hover:bg-red-400/20" onClick={async () => {
                        await supabase.from('team_invitations' as any).delete().eq('id', inv.id);
                        setTeamInvites(prev => prev.filter(i => i.id !== inv.id));
                      }}>Cancel</Button>
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
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Create Roster</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">Roster Name</Label>
              <Input
                value={newRosterName}
                onChange={(e) => setNewRosterName(e.target.value)}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="e.g., Valorant Main, CS2 Academy"
              />
            </div>
            <div>
              <Label className="text-white">Game</Label>
              <select
                value={newRosterGame}
                onChange={(e) => {
                  setNewRosterGame(e.target.value);
                  const game = (esportsGames as any).games.find((g: any) => g.name === e.target.value);
                  if (game) {
                    setNewRosterFormat(game.defaultFormat);
                    const fmt = game.formats.find((f: any) => f.value === game.defaultFormat) || game.formats[0];
                    setNewRosterTeamSize(fmt?.teamSize || 5);
                  }
                }}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
              >
                <option value="" disabled>Select game</option>
                {(esportsGames as any).games.map((g: any) => (<option key={g.name} value={g.name}>{g.name}</option>))}
              </select>
            </div>
            {newRosterGame && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-white">Format</Label>
                  <select
                    value={newRosterFormat}
                    onChange={(e) => {
                      setNewRosterFormat(e.target.value);
                      const game = (esportsGames as any).games.find((g: any) => g.name === newRosterGame);
                      const fmt = game?.formats.find((f: any) => f.value === e.target.value);
                      const fmtSize = (e.target.value === '5v5') ? 5 : (fmt?.teamSize || 5);
                      setNewRosterTeamSize(fmtSize);
                    }}
                    className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white"
                  >
                    {((esportsGames as any).games.find((g: any) => g.name === newRosterGame)?.formats || []).map((f: any) => (
                      <option key={f.value} value={f.value}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-white">Team Size</Label>
                  <Input
                    value={newRosterTeamSize}
                    readOnly
                    disabled
                    className="bg-gray-800 border-gray-600 text-white opacity-70 cursor-not-allowed"
                  />
                  <p className="text-xs text-white/50 mt-1">
                    {newRosterTeamSize === 5 ? '5 starters · up to 2 subs (max 7 members)' : `Roster must have exactly ${newRosterTeamSize} members`}
                  </p>
                </div>
              </div>
            )}
            {/* Member picker */}
            <div>
              <Label className="text-white">Members ({newRosterMembers.length}/{newRosterTeamSize === 5 ? 7 : newRosterTeamSize})</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-48 overflow-y-auto">
                {(currentTeam?.members || []).map((m: any) => {
                  const selected = newRosterMembers.includes(m.user_id);
                  return (
                    <button
                      key={m.user_id}
                      type="button"
                      onClick={() => {
                        setNewRosterMembers(prev => {
                          if (selected) return prev.filter(id => id !== m.user_id);
                          const limit = newRosterTeamSize === 5 ? 7 : newRosterTeamSize;
                          if (prev.length >= limit) return prev;
                          return [...prev, m.user_id];
                        });
                      }}
                      className={`text-left px-3 py-2 rounded border ${
                        selected ? 'bg-green-600/30 border-green-500 text-white' : 'bg-gray-800 border-gray-600 text-white/80'
                      }`}
                    >
                      <div className="font-medium">{m.username}</div>
                      <div className="text-xs text-white/60">{m.email}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="border-gray-600 text-gray-300" onClick={() => setRosterModalOpen(false)}>Cancel</Button>
              <Button onClick={createRosterNow} disabled={rosterSubmitting || !newRosterName || !newRosterGame} className="bg-gaming-purple hover:bg-gaming-purple/80">
                {rosterSubmitting ? 'Creating...' : 'Create Roster'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Roster Modal */}
      <Dialog open={manageRosterModalOpen} onOpenChange={setManageRosterModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Manage Roster</DialogTitle>
          </DialogHeader>
          {manageRoster && (
            <div className="space-y-4">
              <div className="text-white/80">{manageRoster.name} · {manageRoster.game}{manageRoster.format ? ` · ${manageRoster.format}` : ''}</div>
              {/* Members list removed per request */}

              {/* Invite to this roster */}
              <div className="pt-2 border-t border-white/10">
                <Label className="text-white">Invite to this roster (email)</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="member@example.com"
                    value={inviteInput}
                    onChange={(e) => setInviteInput(e.target.value)}
                    className="bg-gray-800 border-gray-600 text-white flex-1"
                  />
                  <Button size="sm" onClick={addInviteeByEmail} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Add
                  </Button>
                </div>
                {/* Typeahead suggestions */}
                {inviteInput && suggestedUsers.length > 0 && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded border border-white/10 bg-[#0f1115]">
                    {suggestedUsers.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-white/5 text-white flex justify-between"
                        onClick={() => {
                          setSelectedInvitees(prev => [...prev, { id: u.id, email: u.email, username: u.username }]);
                          setInviteInput('');
                          setSuggestedUsers([]);
                        }}
                      >
                        <span>{u.username || u.email}</span>
                        <span className="text-xs text-white/60">{u.email}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedInvitees.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedInvitees.map(p => (
                      <div key={p.id} className="px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white flex items-center gap-2">
                        <span>{p.username || p.email}</span>
                        <button onClick={() => setSelectedInvitees(prev => prev.filter(x => x.id !== p.id))} className="text-red-400 hover:text-red-300">×</button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-2 text-right">
                  <Button size="sm" onClick={sendBatchRosterInvites} disabled={selectedInvitees.length === 0} className="bg-green-600 hover:bg-green-700 text-white">
                    Send {selectedInvitees.length} invite{selectedInvitees.length === 1 ? '' : 's'}
                  </Button>
                </div>
                <p className="text-xs text-white/50 mt-2">Roster limit: {manageRoster.team_size === 5 ? '7 members (5 + 2 subs)' : `${manageRoster.team_size}`}.</p>
              </div>

              {/* Captain note */}
              <div className="pt-2 border-t border-white/10 text-xs text-white/60">
                You can also invite players to the team from the team-level button, then add them here after acceptance.
              </div>

              {/* Pending roster invites (owner view) */}
              {isCaptain && rosterInvites.length > 0 && (
                <div className="mt-4 pt-3 border-t border-white/10">
                  <Label className="text-white">Pending Invites</Label>
                  <div className="mt-2 space-y-2">
                    {rosterInvites.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between p-2 bg-gray-800 rounded border border-gray-700">
                        <div className="text-white text-sm">
                          {inv.invited_email || inv.invited_user_id?.slice(0,8)} · {inv.created_at ? new Date(inv.created_at).toLocaleString() : ''}
                        </div>
                        <Button size="sm" variant="outline" className="border-red-400 text-red-400 hover:bg-red-400/20" onClick={() => cancelRosterInvite(inv.id)}>
                          Cancel
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" className="border-gray-600 text-gray-300" onClick={() => setManageRosterModalOpen(false)}>Close</Button>
                <Button onClick={saveManageRoster} className="bg-gaming-purple hover:bg-gaming-purple/80">Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={showRemoveMember} onOpenChange={setShowRemoveMember}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Remove Member</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to remove {memberToRemove?.username} from the team? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Captaincy Confirmation */}
      <AlertDialog open={showTransferCaptaincy} onOpenChange={setShowTransferCaptaincy}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Transfer Captaincy</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to transfer captaincy to {memberToRemove?.username}? You will no longer be the captain of this team.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransferCaptaincy}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              Transfer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disband Team Confirmation */}
      <AlertDialog open={showDisbandTeam} onOpenChange={setShowDisbandTeam}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Disband Team</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-300">
              Are you sure you want to disband this team? This action will remove all members and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisbandTeam}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Disband
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Team Announcement Modal */}
      <Dialog open={showTeamAnnouncement} onOpenChange={setShowTeamAnnouncement}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Send Team Announcement</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="announcement" className="text-white">Message</Label>
              <textarea
                id="announcement"
                placeholder="Type your announcement here..."
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                className="w-full h-32 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white resize-none"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                onClick={() => setShowTeamAnnouncement(false)}
                variant="outline"
                className="border-gray-600 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendAnnouncement}
                disabled={!announcementText.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Send Announcement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Edit Modal */}
      <Dialog open={showEditTeam} onOpenChange={setShowEditTeam}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-esports-dark border border-gray-600/30">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-esports-primary">
              Edit Team
            </DialogTitle>
            <DialogDescription className="text-esports-secondary">
              Update your team's information, logo, and competitive games.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Team Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="editTeamName" className="text-esports-primary">Team Name *</Label>
                  <Input
                    id="editTeamName"
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    placeholder="Enter team name"
                    className="bg-esports-dark border border-gray-600/30 text-esports-primary placeholder-gray-400"
                  />
                </div>

                <div>
                  <Label htmlFor="editTeamTag" className="text-esports-primary">Team Tag *</Label>
                  <Input
                    id="editTeamTag"
                    value={editTeamTag}
                    onChange={(e) => setEditTeamTag(e.target.value.toUpperCase())}
                    placeholder="3-6 characters"
                    maxLength={6}
                    className="bg-esports-dark border border-gray-600/30 text-esports-primary placeholder-gray-400"
                  />
                </div>

                <div>
                  <Label htmlFor="editTeamLogo" className="text-esports-primary">Team Logo</Label>
                  <div className="space-y-3">
                    <Input
                      id="editTeamLogo"
                      type="file"
                      accept="image/*"
                      onChange={handleEditLogoChange}
                      className="bg-esports-dark border border-gray-600/30 text-esports-primary"
                    />
                          {editTeamLogoUrl && (
                            <div className="flex items-center gap-3">
                              <div className="w-16 h-16 bg-esports-card border border-gray-600/30 rounded-xl flex items-center justify-center overflow-hidden">
                                <img
                                  src={editTeamLogoUrl}
                                  alt="Team Logo Preview"
                                  className="w-full h-full object-contain p-1"
                                />
                              </div>
                              <div className="text-sm text-esports-secondary">
                                Logo preview
                              </div>
                            </div>
                          )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-esports-primary">Selected Games</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {editTeamGames.map(game => (
                      <Badge key={game} className="bg-gradient-to-r from-esports-accent to-esports-blue text-white">
                        {game}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Game Selection */}
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-esports-primary mb-2">Select Your Games</h3>
                <p className="text-esports-secondary">
                  {imagesLoading ? 'Loading game images...' : 'Choose the games your team will compete in'}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {esportsGames.games.map((game: any) => (
                  <div
                    key={game.name}
                    className={`relative cursor-pointer transition-all duration-300 ease-out hover:scale-105 ${
                      editTeamGames.includes(game.name)
                        ? 'ring-2 ring-esports-accent ring-offset-2 ring-offset-esports-dark'
                        : 'hover:ring-1 hover:ring-gray-600'
                    }`}
                    onClick={() => handleEditGameToggle(game.name)}
                  >
                    <div className="bg-esports-card border border-gray-600/30 rounded-lg p-4 text-center hover:border-gray-500/50 transition-all duration-300 ease-out">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-lg overflow-hidden bg-esports-dark border border-gray-600/30 relative">
                        {imagesLoading ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-esports-accent border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        ) : gameImages[game.name] ? (
                          <img
                            src={gameImages[game.name]}
                            alt={game.name}
                            className="w-full h-full object-cover transition-opacity duration-300"
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              e.currentTarget.src = game.logo;
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Gamepad2 className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <h4 className="font-semibold text-esports-primary text-sm mb-1">{game.name}</h4>
                      {editTeamGames.includes(game.name) && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-200">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-600/30">
              <Button
                variant="outline"
                onClick={() => setShowEditTeam(false)}
                className="border-gray-600/30 text-esports-secondary hover:bg-gray-800/50"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditTeam}
                disabled={editSubmitting || !editTeamName || !editTeamTag || editTeamGames.length === 0}
                className="btn-esports-blue px-8 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Update Team
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamsPage;