import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  MessageSquare,
  Upload,
  AlertCircle,
  X,
  ShieldAlert,
  Paperclip,
  CheckCircle2,
  Users,
  Ban,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface DisputeSubmissionProps {
  tournamentId: string;
  tournamentName: string;
  teamId?: string | null;
  matchId?: string | null;
  onClose?: () => void;
}

const steps = [
  {
    title: 'Describe the incident',
    description: 'Share what happened and when it occurred.',
  },
  {
    title: 'Attach evidence',
    description: 'Screenshots or clips speed up resolutions.',
  },
  {
    title: 'Submit dispute',
    description: 'Track responses inside the dispute center.',
  },
];

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

// These reasons bypass the organizer and go straight to admins/moderators
const ADMIN_ROUTED_REASONS = ['cheating', 'unsportsmanlike', 'other'];

const DisputeSubmission: React.FC<DisputeSubmissionProps> = ({
  tournamentId,
  tournamentName,
  teamId,
  matchId,
  onClose,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<{
    isEnrolled: boolean;
    isBanned: boolean;
    teamName?: string;
    banReason?: string;
  } | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Check enrollment and ban status on mount
  useEffect(() => {
    const checkStatus = async () => {
      if (!user?.id || !tournamentId) {
        setLoadingStatus(false);
        return;
      }

      try {
        // Check for enrollment
        const registration = await apiClient.get<{ team_id?: string; team_name?: string; participant_type?: string } | null>(
          `/api/tournaments/${tournamentId}/participants/me`
        ).catch(() => null);

        // Check for ban (user or team)
        const userBan = await apiClient.get<{ ban_reason?: string } | null>(
          `/api/tournaments/${tournamentId}/bans?user_id=${user.id}`
        ).catch(() => null);

        let teamBan = null;
        if (registration?.team_id || teamId) {
          const teamIdToCheck = registration?.team_id || teamId;
          teamBan = await apiClient.get<{ ban_reason?: string } | null>(
            `/api/tournaments/${tournamentId}/bans?team_id=${teamIdToCheck}`
          ).catch(() => null);
        }

        setEnrollmentStatus({
          isEnrolled: !!registration,
          isBanned: !!(userBan || teamBan),
          teamName: registration?.team_name || undefined,
          banReason: (userBan?.ban_reason || teamBan?.ban_reason) || undefined,
        });
      } catch (error) {
        console.error('Error checking enrollment/ban status:', error);
        setEnrollmentStatus({ isEnrolled: false, isBanned: false });
      } finally {
        setLoadingStatus(false);
      }
    };

    checkStatus();
  }, [user?.id, tournamentId, teamId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Evidence file must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload an image file',
          variant: 'destructive',
        });
        return;
      }
      setEvidenceFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!disputeReason) {
      toast({
        title: 'Reason required',
        description: 'Please select a dispute reason',
        variant: 'destructive',
      });
      return;
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

    if (!user?.id) {
      toast({
        title: 'Authentication required',
        description: 'Please log in to submit a dispute',
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
        const fileExt = evidenceFile.name.split('.').pop();
        // Use temporary path until dispute is created
        // Path structure: temp/{tournament_id}/{dispute_reason}/{user_id}-{timestamp}.{ext}
        const reasonSlug = disputeReason?.toLowerCase().replace(/\s+/g, '_') || 'general';
        const fileName = `temp/${tournamentId}/${reasonSlug}/${user.id}-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('tournaments.disputes.evidence')
          .upload(fileName, evidenceFile, { upsert: false });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('tournaments.disputes.evidence')
          .getPublicUrl(fileName);

        evidenceUrl = urlData.publicUrl;
        setUploading(false);
      }

      // Create dispute (banned users can still submit disputes)
      // Include dispute_reason if column exists, otherwise include it in description
      const disputeData: any = {
        tournament_id: tournamentId,
        match_id: matchId || null,
        raised_by_user_id: user.id,
        team_id: teamId || null,
        title: title.trim(),
        description: disputeReason 
          ? `[Reason: ${DISPUTE_REASONS.find(r => r.value === disputeReason)?.label || disputeReason}]\n\n${description.trim()}`
          : description.trim(),
        evidence_url: evidenceUrl,
        status: 'open',
      };

      // Try to add dispute_reason if column exists (will be ignored if column doesn't exist)
      try {
        disputeData.dispute_reason = disputeReason;
      } catch {
        // Column might not exist yet, that's okay
      }

      const data = await apiClient.post<any>(`/api/matches/${matchId || 'general'}/disputes`, disputeData);

      // Notify organizer or admins based on reason
      try {
        const reasonLabel = DISPUTE_REASONS.find(r => r.value === disputeReason)?.label || disputeReason;
        if (ADMIN_ROUTED_REASONS.includes(disputeReason)) {
          // Cheating / unsportsmanlike / other → notify all admins/moderators
          if (data?.id) {
            await apiClient.post('/api/disputes/notify-admins', {
              dispute_id: data.id,
              type: 'dispute_filed',
              title: 'New Dispute Filed',
              message: `A player filed a dispute in "${tournamentName}" — ${reasonLabel}.`,
              link: '/admin/disputes',
            });
          }
        } else {
          // Organizer-routed: notify the tournament organizer
          const tourneyData = await apiClient.get<{ organizer_id: string; name: string }>(
            `/api/tournaments/${tournamentId}`
          ).catch(() => null);
          if (tourneyData?.organizer_id && data?.id) {
            apiClient.post('/api/notifications', {
              userId: tourneyData.organizer_id,
              type: 'dispute_filed',
              title: 'New Dispute Filed',
              message: `A player filed a dispute in "${tourneyData.name}" — ${reasonLabel}.`,
              link: '/organizer/disputes',
              data: { dispute_id: data.id, tournament_id: tournamentId },
            }).catch(() => {});
          }
        }
      } catch {
        // Non-critical — dispute is created, notification failure is silent
      }

      toast({
        title: 'Dispute submitted',
        description: 'Your dispute has been submitted. Organizers will review it shortly.',
      });

      // Reset form
      setTitle('');
      setDescription('');
      setDisputeReason('');
      setEvidenceFile(null);

      onClose?.();
    } catch (error: any) {
      console.error('Error submitting dispute:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit dispute',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <Card className="bg-[#12121a] border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
      <CardHeader className="space-y-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl text-white">
            <MessageSquare className="h-5 w-5 text-red-400" />
            File a Dispute
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4 text-gray-300" />
            </Button>
          )}
        </div>
        <p className="text-sm text-white/70">
          Help the moderation team understand the problem. Detailed notes and clear evidence result in faster decisions.
          <span className="block mt-1 text-xs text-white/50">
            Note: Bans are tournament-specific. You can appeal your ban by submitting a dispute.
          </span>
        </p>
      </CardHeader>
      <CardContent className="space-y-6 overflow-y-auto flex-1 pr-2">
        {/* Enrollment/Ban Status Banner */}
        {!loadingStatus && enrollmentStatus && (
          <div className={`rounded-lg p-4 border ${
            enrollmentStatus.isBanned 
              ? 'bg-red-500/10 border-red-500/40' 
              : enrollmentStatus.isEnrolled 
                ? 'bg-green-500/10 border-green-500/40'
                : 'bg-yellow-500/10 border-yellow-500/40'
          }`}>
            <div className="flex items-center gap-3">
              {enrollmentStatus.isBanned ? (
                <>
                  <Ban className="w-5 h-5 text-red-400" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-300">You are banned from this tournament</p>
                    {enrollmentStatus.banReason && (
                      <p className="text-xs text-red-200/80 mt-1">Reason: {enrollmentStatus.banReason}</p>
                    )}
                    <p className="text-xs text-red-200/60 mt-1">You can still submit disputes to appeal your ban.</p>
                  </div>
                </>
              ) : enrollmentStatus.isEnrolled ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-300">
                      {enrollmentStatus.teamName ? `Team "${enrollmentStatus.teamName}" is enrolled` : 'You are enrolled'}
                    </p>
                    <p className="text-xs text-green-200/80 mt-1">You can submit disputes related to this tournament.</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-yellow-300">Not enrolled in this tournament</p>
                    <p className="text-xs text-yellow-200/80 mt-1">You can still submit disputes if you have concerns about this tournament.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3 bg-white/5 border border-white/10 rounded-lg p-4">
          {steps.map((step, idx) => (
            <div key={step.title} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-sm text-red-300 font-semibold">
                {idx + 1}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{step.title}</p>
                <p className="text-xs text-white/60">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-white">Tournament</Label>
              <Input
                value={tournamentName}
                disabled
                className="bg-white/5 border-white/20 text-white/70"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Match ID (optional)</Label>
              <Input
                value={matchId ? `Match #${matchId}` : 'N/A'}
                disabled
                className="bg-white/5 border-white/20 text-white/70"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">
              Dispute Reason <span className="text-red-400">*</span>
            </Label>
            <Select value={disputeReason} onValueChange={setDisputeReason}>
              <SelectTrigger className="bg-white/5 border-white/20 text-white hover:bg-white/10">
                <SelectValue placeholder="Select a reason for your dispute" />
              </SelectTrigger>
              <SelectContent className="bg-[#12121a] border-white/10">
                {DISPUTE_REASONS.map((reason) => (
                  <SelectItem 
                    key={reason.value} 
                    value={reason.value}
                    className="text-white hover:bg-white/10 focus:bg-white/10"
                  >
                    {reason.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {disputeReason === 'ban_appeal' && enrollmentStatus?.isBanned && (
              <p className="text-xs text-yellow-300 mt-1">
                ⚠️ Include details about why you believe the ban was incorrect or should be lifted.
              </p>
            )}
          </div>

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

          <div className="space-y-3">
            <Label className="text-white">Evidence (optional)</Label>
            <div className="relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-6 text-sm text-white/60 bg-white/5 hover:border-red-500/50 hover:text-red-300 transition cursor-pointer border-white/20">
              <input
                type="file"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={handleFileChange}
                accept="image/*"
              />
              <Paperclip className="h-6 w-6 mb-3 text-red-400" />
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
        </div>

        <div className="rounded-xl bg-yellow-500/10 border border-yellow-500/30 p-4 flex gap-3 text-sm text-yellow-100">
          <ShieldAlert className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Good sportsmanship</p>
            <p>
              Disputes with missing context or falsified evidence slow down admins. Repeated abuse of disputes can lead
              to penalties.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {onClose && (
            <Button 
              variant="ghost" 
              onClick={onClose} 
              className="text-white/70 hover:text-white hover:bg-white/10 w-full sm:w-auto border border-white/20"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSubmit}
            disabled={submitting || uploading || !title.trim() || !description.trim() || !disputeReason}
            className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <>
                <Upload className="w-4 h-4 animate-spin" />
                Uploading…
              </>
            ) : submitting ? (
              <>
                <MessageSquare className="w-4 h-4 animate-pulse" />
                Submitting…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Submit Dispute
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DisputeSubmission;

