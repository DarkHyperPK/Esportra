import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Mail, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useRequireVerification } from '@/hooks/useRequireVerification';
import { useInvitationPreview, useTournamentInvitations } from '@/hooks/useTournamentInvitations';
import { useEligibleCaptainTeams } from '@/hooks/useEligibleCaptainTeams';
import { getApiErrorMessage } from '@/lib/apiClient';
import { normalizeInviteCode, isLikelyInviteCode } from '@/utils/inviteCodeUtils';
import type { InvitationPreview, RedeemInvitationResponse } from '@/types/invitation';

export interface InviteRedemptionTournament {
  id: string;
  slug?: string | null;
  name: string;
  game: string;
  game_mode?: string | null;
  gameMode?: string | null;
  team_size?: number;
  status?: string;
}

interface InviteCodeRedemptionProps {
  tournament?: InviteRedemptionTournament | null;
  initialCode?: string;
  compact?: boolean;
  showTitle?: boolean;
  returnPath?: string;
  onSuccess?: (result: RedeemInvitationResponse) => void | Promise<void>;
}

function mapPreviewErrorMessage(preview: InvitationPreview | null | undefined): string | null {
  if (!preview) return null;
  if (preview.message) return preview.message;
  if (!preview.emailMatch) return 'This code is locked to another email address.';
  if (preview.status === 'redeemed') return 'This invitation has already been used.';
  if (preview.status === 'revoked') return 'This invitation was revoked by the organizer.';
  if (preview.status === 'draft') return 'This invitation has not been sent yet.';
  if (preview.status === 'expired') return 'This invitation has expired. Ask the organizer to resend it.';
  if (preview.status === 'not_found') return 'Invitation code was not found.';
  return null;
}

