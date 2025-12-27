import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/contexts/RoleContext';
import { useTournamentBracket } from '@/hooks/useTournamentBracket';
import {
  CheckCircle,
  XCircle,
  Eye,
  Camera,
  Map as MapIcon
} from 'lucide-react';
import SingleEliminationBracketCustom, { BracketMatch } from '@/components/bracket/SingleEliminationBracketCustom';
import DoubleEliminationBracket from '@/components/bracket/DoubleEliminationBracket';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MapVeto } from '@/components/tournament/MapVeto';

interface Team {
  id: string;
  name: string;
  tag?: string;
  logo_url?: string;
  members?: any[];
}

interface Match {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  team1_score?: number;
  team2_score?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'disputed';
  scheduled_time?: string;
  winner_id?: string;
  created_at: string;
  updated_at: string;
  team1?: Team;
  team2?: Team;
  winner?: Team;
}

interface MatchResult {
  id: string;
  match_id: string;
  reported_by: string;
  team1_score: number;
  team2_score: number;
  screenshots: string[];
  status: 'pending' | 'verified' | 'rejected';
  verification_notes?: string;
  created_at: string;
  verified_by?: string;
  verified_at?: string;
}

interface TournamentBracketProps {
  tournamentId: string;
  isOrganizer: boolean;
  onBracketUpdate?: () => void;
}

