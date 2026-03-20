import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Users, Trophy } from "lucide-react";
import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/apiClient';
import Select from 'react-select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Dialog as InviteDialog, DialogContent as InviteDialogContent, DialogHeader as InviteDialogHeader, DialogTitle as InviteDialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useTeamManagement } from '@/hooks/useTeamManagement';
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
  tag: string;
  tournamentWins: number;
  totalMatches: number;
}

const PlayerTeams = () => {
  const [showModal, setShowModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [teamLogoUrl, setTeamLogoUrl] = useState<string | null>(null);
  const [verifiedUsers, setVerifiedUsers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [teamTag, setTeamTag] = useState('');
  const [game, setGame] = useState('');
  const [games] = useState([
    { value: 'valorant', label: 'VALORANT', logo: '/games/valorant.png' },
    { value: 'cs2', label: 'CS2', logo: '/games/cs2.png' },
    { value: 'fortnite', label: 'Fortnite', logo: '/games/fortnite.png' },
  ]);
  const [memberUsernames, setMemberUsernames] = useState(['']);
  const [memberValidation, setMemberValidation] = useState<(boolean | null)[]>([null]);
  const [memberTooltip] = useState('Make sure usernames are correct; no invite will be sent otherwise.');
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
  const [isEditing, setIsEditing] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const {
    userTeams,
    loading,
    createTeam,
    updateTeam,
    deleteTeam,
    inviteUserToTeam,
    removeTeamMember,
    getVerifiedUsers,
    refreshTeams,
  } = useTeamManagement();

  // Map hook teams to local Team shape
  const teams: Team[] = userTeams.map(t => ({
    id: t.id,
    name: t.name,
    logo: t.logo_url || '',
    game: t.game,
    tag: t.tag || '',
    members: (t.members || []).map(m => ({
      id: m.id,
      username: m.username || 'Unknown',
      avatar: m.avatar_url || '',
      role: m.role === 'captain' ? 'Captain' : 'Member',
    })),
    tournamentWins: t.tournament_wins || 0,
    totalMatches: t.total_matches || 0,
  }));

  useEffect(() => {
    const fetchVerifiedUsers = async () => {
      const data = await getVerifiedUsers();
      if (data) setVerifiedUsers(data);
    };
    fetchVerifiedUsers();
  }, [getVerifiedUsers]);

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

  const uploadTeamLogo = async (file: File, _teamName: string): Promise<string | null> => {
    if (!file) return null;
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'teams.logos');
      const { url } = await apiClient.upload<{ url: string; path: string }>('/api/storage/upload', fd);
      return url;
    } catch {
      return null;
    }
  };

  // Validate usernames via API
  const validateMembers = async () => {
    const results = await Promise.all(memberUsernames.map(async (username) => {
      if (!username) return false;
      try {
        await apiClient.get(`/api/profiles/by-username/${encodeURIComponent(username)}`);
        return true;
      } catch {
        return false;
      }
    }));
    setMemberValidation(results);
    return results.every(Boolean);
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

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
      logoUrl = await uploadTeamLogo(teamLogoFile, teamName);
      setTeamLogoUrl(logoUrl);
    }

    const membersList = memberUsernames
      .filter(username => !!username)
      .map(username => {
        const u = verifiedUsers.find(v => v.username === username);
        return u ? { user_id: u.id, role: 'member' as const } : null;
      })
      .filter((m): m is { user_id: string; role: 'member' } => m !== null);

    const newTeam = isEditing && editingTeamId
      ? await updateTeam(editingTeamId, {
        name: teamName,
        tag: teamTag,
        game: game || 'Unknown',
        logo_url: logoUrl || teamLogoUrl || undefined,
      })
      : await createTeam({
        name: teamName,
        tag: teamTag,
        game: game || 'Unknown',
        game_format: 'squad',
        logo_url: logoUrl || undefined,
        description: '',
        members: membersList
      });

    if (newTeam) {
      setShowModal(false);
      resetForm();
    }
    setSubmitting(false);
  };

  const resetForm = () => {
    setTeamName('');
    setTeamTag('');
    setGame('');
    setTeamLogoFile(null);
    setTeamLogoUrl(null);
    setMemberUsernames(['']);
    setMemberValidation([null]);
    setIsEditing(false);
    setEditingTeamId(null);
  };

  // Listen for team invite acceptance events
  useEffect(() => {
    const handleTeamInviteAccepted = () => {
      refreshTeams();
    };
    window.addEventListener('teamInviteAccepted', handleTeamInviteAccepted);
    return () => window.removeEventListener('teamInviteAccepted', handleTeamInviteAccepted);
  }, [refreshTeams]);

  const gameOptions = games.map(g => ({ value: g.value, label: g.label }));

  // Invite member logic using hook
  const handleInviteMember = async () => {
    setInviteError('');
    setInviteLoading(true);

    if (!inviteModal.teamId) return;

    try {
      const profile = await apiClient.get<{ id: string }>(`/api/profiles/by-username/${encodeURIComponent(inviteUsername)}`);
      const success = await inviteUserToTeam(inviteModal.teamId, profile.id);
      setInviteLoading(false);
      if (success) {
        setInviteModal({ open: false, teamId: null });
        setInviteUsername('');
      }
    } catch {
      setInviteError('User not found.');
      setInviteLoading(false);
    }
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
                    <img src={team.logo} loading="lazy" alt={team.name} className="h-full w-full object-cover" />
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
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.avatar} alt={member.username} />
                            <AvatarFallback>{member.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
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
                            <Button variant="destructive" size="sm" onClick={async () => {
                              await removeTeamMember(team.id, member.id);
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
                        <Button variant="outline" size="sm" onClick={() => {
                          setIsEditing(true);
                          setEditingTeamId(team.id);
                          setTeamName(team.name);
                          setTeamTag((team as any).tag || '');
                          setGame(team.game);
                          setTeamLogoUrl(team.logo);
                          setMemberUsernames(team.members.map(m => m.username));
                          setMemberValidation(team.members.map(() => true));
                          setShowModal(true);
                        }}>
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
                          {team.totalMatches > 0 ? Math.round((team.tournamentWins / team.totalMatches) * 100) : 0}%
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gaming-gray/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gaming-purple"
                          style={{ width: `${team.totalMatches > 0 ? (team.tournamentWins / team.totalMatches) * 100 : 0}%` }}
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
      <Dialog open={showModal} onOpenChange={(open) => {
        if (!open) resetForm();
        setShowModal(open);
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Team' : 'Create a New Team'}</DialogTitle>
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
                <img src={teamLogoUrl} loading="lazy" alt="Team Logo" className="mt-2 w-16 h-16 object-cover rounded" />
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
              {submitting ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Team')}
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
                  await deleteTeam(deleteModal.team!.id);
                  setDeleteModal({ open: false, team: null });
                } catch (err: any) {
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
    </div>
  );
};

export default PlayerTeams;
