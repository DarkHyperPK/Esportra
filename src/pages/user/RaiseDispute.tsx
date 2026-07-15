import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, AlertCircle, Loader2, Search } from 'lucide-react';
import { PageTransition } from '@/components/PageTransition';

// Dispute reasons that can be handled by organizers
// Ban appeals should go to the tournament organizer who issued the ban
const ORGANIZER_RESOLVABLE_REASONS = [
  'match_result',
  'scheduling',
  'technical_issue',
  'rule_violation',
  'roster_violation',
  'ban_appeal', // Ban appeals go to tournament organizer
];

// All dispute reasons
const DISPUTE_REASONS = [
  { value: 'cheating', label: 'Cheating / Hacking' },
  { value: 'unsportsmanlike', label: 'Unsportsmanlike Conduct' },
  { value: 'roster_violation', label: 'Unapproved Player / Roster Violation' },
  { value: 'match_result', label: 'Match Result Discrepancy' },
  { value: 'scheduling', label: 'Scheduling / No-Show' },
  { value: 'technical_issue', label: 'Technical Issue / Server Problems' },
  { value: 'rule_violation', label: 'Tournament Rule Violation' },
  { value: 'ban_appeal', label: 'Ban Appeal' },
  { value: 'other', label: 'Other' },
];

interface Tournament {
  id: string;
  name: string;
  slug: string;
  organizer_id: string;
  organizer_name?: string;
  date: string;
  is_registered?: boolean;
  is_banned?: boolean;
}

