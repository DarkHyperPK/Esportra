import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import type { RoundInfo, BoMode } from '@/types/stage';

interface RoundBoConfigSectionProps {
  format: string;
  bracketSize: number;
  boMode: BoMode;
  defaultBestOf: number;
  roundBoOverrides: Record<string, number>;
  seriesOptions: { label: string; value: number }[];
  onBoModeChange: (mode: BoMode) => void;
  onOverridesChange: (overrides: Record<string, number>) => void;
  disabled?: boolean;
}

export function RoundBoConfigSection({
  format,
  bracketSize,
  boMode,
  defaultBestOf,
  roundBoOverrides,
  seriesOptions,
  onBoModeChange,
  onOverridesChange,
  disabled = false,
}: RoundBoConfigSectionProps) {
  const [rounds, setRounds] = useState<RoundInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEliminationFormat = format === 'single_elimination' || format === 'double_elimination';

  useEffect(() => {
    if (!isEliminationFormat || boMode !== 'per_round' || bracketSize < 2) {
      setRounds([]);
      return;
    }

    const fetchRoundStructure = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiClient.get<{ rounds: RoundInfo[] }>(
          `/api/stages/round-structure?format=${format}&bracketSize=${bracketSize}`
        );
        setRounds(response.rounds);

        // Initialize overrides for any rounds that don't have one yet
        const newOverrides = { ...roundBoOverrides };
        let hasChanges = false;
        for (const round of response.rounds) {
          if (!(round.key in newOverrides)) {
            newOverrides[round.key] = defaultBestOf;
            hasChanges = true;
          }
        }
        if (hasChanges) {
          onOverridesChange(newOverrides);
        }
      } catch (err) {
        setError('Failed to load round structure');
        console.error('Failed to fetch round structure:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoundStructure();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when format/size/mode changes, not on override changes
  }, [format, bracketSize, boMode, isEliminationFormat]);

  const handleRoundBoChange = (roundKey: string, value: number) => {
    onOverridesChange({
      ...roundBoOverrides,
      [roundKey]: value,
    });
  };

  if (!isEliminationFormat) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex items-center justify-between p-3 rounded-lg transition-colors",
          boMode === 'per_round'
            ? "bg-emerald-500/10 border border-emerald-500/30"
            : "bg-black/20 border border-white/5"
        )}
      >
        <div className="space-y-0.5">
          <Label className={cn(
            "font-medium",
            boMode === 'per_round' ? "text-emerald-400" : "text-gray-300"
          )}>
            {boMode === 'per_round' ? 'Per-Round Series Format (Active)' : 'Enable Per-Round Series Format'}
          </Label>
          <p className="text-xs text-gray-500">
            {boMode === 'per_round'
              ? 'Configure BO format individually for each round below'
              : 'Set different BO formats for different rounds (e.g., BO1 early, BO5 finals)'
            }
          </p>
        </div>
        <Switch
          checked={boMode === 'per_round'}
          onCheckedChange={(checked) => onBoModeChange(checked ? 'per_round' : 'per_stage')}
          disabled={disabled}
        />
      </div>

      {boMode === 'per_round' && (
        <div className="mt-4 space-y-3 pl-4 border-l-2 border-emerald-500/30">
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading rounds...</span>
            </div>
          ) : error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : rounds.length === 0 ? (
            <p className="text-sm text-gray-500">
              Set bracket size to configure rounds
            </p>
          ) : (
            <>
              {format === 'double_elimination' && (
                <>
                  <RoundGroup
                    title="Winners Bracket"
                    rounds={rounds.filter(r => r.bracketType === 'winners')}
                    overrides={roundBoOverrides}
                    defaultBestOf={defaultBestOf}
                    seriesOptions={seriesOptions}
                    onRoundBoChange={handleRoundBoChange}
                    disabled={disabled}
                  />
                  <RoundGroup
                    title="Losers Bracket"
                    rounds={rounds.filter(r => r.bracketType === 'losers')}
                    overrides={roundBoOverrides}
                    defaultBestOf={defaultBestOf}
                    seriesOptions={seriesOptions}
                    onRoundBoChange={handleRoundBoChange}
                    disabled={disabled}
                  />
                  <RoundGroup
                    title="Grand Final"
                    rounds={rounds.filter(r => r.bracketType === 'final')}
                    overrides={roundBoOverrides}
                    defaultBestOf={defaultBestOf}
                    seriesOptions={seriesOptions}
                    onRoundBoChange={handleRoundBoChange}
                    disabled={disabled}
                  />
                </>
              )}
              {format === 'single_elimination' && (
                <RoundGroup
                  title="Rounds"
                  rounds={rounds}
                  overrides={roundBoOverrides}
                  defaultBestOf={defaultBestOf}
                  seriesOptions={seriesOptions}
                  onRoundBoChange={handleRoundBoChange}
                  disabled={disabled}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

interface RoundGroupProps {
  title: string;
  rounds: RoundInfo[];
  overrides: Record<string, number>;
  defaultBestOf: number;
  seriesOptions: { label: string; value: number }[];
  onRoundBoChange: (roundKey: string, value: number) => void;
  disabled?: boolean;
}

function RoundGroup({
  title,
  rounds,
  overrides,
  defaultBestOf,
  seriesOptions,
  onRoundBoChange,
  disabled,
}: RoundGroupProps) {
  if (rounds.length === 0) return null;

  return (
    <div className="space-y-2">
      <h5 className="text-xs font-medium text-gray-400 uppercase tracking-wider">
        {title}
      </h5>
      <div className="grid gap-2">
        {rounds.map((round) => (
          <div
            key={round.key}
            className={cn(
              "flex items-center justify-between py-2 px-3 rounded-md",
              "bg-black/20 border border-white/5"
            )}
          >
            <span className="text-sm text-gray-300">{round.label}</span>
            <Select
              value={String(overrides[round.key] ?? defaultBestOf)}
              onValueChange={(val) => onRoundBoChange(round.key, Number(val))}
              disabled={disabled}
            >
              <SelectTrigger className="w-32 h-8 bg-black/30 border-white/10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {seriesOptions.map((opt) => (
                  <SelectItem key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
