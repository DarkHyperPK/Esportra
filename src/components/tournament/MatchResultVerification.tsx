import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DangerButton, GhostButton, SuccessButton } from '@/components/ui/app-buttons';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button-variants';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Swords, CheckCircle2, AlertCircle, Check, ShieldAlert, Clock, ImagePlus, X as XIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { getApiErrorMessage } from '@/lib/apiClient';
import { useMatchResultReport } from '@/hooks/useMatchResultReport';
import { FullScoreboard } from './FullScoreboard';
import EntityAvatar from '@/components/ui/EntityAvatar';
import { competitorIdsMatch } from '@/utils/competitorId';

interface MatchResultVerificationProps {
  matchId: string;
  gameNumber: number;
  userTeamId?: string;
  team1Id?: string;
  team2Id?: string;
  team1Name?: string;
  team2Name?: string;
  team1Logo?: string;
  team2Logo?: string;
  isCaptain?: boolean;
  /** When set, overrides isCaptain — should match backend GetUserCompetitorIdInMatch. */
  canVerify?: boolean;
  subscribeRealtime?: boolean;
  onSuccess?: () => void;
}

export const MatchResultVerification: React.FC<MatchResultVerificationProps> = ({
  matchId,
  gameNumber,
  userTeamId,
  team1Id,
  team2Id,
  team1Name = 'Team 1',
  team2Name = 'Team 2',
  team1Logo,
  team2Logo,
  isCaptain = true,
  canVerify,
  subscribeRealtime = true,
  onSuccess,
}) => {
  const {
    activeReport,
    acceptedReport,
    isMyReport,
    acceptReport,
    disputeReport,
  } = useMatchResultReport(matchId, gameNumber, { subscribeRealtime });
  const { toast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeEvidenceFile, setDisputeEvidenceFile] = useState<File | null>(null);
  const [disputeEvidencePreview, setDisputeEvidencePreview] = useState<string | null>(null);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (!activeReport) return;
    setSubmitting(true);
    setAcceptError(null);
    try {
      await acceptReport.mutateAsync({
        reportId: activeReport.id,
        gameNumber: activeReport.game_number,
        riotMatchId: activeReport.riot_match_id,
        mapId: activeReport.map_id || undefined,
      });
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setAcceptError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvidenceSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setDisputeEvidenceFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setDisputeEvidencePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setDisputeEvidencePreview(null);
    }
  };

  const handleDispute = async () => {
    if (!activeReport || !userTeamId) return;
    try {
      await disputeReport.mutateAsync({
        reportId: activeReport.id,
        reason: disputeReason || 'Result does not match our records.',
        teamId: userTeamId,
        evidenceFile: disputeEvidenceFile,
      });
      setDisputeOpen(false);
      setDisputeReason('');
      setDisputeEvidenceFile(null);
      setDisputeEvidencePreview(null);
    } catch (err: unknown) {
      toast({
        title: 'Dispute failed',
        description: getApiErrorMessage(err, { context: 'dispute' }),
        variant: 'destructive',
      });
    }
  };

  if (acceptedReport) {
    return (
      <Card className="bg-black border-zinc-800 overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-zinc-900/50 p-4 border-b border-zinc-800">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Game {acceptedReport.game_number} — Result Verified
            </h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
              <div className="text-center py-2">
                <p className="text-sm font-black text-white uppercase tracking-widest mb-6">
                  {acceptedReport.map_name || 'MAP'}
                </p>
                <div className="flex items-center justify-center gap-8">
                  <div className="flex flex-col items-center">
                    <div className="mb-2">
                      <EntityAvatar
                        src={team1Logo}
                        name={team1Name}
                        entityId={team1Id}
                        type="team"
                        size="w-12 h-12 rounded-lg"
                      />
                    </div>
                    <p className="text-xs text-zinc-500 mb-2">{team1Name}</p>
                    <p className="text-3xl font-black font-mono text-emerald-500">
                      {acceptedReport.team1_score}
                    </p>
                  </div>
                  <span className="text-zinc-600 text-lg flex items-center h-full pt-16">—</span>
                  <div className="flex flex-col items-center">
                    <div className="mb-2">
                      <EntityAvatar
                        src={team2Logo}
                        name={team2Name}
                        entityId={team2Id}
                        type="team"
                        size="w-12 h-12 rounded-lg"
                      />
                    </div>
                    <p className="text-xs text-zinc-500 mb-2">{team2Name}</p>
                    <p className="text-3xl font-black font-mono text-rose-500">
                      {acceptedReport.team2_score}
                    </p>
                  </div>
                </div>
              </div>
              <div className="text-center mt-6">
                <p className="text-xs text-zinc-500">
                  Verified {acceptedReport.responded_at ? format(new Date(acceptedReport.responded_at), 'MMM d, h:mm a') : ''}
                </p>
              </div>
            </div>

            {acceptedReport.match_data?.players && (
              <div className="space-y-3">
                <GhostButton
                  type="button"
                  size="sm"
                  onClick={() => setShowScoreboard(!showScoreboard)}
                  className="w-full h-8 text-[10px] font-black uppercase tracking-widest"
                >
                  <Swords className="w-3 h-3 mr-2" />
                  {showScoreboard ? 'Hide Scoreboard' : 'View Full Scoreboard'}
                </GhostButton>

                <AnimatePresence>
                  {showScoreboard && (
                    <motion.div
                      initial={{ opacity: 0, gridTemplateRows: '0fr' }}
                      animate={{ opacity: 1, gridTemplateRows: '1fr' }}
                      exit={{ opacity: 0, gridTemplateRows: '0fr' }}
                      transition={{ duration: 0.2 }}
                      style={{ display: 'grid', overflow: 'hidden' }}
                    >
                      <div style={{ minHeight: 0, overflow: 'auto' }}>
                        <FullScoreboard
                          players={acceptedReport.match_data.players}
                          team1Name={team1Name}
                          team2Name={team2Name}
                          team1Score={acceptedReport.team1_score}
                          team2Score={acceptedReport.team2_score}
                          reporterSide={acceptedReport.match_data.reporterSide}
                          reportedByTeamId={acceptedReport.reported_by_team_id}
                          team1Id={team1Id}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activeReport) {
    return null;
  }

  const isMatchParticipant = Boolean(
    userTeamId
    && (competitorIdsMatch(userTeamId, team1Id) || competitorIdsMatch(userTeamId, team2Id)),
  );
  const isOnReportingSide = Boolean(
    userTeamId
    && activeReport.reported_by_team_id
    && competitorIdsMatch(userTeamId, activeReport.reported_by_team_id),
  );
  const isOwnSideReport = isMyReport || isOnReportingSide;
  const showVerifyActions = !isOwnSideReport
    && (canVerify ?? isMatchParticipant ?? isCaptain);

  return (
    <Card className="bg-black border-zinc-800 overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-zinc-900/50 p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Swords className="w-4 h-4 text-zinc-400" />
              Game {activeReport.game_number} — Result Reported
            </h3>
            <span className="text-xs text-zinc-500">
              {format(new Date(activeReport.created_at), 'MMM d, h:mm a')}
            </span>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="p-4 bg-zinc-900/30 border border-zinc-800 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-zinc-400 font-medium uppercase tracking-wider">
                {isMyReport ? 'Your Report' : 'Opponent Reported'}
              </span>
            </div>
            <div className="text-center py-2">
              <p className="text-sm font-black text-white uppercase tracking-widest mb-6">
                {activeReport.map_name || 'MAP'}
              </p>
              <div className="flex items-center justify-center gap-8">
                <div className="flex flex-col items-center">
                  <div className="mb-2">
                    <EntityAvatar
                      src={team1Logo}
                      name={team1Name}
                      entityId={team1Id}
                      type="team"
                      size="w-12 h-12 rounded-lg"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mb-2">{team1Name}</p>
                  <p className="text-3xl font-black font-mono text-emerald-500">
                    {activeReport.team1_score}
                  </p>
                </div>
                <span className="text-zinc-600 text-lg flex items-center h-full pt-16">—</span>
                <div className="flex flex-col items-center">
                  <div className="mb-2">
                    <EntityAvatar
                      src={team2Logo}
                      name={team2Name}
                      entityId={team2Id}
                      type="team"
                      size="w-12 h-12 rounded-lg"
                    />
                  </div>
                  <p className="text-xs text-zinc-500 mb-2">{team2Name}</p>
                  <p className="text-3xl font-black font-mono text-rose-500">
                    {activeReport.team2_score}
                  </p>
                </div>
              </div>
              {activeReport.match_data?.players && (
                <div className="mt-4 pt-4 border-t border-blue-500/10">
                  <GhostButton
                    type="button"
                    size="sm"
                    onClick={() => setShowScoreboard(!showScoreboard)}
                    className="w-full h-8 text-[10px] font-black uppercase tracking-widest"
                  >
                    <Swords className="w-3 h-3 mr-2" />
                    {showScoreboard ? 'Hide Scoreboard' : 'View Full Scoreboard'}
                  </GhostButton>

                  <AnimatePresence>
                    {showScoreboard && (
                      <motion.div
                        initial={{ opacity: 0, gridTemplateRows: '0fr' }}
                        animate={{ opacity: 1, gridTemplateRows: '1fr' }}
                        exit={{ opacity: 0, gridTemplateRows: '0fr' }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'grid', overflow: 'hidden' }}
                        className="mt-2"
                      >
                        <div style={{ minHeight: 0, overflow: 'auto' }}>
                          <FullScoreboard
                            players={activeReport.match_data.players}
                            team1Name={team1Name}
                            team2Name={team2Name}
                            team1Score={activeReport.team1_score}
                            team2Score={activeReport.team2_score}
                            reporterSide={activeReport.match_data.reporterSide}
                            reportedByTeamId={activeReport.reported_by_team_id}
                            team1Id={team1Id}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {activeReport.screenshot_urls && Array.isArray(activeReport.screenshot_urls) && activeReport.screenshot_urls.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Evidence Screenshots</p>
              <div className="grid grid-cols-2 gap-2">
                {activeReport.screenshot_urls.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="block relative aspect-video bg-black/40 rounded-lg border border-zinc-800 overflow-hidden group hover:border-zinc-600 transition-colors">
                    <img src={url} loading="lazy" alt={`Evidence ${i + 1}`} className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-white text-xs font-medium">View Full Image</span>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {activeReport.comment && (
            <div className="p-3 bg-zinc-900/30 border border-zinc-800 rounded-lg">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Comment</p>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{activeReport.comment}</p>
            </div>
          )}

          {isOwnSideReport ? (
            <div className="text-center p-3 bg-zinc-800/50 rounded-lg">
              <Clock className="w-5 h-5 text-zinc-400 mx-auto mb-1 animate-pulse" />
              <p className="text-zinc-400 text-sm">Waiting for opponent to verify...</p>
            </div>
          ) : showVerifyActions ? (
            <div className="space-y-2">
              {acceptError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-xs">
                  {acceptError}
                </div>
              )}
              <SuccessButton
                type="button"
                onClick={handleAccept}
                disabled={acceptReport.isPending || submitting}
                className="w-full active:scale-[0.98] transition-transform duration-75"
              >
                {acceptReport.isPending || submitting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Accept Result
              </SuccessButton>
              <DangerButton
                onClick={() => setDisputeOpen(true)}
                className="w-full active:scale-[0.98] transition-transform duration-75"
              >
                <ShieldAlert className="w-4 h-4 mr-2" />
                Dispute Result
              </DangerButton>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <p className="text-sm text-amber-400">
                Only match participants can verify results.
              </p>
            </div>
          )}
        </div>
      </CardContent>

      <Dialog open={disputeOpen} onOpenChange={(open: boolean) => {
        setDisputeOpen(open);
        if (!open) { setDisputeEvidenceFile(null); setDisputeEvidencePreview(null); setDisputeReason(''); }
      }}>
        <DialogContent className="bg-zinc-900 border border-zinc-700 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-400" />
              Dispute Result
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will be escalated to the tournament organizer for resolution.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-zinc-300">
                Reported: <strong>{activeReport.map_name}</strong> — {activeReport.team1_score} to {activeReport.team2_score}
              </p>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-400">Reason for dispute</label>
              <Textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Explain why the reported result is incorrect..."
                className="bg-zinc-800 border-zinc-700 text-white"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-zinc-400">Attach screenshot (optional)</label>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                id="dispute-evidence-input-verification"
                onChange={handleEvidenceSelect}
              />
              {disputeEvidencePreview ? (
                <div className="relative rounded-lg overflow-hidden border border-zinc-700">
                  <img
                    src={disputeEvidencePreview}
                    alt="Evidence preview"
                    className="w-full max-h-40 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => { setDisputeEvidenceFile(null); setDisputeEvidencePreview(null); }}
                    className="absolute top-2 right-2 p-1 rounded-full bg-black/70 hover:bg-black text-white transition-colors"
                  >
                    <XIcon className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label
                  htmlFor="dispute-evidence-input-verification"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors text-sm"
                >
                  <ImagePlus className="w-4 h-4 shrink-0" />
                  Click to attach a screenshot
                </label>
              )}
            </div>

            <div className="flex gap-2">
              <DangerButton
                onClick={handleDispute}
                disabled={disputeReport.isPending}
                className="flex-1"
              >
                {disputeReport.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
                ) : 'File Dispute'}
              </DangerButton>
              <Button
                variant="ghost"
                onClick={() => setDisputeOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
