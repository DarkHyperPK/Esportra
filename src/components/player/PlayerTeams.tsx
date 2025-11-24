import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Users, Trophy } from "lucide-react";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Select from 'react-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Dialog as InviteDialog, DialogContent as InviteDialogContent, DialogHeader as InviteDialogHeader, DialogTitle as InviteDialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog as ConfirmDialog, DialogContent as ConfirmDialogContent, DialogHeader as ConfirmDialogHeader, DialogTitle as ConfirmDialogTitle } from '@/components/ui/dialog';

interface TeamMember {
  id: string;
  username: string;
  avatar: string;
  role: string;
}

interface Team {
  id: string;
  name: string;
  game: string;
  logo: string;
  members: TeamMember[];
  tournamentWins: number;
  totalMatches: number;
}

const PlayerTeams = () => {
  const [showModal, setShowModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [teamLogoUrl, setTeamLogoUrl] = useState<string | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [verifiedUsers, setVerifiedUsers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamTag, setTeamTag] = useState('');
  const [game, setGame] = useState('');
  const [games, setGames] = useState([
    { value: 'valorant', label: 'VALORANT', logo: '/games/valorant.png' },
    { value: 'cs2', label: 'CS2', logo: '/games/cs2.png' },
    { value: 'fortnite', label: 'Fortnite', logo: '/games/fortnite.png' },
    // Add more games as needed
  ]);
  const [memberUsernames, setMemberUsernames] = useState(['']);
  const [memberValidation, setMemberValidation] = useState<(boolean | null)[]>([null]);
  const [memberTooltip, setMemberTooltip] = useState('Make sure usernames are correct; no invite will be sent otherwise.');
  const { toast } = useToast();
  const [errorMsg, setErrorMsg] = useState('');
  const [inviteModal, setInviteModal] = useState<{ open: boolean, teamId: string | null }>({ open: false, teamId: null });
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const { user } = useAuth();
  const userId = user?.id;
  const [deleteModal, setDeleteModal] = useState<{ open: boolean, team: Team | null }>({ open: false, team: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchVerifiedUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, email')
        .eq('is_verified', true);
      if (!error && data) setVerifiedUsers(data);
    };
    fetchVerifiedUsers();
  }, []);

  const userOptions = verifiedUsers.map(user => ({
    value: user.id,
    label: `@${user.username}${user.full_name ? ` (${user.full_name})` : ''}${user.email ? ` - ${user.email}` : ''}`,
  }));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTeamLogoFile(e.target.files[0]);
      setTeamLogoUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  const uploadTeamLogo = async (file: File): Promise<string | null> => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `team-${Date.now()}.${fileExt}`;
    const filePath = fileName; // Don't include folder in path since we're uploading to team-logos bucket
    const { error } = await supabase.storage.from('teams.logos').upload(filePath, file);
    if (error) return null;
    const { data } = supabase.storage.from('teams.logos').getPublicUrl(filePath);
    return data.publicUrl;
  };

  // Validate usernames on submit
  const validateMembers = async () => {
    const results = await Promise.all(memberUsernames.map(async (username) => {
      if (!username) return false;
      const { data } = await supabase.from('profiles').select('id').eq('username', username).single();
      return !!data;
    }));
    setMemberValidation(results);
    return results.every(Boolean);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    // Validate members
    const valid = await validateMembers();
    if (!valid) {
      setErrorMsg('One or more usernames are invalid. Please check and try again.');
      setSubmitting(false);
      toast({
        title: 'Invalid Usernames',
        description: 'One or more usernames do not exist on the platform.',
        variant: 'destructive',
      });
      return;
    }
    let logoUrl = null;
    if (teamLogoFile) {
      logoUrl = await uploadTeamLogo(teamLogoFile);
      setTeamLogoUrl(logoUrl);
    }
    // Get current user id (Supabase v2)
    const { data: { user } } = await supabase.auth.getUser();
    // Create team
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({ 
        name: teamName, 
        tag: teamTag, 
        logo_url: logoUrl, 
        game: game || 'Unknown', // Ensure game field is not null
        games: [game || 'Unknown'], // Also set games array
        owner_id: user?.id 
      })
      .select()
      .single();
    if (teamError) {
      setErrorMsg('Failed to create team. Please try again.');
      setSubmitting(false);
      toast({
        title: 'Team Creation Failed',
        description: teamError.message,
        variant: 'destructive',
      });
      return;
    }
    // Add creator as captain and other members
    const memberRows = [
      { team_id: team.id, user_id: user.id, role: 'captain' },
      ...memberUsernames
        .filter(username => verifiedUsers.find(u => u.username === username)?.id !== user.id)
        .map((username) => ({
          team_id: team.id,
          user_id: verifiedUsers.find(u => u.username === username)?.id,
          role: 'member',
        })),
    ];
    const { error: memberError } = await supabase.from('team_members').insert(memberRows);
    if (memberError) {
      setErrorMsg('Failed to add team members.');
      setSubmitting(false);
      toast({
        title: 'Member Add Failed',
        description: memberError.message,
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Team Created',
      description: 'Your team has been created and invites sent to members.',
      variant: 'success',
    });
    setShowModal(false);
    setTeamName('');
    setTeamTag('');
    setGame('');
    setTeamLogoFile(null);
    setTeamLogoUrl(null);
    setMemberUsernames(['']);
    setSubmitting(false);
    // Refetch teams
    // (fetchTeams will run due to showModal change)
  };

  // Listen for team invite acceptance events
  useEffect(() => {
    const handleTeamInviteAccepted = () => {
      console.log('Team invite accepted, refreshing teams...');
      // Trigger a re-fetch by updating a dependency
      setShowModal(prev => prev);
    };

    window.addEventListener('teamInviteAccepted', handleTeamInviteAccepted);
    
    return () => {
      window.removeEventListener('teamInviteAccepted', handleTeamInviteAccepted);
    };
  }, []);

  useEffect(() => {
    const fetchTeams = async () => {
      setLoading(true);
      // Get current user id (Supabase v2)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setTeams([]);
        setLoading(false);
        return;
      }
      // Get all team_ids where user is a member
      const { data: memberRows, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, role')
        .eq('user_id', user.id);
      const teamIds = memberRows ? memberRows.map(row => row.team_id) : [];
      // Fetch teams where user is a member or creator
      const { data: teamRows, error: teamError } = await supabase
        .from('teams')
        .select('id, name, logo_url, owner_id, game, tag')
        .or([
          teamIds.length > 0 ? `id.in.(${teamIds.join(',')})` : null,
          `owner_id.eq.${user.id}`
        ].filter(Boolean).join(','));
      if (teamError || !teamRows) {
        setTeams([]);
        setLoading(false);
        return;
      }
      // Remove duplicates (if any)
      const uniqueTeams = Array.from(new Map(teamRows.map(t => [t.id, t])).values());
      // For each team, fetch members
      const teamsWithMembers = await Promise.all(uniqueTeams.map(async (team) => {
        const { data: memberList } = await supabase
          .from('team_members')
          .select('user_id, role, profiles(username, avatar_url)')
          .eq('team_id', team.id);
        const members = (memberList || []).map(m => ({
          id: m.user_id,
          username: m.profiles?.username || '',
          avatar: m.profiles?.avatar_url || '',
          role: m.role === 'captain' ? 'Captain' : 'Member',
        }));
        return {
          id: team.id,
          name: team.name,
          logo: team.logo_url,
          game: team.game,
          members,
          tournamentWins: 0,
          totalMatches: 0,
        };
      }));
      setTeams(teamsWithMembers);
      setLoading(false);
    };
    fetchTeams();
  }, [showModal]);

  const gameOptions = games.map(g => ({ value: g.value, label: g.label }));

  // Invite member logic
  const handleInviteMember = async () => {
    setInviteError('');
    setInviteLoading(true);
    // Validate username
    const { data: user, error } = await supabase.from('profiles').select('id, is_verified, is_admin').eq('username', inviteUsername).single();
    if (error || !user) {
      setInviteError('User not found.');
      setInviteLoading(false);
      return;
    }
    if (!user.is_verified) {
      setInviteError('User is not verified.');
      setInviteLoading(false);
      return;
    }
    if (user.is_admin) {
      setInviteError('Cannot invite admins to teams. Admins can only create and manage teams.');
      setInviteLoading(false);
      return;
    }
    // Check if already a member or invited
    const { data: existingMember } = await supabase.from('team_members').select('id').eq('team_id', inviteModal.teamId).eq('user_id', user.id).single();
    if (existingMember) {
      setInviteError('User is already a team member.');
      setInviteLoading(false);
      return;
    }
    const { data: existingInvite } = await supabase.from('team_invites').select('id, status').eq('team_id', inviteModal.teamId).eq('user_id', user.id).single();
    if (existingInvite && existingInvite.status === 'pending') {
      setInviteError('User already has a pending invite.');
      setInviteLoading(false);
      return;
    }
    // Get current user (inviter)
    const { data: { user: inviter } } = await supabase.auth.getUser();
    // Insert invite
    const { error: inviteError } = await supabase.from('team_invites').insert({
      team_id: inviteModal.teamId,
      user_id: user.id,
      invited_by: inviter.id,
      status: 'pending',
    });
    if (inviteError) {
      setInviteError('Failed to send invite.');
      setInviteLoading(false);
      return;
    }
    // Create notification for invited user
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'team_invite',
      title: 'Team Invitation',
      message: `You have been invited to join a team.`,
      is_read: false,
      created_at: new Date().toISOString(),
    });
    setInviteLoading(false);
    setInviteModal({ open: false, teamId: null });
    setInviteUsername('');
    toast({
      title: 'Invite Sent',
      description: 'The user has been invited to join your team.',
      variant: 'success',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Create Your Team</h2>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {teams.map((team) => (
          <Card key={team.id} className="bg-gradient-to-br from-gaming-dark via-gaming-darker to-gaming-dark border border-gaming-purple/30 rounded-xl shadow-lg overflow-hidden p-6 flex flex-col gap-4">
            <CardHeader className="pb-0">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 rounded-lg bg-esports-dark flex items-center justify-center overflow-hidden border-2 border-gaming-purple/40 shadow">
                    <img src={team.logo} alt={team.name} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-white drop-shadow">{team.name}</CardTitle>
                    <div className="text-sm text-gaming-purple font-semibold uppercase tracking-wider">{team.game}</div>
                  </div>
                </div>
                <Badge className="bg-gaming-purple/90 text-white px-3 py-1 rounded-full text-sm font-semibold shadow">{team.members.length} members</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs defaultValue="members">
                <TabsList className="mb-4 bg-esports-dark rounded-lg shadow-inner">
                  <TabsTrigger value="members">Members</TabsTrigger>
                  <TabsTrigger value="stats">Stats</TabsTrigger>
                </TabsList>
                
                <TabsContent value="members">
                  <div className="space-y-3">
                    {team.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between bg-gaming-dark rounded-lg px-3 py-2 shadow-sm">
                        <div className="flex items-center gap-3">
                          <Avatar src={member.avatar} name={member.username} size={40} />
                          <div>
                            <div className="font-semibold text-white">{member.username}</div>
                            <div className="text-xs text-gray-400">{member.role}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.role === 'Captain' && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-400 bg-gaming-dark/80 px-2 py-1 rounded-full font-bold">Captain</Badge>
                          )}
                          {team.members.some(m => m.role === 'Captain' && m.id === userId) && member.role !== 'Captain' && (
                            <Button variant="destructive" size="xs" onClick={async () => {
                              // Remove member logic
                              await supabase.from('team_members').delete().eq('team_id', team.id).eq('user_id', member.id);
                              toast({ title: 'Member removed', variant: 'success' });
                              setShowModal(false);
                            }}>
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                    {team.members.some(m => m.role === 'Captain' && m.id === userId) && (
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" className="bg-gaming-purple/10 hover:bg-gaming-purple/20 border-gaming-purple/40 text-gaming-purple font-semibold rounded-lg shadow" onClick={() => setInviteModal({ open: true, teamId: team.id })}>
                          <Plus className="mr-2 h-4 w-4" />
                          Invite Member
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => {}}>
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteModal({ open: true, team })}>
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="stats">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-esports-dark rounded-md p-4 text-center">
                      <div className="flex justify-center">
                        <Trophy className="h-10 w-10 text-yellow-500 mb-1" />
                      </div>
                      <div className="text-2xl font-bold">{team.tournamentWins}</div>
                      <div className="text-sm text-gray-400">Tournaments Won</div>
                    </div>
                    
                    <div className="bg-esports-dark rounded-md p-4 text-center">
                      <div className="flex justify-center">
                        <Users className="h-10 w-10 text-blue-500 mb-1" />
                      </div>
                      <div className="text-2xl font-bold">{team.totalMatches}</div>
                      <div className="text-sm text-gray-400">Matches Played</div>
                    </div>
                    
                    <div className="col-span-2 bg-esports-dark rounded-md p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm text-gray-400">Win Rate</div>
                        <div className="font-medium">
                          {Math.round((team.tournamentWins / team.totalMatches) * 100)}%
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gaming-gray/20 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gaming-purple"
                          style={{ width: `${(team.tournamentWins / team.totalMatches) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <Button variant="outline" className="w-full mt-4">View Detailed Stats</Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
        
        <Card className="bg-gaming-dark border-gaming-gray/30 border-dashed flex flex-col justify-center items-center p-10 min-h-[300px]">
          <div className="rounded-full bg-esports-dark p-4 mb-4">
            <Users size={32} className="text-gaming-purple" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Create a New Team</h3>
          <p className="text-center text-gray-400 mb-4">Form a team to participate in tournaments together</p>
          <Button className="bg-gaming-purple hover:bg-gaming-purple/80" onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Team
          </Button>
        </Card>
      </div>
      {/* Modal for creating a team */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create a New Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div>
              <Label htmlFor="teamName">Team Name</Label>
              <Input id="teamName" value={teamName} onChange={e => setTeamName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="teamTag">Team Tag (short)</Label>
              <Input id="teamTag" value={teamTag} onChange={e => setTeamTag(e.target.value)} maxLength={6} required />
            </div>
            <div>
              <Label htmlFor="teamLogo">Team Logo (Optional)</Label>
              <Input id="teamLogo" type="file" accept="image/*" onChange={handleLogoChange} />
              {teamLogoUrl && (
                <img src={teamLogoUrl} alt="Team Logo" className="mt-2 w-16 h-16 object-cover rounded" />
              )}
            </div>
            <div>
              <Label htmlFor="game">Game</Label>
              <Select
                id="game"
                options={gameOptions}
                value={gameOptions.find(opt => opt.value === game) || null}
                onChange={opt => setGame(opt ? opt.value : '')}
                placeholder="Select a game"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({ ...base, backgroundColor: '#18181b', color: '#fff', borderColor: '#23232b' }),
                  menu: (base) => ({ ...base, backgroundColor: '#18181b', color: '#fff' }),
                  option: (base, state) => ({
                    ...base,
                    backgroundColor: state.isSelected ? '#a259ff' : state.isFocused ? '#23232b' : '#18181b',
                    color: state.isSelected ? '#fff' : '#fff',
                  }),
                  singleValue: (base) => ({ ...base, color: '#fff' }),
                  placeholder: (base) => ({ ...base, color: '#aaa' }),
                }}
              />
            </div>
            <div>
              <Label>Team Members</Label>
              {memberUsernames.map((username, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <Input
                    value={username}
                    onChange={e => {
                      const arr = [...memberUsernames];
                      arr[idx] = e.target.value;
                      setMemberUsernames(arr);
                    }}
                    placeholder="Enter username"
                    required
                    className={memberValidation[idx] === false ? 'border-red-500' : ''}
                  />
                  {memberUsernames.length > 1 && (
                    <Button type="button" variant="outline" onClick={() => {
                      setMemberUsernames(memberUsernames.filter((_, i) => i !== idx));
                      setMemberValidation(memberValidation.filter((_, i) => i !== idx));
                    }}>Remove</Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => {
                setMemberUsernames([...memberUsernames, '']);
                setMemberValidation([...memberValidation, null]);
              }}>Add Member</Button>
              <div className="text-xs text-gray-400 mt-1">{memberTooltip}</div>
              {errorMsg && <div className="text-red-500 text-xs mt-2">{errorMsg}</div>}
            </div>
            <Button type="submit" className="w-full bg-gaming-purple hover:bg-gaming-purple/80" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Team'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      {/* Invite Member Modal */}
      <InviteDialog open={inviteModal.open} onOpenChange={open => setInviteModal({ open, teamId: open ? inviteModal.teamId : null })}>
        <InviteDialogContent className="max-w-md">
          <InviteDialogHeader>
            <InviteDialogTitle>Invite Member</InviteDialogTitle>
          </InviteDialogHeader>
          <div className="space-y-4">
            <Label htmlFor="inviteUsername">Username</Label>
            <Input id="inviteUsername" value={inviteUsername} onChange={e => setInviteUsername(e.target.value)} placeholder="Enter username" />
            {inviteError && <div className="text-red-500 text-xs">{inviteError}</div>}
            <Button onClick={handleInviteMember} disabled={inviteLoading} className="w-full bg-gaming-purple hover:bg-gaming-purple/80">
              {inviteLoading ? 'Inviting...' : 'Send Invite'}
            </Button>
          </div>
        </InviteDialogContent>
      </InviteDialog>
      {/* Delete Confirmation Modal */}
      <ConfirmDialog open={deleteModal.open} onOpenChange={open => setDeleteModal({ open, team: open ? deleteModal.team : null })}>
        <ConfirmDialogContent className="max-w-md">
          <ConfirmDialogHeader>
            <ConfirmDialogTitle>Delete Team</ConfirmDialogTitle>
          </ConfirmDialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to delete the team <b>{deleteModal.team?.name}</b>? This action cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDeleteModal({ open: false, team: null })}>Cancel</Button>
              <Button variant="destructive" disabled={deleting} onClick={async () => {
                setDeleting(true);
                try {
                  // Delete team (cascades to members/invites)
                  const { error } = await supabase.from('teams').delete().eq('id', deleteModal.team?.id);
                  if (error) throw error;
                  setDeleteModal({ open: false, team: null });
                  toast({ title: 'Team deleted', variant: 'success' });
                  // Refetch teams
                  setShowModal(false);
                  // Optionally, trigger a global refresh (e.g., via context or notification)
                } catch (err) {
                  toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
                } finally {
                  setDeleting(false);
                }
              }}>
                Delete
              </Button>
            </div>
          </div>
        </ConfirmDialogContent>
      </ConfirmDialog>
      {/*
        NEXT STEPS:
        - Implement invite/accept/decline logic for team members
        - Show pending invites and allow members to accept/reject
        - Add audit log and notification logic
      */}
    </div>
  );
};

export default PlayerTeams;
