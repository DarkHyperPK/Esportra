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
  Camera
} from 'lucide-react';

interface Team {
  id: string;
  name: string;
  tag: string;
  logo_url?: string;
  members: any[];
}

interface Match {
  id: string;
  tournament_id: string;
  round: number;
  match_number: number;
  team1_id: string;
  team2_id: string;
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
    loading,
    error,
    generateBracket,
    reportMatchScore,
    verifyMatchResult
  } = useTournamentBracket(tournamentId);
  
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);
  const [pendingResult, setPendingResult] = useState<MatchResult | null>(null);
  
  // Score reporting form
  const [team1Score, setTeam1Score] = useState('');
  const [team2Score, setTeam2Score] = useState('');
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Verification form
  const [verificationNotes, setVerificationNotes] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'verified' | 'rejected'>('verified');

  const handleGenerateBracket = async () => {
    try {
      setSubmitting(true);
      await generateBracket();
      toast({
        title: 'Bracket Generated',
        description: 'Tournament bracket created successfully',
        variant: 'default',
      });
      onBracketUpdate?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate bracket',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportScore = async () => {
    if (!selectedMatch || !user) return;

    try {
      setSubmitting(true);
      await reportMatchScore(
        selectedMatch.id,
        parseInt(team1Score),
        parseInt(team2Score),
        screenshots
      );

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
      await verifyMatchResult(
        pendingResult.id,
        verificationStatus,
        verificationNotes
      );

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

  const getRoundName = (round: number, totalRounds: number) => {
    if (round === totalRounds) return 'Final';
    if (round === totalRounds - 1) return 'Semi-Final';
    if (round === totalRounds - 2) return 'Quarter-Final';
    return `Round ${round}`;
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

  const totalRounds = Math.max(...matches.map(m => m.round), 0);
  const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* Bracket Header */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">Tournament Bracket</h3>
          {isOrganizer && matches.length === 0 && (
            <Button
              onClick={handleGenerateBracket}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {submitting ? 'Generating...' : 'Generate Bracket'}
            </Button>
          )}
        </div>
        
        {matches.length === 0 ? (
          <p className="text-gray-400">Bracket available soon. Check back later.</p>
        ) : (
          <div className="text-sm text-gray-400">
            {matches.length} matches across {totalRounds} rounds
          </div>
        )}
      </div>

      {/* Bracket Visualization */}
      {matches.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-6">
          <div className="flex overflow-x-auto space-x-8">
            {rounds.map(round => {
              const roundMatches = matches.filter(m => m.round === round);
              return (
                <div key={round} className="flex-shrink-0">
                  <h4 className="text-lg font-semibold text-white mb-4 text-center">
                    {getRoundName(round, totalRounds)}
                  </h4>
                  <div className="space-y-4">
                    {roundMatches.map(match => {
                      const result = getMatchResult(match.id);
                      return (
                        <div
                          key={match.id}
                          className="bg-gray-700/50 border border-gray-600/50 rounded-lg p-4 min-w-[300px]"
                        >
                          <div className="space-y-3">
                            {/* Team 1 */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {match.team1?.logo_url && (
                                  <img
                                    src={match.team1.logo_url}
                                    alt={match.team1.name}
                                    className="w-8 h-8 rounded"
                                  />
                                )}
                                <div>
                                  <div className="font-medium text-white">{match.team1?.name || 'TBD'}</div>
                                  <div className="text-sm text-gray-400">[{match.team1?.tag || 'TBD'}]</div>
                                </div>
                              </div>
                              <div className="text-lg font-bold text-white">
                                {match.team1_score !== null ? match.team1_score : '-'}
                              </div>
                            </div>

                            {/* VS */}
                            <div className="text-center text-gray-400 font-medium">VS</div>

                            {/* Team 2 */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {match.team2?.logo_url && (
                                  <img
                                    src={match.team2.logo_url}
                                    alt={match.team2.name}
                                    className="w-8 h-8 rounded"
                                  />
                                )}
                                <div>
                                  <div className="font-medium text-white">{match.team2?.name || 'TBD'}</div>
                                  <div className="text-sm text-gray-400">[{match.team2?.tag || 'TBD'}]</div>
                                </div>
                              </div>
                              <div className="text-lg font-bold text-white">
                                {match.team2_score !== null ? match.team2_score : '-'}
                              </div>
                            </div>

                            {/* Match Status */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-600/50">
                              <Badge 
                                variant={
                                  match.status === 'completed' ? 'default' :
                                  match.status === 'in_progress' ? 'secondary' :
                                  match.status === 'disputed' ? 'destructive' : 'outline'
                                }
                                className="text-xs"
                              >
                                {match.status.replace('_', ' ')}
                              </Badge>
                              
                              <div className="flex gap-2">
                                {canReportScore(match) && match.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedMatch(match);
                                      setShowScoreDialog(true);
                                    }}
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    <Camera className="w-3 h-3 mr-1" />
                                    Report Score
                                  </Button>
                                )}
                                
                                {isOrganizer && canVerifyResults && result && result.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      setSelectedMatch(match);
                                      setPendingResult(result);
                                      setShowVerificationDialog(true);
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Verify
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
    </div>
  );
};

export default TournamentBracket;