const RaiseDispute = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [disputeType, setDisputeType] = useState<'tournament' | 'general' | ''>('');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Fetch tournaments user is registered in or has been banned from
  const fetchTournaments = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get tournaments where user is registered
      const registrations = await apiClient.get<{ tournament_id: string }[]>(
        `/api/tournaments/my-registrations`
      );

      // Get tournaments where user/team is banned
      const userBans = await apiClient.get<{ tournament_id: string }[]>(
        `/api/tournaments/my-bans`
      ).catch(() => []);

      // Get teams user owns or is captain of
      const ownedTeams = await apiClient.get<{ id: string }[]>(
        `/api/teams?owner_id=${user.id}`
      ).catch(() => []);

      const captainTeams = await apiClient.get<{ id: string; team_id?: string }[]>(
        `/api/teams/my-captain-teams`
      ).catch(() => []);

      const allTeamIds = [
        ...(ownedTeams || []).map(t => t.id),
        ...(captainTeams || []).map(t => t.id || t.team_id).filter(Boolean)
      ];

      let teamBans: any[] = [];
      if (allTeamIds.length > 0) {
        const uniqueTeamIds = Array.from(new Set(allTeamIds));
        teamBans = await apiClient.get<{ tournament_id: string }[]>(
          `/api/tournaments/team-bans?team_ids=${uniqueTeamIds.join(',')}`
        ).catch(() => []);
      }

      // Collect all tournament IDs - include both registered AND banned tournaments
      // This ensures banned teams can still file disputes
      const tournamentIds = new Set<string>();
      
      // Add registered tournaments
      (registrations || []).forEach((reg: any) => {
        if (reg.tournament_id) tournamentIds.add(reg.tournament_id);
      });
      
      // Add banned tournaments (user bans) - IMPORTANT: banned users can still file disputes
      (userBans || []).forEach((ban: any) => {
        if (ban.tournament_id) tournamentIds.add(ban.tournament_id);
      });
      
      // Add banned tournaments (team bans) - IMPORTANT: banned teams can still file disputes
      teamBans.forEach((ban: any) => {
        if (ban.tournament_id) tournamentIds.add(ban.tournament_id);
      });

      // Fetch tournaments separately to avoid relationship issues
      let tournamentsData: any[] = [];
      if (tournamentIds.size > 0) {
        tournamentsData = await apiClient.get<any[]>(
          `/api/tournaments?ids=${Array.from(tournamentIds).join(',')}`
        );
      }

      // Get organizer user IDs
      const organizerUserIds = new Set<string>();
      tournamentsData.forEach((t: any) => {
        if (t.organizer_id) organizerUserIds.add(t.organizer_id);
      });

      // Fetch organizer profiles
      const organizerProfilesMap = new Map<string, { full_name?: string; username?: string }>();
      if (organizerUserIds.size > 0) {
        const profiles = await apiClient.get<any[]>(
          `/api/profiles?ids=${Array.from(organizerUserIds).join(',')}`
        ).catch(() => []);
        
        if (profiles) {
          profiles.forEach((profile: any) => {
            organizerProfilesMap.set(profile.id, {
              full_name: profile.full_name,
              username: profile.username,
            });
          });
        }
      }

      // Combine and deduplicate tournaments
      const tournamentMap = new Map<string, Tournament>();
      const registeredTournamentIds = new Set<string>();
      const bannedTournamentIds = new Set<string>();

      // Mark registered tournaments
      (registrations || []).forEach((reg: any) => {
        if (reg.tournament_id) registeredTournamentIds.add(reg.tournament_id);
      });

      // Mark banned tournaments (user bans)
      (userBans || []).forEach((ban: any) => {
        if (ban.tournament_id) bannedTournamentIds.add(ban.tournament_id);
      });

      // Mark banned tournaments (team bans)
      teamBans.forEach((ban: any) => {
        if (ban.tournament_id) bannedTournamentIds.add(ban.tournament_id);
      });

      // Build tournament map from fetched data
      tournamentsData.forEach((t: any) => {
        if (!tournamentMap.has(t.id)) {
          const organizerProfile = organizerProfilesMap.get(t.organizer_id);
          const isRegistered = registeredTournamentIds.has(t.id);
          const isBanned = bannedTournamentIds.has(t.id);
          
          // Use start_date for display (tournament date), created_at for creation date
          const tournamentDate = t.start_date 
            ? new Date(t.start_date).toISOString().split('T')[0] 
            : (t.created_at ? new Date(t.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
          
          tournamentMap.set(t.id, {
            id: t.id,
            name: t.name,
            slug: t.slug,
            organizer_id: t.organizer_id,
            organizer_name: organizerProfile?.full_name || organizerProfile?.username || 'Organizer',
            date: tournamentDate,
            is_registered: isRegistered,
            is_banned: isBanned,
          });
        }
      });

      const tournamentList = Array.from(tournamentMap.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTournaments(tournamentList);
      setFilteredTournaments(tournamentList);
    } catch (error: unknown) {
      console.error('Error fetching tournaments:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load tournaments',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    // Only fetch tournaments if tournament type is selected
    if (disputeType === 'tournament') {
      fetchTournaments();
    } else {
      setLoading(false);
    }
  }, [disputeType, fetchTournaments]);

  // Filter tournaments based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTournaments(tournaments);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = tournaments.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.organizer_name?.toLowerCase().includes(query)
    );
    setFilteredTournaments(filtered);
  }, [searchQuery, tournaments]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select a file smaller than 5MB',
          variant: 'destructive',
        });
        return;
      }
      setEvidenceFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to submit a dispute',
        variant: 'destructive',
      });
      return;
    }

    if (!disputeType) {
      toast({
        title: 'Dispute type required',
        description: 'Please select whether this is a tournament dispute or general support',
        variant: 'destructive',
      });
      return;
    }

    if (disputeType === 'tournament') {
      if (!selectedTournament) {
        toast({
          title: 'Tournament required',
          description: 'Please select a tournament',
          variant: 'destructive',
        });
        return;
      }

      if (!disputeReason) {
        toast({
          title: 'Reason required',
          description: 'Please select a dispute reason',
          variant: 'destructive',
        });
        return;
      }
    }

    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a dispute title',
        variant: 'destructive',
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: 'Description required',
        description: 'Please describe your dispute',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      let evidenceUrl: string | null = null;

      // Upload evidence if provided
      if (evidenceFile) {
        setUploading(true);

        const reasonSlug = disputeReason?.toLowerCase().replace(/\s+/g, '_') || 'general';
        const folder = disputeType === 'general'
          ? `temp/general`
          : `temp/${selectedTournament}/${reasonSlug}`;

        const fd = new FormData();
        fd.append('file', evidenceFile);
        fd.append('bucket', 'tournaments.disputes.evidence');
        fd.append('folder', folder);
        const { url } = await apiClient.upload<{ url: string; path: string }>('/api/storage/upload', fd);
        evidenceUrl = url;
        setUploading(false);
      }

      // Handle general support disputes (tournament_id will be NULL)
      let finalTournamentId: string | null = null;
      let finalTeamId: string | null = null;
      let finalDisputeReason: string | null = null;
      
      if (disputeType === 'general') {
        // General support - no tournament, no team, no reason needed
        finalTournamentId = null;
        finalTeamId = null;
        finalDisputeReason = 'general_support';
      } else {
        // Tournament dispute
        finalTournamentId = selectedTournament;
        finalDisputeReason = disputeReason;
        
        // Get team_id if user is registered as a team OR if their team is banned
        const selectedTournamentData = tournaments.find(t => t.id === selectedTournament);
        
        if (selectedTournamentData) {
          // First, try to get team_id from registration (if registered)
          if (selectedTournamentData.is_registered) {
            const registration = await apiClient.get<{ team_id?: string } | null>(
              `/api/tournaments/${selectedTournament}/participants/me`
            ).catch(() => null);
            finalTeamId = registration?.team_id || null;
          }
          
          // If no team_id from registration, check if user owns a team or is captain
          if (!finalTeamId) {
            const ownedTeamsList = await apiClient.get<{ id: string }[]>(
              `/api/teams?owner_id=${user.id}`
            ).catch(() => []);
            const ownedTeam = ownedTeamsList?.[0] || null;
            
            if (ownedTeam?.id) {
              const teamBan = await apiClient.get<{ team_id: string } | null>(
                `/api/tournaments/${selectedTournament}/bans?team_id=${ownedTeam.id}`
              ).catch(() => null);
              
              if (teamBan) {
                finalTeamId = ownedTeam.id;
              }
            } else {
              const captainTeamsList = await apiClient.get<{ team_id: string }[]>(
                `/api/teams/my-captain-teams`
              ).catch(() => []);
              const captainTeam = captainTeamsList?.[0] || null;
              
              if (captainTeam?.team_id) {
                const teamBan = await apiClient.get<{ team_id: string } | null>(
                  `/api/tournaments/${selectedTournament}/bans?team_id=${captainTeam.team_id}`
                ).catch(() => null);
                
                if (teamBan) {
                  finalTeamId = captainTeam.team_id;
                }
              }
            }
          }
        }
      }

      // Create dispute
      const disputeData: Record<string, unknown> = {
        tournament_id: finalTournamentId,
        raised_by_user_id: user.id,
        team_id: finalTeamId,
        title: title.trim(),
        description: disputeType === 'tournament' && finalDisputeReason
          ? `[Reason: ${DISPUTE_REASONS.find(r => r.value === finalDisputeReason)?.label || finalDisputeReason}]\n\n${description.trim()}`
          : description.trim(),
        evidence_url: evidenceUrl,
        status: 'open',
      };

      // Add dispute_reason
      disputeData.dispute_reason = finalDisputeReason || 'other';

      const data = await apiClient.post<any>('/api/disputes', disputeData);

      if (disputeType === 'general') {
        // General support → notify all admins/moderators
        if (data?.id) {
          await apiClient.post('/api/disputes/notify-admins', {
            dispute_id: data.id,
            type: 'dispute_filed',
            title: 'New General Support Request',
            message: `A user submitted a general support request: "${title.trim()}"`,
            link: '/admin/disputes',
          });
        }
        toast({
          title: 'Support request submitted',
          description: 'Your general support request has been submitted and will be reviewed by administrators.',
        });
      } else {
        const tournament = tournaments.find(t => t.id === selectedTournament);
        const canResolveWithOrganizer = ORGANIZER_RESOLVABLE_REASONS.includes(disputeReason);
        const reasonLabel = DISPUTE_REASONS.find(r => r.value === disputeReason)?.label || disputeReason;

        if (canResolveWithOrganizer) {
          // Notify tournament organizer (fire-and-forget, don't block dispute submission)
          if (tournament?.organizer_id && data?.id) {
            apiClient.post('/api/notifications', {
              userId: tournament.organizer_id,
              type: 'dispute_filed',
              title: 'New Dispute Filed',
              message: `A player filed a dispute in "${tournament.name}" — ${reasonLabel}.`,
              link: '/organizer/disputes',
              data: { dispute_id: data.id, tournament_id: tournament.id },
            }).catch(() => {});
          }
        } else {
          // Admin-routed (cheating, unsportsmanlike, other) → notify all admins/moderators
          if (data?.id) {
            await apiClient.post('/api/disputes/notify-admins', {
              dispute_id: data.id,
              type: 'dispute_filed',
              title: 'New Dispute Filed',
              message: `A player filed a dispute in "${tournament?.name ?? 'a tournament'}" — ${reasonLabel}.`,
              link: '/admin/disputes',
            });
          }
        }

        toast({
          title: 'Dispute submitted',
          description: data?.reference_number
            ? `Your dispute ${data.reference_number} has been submitted and will be reviewed by ${canResolveWithOrganizer ? 'the tournament organizer' : 'administrators'}.`
            : canResolveWithOrganizer
              ? `Your dispute has been submitted and will be reviewed by the tournament organizer.`
              : `Your dispute has been submitted and will be reviewed by administrators.`,
        });
      }

      navigate('/user/my-disputes');
    } catch (error: unknown) {
      console.error('Error submitting dispute:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : (error as any)?.message || JSON.stringify(error);
      const errorCode = (error as any)?.code || 'UNKNOWN';
      const errorDetails = (error as any)?.details || '';
      const errorHint = (error as any)?.hint || '';
      console.error('Dispute submission error details:', { 
        errorMessage, 
        errorCode, 
        errorDetails, 
        errorHint, 
        error 
      });
      toast({
        title: 'Submission failed',
        description: `Failed to submit dispute: ${errorMessage}${errorHint ? ` (${errorHint})` : ''}`,
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  if (loading && disputeType === 'tournament') {
    return (
      <PageTransition>
        <div className="min-h-screen bg-transparent flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-red-400 mx-auto mb-4" />
            <p className="text-white/70">Loading tournaments...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-transparent py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-[#12121a] border border-white/10 shadow-2xl">
            <CardHeader className="space-y-3">
              <CardTitle className="flex items-center gap-2 text-2xl text-white">
                <MessageSquare className="h-6 w-6 text-red-400" />
                Raise a Dispute / Support
              </CardTitle>
              <p className="text-sm text-white/70">
                {!disputeType 
                  ? 'First, let us know what type of dispute or support request you need.'
                  : disputeType === 'tournament'
                    ? 'Select a tournament and provide details about your dispute. The dispute will be routed to the appropriate team based on the reason you select.'
                    : 'Provide details about your general support request. This will be reviewed by administrators.'}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Dispute Type Selection */}
              {!disputeType && (
                <div className="space-y-2">
                  <Label className="text-white">
                    What is this regarding? <span className="text-red-400">*</span>
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card 
                      className="bg-white/5 border border-white/10 hover:border-red-500/50 cursor-pointer transition"
                      onClick={() => setDisputeType('tournament')}
                    >
                      <CardContent className="pt-6">
                        <div className="text-center space-y-2">
                          <MessageSquare className="h-8 w-8 text-red-400 mx-auto" />
                          <h3 className="font-semibold text-white">Tournament Dispute</h3>
                          <p className="text-xs text-white/60">Issues related to a specific tournament</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card 
                      className="bg-white/5 border border-white/10 hover:border-red-500/50 cursor-pointer transition"
                      onClick={() => setDisputeType('general')}
                    >
                      <CardContent className="pt-6">
                        <div className="text-center space-y-2">
                          <MessageSquare className="h-8 w-8 text-red-400 mx-auto" />
                          <h3 className="font-semibold text-white">General Support</h3>
                          <p className="text-xs text-white/60">General questions or platform issues</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Tournament Selection - Only show if tournament type selected */}
              {disputeType === 'tournament' && (
                <div className="space-y-2">
                  <Label className="text-white">
                    Select Tournament <span className="text-red-400">*</span>
                  </Label>
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tournaments by name or organizer..."
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/40 pl-10"
                    />
                  </div>
                  {filteredTournaments.length === 0 ? (
                    <div className="text-center py-8 text-white/50">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No tournaments found</p>
                      <p className="text-sm mt-1">You need to be registered in or banned from a tournament to raise a dispute. Banned teams can still file disputes to appeal their ban.</p>
                    </div>
                  ) : (
                    <Select value={selectedTournament} onValueChange={setSelectedTournament}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                        <SelectValue placeholder="Select a tournament" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#12121a] border-white/10 max-h-[300px]">
                        {filteredTournaments.map((tournament) => (
                          <SelectItem
                            key={tournament.id}
                            value={tournament.id}
                            className="text-white hover:bg-white/10 focus:bg-white/10"
                          >
                            <div className="flex flex-col">
                              <span className="font-semibold">{tournament.name}</span>
                              <span className="text-xs text-white/60">
                                {tournament.organizer_name} • {new Date(tournament.date).toLocaleDateString()}
                                {tournament.is_banned && (
                                  <span className="ml-2 text-red-400">(Banned)</span>
                                )}
                                {tournament.is_registered && !tournament.is_banned && (
                                  <span className="ml-2 text-green-400">(Registered)</span>
                                )}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              )}

              {/* Tournament Dispute Form */}
              {disputeType === 'tournament' && (
                <>
                  {/* Dispute Reason */}
                  <div className="space-y-2">
                    <Label className="text-white">
                      Dispute Reason <span className="text-red-400">*</span>
                    </Label>
                    <Select value={disputeReason} onValueChange={setDisputeReason}>
                      <SelectTrigger className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                        <SelectValue placeholder="Select a reason for your dispute" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#12121a] border-white/10">
                        {DISPUTE_REASONS.map((reason) => {
                          const canResolveWithOrganizer = ORGANIZER_RESOLVABLE_REASONS.includes(reason.value);
                          return (
                            <SelectItem
                              key={reason.value}
                              value={reason.value}
                              className="text-white hover:bg-white/10 focus:bg-white/10"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span>{reason.label}</span>
                                {canResolveWithOrganizer && (
                                  <span className="text-xs text-green-400 ml-2">(Organizer)</span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    {disputeReason && (
                      <p className="text-xs text-white/50 mt-1">
                        {ORGANIZER_RESOLVABLE_REASONS.includes(disputeReason)
                          ? disputeReason === 'ban_appeal'
                            ? 'This ban appeal will be reviewed by the tournament organizer who issued the ban'
                            : 'This dispute will be handled by the tournament organizer'
                          : 'This dispute will be reviewed by administrators'}
                      </p>
                    )}
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <Label className="text-white">
                      Title <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Example: Opponent used unapproved player"
                      maxLength={200}
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-white">
                      Description <span className="text-red-400">*</span>
                    </Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Give a clear timeline, round numbers, and any witnesses. Include specific details about what happened, when it occurred, and who was involved."
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/40 min-h-[140px]"
                      maxLength={2000}
                    />
                    <p className="text-xs text-white/50">{description.length}/2000 characters</p>
                  </div>

                  {/* Evidence */}
                  <div className="space-y-3">
                    <Label className="text-white">Evidence (optional)</Label>
                    <div className="relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 text-sm text-white/60 bg-white/5 hover:border-red-500/50 hover:text-red-300 transition cursor-pointer border-white/20">
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                        accept="image/*"
                      />
                      {evidenceFile ? (
                        <>
                          <p className="text-white font-medium">{evidenceFile.name}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-red-300 hover:text-red-100 hover:bg-red-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEvidenceFile(null);
                            }}
                          >
                            Remove file
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-white">Drop screenshot here or click to browse</p>
                          <p className="text-xs text-white/50 mt-1">PNG or JPG, max size 5MB</p>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* General Support Form */}
              {disputeType === 'general' && (
                <>
                  {/* Title */}
                  <div className="space-y-2">
                    <Label className="text-white">
                      Title <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Example: Account issue or platform question"
                      maxLength={200}
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/40"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-white">
                      Description <span className="text-red-400">*</span>
                    </Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Please describe your issue or question in detail..."
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/40 min-h-[140px]"
                      maxLength={2000}
                    />
                    <p className="text-xs text-white/50">{description.length}/2000 characters</p>
                  </div>

                  {/* Evidence */}
                  <div className="space-y-3">
                    <Label className="text-white">Evidence (optional)</Label>
                    <div className="relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 text-sm text-white/60 bg-white/5 hover:border-red-500/50 hover:text-red-300 transition cursor-pointer border-white/20">
                      <input
                        type="file"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleFileChange}
                        accept="image/*"
                      />
                      {evidenceFile ? (
                        <>
                          <p className="text-white font-medium">{evidenceFile.name}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 text-red-300 hover:text-red-100 hover:bg-red-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEvidenceFile(null);
                            }}
                          >
                            Remove file
                          </Button>
                        </>
                      ) : (
                        <>
                          <p className="text-white">Drop screenshot here or click to browse</p>
                          <p className="text-xs text-white/50 mt-1">PNG or JPG, max size 5MB</p>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-white/10">
                {disputeType && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDisputeType('');
                      setSelectedTournament('');
                      setDisputeReason('');
                      setTitle('');
                      setDescription('');
                      setEvidenceFile(null);
                    }}
                    className="text-white/70 hover:text-white hover:bg-white/10 w-full sm:w-auto border border-white/20"
                  >
                    Back
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => navigate('/user/my-disputes')}
                  className="text-white/70 hover:text-white hover:bg-white/10 w-full sm:w-auto border border-white/20"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    submitting || 
                    uploading || 
                    !disputeType ||
                    (disputeType === 'tournament' && (!selectedTournament || !disputeReason)) ||
                    !title.trim() || 
                    !description.trim()
                  }
                  className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading…
                    </>
                  ) : submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4" />
                      Submit Dispute
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
};

export default RaiseDispute;

