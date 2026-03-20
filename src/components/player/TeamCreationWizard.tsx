import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import {
  Users,
  Trophy,
  Gamepad2,
  Plus,
  CheckCircle,
  XCircle,
  Crown,
  Edit3,
  Trash2,
  UserPlus,
  Shield,
  Sparkles,
  Star,
  Zap,
  Settings,
  PlusCircle
} from "lucide-react";
import esportsGames from '@/data/esportsGames.json';
import { rawgSearchGames } from '@/lib/rawgProxy';
import CountrySelector from '@/components/ui/CountrySelector';
import { detectUserCountry } from '@/utils/countries';



interface Game {
  name: string;
  formats: Array<{
    name: string;
    value: string;
    teamSize: number;
  }>;
  defaultFormat: string;
  logo: string;
}

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
  const { user, profile } = useAuth();
  const { toast } = useToast();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(2);
  const [showWizard, setShowWizard] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editCountry, setEditCountry] = useState('');

  // Team creation state
  const [selectedGames, setSelectedGames] = useState<string[]>([]); // deprecated for initial creation; rosters handle games
  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [teamLogoUrl, setTeamLogoUrl] = useState<string | null>(null);
  const [teamCountryCode, setTeamCountryCode] = useState('');

  // Member management
  const [verifiedUsers, setVerifiedUsers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Loading states
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userTeam, setUserTeam] = useState<Team | null>(null);
  const [fetchingTeam, setFetchingTeam] = useState(true);

  // Game images from RAWG API
  const [gameImages, setGameImages] = useState<Record<string, string>>({});
  const [imagesLoading, setImagesLoading] = useState(true);

  // Fetch game images from RAWG API with optimized loading
  const fetchGameImages = async () => {
    setImagesLoading(true);
    const images: Record<string, string> = {};

    const batchSize = 4;
    const games = esportsGames.games;

    for (let i = 0; i < games.length; i += batchSize) {
      const batch = games.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (game: Game) => {
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

  // Fetch verified users and user's team
  useEffect(() => {
    fetchVerifiedUsers();
    fetchUserTeam();
    fetchGameImages();

    // Autodetect country
    const autodetect = async () => {
      if (!teamCountryCode) {
        const detected = await detectUserCountry();
        if (detected) setTeamCountryCode(detected);
      }
    };
    autodetect();
  }, []);

  const fetchVerifiedUsers = async () => {
    try {
      const data = await apiClient.get<any[]>('/api/profiles/search?verified=true');
      setVerifiedUsers(data || []);
    } catch (error) {
      console.error('Error fetching verified users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load verified users',
        variant: 'destructive',
      });
    }
  };

  const fetchUserTeam = async () => {
    if (!user) return;

    try {
      setFetchingTeam(true);

      // Get user's teams via API
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
          tournament_wins: 0,
          total_matches: 0,
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
    } finally {
      setFetchingTeam(false);
    }
  };

  const handleGameToggle = (_gameName: string) => { };

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
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

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

  const addMember = (user: any) => {
    // Check if user is admin
    if (user.is_admin) {
      toast({
        title: 'Cannot add admin',
        description: 'Admins cannot be added to teams as members. They can only create and manage teams.',
        variant: 'destructive',
      });
      return;
    }

    // Check if user is already selected
    if (selectedMembers.some(m => m.id === user.id)) {
      toast({
        title: 'Already Selected',
        description: 'This user is already in your team',
        variant: 'destructive',
      });
      return;
    }

    // Add user as first member (captain) if no members yet
    const role = selectedMembers.length === 0 ? 'captain' : 'member';

    setSelectedMembers(prev => [...prev, {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      avatar_url: user.avatar_url,
      role,
      verified: user.verified,
    }]);
  };

  const removeMember = (userId: string) => {
    setSelectedMembers(prev => {
      const newMembers = prev.filter(m => m.id !== userId);

      // If captain is removed, make first remaining member captain
      if (newMembers.length > 0 && !newMembers.some(m => m.role === 'captain')) {
        newMembers[0].role = 'captain';
      }

      return newMembers;
    });
  };

  const handleCreateTeam = async () => {
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
    setSelectedGames([]);
    setTeamName('');
    setTeamTag('');
    setTeamLogoFile(null);
    setTeamLogoUrl(null);
    setSelectedMembers([]);
    setSearchQuery('');
    setTeamCountryCode('');
  };

  const filteredUsers = verifiedUsers.filter(user =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.full_name && user.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // If user already has a team, show team management
  if (userTeam) {
    return (
      <div className="bg-esports-dark rounded-lg p-6">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        {/* Glassy Header */}
        <div className="relative z-10 backdrop-blur-xl bg-white/10 border border-white/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                    My Team
                  </h1>
                  <p className="text-lg text-gray-300 mt-2 max-w-2xl">
                    Manage your esports team and dominate across multiple games
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => {
                    if (userTeam) {
                      setEditName(userTeam.name);
                      setEditTag(userTeam.tag);
                      setEditCountry(userTeam.country_code || '');
                    }
                    setShowEditModal(true);
                  }}
                  variant="outline"
                  className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20 backdrop-blur-xl"
                >
                  <Settings className="mr-2 h-5 w-5" />
                  Edit Team
                </Button>
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
                <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl">
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
                <div className="p-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl">
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
                <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
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
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 hover:bg-white/15 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/25">
            {/* Team Header */}
            <div className="flex items-center gap-6 mb-8">
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/20 flex items-center justify-center overflow-hidden">
                  {userTeam.logo_url ? (
                    <img src={userTeam.logo_url} loading="lazy" alt={userTeam.name} className="w-full h-full object-cover" />
                  ) : (
                    <Gamepad2 className="h-12 w-12 text-purple-400" />
                  )}
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                  <Crown className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white mb-2">{userTeam.name}</h2>
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm">
                    [{userTeam.tag}]
                  </Badge>
                  <Badge variant="outline" className="border-green-500/50 text-green-400 bg-green-500/10 text-sm">
                    Active
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
                <Button variant="outline" onClick={() => setShowEditModal(false)} className="border-white/30 text-white hover:bg-white/10">Cancel</Button>
                <Button onClick={async () => {
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
                }} className="bg-gradient-to-r from-cyan-600 to-fuchsia-600 text-white">Save Changes</Button>
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
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-esports-dark border border-gray-600/30">
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
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="border-gray-600/30 text-esports-secondary hover:bg-gray-800/50"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleCreateTeam}
                    disabled={submitting || !teamName || !teamTag}
                    className="btn-esports-blue px-8 py-3 rounded-lg font-semibold"
                  >
                    {submitting ? 'Creating Team...' : 'Create Team'}
                  </Button>
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
