import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { getStageBRConfig, parseStageConfig } from '@/utils/brConfigResolve';
import { useGameCatalogGame } from '@/hooks/useGameCatalogGame';
import {
  catalogGameHasBRMaps,
  getCatalogMapItems,
  getCatalogMapPool,
} from '@/utils/gameCatalogBr';
import { BRMapOptionList } from '@/components/organizer/br/BRMapOptionList';
import { BR_FEATURE_FLAGS } from '@/config/brFeatureFlags';
import type { BRAdvancementMode, BRMapMode, BRStageConfig } from '@/types/battleRoyale';
import type { Database } from '@/integrations/supabase/types';

type TournamentStage = Database['public']['Tables']['tournament_stages']['Row'];

interface BRStageAdvancedConfigProps {
  tournamentId: string;
  stages: TournamentStage[];
  stage: TournamentStage;
  gameName: string;
  onSaved: () => void;
}

export const BRStageAdvancedConfig: React.FC<BRStageAdvancedConfigProps> = ({
  tournamentId,
  stages,
  stage,
  gameName,
  onSaved,
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const { data: catalogGame, isLoading: catalogLoading } = useGameCatalogGame(gameName);
  const catalogBrConfig = catalogGame?.brConfig;
  const hasMaps = catalogGameHasBRMaps(catalogBrConfig) && BR_FEATURE_FLAGS.mapsEnabled;
  const catalogMapItems = useMemo(() => getCatalogMapItems(catalogBrConfig), [catalogBrConfig]);
  const catalogPool = useMemo(() => getCatalogMapPool(catalogBrConfig), [catalogBrConfig]);

  const existing = useMemo(() => getStageBRConfig(stage) ?? {}, [stage]);

  const [gameCount, setGameCount] = useState<string>(
    existing.gameCount != null ? String(existing.gameCount) : '',
  );
  const [perGroup, setPerGroup] = useState<string>(
    String(existing.advancement?.perGroup ?? stage.advancement_count ?? ''),
  );
  const [mapMode, setMapMode] = useState<BRMapMode>(
    existing.map?.mode ?? (hasMaps ? 'per_round' : 'none'),
  );
  const [selectedMaps, setSelectedMaps] = useState<string[]>(
    existing.map?.pool?.length ? existing.map.pool : catalogPool,
  );
  const [fixedMap, setFixedMap] = useState<string>(
    existing.map?.fixedMap ?? catalogPool[0] ?? '',
  );
  const [scoringPresetKey, setScoringPresetKey] = useState<string>(
    existing.scoring?.presetKey ?? '',
  );
  const [scoringKillCap, setScoringKillCap] = useState<string>(
    existing.scoring?.killCap != null ? String(existing.scoring.killCap) : '',
  );

  const toggleMap = (mapName: string, checked: boolean) => {
    setSelectedMaps((prev) => {
      if (checked) return [...new Set([...prev, mapName])];
      return prev.filter((m) => m !== mapName);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const advancementMode: BRAdvancementMode = 'top_n_per_group';
      const brConfig: BRStageConfig = {
        gameCount: gameCount.trim() ? Number(gameCount) : null,
        ...(scoringPresetKey.trim() || scoringKillCap.trim()
          ? {
              scoring: {
                presetKey: scoringPresetKey.trim() || undefined,
                killCap: scoringKillCap.trim() ? Number(scoringKillCap) : undefined,
              },
            }
          : {}),
        advancement:
          stage.advancement_count === null && !perGroup.trim()
            ? null
            : {
                mode: advancementMode,
                perGroup: Number(perGroup) || stage.advancement_count || undefined,
              },
        ...(hasMaps
          ? {
              map: {
                mode: mapMode,
                pool: selectedMaps,
                fixedMap: mapMode === 'fixed_stage' ? fixedMap : null,
              },
            }
          : undefined),
      };

      const rootConfig = parseStageConfig(stage);
      const nextConfig = { ...rootConfig, br: brConfig };

      const advancementCount = perGroup.trim()
        ? Number(perGroup)
        : stage.advancement_count;

      const stageDtos = stages.map((s) => {
        const parsedConfig = s.id === stage.id ? nextConfig : parseStageConfig(s);
        const dto: Record<string, unknown> = {
          id: s.id,
          name: s.name,
          format: s.format || 'battle_royale',
          stageOrder: s.stage_order,
          bestOf: 1,
          capacity: s.capacity,
          advancementCount: s.id === stage.id ? advancementCount : s.advancement_count,
          startsAt: s.starts_at || null,
          endsAt: s.ends_at || null,
        };
        if (Object.keys(parsedConfig).length > 0) {
          dto.config = parsedConfig;
        }
        return dto;
      });

      await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: stageDtos });
      toast({ title: 'Stage settings saved' });
      onSaved();
    } catch (error: unknown) {
      toast({
        title: 'Could not save stage settings',
        description: getApiErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-white">
        <Settings2 className="w-4 h-4 text-zinc-400" />
        Stage settings
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Target game count</Label>
          <Input
            type="number"
            min={1}
            max={24}
            value={gameCount}
            onChange={(e) => setGameCount(e.target.value)}
            placeholder="Inherit tournament default"
            className="h-9 bg-white/5 border-white/10"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Qualify per group</Label>
          <Input
            type="number"
            min={1}
            value={perGroup}
            onChange={(e) => setPerGroup(e.target.value)}
            className="h-9 bg-white/5 border-white/10"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 pt-2 border-t border-white/5">
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Scoring preset override</Label>
          <Select value={scoringPresetKey || '__inherit__'} onValueChange={(v) => setScoringPresetKey(v === '__inherit__' ? '' : v)}>
            <SelectTrigger className="h-9 bg-white/5 border-white/10">
              <SelectValue placeholder="Inherit tournament default" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__inherit__">Inherit tournament default</SelectItem>
              <SelectItem value="algs">ALGS</SelectItem>
              <SelectItem value="fncs">FNCS</SelectItem>
              <SelectItem value="pcs">PCS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Kill cap override</Label>
          <Input
            type="number"
            min={0}
            value={scoringKillCap}
            onChange={(e) => setScoringKillCap(e.target.value)}
            placeholder="Inherit preset / tournament"
            className="h-9 bg-white/5 border-white/10"
          />
        </div>
      </div>

      {hasMaps && (
        <div className="space-y-3 pt-2 border-t border-white/5">
          <Label className="text-[10px] uppercase tracking-wider text-zinc-500">Map selection</Label>
          <Select value={mapMode} onValueChange={(v) => setMapMode(v as BRMapMode)}>
            <SelectTrigger className="h-9 bg-white/5 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="per_round">Organizer picks per round</SelectItem>
              <SelectItem value="fixed_stage">One map for whole stage</SelectItem>
              <SelectItem value="rotation">Auto-rotate through pool</SelectItem>
            </SelectContent>
          </Select>

          {mapMode === 'fixed_stage' && (
            <Select value={fixedMap} onValueChange={setFixedMap}>
              <SelectTrigger className="h-9 bg-white/5 border-white/10">
                <SelectValue placeholder="Select map" />
              </SelectTrigger>
              <SelectContent>
                {selectedMaps.map((mapName) => (
                  <SelectItem key={mapName} value={mapName}>{mapName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {catalogLoading ? (
              <p className="text-xs text-zinc-500 col-span-full">Loading maps from game catalog…</p>
            ) : (
              <div className="col-span-full">
                <BRMapOptionList
                  items={catalogMapItems}
                  selected={selectedMaps}
                  onToggle={toggleMap}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving}
        className="bg-emerald-600 hover:bg-emerald-500"
      >
        <Save className="w-3.5 h-3.5 mr-1.5" />
        {saving ? 'Saving...' : 'Save stage settings'}
      </Button>
    </div>
  );
};

export default BRStageAdvancedConfig;
