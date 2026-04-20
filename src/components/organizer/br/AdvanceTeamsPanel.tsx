import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { ArrowRight, Trophy, Users, Loader2, Eye, ChevronUp } from 'lucide-react';
import { useBRAdvancement } from '@/hooks/useBRAdvancement';
import type { QualifiedTeam } from '@/hooks/useBRAdvancement';

interface AdvanceTeamsPanelProps {
  stageId: string;
  advancementCount: number;
  onAdvanced: () => void;
}

const AdvanceTeamsPanel: React.FC<AdvanceTeamsPanelProps> = ({
  stageId,
  advancementCount,
  onAdvanced,
}) => {
  const { preview, execute } = useBRAdvancement(stageId);
  const [teamsPerGroup, setTeamsPerGroup] = useState(advancementCount || 4);
  const [previewData, setPreviewData] = useState<{
    qualified_teams: QualifiedTeam[];
    total_qualified: number;
    groups_count: number;
  } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handlePreview = async () => {
    try {
      const data = await preview.mutateAsync(teamsPerGroup);
      setPreviewData(data);
    } catch {
      /* toast handled by hook */
    }
  };

  const handleAdvance = async () => {
    try {
      await execute.mutateAsync(teamsPerGroup);
      setPreviewData(null);
      onAdvanced();
    } catch {
      /* toast handled by hook */
    } finally {
      setShowConfirm(false);
    }
  };

  // Group qualified teams by their source group
  const groupedTeams = previewData?.qualified_teams.reduce<Record<string, QualifiedTeam[]>>(
    (acc, team) => {
      const key = team.from_group;
      if (!acc[key]) acc[key] = [];
      acc[key].push(team);
      return acc;
    },
    {}
  );

  return (
    <Card className="bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl">
      <CardHeader className="pb-3 border-b border-white/5">
        <CardTitle className="text-base font-bold text-white flex items-center gap-2">
          <ChevronUp className="w-4 h-4 text-emerald-400" />
          Stage Advancement
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Configuration */}
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <Label className="text-xs text-zinc-400 mb-1">Teams per group to advance</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={teamsPerGroup}
              onChange={(e) => setTeamsPerGroup(Math.max(1, parseInt(e.target.value) || 1))}
              className="bg-white/5 border-white/10 h-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreview}
            disabled={preview.isPending}
            className="h-9"
          >
            {preview.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <Eye className="w-3.5 h-3.5 mr-1" />
            )}
            Preview
          </Button>
        </div>

        {/* Preview results */}
        {previewData && groupedTeams && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-400">
                {previewData.total_qualified} teams from {previewData.groups_count} groups
              </p>
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                {previewData.total_qualified} qualify
              </Badge>
            </div>

            {Object.entries(groupedTeams).map(([groupName, teams]) => (
              <div key={groupName} className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  {groupName}
                </p>
                {teams.map((team, i) => (
                  <div
                    key={team.team_id}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg',
                      i < 3 ? 'bg-emerald-500/[0.05] border border-emerald-500/10' : 'bg-white/[0.02]'
                    )}
                  >
                    <span className="text-xs font-bold text-emerald-400 w-5">{i + 1}</span>
                    {team.logo_url && (
                      <img src={team.logo_url} alt="" className="w-5 h-5 rounded object-cover" />
                    )}
                    <span className="text-sm text-white truncate flex-1">{team.team_name}</span>
                    <span className="text-xs text-zinc-400">{team.total_points} pts</span>
                    <span className="text-xs text-zinc-500">{team.wins}W</span>
                  </div>
                ))}
              </div>
            ))}

            {/* Advance button */}
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white"
              onClick={() => setShowConfirm(true)}
              disabled={execute.isPending}
            >
              {execute.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              Advance {previewData.total_qualified} Teams to Finals
            </Button>
          </div>
        )}

        {/* Confirmation dialog */}
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent className="bg-[#121214] border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle>Advance Teams?</AlertDialogTitle>
              <AlertDialogDescription>
                This will advance {previewData?.total_qualified} teams to the finals stage, mark this
                stage as completed, and activate the next stage. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-emerald-600 hover:bg-emerald-500"
                onClick={handleAdvance}
              >
                Advance Teams
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default AdvanceTeamsPanel;
