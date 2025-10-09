import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
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

// RAWG API configuration
const RAWG_API_KEY = '55e8210bf73448108b7f3c6707739206';
const RAWG_API_URL = 'https://api.rawg.io/api/games';

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
  role: 'captain' | 'player' | 'substitute';
  verified: boolean;
}

interface Team {
  id: string;
  name: string;
  tag: string;
  games: string[];
  logo_url?: string;
  created_by: string;
  created_at: string;
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
  const [currentStep, setCurrentStep] = useState(1);
  const [showWizard, setShowWizard] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editGames, setEditGames] = useState<string[]>([]);
  
  // Team creation state
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [teamLogoFile, setTeamLogoFile] = useState<File | null>(null);
  const [teamLogoUrl, setTeamLogoUrl] = useState<string | null>(null);
  
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
    
    // Fetch images in batches to avoid overwhelming the API
    const batchSize = 4;
    const games = esportsGames.games;
    
    for (let i = 0; i < games.length; i += batchSize) {
      const batch = games.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (game: Game) => {
          try {
            const searchName = game.name.trim().toLowerCase() === 'cs2' ? 'Counter-Strike 2' : game.name;
            const response = await fetch(`${RAWG_API_URL}?key=${RAWG_API_KEY}&search=${encodeURIComponent(searchName)}&page_size=1`);
            const data = await response.json();
            if (data && data.results && data.results.length > 0) {
              images[game.name] = data.results[0].background_image || '';
            }
          } catch (error) {
            console.error(`Failed to fetch image for ${game.name}:`, error);
          }
        })
      );
      
      // Update images progressively as they load
      setGameImages({...images});
      
      // Small delay between batches to prevent rate limiting
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
  }, []);

  const fetchVerifiedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, verified, email')
        .eq('verified', true)
        .order('username');
      
      if (error) throw error;
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
      
      // Get team where user is the creator
      const { data: createdTeam, error: createdError } = await supabase
        .from('teams')
        .select('*')
        .eq('created_by', user.id)
        .maybeSingle();

      if (createdError && createdError.code !== 'PGRST116') throw createdError;

      if (createdTeam) {
        // Fetch members for the team
        const { data: members } = await supabase
          .from('team_members')
          .select(`
            user_id,
            role,
            profiles (
              id,
              username,
              full_name,
              avatar_url,
              verified
            )
          `)
          .eq('team_id', createdTeam.id);

        setUserTeam({
          ...createdTeam,
          members: (members || []).map(m => ({
            id: m.user_id,
            username: m.profiles.username,
            full_name: m.profiles.full_name,
            avatar_url: m.profiles.avatar_url,
            role: m.role,
            verified: m.profiles.verified,
          })),
          tournament_wins: 0, // TODO: Calculate from tournament results
          total_matches: 0, // TODO: Calculate from match history
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

  const handleGameToggle = (gameName: string) => {
    setSelectedGames(prev => 
      prev.includes(gameName) 
        ? prev.filter(g => g !== gameName)
        : [...prev, gameName]
    );
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTeamLogoFile(e.target.files[0]);
      setTeamLogoUrl(URL.createObjectURL(e.target.files[0]));
    }
  };

  const uploadTeamLogo = async (file: File): Promise<string | null> => {
    if (!file) {
      console.log('No file provided to uploadTeamLogo');
      return null;
    }
    
    try {
      console.log('=== LOGO UPLOAD DEBUG ===');
      console.log('File:', file);
      console.log('File name:', file.name);
      console.log('File size:', file.size);
      console.log('File type:', file.type);
      
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
      
      const fileExt = file.name.split('.').pop();
      const fileName = `team-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      // Fix: Don't include 'team-logos/' in the path since we're already uploading to the team-logos bucket
      const filePath = fileName;
      
      console.log('Uploading to path:', filePath);
      
      // Direct upload attempt - this will give us a clearer error if there are permission issues
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

  const addMember = (user: any) => {
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
    const role = selectedMembers.length === 0 ? 'captain' : 'player';
    
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
    if (!user || selectedGames.length === 0 || !teamName || !teamTag) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);

    try {
      // Enforce: creator cannot create a team for games where they are already active member
      const { data: candidateTeams, error: conflictError } = await supabase
        .from('teams')
        .select('id, name, games, team_members!inner(user_id, is_active)')
        .eq('team_members.user_id', user.id)
        .eq('team_members.is_active', true);
      if (conflictError) throw conflictError;
      const hasConflict = (candidateTeams || []).some((t: any) => Array.isArray(t?.games) && t.games.some((g: string) => selectedGames.includes(g)));
      if (hasConflict) {
        toast({
          title: 'Cannot Create Team',
          description: 'You are already a member of another team for one or more selected games.',
          variant: 'destructive',
        });
        return;
      }

      // Upload logo if provided
      let logoUrl = null;
      if (teamLogoFile) {
        console.log('=== LOGO UPLOAD START ===');
        console.log('Team logo file:', teamLogoFile);
        console.log('File name:', teamLogoFile.name);
        console.log('File size:', teamLogoFile.size);
        console.log('File type:', teamLogoFile.type);
        
        try {
          logoUrl = await uploadTeamLogo(teamLogoFile);
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
        games: selectedGames,
        logo_url: logoUrl,
        created_by: user.id,
      });

      // Create team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          tag: teamTag,
          games: selectedGames,
          logo_url: logoUrl,
          created_by: user.id,
        })
        .select()
        .single();

      console.log('Created team:', team);
      console.log('Team error:', teamError);
      console.log('===========================');

      if (teamError) throw teamError;

      // Build final member list: ensure current user is added as captain if none selected
      const hasCurrentUser = selectedMembers.some(m => m.id === user.id);
      const hasCaptain = selectedMembers.some(m => m.role === 'captain');
      const finalMembers = hasCurrentUser
        ? selectedMembers
        : [{ id: user.id, role: hasCaptain ? 'player' : 'captain' }, ...selectedMembers];

      const memberRows = finalMembers.map(member => ({
        team_id: team.id,
        user_id: member.id,
        role: member.role,
      }));

      const { error: memberError } = await supabase
        .from('team_members')
        .insert(memberRows);

      if (memberError) throw memberError;

      // Send notifications to team members
      const notifications = finalMembers
        .filter(m => m.id !== user.id) // Don't notify yourself
        .map(member => ({
          user_id: member.id,
          type: 'team_created',
          title: 'Team Created',
          message: `You have been added to team "${teamName}" as ${member.role}`,
          data: { team_id: team.id, team_name: teamName },
          read: false,
          created_at: new Date().toISOString(),
        }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }

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
                      setEditGames(userTeam.games || []);
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
                    <img src={userTeam.logo_url} alt={userTeam.name} className="w-full h-full object-cover" />
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
                    <Avatar className="h-12 w-12" src={member.avatar_url} name={member.username} />
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
                <Label className="text-white">Games</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {esportsGames.games.map((g: any) => (
                    <Badge key={g.name} onClick={() => setEditGames(prev => prev.includes(g.name) ? prev.filter(id => id !== g.name) : [...prev, g.name])} className={`${editGames.includes(g.name) ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400/40' : 'bg-white/10 text-white/70 border-white/20'} cursor-pointer`}>
                      {g.name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowEditModal(false)} className="border-white/30 text-white hover:bg-white/10">Cancel</Button>
                <Button onClick={async () => {
                  if (!userTeam) return;
                  try {
                    const { error } = await supabase
                      .from('teams')
                      .update({ name: editName, tag: editTag, games: editGames, updated_at: new Date().toISOString() })
                      .eq('id', userTeam.id);
                    if (error) throw error;
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

      {/* Team Creation Wizard */}
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-esports-dark border border-gray-600/30">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-esports-primary">
              Create Your Team
            </DialogTitle>
            <DialogDescription className="text-esports-secondary">
              Set up your esports team with games, members, and branding.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Step 1: Game Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-esports-blue to-esports-cyan rounded-xl flex items-center justify-center">
                    <Gamepad2 className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-esports-primary mb-2">Select Your Games</h3>
                  <p className="text-esports-secondary">
                    {imagesLoading ? 'Loading game images...' : 'Choose the games your team will compete in'}
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {esportsGames.games.map((game: Game) => (
                    <div
                      key={game.name}
                      className={`relative cursor-pointer transition-all duration-300 ease-out hover:scale-105 ${
                        selectedGames.includes(game.name)
                          ? 'ring-2 ring-esports-accent ring-offset-2 ring-offset-esports-dark'
                          : 'hover:ring-1 hover:ring-gray-600'
                      }`}
                      onClick={() => handleGameToggle(game.name)}
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
                        {selectedGames.includes(game.name) && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center animate-in zoom-in-50 duration-200">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedGames.length > 0 && (
                  <div className="text-center pt-4">
                    <Button
                      onClick={() => setCurrentStep(2)}
                      disabled={imagesLoading}
                      className="btn-esports-blue px-8 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {imagesLoading ? 'Loading...' : `Continue with ${selectedGames.length} game${selectedGames.length !== 1 ? 's' : ''}`}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Team Details */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 mb-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(1)}
                    className="border-gray-600/30 text-esports-secondary hover:bg-gray-800/50"
                  >
                    ← Back
                  </Button>
                  <div>
                    <h3 className="text-2xl font-bold text-esports-primary">Team Details</h3>
                    <p className="text-esports-secondary">
                      Configure your multi-game team
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
                      <Label className="text-white">Selected Games</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedGames.map(game => (
                          <Badge key={game} className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
                            {game}
                          </Badge>
                        ))}
                      </div>
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
