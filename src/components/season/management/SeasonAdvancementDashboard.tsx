import { useSeasonAdvancement } from '@/hooks/useSeasons';
import { usePreviewSeasonAdvancement, useProcessSeasonAdvancement, useSeasonTournaments } from '@/hooks/useSeasonStandings';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertTriangle, CheckCircle2, Loader2, Eye, Play } from 'lucide-react';
import type { ProposedMovement } from '@/types/season';

interface Props {
  seasonId: string;
}

const SeasonAdvancementDashboard = ({ seasonId }: Props) => {
  const connectionsQuery = useSeasonAdvancement(seasonId);
  const tournamentsQuery = useSeasonTournaments(seasonId);
  const previewMutation = usePreviewSeasonAdvancement();
  const processAdvancement = useProcessSeasonAdvancement();

  const handlePreview = () => {
    previewMutation.mutate({ id: seasonId });
  };

  const handleApply = () => {
    processAdvancement.mutate({ id: seasonId });
    previewMutation.reset();
  };

  const connections = connectionsQuery.data ?? [];
  const completedTournaments = (tournamentsQuery.data ?? []).filter(
    (t) => t.status === 'completed' || t.tournamentStatus === 'completed'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-3xl border border-white/[0.06] bg-[#0a0a0c] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading text-2xl font-bold text-white">Advancement Dashboard</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Review and apply team advancement across the season circuit.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={previewMutation.isPending}
              className="gap-1.5"
            >
              {previewMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
              Preview
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={processAdvancement.isPending || (!previewMutation.data && connections.length === 0)}
              className="gap-1.5"
            >
              {processAdvancement.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              Apply Advancement
            </Button>
          </div>
        </div>
      </div>

      {/* Completed Tournaments */}
      {completedTournaments.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0c] p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Completed Tournaments</h3>
          <div className="flex flex-wrap gap-2">
            {completedTournaments.map((t) => (
              <Badge key={t.id} variant="secondary" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                {t.displayName || t.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Advancement Connections */}
      {connections.length > 0 && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0c] p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Advancement Paths</h3>
          <div className="space-y-2">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] px-4 py-3"
              >
                <span className="text-sm font-medium text-zinc-300">{conn.sourceNodeName}</span>
                <ArrowRight className="h-4 w-4 text-zinc-500 shrink-0" />
                <span className="text-sm font-medium text-zinc-300">{conn.targetNodeName}</span>
                <span className="ml-auto text-xs text-zinc-500">
                  Places {conn.placementStart}–{conn.placementEnd} · Top {conn.advancementCount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview Error */}
      {previewMutation.isError && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300">{previewMutation.error instanceof Error ? previewMutation.error.message : 'Failed to preview advancement'}</p>
        </div>
      )}

      {/* Preview Results */}
      {previewMutation.data && (
        <div className="rounded-2xl border border-white/[0.06] bg-[#0a0a0c] p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">
              Preview: {previewMutation.data.movements.length} team{previewMutation.data.movements.length !== 1 ? 's' : ''} eligible
            </h3>
            {previewMutation.data.message && (
              <span className="text-xs text-zinc-500">{previewMutation.data.message}</span>
            )}
          </div>

          {/* Warnings */}
          {previewMutation.data.warnings.length > 0 && (
            <div className="space-y-1.5">
              {previewMutation.data.warnings.map((w: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-xs text-amber-400/80">
                  <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Movements */}
          {previewMutation.data.movements.length > 0 && (
            <div className="space-y-2">
              {previewMutation.data.movements.map((m: ProposedMovement, i: number) => (
                <div
                  key={`${m.teamId}-${i}`}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.02] border border-white/[0.04] px-4 py-3"
                >
                  {m.teamLogoUrl && (
                    <img src={m.teamLogoUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-white truncate block">
                      {m.teamName ?? 'Unknown Team'}
                    </span>
                    <span className="text-xs text-zinc-500">
                      Rank #{m.currentRank} · {m.totalPoints} pts
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span>{m.sourceNodeName}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span className="text-emerald-400">{m.targetNodeName}</span>
                  </div>
                  {m.alreadyRegistered && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400">
                      Already registered
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}

          {previewMutation.data.movements.length === 0 && !previewMutation.data.message && (
            <p className="text-sm text-zinc-500 text-center py-4">No teams eligible for advancement.</p>
          )}
        </div>
      )}

      {/* Empty State */}
      {connections.length === 0 && !previewMutation.data && !connectionsQuery.isLoading && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/[0.06] bg-white/[0.02] py-16 text-center">
          <p className="text-sm font-medium text-zinc-400">No advancement rules configured</p>
          <p className="text-xs text-zinc-600">
            Add advancement rules in the Rules tab to define how teams progress through the season.
          </p>
        </div>
      )}
    </div>
  );
};

export default SeasonAdvancementDashboard;