const InviteCodeRedemption: React.FC<InviteCodeRedemptionProps> = ({
  tournament,
  initialCode = '',
  compact = false,
  showTitle = true,
  returnPath,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const requireVerification = useRequireVerification();
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);

  const normalizedCode = useMemo(() => normalizeInviteCode(inviteCode), [inviteCode]);
  const canPreview = Boolean(user && isLikelyInviteCode(normalizedCode));

  const { redeemCode } = useTournamentInvitations(undefined, { list: false });
  const previewQuery = useInvitationPreview(normalizedCode, canPreview);
  const preview = previewQuery.data;

  const previewTournament = useMemo<InviteRedemptionTournament | null>(() => {
    if (tournament) return tournament;
    if (!preview?.tournamentId || !preview.tournamentName) return null;
    return {
      id: preview.tournamentId,
      slug: preview.tournamentSlug,
      name: preview.tournamentName,
      game: preview.tournamentGame || '',
      game_mode: preview.tournamentGameMode,
      team_size: preview.tournamentTeamSize ?? undefined,
      status: preview.tournamentStatus ?? undefined,
    };
  }, [preview, tournament]);

  const isSoloInvite = (previewTournament?.team_size ?? preview?.tournamentTeamSize ?? 2) === 1;

  const {
    captainTeams,
    eligibleTeamIds,
    ineligibleReasons,
    selectedTeamId,
    setSelectedTeamId,
    teamRosters,
    selectedRosterId,
    setSelectedRosterId,
    fetchingTeams,
    requiresExplicitTeamSelection,
  } = useEligibleCaptainTeams({
    tournament: {
      game: previewTournament?.game || tournament?.game || '',
      game_mode: previewTournament?.game_mode ?? tournament?.game_mode,
      gameMode: previewTournament?.gameMode ?? tournament?.gameMode,
      team_size: previewTournament?.team_size ?? tournament?.team_size,
    },
    userId: user?.id,
    enabled: Boolean(user && preview?.canRedeem && previewTournament && !isSoloInvite),
  });

  useEffect(() => {
    if (initialCode) setInviteCode(initialCode);
  }, [initialCode]);

  useEffect(() => {
    setPreviewError(mapPreviewErrorMessage(preview));
    setAlreadyRegistered(false);
    setSubmitError(null);
  }, [preview]);

  const signInHref = useMemo(() => {
    const path = returnPath || (typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.search}`
      : '/invitations/redeem');
    return `/auth/signin?redirect=${encodeURIComponent(path)}`;
  }, [returnPath]);

  const handleRedeem = async () => {
    setSubmitError(null);
    setAlreadyRegistered(false);

    if (!user) return;
    if (!requireVerification()) return;

    if (!isLikelyInviteCode(normalizedCode)) {
      setSubmitError('Enter a valid invitation code from your email.');
      return;
    }

    if (!preview?.canRedeem) {
      setSubmitError(previewError || 'This invitation cannot be redeemed right now.');
      return;
    }

    if (!isSoloInvite) {
      if (captainTeams.length === 0) {
        setSubmitError('Create a team and return here to redeem your invitation.');
        return;
      }

      if (!selectedTeamId || !eligibleTeamIds.has(selectedTeamId)) {
        setSubmitError('Select an eligible team before redeeming this invitation.');
        return;
      }

      if (!selectedRosterId) {
        setSubmitError('Select a roster that matches this tournament.');
        return;
      }
    }

    try {
      const result = await redeemCode.mutateAsync(
        isSoloInvite
          ? { code: normalizedCode }
          : {
              code: normalizedCode,
              teamId: selectedTeamId,
              rosterId: selectedRosterId,
            },
      );

      toast({
        title: 'Invitation redeemed',
        description: isSoloInvite
          ? 'You have joined this tournament with your invited player slot.'
          : 'Your team has joined this tournament.',
      });

      if (onSuccess) {
        await onSuccess(result);
      } else {
        const slug = result.tournamentSlug || previewTournament?.slug;
        if (slug) navigate(`/tournaments/${slug}`);
      }
    } catch (error: unknown) {
      const message = getApiErrorMessage(
        error,
        isSoloInvite
          ? 'Check that the code belongs to your email and that registration is still open.'
          : 'Check that the code belongs to your email and that you are a team captain.',
      );
      if (message.toLowerCase().includes('already registered')) {
        setAlreadyRegistered(true);
      }
      setSubmitError(message);
    }
  };

  const showTeamSelection = Boolean(user && preview?.canRedeem && previewTournament && !isSoloInvite);
  const redeemDisabled = redeemCode.isPending
    || previewQuery.isLoading
    || !preview?.canRedeem
    || (!isSoloInvite && (
      fetchingTeams
      || !selectedTeamId
      || !selectedRosterId
      || !eligibleTeamIds.has(selectedTeamId)
    ));

  const content = (
    <div className="space-y-4">
      {!user && (
        <Alert className="border-amber-500/20 bg-amber-500/10">
          <AlertDescription className="text-amber-100">
            Sign in with the email address that received this invitation.
            <div className="mt-3">
              <Button asChild className="bg-white text-black hover:bg-white/90">
                <Link to={signInHref}>Sign in to redeem</Link>
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="invite-code-input" className="text-sm text-gray-400">Invitation code</Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="invite-code-input"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                void handleRedeem();
              }
            }}
            placeholder="XKDL-MQP2"
            disabled={!user || redeemCode.isPending}
            className="border-white/10 bg-black/40 font-mono tracking-widest text-white"
          />
          <Button
            type="button"
            onClick={() => void handleRedeem()}
            disabled={!user || redeemDisabled}
            className="bg-white text-black hover:bg-white/90 font-mono text-xs font-bold uppercase tracking-wider"
          >
            {redeemCode.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Join with Code
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          {isSoloInvite
            ? 'Codes are locked to your account email. This invite is for your player slot.'
            : 'Codes are locked to your account email and can only be redeemed by a team captain.'}
        </p>
      </div>

      {previewQuery.isLoading && canPreview && (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking invitation...
        </div>
      )}

      {preview?.canRedeem && previewTournament && (
        <Alert className="border-emerald-500/20 bg-emerald-500/10">
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          <AlertDescription className="text-emerald-100">
            Valid invitation for <span className="font-semibold">{previewTournament.name}</span>
            {preview.expiresAt ? ` · expires ${new Date(preview.expiresAt).toLocaleDateString()}` : ''}.
            {isSoloInvite
              ? ' Invited players join with guaranteed slots and do not require entry-fee payment.'
              : ' Invited teams join with guaranteed slots and do not require entry-fee payment.'}
          </AlertDescription>
        </Alert>
      )}

      {previewError && !previewQuery.isLoading && (
        <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{previewError}</AlertDescription>
        </Alert>
      )}

      {showTeamSelection && (
        <div className="space-y-4 rounded-none border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <Users className="h-4 w-4 text-rose-300" />
            Choose the team joining this tournament
          </div>

          {fetchingTeams ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your captain teams...
            </div>
          ) : captainTeams.length === 0 ? (
            <div className="space-y-3 text-sm text-gray-400">
              <p>You need an active team where you are captain before redeeming this invitation.</p>
              <Button asChild variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Link to={`/player/teams?redirect=${encodeURIComponent(returnPath || '/invitations/redeem')}`}>
                  Create a team
                </Link>
              </Button>
            </div>
          ) : (
            <>
              {requiresExplicitTeamSelection && (
                <p className="text-xs text-amber-300">You captain multiple teams. Pick which team should use this invite.</p>
              )}

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-gray-500">Team</Label>
                <Select value={selectedTeamId || undefined} onValueChange={setSelectedTeamId}>
                  <SelectTrigger className="border-white/10 bg-black/30 text-white">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {captainTeams.map((team) => {
                      const eligible = eligibleTeamIds.has(team.id);
                      const reasons = ineligibleReasons[team.id] || [];
                      return (
                        <SelectItem key={team.id} value={team.id} disabled={!eligible}>
                          {team.name}{!eligible && reasons[0] ? ` — ${reasons[0]}` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-widest text-gray-500">Roster</Label>
                <Select value={selectedRosterId || undefined} onValueChange={setSelectedRosterId}>
                  <SelectTrigger className="border-white/10 bg-black/30 text-white">
                    <SelectValue placeholder="Select roster" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamRosters.map((roster) => (
                      <SelectItem key={roster.id} value={roster.id}>
                        {roster.name} · {roster.game}{roster.format ? ` · ${roster.format}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTeamId && teamRosters.length === 0 && (
                  <p className="text-xs text-amber-300">No eligible roster found for this tournament. Create one in Team Management.</p>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {submitError && (
        <Alert variant="destructive" className="border-red-500/20 bg-red-500/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <p>{submitError}</p>
            {alreadyRegistered && previewTournament?.slug && (
              <Button
                type="button"
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                onClick={() => navigate(`/tournaments/${previewTournament.slug}`)}
              >
                View tournament registration
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  if (compact) {
    return content;
  }

  return (
    <Card className="mx-auto max-w-3xl border border-purple-500/20 bg-[#0d0d10] shadow-2xl shadow-purple-950/20">
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Mail className="h-5 w-5 text-purple-300" />
            Redeem tournament invitation
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={showTitle ? '' : 'pt-6'}>
        {content}
      </CardContent>
    </Card>
  );
};

export default InviteCodeRedemption;
