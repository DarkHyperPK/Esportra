import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Save, AlertTriangle } from 'lucide-react';
import type { BRRoundResult, BRResultInput } from '@/types/brRounds';
import type { BRGroupTeam } from '@/types/brGroups';

interface ScoringPreset {
  placements: number[];
  killPoints: number;
  killCap: number | null;
}

interface RoundResultsGridProps {
  roundId: string;
  teams: BRGroupTeam[];
  existingResults: BRRoundResult[];
  scoringPreset: ScoringPreset;
  onSave: (results: BRResultInput[]) => Promise<void>;
  isSaving: boolean;
  isLocked: boolean;
}

interface ResultRow {
  teamId: string;
  teamName: string;
  logoUrl: string | null;
  placement: number;
  kills: number;
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
}

export const RoundResultsGrid: React.FC<RoundResultsGridProps> = ({
  teams: teamsProp,
  existingResults: existingResultsProp,
  scoringPreset,
  onSave,
  isSaving,
  isLocked,
}) => {
  const teams = teamsProp ?? [];
  const existingResults = existingResultsProp ?? [];

  const calcPoints = useCallback(
    (placement: number, kills: number) => {
      const pp =
        placement >= 1 && placement <= scoringPreset.placements.length
          ? scoringPreset.placements[placement - 1]
          : 0;
      const effectiveKills = scoringPreset.killCap
        ? Math.min(kills, scoringPreset.killCap)
        : kills;
      const kp = effectiveKills * scoringPreset.killPoints;
      return { placementPoints: pp, killPoints: kp, totalPoints: pp + kp };
    },
    [scoringPreset]
  );

  const resultsByTeamId = useMemo(() => {
    const map = new Map<string, BRRoundResult>();
    for (const result of existingResults) {
      map.set(result.team_id, result);
    }
    return map;
  }, [existingResults]);

  const buildRows = useCallback((): ResultRow[] => {
    return teams.map((team) => {
      const existing = resultsByTeamId.get(team.team_id);
      if (existing) {
        const pts = calcPoints(existing.placement, existing.kills);
        return {
          teamId: team.team_id,
          teamName: team.team_name,
          logoUrl: team.logo_url,
          placement: existing.placement,
          kills: existing.kills,
          ...pts,
        };
      }
      return {
        teamId: team.team_id,
        teamName: team.team_name,
        logoUrl: team.logo_url,
        placement: 0,
        kills: 0,
        placementPoints: 0,
        killPoints: 0,
        totalPoints: 0,
      };
    });
  }, [teams, resultsByTeamId, calcPoints]);

  const serverRowsSignature = useMemo(
    () => teams
      .map((team) => {
        const existing = resultsByTeamId.get(team.team_id);
        return existing
          ? `${team.team_id}:${existing.placement}:${existing.kills}`
          : `${team.team_id}:0:0`;
      })
      .join('|'),
    [teams, resultsByTeamId]
  );

  const [rows, setRows] = useState<ResultRow[]>(buildRows);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (isEditing) return;
    setRows(buildRows());
  }, [buildRows, serverRowsSignature, isEditing]);

  const updateRow = useCallback(
    (teamId: string, field: 'placement' | 'kills', rawValue: number) => {
      setIsEditing(true);
      const value = field === 'placement'
        ? Math.max(0, Math.min(teams.length || 999, rawValue))
        : Math.max(0, rawValue);
      setRows((prev) =>
        prev.map((r) => {
          if (r.teamId !== teamId) return r;
          const updated = { ...r, [field]: value };
          const pts = calcPoints(updated.placement, updated.kills);
          return { ...updated, ...pts };
        })
      );
    },
    [calcPoints, teams.length]
  );

  const duplicatePlacements = useMemo(() => {
    const filled = rows.filter((r) => r.placement >= 1);
    const seen = new Set<number>();
    const dupes = new Set<number>();
    for (const r of filled) {
      if (seen.has(r.placement)) dupes.add(r.placement);
      seen.add(r.placement);
    }
    return dupes;
  }, [rows]);

  const allFilled = rows.every((r) => r.placement >= 1);
  const canSave = allFilled && duplicatePlacements.size === 0 && !isLocked;
  const saveBlockReason = isLocked
    ? 'Round is locked'
    : !allFilled
    ? 'Enter placement for all teams'
    : duplicatePlacements.size > 0
    ? 'Fix duplicate placements first'
    : null;

  const handleSave = async () => {
    if (!canSave) return;
    const results: BRResultInput[] = rows.map((r) => ({
      teamId: r.teamId,
      placement: r.placement,
      kills: r.kills,
      placementPoints: r.placementPoints,
      killPoints: r.killPoints,
    }));
    try {
      await onSave(results);
      setIsEditing(false);
    } catch {
      /* toast handled by hook */
    }
  };

  if (teams.length === 0) {
    return (
      <div className="flex items-center gap-2 text-zinc-500 text-xs py-4 justify-center">
        <Users className="w-4 h-4" />
        No teams assigned to this group
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid grid-cols-[2fr_80px_80px_60px_60px_60px] gap-2 px-3 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
        <span>Team</span>
        <span className="text-center">Place</span>
        <span className="text-center">Kills</span>
        <span className="text-center">P.Pts</span>
        <span className="text-center">K.Pts</span>
        <span className="text-center">Total</span>
      </div>

      {/* Rows */}
      <div className="space-y-1 max-h-[420px] overflow-y-auto overscroll-contain [contain:layout_style_paint]">
        {rows.map((row) => {
          const hasDupe = duplicatePlacements.has(row.placement) && row.placement >= 1;
          return (
            <div
              key={row.teamId}
              style={{ contentVisibility: 'auto' }}
              className={`grid grid-cols-[2fr_80px_80px_60px_60px_60px] gap-2 items-center px-3 py-1.5 rounded-lg ${
                hasDupe ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/[0.02] hover:bg-white/5'
              } transition-colors`}
            >
              {/* Team */}
              <div className="flex items-center gap-2 min-w-0">
                {row.logoUrl ? (
                  <img
                    src={row.logoUrl}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    fetchPriority="low"
                    className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-3 h-3 text-zinc-500" />
                  </div>
                )}
                <span className="text-xs text-zinc-300 truncate">{row.teamName}</span>
              </div>

              {/* Placement */}
              <Input
                type="number"
                min={1}
                max={teams.length || undefined}
                value={row.placement || ''}
                onChange={(e) => updateRow(row.teamId, 'placement', parseInt(e.target.value) || 0)}
                disabled={isLocked}
                className="h-7 text-xs text-center bg-white/5 border-white/10 text-white px-1"
              />

              {/* Kills */}
              <Input
                type="number"
                min={0}
                value={row.kills}
                onChange={(e) => updateRow(row.teamId, 'kills', Math.max(0, parseInt(e.target.value) || 0))}
                disabled={isLocked}
                className="h-7 text-xs text-center bg-white/5 border-white/10 text-white px-1"
              />

              {/* Points (read-only) */}
              <span className="text-xs text-zinc-400 text-center">{row.placementPoints}</span>
              <span className="text-xs text-zinc-400 text-center">{row.killPoints}</span>
              <span className="text-xs text-white font-medium text-center">{row.totalPoints}</span>
            </div>
          );
        })}
      </div>

      {/* Validation */}
      {!allFilled && !isLocked && (
        <div className="flex items-center gap-2 text-zinc-500 text-xs bg-white/[0.02] rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Enter a placement for every team before saving.
        </div>
      )}

      {duplicatePlacements.size > 0 && (
        <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Duplicate placements: {[...duplicatePlacements].join(', ')}
        </div>
      )}

      {/* Save */}
      {!isLocked && (
        <Button
          onClick={handleSave}
          disabled={!canSave || isSaving}
          title={saveBlockReason ?? undefined}
          className="w-full bg-white text-black hover:bg-white/90 font-mono text-xs font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-3.5 h-3.5 mr-2" />
          {isSaving ? 'Saving...' : 'Save Results'}
        </Button>
      )}
    </div>
  );
};