const TournamentBracket: React.FC<TournamentBracketProps> = ({
  tournamentId,
  isOrganizer,
  onBracketUpdate
}) => {
  const { user } = useAuth();
  const { canReportScores, canVerifyResults } = useRole();
  const { toast } = useToast();

  const {
    matches,
    matchResults,
    stages,
    currentStage,
    selectedStageId,
    setSelectedStageId,
    loading,
    error,
    generateBracket,
    reportMatchScore,
    verifyMatchResult
  } = useTournamentBracket(tournamentId);

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [showVetoDialog, setShowVetoDialog] = useState(false);
  const [pendingResult, setPendingResult] = useState<MatchResult | null>(null);

  // Score reporting form
  const [team1Score, setTeam1Score] = useState('');
  const [team2Score, setTeam2Score] = useState('');
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Verification form
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'verified' | 'rejected'>('verified');



  const handleReportScore = async () => {
    if (!selectedMatch || !user) return;

    try {
      setSubmitting(true);
      await reportMatchScore({
        matchId: selectedMatch.id,
        team1Score: parseInt(team1Score),
        team2Score: parseInt(team2Score),
        screenshots
      });

      toast({
        title: 'Score Reported',
        description: 'Match result submitted for verification',
        variant: 'default',
      });

      setShowScoreDialog(false);
      setTeam1Score('');
      setTeam2Score('');
      setScreenshots([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to report match score',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyResult = async () => {
    if (!pendingResult) return;

    try {
      setSubmitting(true);
      await verifyMatchResult({
        resultId: pendingResult.id,
        status: verificationStatus as 'verified' | 'rejected',
        notes: verificationNotes
      });

      toast({
        title: 'Result Verified',
        description: `Match result ${verificationStatus}`,
        variant: 'default',
      });

      setShowVerificationDialog(false);
      setPendingResult(null);
      setVerificationNotes('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to verify match result',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getMatchResult = (matchId: string) => {
    return matchResults.find(result => result.match_id === matchId);
  };

  const canReportScore = (match: Match) => {
    if (!user || !canReportScores) return false;
    if (match.status === 'completed') return false;

    // Check if user is captain of either team
    const isTeam1Captain = match.team1?.members?.some(member =>
      member.user_id === user.id && member.role === 'captain'
    );
    const isTeam2Captain = match.team2?.members?.some(member =>
      member.user_id === user.id && member.role === 'captain'
    );

    return isTeam1Captain || isTeam2Captain;
  };

  const canVeto = (match: Match) => {
    if (!user) return false;
    if (match.status === 'completed') return false;

    // Check stage config for veto enabled
    const vetoEnabled = (currentStage?.config as any)?.veto?.enabled;
    if (!vetoEnabled) return false;

    // Check if user is captain or organizer
    const isTeam1Captain = match.team1?.members?.some(m => m.user_id === user.id && m.role === 'captain');
    const isTeam2Captain = match.team2?.members?.some(m => m.user_id === user.id && m.role === 'captain');

    return isTeam1Captain || isTeam2Captain || isOrganizer;
  };

  // Transform API matches to BracketMatch format
  const bracketMatches: (BracketMatch & { bracket_side?: string })[] = matches.map(m => ({
    id: m.id,
    match_number: m.match_number,
    round: m.round,
    status: m.status,
    winner_id: m.winner_id,
    team1_id: m.team1_id,
    team2_id: m.team2_id,
    bracket_side: m.bracket_side,
    team1: m.team1 ? {
      id: m.team1.id,
      name: m.team1.name,
      logo: m.team1.logo_url,
      score: m.team1_score,
      isWinner: m.winner_id === m.team1.id
    } : null,
    team2: m.team2 ? {
      id: m.team2.id,
      name: m.team2.name,
      logo: m.team2.logo_url,
      score: m.team2_score,
      isWinner: m.winner_id === m.team2.id
    } : null
  }));

  // Find user's team ID to auto-expand their matches
  const userTeamId = matches.find(m =>
    (m.team1 as any)?.members?.some((mem: any) => mem.user_id === user?.id) ||
    (m.team2 as any)?.members?.some((mem: any) => mem.user_id === user?.id)
  ) ? (matches.find(m => (m.team1 as any)?.members?.some((mem: any) => mem.user_id === user?.id))?.team1_id)
    : matches.find(m => (m.team2 as any)?.members?.some((mem: any) => mem.user_id === user?.id))?.team2_id;

  const handleMatchAction = (matchId: string) => {
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    if (isOrganizer && canVerifyResults) {
      const result = getMatchResult(matchId);
      if (result && result.status === 'pending') {
        setSelectedMatch(match as any);
        setPendingResult(result as any);
        setShowVerificationDialog(true);
        return;
      }
    }

    if (canReportScore(match) && match.status === 'pending') {
      setSelectedMatch(match as any);
      setShowScoreDialog(true);
    }
  };

  const renderMatchActions = (match: BracketMatch) => {
    const originalMatch = matches.find(m => m.id === match.id);
    if (!originalMatch) return null;

    const actions = [];
    const isPending = originalMatch.status === 'pending';
    const isCompleted = originalMatch.status === 'completed';

    // Verify Result (Organizer)
    if (isOrganizer && canVerifyResults) {
      const result = getMatchResult(match.id);
      if (result && result.status === 'pending') {
        actions.push(
          <Button
            key="verify"
            size="sm"
            variant="default"
            className="w-full bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => {
              setSelectedMatch(originalMatch as any);
              setPendingResult(result as any);
              setShowVerificationDialog(true);
            }}
          >
            <CheckCircle className="w-3 h-3 mr-2" />
            Verify Result
          </Button>
        );
      }
    }

    // Veto (Captains/Organizer)
    if (canVeto(originalMatch) && !isCompleted) {
      actions.push(
        <Button
          key="veto"
          size="sm"
          variant="outline"
          className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
          onClick={() => {
            setSelectedMatch(originalMatch as any);
            setShowVetoDialog(true);
          }}
        >
          <MapIcon className="w-3 h-3 mr-2" />
          Map Veto
        </Button>
      );
    }

    // Report Score (Captains)
    if (canReportScore(originalMatch) && isPending) {
      actions.push(
        <Button
          key="report"
          size="sm"
          variant="outline"
          className="w-full border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10"
          onClick={() => {
            setSelectedMatch(originalMatch as any);
            setShowScoreDialog(true);
          }}
        >
          <Camera className="w-3 h-3 mr-2" />
          Report Score
        </Button>
      );
    }

    if (actions.length === 0) {
      return (
        <Button
          size="sm"
          variant="ghost"
          className="w-full text-xs text-gray-500"
          disabled
        >
          No actions available
        </Button>
      );
    }

    return <div className="flex flex-col gap-2 w-full">{actions}</div>;
  };

  const getMatchActionLabel = (match: BracketMatch) => {
    // This is a fallback if renderMatchActions is not used or supported
    const originalMatch = matches.find(m => m.id === match.id);
    if (!originalMatch) return 'View Details';

    if (isOrganizer && canVerifyResults) {
      const result = getMatchResult(match.id);
      if (result && result.status === 'pending') return 'Verify Result';
    }

    if (canReportScore(originalMatch) && originalMatch.status === 'pending') {
      return 'Report Score';
    }

    return 'View Details';
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700/50 rounded w-1/3"></div>
          <div className="h-8 bg-gray-700/50 rounded"></div>
          <div className="h-4 bg-gray-700/50 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bracket Header */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Tournament Bracket</h3>
          {/* Generate Bracket button removed as it is now handled in Stage Management */}
        </div>

        {matches.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 mb-2">Bracket not generated yet.</p>
            {isOrganizer && (
              <p className="text-sm text-gray-500">
                Go to the <strong>Stages</strong> tab to generate the bracket for this stage.
              </p>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-400">
            {matches.length} matches across {Math.max(...matches.map(m => m.round), 0)} rounds
          </div>
        )}
      </div>

      {/* Stage Selection Tabs */}
      {stages.length > 1 && (
        <Tabs value={selectedStageId} onValueChange={setSelectedStageId} className="mb-8">
          <TabsList className="bg-gray-800 border border-gray-700">
            {stages.map((stage: any) => (
              <TabsTrigger
                key={stage.id}
                value={stage.id}
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                {stage.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Bracket Visualization */}
      {matches.length > 0 && currentStage && (
        currentStage.format === 'double_elimination' ? (
          <DoubleEliminationBracket
            matches={bracketMatches}
            userTeamId={userTeamId}
            onMatchAction={handleMatchAction}
            getMatchActionLabel={getMatchActionLabel}
            renderMatchActions={renderMatchActions}
          />
        ) : (
          <SingleEliminationBracketCustom
            matches={bracketMatches}
            userTeamId={userTeamId}
            onMatchAction={handleMatchAction}
            getMatchActionLabel={getMatchActionLabel}
            renderMatchActions={renderMatchActions}
          />
        )
      )}

      {/* Score Reporting Dialog */}
      <Dialog open={showScoreDialog} onOpenChange={setShowScoreDialog}>
        <DialogContent className="bg-gray-900 border border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Report Match Score</DialogTitle>
            <DialogDescription className="text-gray-400">
              Report the final score for {selectedMatch?.team1?.name} vs {selectedMatch?.team2?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="team1Score" className="text-white">{selectedMatch?.team1?.name}</Label>
                <Input
                  id="team1Score"
                  type="number"
                  value={team1Score}
                  onChange={(e) => setTeam1Score(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Score"
                />
              </div>
              <div>
                <Label htmlFor="team2Score" className="text-white">{selectedMatch?.team2?.name}</Label>
                <Input
                  id="team2Score"
                  type="number"
                  value={team2Score}
                  onChange={(e) => setTeam2Score(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Score"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="screenshots" className="text-white">Screenshots (Proof)</Label>
              <Input
                id="screenshots"
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setScreenshots(Array.from(e.target.files || []))}
                className="bg-gray-800 border-gray-600 text-white"
              />
              <p className="text-sm text-gray-400 mt-1">
                Upload screenshots of the final scoreboard as proof
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowScoreDialog(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleReportScore}
              disabled={submitting || !team1Score || !team2Score}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {submitting ? 'Reporting...' : 'Report Score'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verification Dialog */}
      <Dialog open={showVerificationDialog} onOpenChange={setShowVerificationDialog}>
        <DialogContent className="bg-gray-900 border border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Verify Match Result</DialogTitle>
            <DialogDescription className="text-gray-400">
              Review the reported score and screenshots for {selectedMatch?.team1?.name} vs {selectedMatch?.team2?.name}
            </DialogDescription>
          </DialogHeader>

          {pendingResult && (
            <div className="space-y-4">
              {/* Reported Score */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Reported Score</h4>
                <div className="flex items-center justify-between">
                  <div className="text-white">
                    {selectedMatch?.team1?.name}: {pendingResult.team1_score}
                  </div>
                  <div className="text-white">
                    {selectedMatch?.team2?.name}: {pendingResult.team2_score}
                  </div>
                </div>
              </div>

              {/* Screenshots */}
              {pendingResult.screenshots.length > 0 && (
                <div>
                  <h4 className="font-semibold text-white mb-2">Screenshots</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {pendingResult.screenshots.map((screenshot, index) => (
                      <img
                        key={index}
                        src={screenshot}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-32 object-cover rounded border border-gray-600"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Verification Notes */}
              <div>
                <Label htmlFor="verificationNotes" className="text-white">Verification Notes</Label>
                <Textarea
                  id="verificationNotes"
                  value={verificationNotes}
                  onChange={(e) => setVerificationNotes(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                  placeholder="Add any notes about the verification..."
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowVerificationDialog(false)}
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setVerificationStatus('rejected');
                handleVerifyResult();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => {
                setVerificationStatus('verified');
                handleVerifyResult();
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Verify
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Veto Dialog */}
      <Dialog open={showVetoDialog} onOpenChange={setShowVetoDialog}>
        <DialogContent className="bg-gray-900 border border-gray-700 max-w-4xl h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Map Veto</DialogTitle>
            <DialogDescription className="text-gray-400">
              Perform map veto for {selectedMatch?.team1?.name} vs {selectedMatch?.team2?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedMatch && (
            <MapVeto
              matchId={selectedMatch.id}
              tournamentId={tournamentId}
              team1Id={selectedMatch.team1_id || ''}
              team2Id={selectedMatch.team2_id || ''}
              team1Name={selectedMatch.team1?.name || 'Team 1'}
              team2Name={selectedMatch.team2?.name || 'Team 2'}
              bestOf={(currentStage?.config as any)?.veto?.bestOf || 1}
              game="valorant" // This should ideally be dynamic but MapVeto handles generic tables now
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentBracket;
