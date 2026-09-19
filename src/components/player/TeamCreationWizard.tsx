import React, { useState, useEffect, useCallback } from 'react';
import { AccentButton, CancelButton, CtaButton, OutlineButton } from "@/components/ui/app-buttons";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';
import { useRequireVerification } from '@/hooks/useRequireVerification';
import {
  Users,
  Trophy,
  Gamepad2,
  Crown,
  Shield,
  Star,
  Settings
} from "lucide-react";
import CountrySelector from '@/components/ui/CountrySelector';
import { detectUserCountry } from '@/utils/countries';



interface TeamMember {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  role: 'captain' | 'member' | 'substitute';
  verified: boolean;
}

interface Team {
  id: string;
  name: string;
  tag: string;
  games: string[];
  logo_url?: string;
  owner_id: string;
  created_at: string;
  country_code?: string | null;
  members: TeamMember[];
  tournament_wins: number;
  total_matches: number;
}

interface TeamCreationWizardProps {
  onClose: () => void;
}

const TeamCreationWizard = ({ onClose }: TeamCreationWizardProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const requireVerification = useRequireVerification();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(2);
  const [showWizard, setShowWizard] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editCountry, setEditCountry] = useState('');

  // Team creation state
  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [teamLogoUrl, setTeamLogoUrl] = useState<string | null>(null);
  const [teamCountryCode, setTeamCountryCode] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [userTeam, setUserTeam] = useState<Team | null>(null);

  const fetchUserTeam = useCallback(async () => {
    if (!user) return;

    try {
      const teams = await apiClient.get<any[]>('/api/teams/me');
      const ownedTeam = (teams || []).find((t: any) => t.owner_id === user.id);

      if (ownedTeam) {
        setUserTeam({
          ...ownedTeam,
          members: (ownedTeam.members || []).map((m: any) => ({
            id: m.user_id || m.id,
            username: m.username || m.profiles?.username,
            full_name: m.full_name || m.profiles?.full_name,
            avatar_url: m.avatar_url || m.profiles?.avatar_url,
            role: m.role,
            verified: m.is_verified || m.profiles?.is_verified,
          })),
          tournament_wins: ownedTeam.tournament_wins ?? 0,
          total_matches: ownedTeam.total_matches ?? 0,
        });
      } else {
        setUserTeam(null);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your team',
        variant: 'destructive',
      });
    }
  }, [toast, user]);

  useEffect(() => {
    void fetchUserTeam();

    const autodetect = async () => {
      const detected = await detectUserCountry();
      if (detected) setTeamCountryCode(detected);
    };
    void autodetect();
  }, [fetchUserTeam]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTeamLogoFile(e.target.files[0]);
      setTeamLogoUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  const uploadTeamLogo = async (file: File, teamName: string): Promise<string | null> => {
    if (!file) {
      console.log('No file provided to uploadTeamLogo');
      return null;
    }

    try {
      console.log('=== LOGO UPLOAD DEBUG ===');
      console.log('Team name:', teamName);

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        console.error('Invalid file type:', file.type);
        throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        console.error('File too large:', file.size);
        throw new Error('File size must be less than 5MB');
      }

      const sanitizedTeamName = teamName.replace(/[^a-z0-9]/gi, '-').toLowerCase();

      console.log('Uploading via backend proxy');

      // Upload through the backend proxy which uses service_role key (bypasses RLS)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'teams.logos');
      formData.append('folder', sanitizedTeamName);

      const result = await apiClient.upload<{ url: string; path: string }>(
        '/api/storage/upload',
        formData,
      );

      console.log('Upload result:', result);
      return result.url;
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

  const handleCreateTeam = async () => {
    if (!requireVerification()) return;
    if (!user || !teamName || !teamTag) {
      toast({
        title: 'Missing Information',
        description: 'Please enter team name and tag',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // No game selection at creation time; games managed via rosters later

      // Upload logo if provided
      let logoUrl = null;
      if (teamLogoFile) {
        console.log('=== LOGO UPLOAD START ===');
        console.log('Team logo file:', teamLogoFile);
        console.log('File name:', teamLogoFile.name);
        console.log('File size:', teamLogoFile.size);
        console.log('File type:', teamLogoFile.type);

        try {
          logoUrl = await uploadTeamLogo(teamLogoFile, teamName);
          console.log('Logo URL after upload:', logoUrl);

          if (!logoUrl) {
            console.error('Logo upload returned null/undefined');
            toast({
              title: 'Logo Upload Failed',
              description: 'Failed to upload team logo. Team will be created without logo.',
              variant: 'destructive',
            });
          } else {
            console.log('Logo upload successful:', logoUrl);
          }
        } catch (error) {
          console.error('Logo upload error:', error);
          toast({
            title: 'Logo Upload Failed',
            description: 'Failed to upload team logo. Team will be created without logo.',
            variant: 'destructive',
          });
        }
        console.log('=== LOGO UPLOAD END ===');
      } else {
        console.log('No logo file provided, skipping upload');
      }

      console.log('=== TEAM CREATION DEBUG ===');
      console.log('Team data to insert:', {
        name: teamName,
        tag: teamTag,
        games: [],
        logo_url: logoUrl,
        owner_id: user.id,
      });

      // Create team
      const team = await apiClient.post<any>('/api/teams', {
        name: teamName,
        tag: teamTag,
        game: 'Organization',
        games: [],
        logoUrl: logoUrl,
        countryCode: teamCountryCode || null,
      });

      console.log('Created team:', team);
      console.log('===========================');

      if (!team?.id) throw new Error('Team creation failed');

      // Creator is auto-added as captain by the backend
      // No need for a separate member insert

      // No member notifications needed at creation time

      toast({
        title: 'Team Created!',
        description: `Team "${teamName}" has been created successfully`,
        variant: 'default',
      });

      // Reset form and close wizard
      resetForm();

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('teamCreated'));

      onClose(); // Close the modal - this will trigger fetchUserTeams() in the parent component

    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: 'Error',
        description: 'Failed to create team. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setTeamName('');
    setTeamTag('');
    setTeamLogoFile(null);
    setTeamLogoUrl(null);
    setTeamCountryCode('');
  };

  // If user already has a team, show team management
  if (userTeam) {
    return (
      <div className="bg-esports-dark rounded-lg p-6">
        {/* Glassy Header */}
        <div className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold text-white">
                    My Team
                  </h1>
                  <p className="text-lg text-gray-300 mt-2 max-w-2xl">
                    Manage your team members and game rosters
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <OutlineButton
                  onClick={() => {
                    if (userTeam) {
                      setEditName(userTeam.name);
                      setEditTag(userTeam.tag);
                      setEditCountry(userTeam.country_code || '');
                    }
                    setShowEditModal(true);
                  }}
                >
                  <Settings className="mr-2 h-5 w-5" />
                  Edit Team
                </OutlineButton>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20">
                  <Trophy className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Games</p>
                  <p className="text-2xl font-bold text-white">{userTeam.games.length}</p>
                </div>
              </div>
            </div>
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 border border-white/10">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Members</p>
                  <p className="text-2xl font-bold text-white">{userTeam.members.length}</p>
                </div>
              </div>
            </div>
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 border border-white/10">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Wins</p>
                  <p className="text-2xl font-bold text-white">{userTeam.tournament_wins}</p>
                </div>
              </div>
            </div>
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl">
                  <Gamepad2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Matches</p>
                  <p className="text-2xl font-bold text-white">{userTeam.total_matches}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Team Card */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 hover:bg-white/15 transition-all duration-300 hover:shadow-2xl hover:shadow-rose-500/25">
            {/* Team Header */}
            <div className="flex items-center gap-6 mb-8">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-rose-500/20 to-blue-500/20 border border-white/20 flex items-center justify-center overflow-hidden">
                  {userTeam.logo_url ? (
                    <img src={userTeam.logo_url} loading="lazy" alt={userTeam.name} className="w-full h-full object-cover" />
                  ) : (
                    <Gamepad2 className="h-12 w-12 text-rose-400" />
                  )}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Crown className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white mb-2">{userTeam.name}</h2>
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-sm">
                    [{userTeam.tag}]
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {userTeam.games.map(game => (
                    <Badge key={game} variant="outline" className="border-white/30 text-gray-300 bg-white/10 text-xs">
                      {game}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Team Members */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold text-white mb-4">Team Members</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {userTeam.members.map((member) => (
                  <div key={member.id} className="flex items-center gap-4 p-4 backdrop-blur-xl bg-white/5 rounded-xl border border-white/10">
                    <Avatar className="h-12 w-12 text-zinc-700 bg-white/5 rounded-xl border border-white/10">
                      <AvatarImage src={member.avatar_url} />
                      <AvatarFallback>{member.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-white">{member.username}</div>
                      <div className="flex items-center gap-2">
                        {member.role === 'captain' && (
                          <Crown className="h-3 w-3 text-yellow-500" />
                        )}
                        {member.verified && (
                          <Shield className="h-3 w-3 text-green-500" />
                        )}
                        <span className="text-xs text-gray-400">{member.role}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Edit Team Dialog */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="max-w-lg backdrop-blur-xl bg-slate-900/95 border border-cyan-400/20">
            <DialogHeader>
              <DialogTitle className="text-white">Edit Team</DialogTitle>
              <DialogDescription className="text-gray-400">
                Update your team's basic information.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-white">Team Name</Label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <Label className="text-white">Team Tag</Label>
                <Input value={editTag} onChange={(e) => setEditTag(e.target.value.toUpperCase())} className="bg-white/10 border-white/20 text-white" maxLength={6} />
              </div>
              <div>
                <Label className="text-white">Team Country</Label>
                <CountrySelector
                  value={editCountry}
                  onChange={setEditCountry}
                  className="bg-white/10 border-white/20 text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <CancelButton onClick={() => setShowEditModal(false)}>Cancel</CancelButton>
                <AccentButton onClick={async () => {
                  if (!userTeam) return;
                  try {
                    await apiClient.put(`/api/teams/${userTeam.id}`, {
                      name: editName,
                      tag: editTag,
                      country_code: editCountry || null,
                      updated_at: new Date().toISOString()
                    });
                    await fetchUserTeam();
                    setShowEditModal(false);
                    toast({ title: 'Team updated', description: 'Your changes have been saved.' });
                  } catch (err: any) {
                    console.error('Update team error', err);
                    toast({ title: 'Update failed', description: err.message || 'Could not update team', variant: 'destructive' });
                  }
                }}>Save Changes</AccentButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // If user doesn't have a team, show team creation
  return (
    <div className="w-full">

      {/* Team Creation Wizard (basic info only; games are managed via rosters) */}
      <Dialog open={showWizard} onOpenChange={(open) => { if (!open) { setShowWizard(false); onClose(); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto overscroll-contain bg-esports-dark border border-gray-600/30" data-lenis-prevent>
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-esports-primary">
              Create Your Team
            </DialogTitle>
            <DialogDescription className="text-esports-secondary">
              Set up your esports team with basic info and branding. Add game rosters later from your dashboard.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Team Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-esports-primary">Team Details</h3>
                    <p className="text-esports-secondary">
                      Create your organization team. Add game rosters later.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Team Information */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="teamName" className="text-esports-primary">Team Name *</Label>
                      <Input
                        id="teamName"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Enter team name"
                        className="bg-esports-dark border border-gray-600/30 text-esports-primary placeholder-gray-400"
                      />
                    </div>

                    <div>
                      <Label htmlFor="teamTag" className="text-esports-primary">Team Tag *</Label>
                      <Input
                        id="teamTag"
                        value={teamTag}
                        onChange={(e) => setTeamTag(e.target.value.toUpperCase())}
                        placeholder="3-6 characters"
                        maxLength={6}
                        className="bg-esports-dark border border-gray-600/30 text-esports-primary placeholder-gray-400"
                      />
                    </div>

                    <div>
                      <Label htmlFor="teamLogo" className="text-white">Team Logo (Optional)</Label>
                      <Input
                        id="teamLogo"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="backdrop-blur-xl bg-white/10 border border-white/20 text-white"
                      />
                      {teamLogoUrl && (
                        <div className="mt-2">
                          <div className="w-16 h-16 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center overflow-hidden">
                            <img
                              src={teamLogoUrl}
                              alt="Team Logo Preview"
                              className="w-full h-full object-contain p-1"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Team Members (invite-only; no global user list) */}
                  <div className="space-y-2">
                    <Label className="text-white">Team Members</Label>
                    <p className="text-sm text-gray-300">
                      You’ll be set as captain automatically. Invite members later from your team page by username or email.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-6 border-t border-white/20">
                  <CancelButton onClick={() => setCurrentStep(1)}>
                    Back
                  </CancelButton>
                  <CtaButton
                    onClick={handleCreateTeam}
                    disabled={submitting || !teamName || !teamTag}
                    className="px-8 py-3"
                  >
                    {submitting ? 'Creating Team...' : 'Create Team'}
                  </CtaButton>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamCreationWizard;
