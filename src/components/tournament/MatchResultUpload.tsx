import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CtaButton } from '@/components/ui/app-buttons';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { useMatchResultReport } from '@/hooks/useMatchResultReport';
import { MatchResultVerification } from './MatchResultVerification';

interface Props {
  matchId?: string;
  teamId?: string;
  team1Id?: string;
  team2Id?: string;
  gameNumber: number;
  mapName?: string;
  mapId?: string;
  team1Name?: string;
  team2Name?: string;
  team1Logo?: string;
  team2Logo?: string;
  isCaptain: boolean;
  onSuccess?: () => void;
}

const MatchResultUpload: React.FC<Props> = ({
  matchId, teamId, team1Id, team2Id, gameNumber, mapName, mapId, team1Name, team2Name,
  team1Logo, team2Logo, isCaptain, onSuccess,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [files, setFiles] = useState<File[]>([]);
  const [comment, setComment] = useState('');
  const [team1Score, setTeam1Score] = useState('');
  const [team2Score, setTeam2Score] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { activeReport, acceptedReport } = useMatchResultReport(matchId, gameNumber);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length + files.length > 5) {
      toast({ title: 'Too many files', description: 'Maximum 5 images allowed.', variant: 'destructive' });
      return;
    }
    setFiles([...files, ...selectedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const onSubmit = async () => {
    if (!user) {
      toast({ title: 'Not allowed', description: 'Please log in to submit results.', variant: 'destructive' });
      return;
    }
    if (!isCaptain) {
      toast({ title: 'Not allowed', description: 'Only team captains can submit results.', variant: 'destructive' });
      return;
    }
    if (!matchId || !teamId) {
      toast({ title: 'Missing match', description: 'Open the upload from a specific match.', variant: 'destructive' });
      return;
    }

    const t1 = parseInt(team1Score, 10);
    const t2 = parseInt(team2Score, 10);
    if (isNaN(t1) || isNaN(t2) || t1 < 0 || t2 < 0) {
      toast({ title: 'Invalid scores', description: 'Please enter valid round scores for both teams.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const imageUrls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('bucket', 'tournaments.results');
        const { url } = await apiClient.upload<{ url: string; path: string }>('/api/storage/upload', fd);
        imageUrls.push(url);
      }

      await apiClient.post(`/api/matches/${matchId}/reports`, {
        gameNumber,
        reportedByTeamId: teamId,
        team1Score: t1,
        team2Score: t2,
        winnerTeamId: t1 !== t2 && team1Id && team2Id
          ? (t1 > t2 ? team1Id : team2Id)
          : undefined,
        mapName: mapName || undefined,
        mapId: mapId || undefined,
        screenshotUrls: imageUrls.length > 0 ? imageUrls : undefined,
        comment: comment || undefined,
      });

      await queryClient.invalidateQueries({ queryKey: ['match-result-reports', matchId] });
      toast({ title: 'Submitted', description: 'Match result reported. Awaiting opponent confirmation.' });
      setFiles([]); setComment(''); setTeam1Score(''); setTeam2Score('');
      onSuccess?.();
    } catch (e: unknown) {
      console.error('Result submit failed:', e);
      toast({
        title: 'Upload failed',
        description: getApiErrorMessage(e, 'Could not submit match result.'),
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (matchId && (activeReport || acceptedReport)) {
    return (
      <MatchResultVerification
        matchId={matchId}
        gameNumber={gameNumber}
        userTeamId={teamId}
        team1Id={team1Id}
        team2Id={team2Id}
        team1Name={team1Name}
        team2Name={team2Name}
        team1Logo={team1Logo}
        team2Logo={team2Logo}
        isCaptain={isCaptain}
        onSuccess={onSuccess}
      />
    );
  }

  const scoresValid = team1Score !== '' && team2Score !== '' &&
    !isNaN(parseInt(team1Score)) && !isNaN(parseInt(team2Score));

  return (
    <div className="bg-[#0a0a0c] border border-white/10/30 rounded-xl p-4">
      <h3 className="text-white font-semibold mb-1">Manual Result Report</h3>
      {mapName && (
        <p className="text-sm text-rose-500 mb-3">
          Game {gameNumber} — {mapName}
        </p>
      )}

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              {team1Name || 'Team 1'} Rounds
            </label>
            <Input
              type="number" min="0" max="99"
              value={team1Score}
              onChange={(e) => setTeam1Score(e.target.value)}
              placeholder="0"
              className="bg-gray-900/50 border-white/10/40 text-white text-center text-lg"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">
              {team2Name || 'Team 2'} Rounds
            </label>
            <Input
              type="number" min="0" max="99"
              value={team2Score}
              onChange={(e) => setTeam2Score(e.target.value)}
              placeholder="0"
              className="bg-gray-900/50 border-white/10/40 text-white text-center text-lg"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1 block">
            Screenshots (optional proof)
          </label>
          <label
            className={cn(
              "flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg bg-gray-900/50 transition-colors",
              files.length >= 5
                ? "border-gray-600 cursor-not-allowed opacity-50"
                : "border-rose-500/50 cursor-pointer hover:bg-gray-900/70 hover:border-rose-500"
            )}
          >
            <p className="text-sm text-gray-300">
              {files.length >= 5 ? (
                <span className="text-gray-500">Maximum 5 images reached</span>
              ) : (
                <><span className="font-semibold text-rose-500">Click to upload</span> or drag and drop</>
              )}
            </p>
            <p className="text-xs text-gray-400">PNG, JPG, WEBP</p>
            <input
              type="file" accept="image/*" multiple
              onChange={handleFileChange}
              disabled={files.length >= 5}
              className="hidden"
            />
          </label>
        </div>

        {files.length > 0 && (
          <div className="space-y-1 max-h-24 overflow-y-auto overscroll-contain" data-lenis-prevent>
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-800/50 rounded px-2 py-1">
                <span className="text-xs text-gray-300 truncate flex-1">{file.name}</span>
                <button type="button" onClick={() => removeFile(index)}
                  className="ml-2 text-red-400 hover:text-red-300 text-xs">Remove</button>
              </div>
            ))}
          </div>
        )}

        <Textarea
          placeholder="Add a comment (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="bg-gray-900/50 border-white/10/40"
        />

        <div className="text-right">
          <CtaButton
            disabled={submitting || !scoresValid}
            onClick={onSubmit}
            className="disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Result'}
          </CtaButton>
        </div>

        {!isCaptain && (
          <p className="text-xs text-amber-400 mt-2">
            ⚠️ Only the team captain can submit results.
          </p>
        )}
      </div>
    </div>
  );
};

export default MatchResultUpload;
