import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { EYEBROW_CLASS, HINT_CLASS, LABEL_CLASS } from '@/components/ui/kit';
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
        setError('Couldn’t load this stage’s rounds. Close and reopen to try again.');
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
          "flex items-center justify-between gap-4 p-4 transition-colors",
          boMode === 'per_round'
            ? "bg-white/[0.04] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]"
            : "bg-white/[0.02] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.07)]"
        )}
      >
        <div className="space-y-0.5">
          <Label className={LABEL_CLASS}>Different length per round</Label>
          <p className={HINT_CLASS}>
            {boMode === 'per_round'
              ? 'Set each round below. Rounds you leave alone use the stage default.'
              : 'For example, best of 1 early on and best of 5 in the final.'
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
        <div className="mt-4">
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center gap-2 py-2 text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span className="text-sm">Loading rounds…</span>
              </div>
            ) : error ? (
              <p className="text-sm text-red-300">{error}</p>
            ) : rounds.length === 0 ? (
              <p className={HINT_CLASS}>
                Set how many teams play in this stage to see its rounds.
              </p>
            ) : (
              <>
                {format === 'double_elimination' && (
                  <>
                    <RoundGroup
                      title="Upper bracket"
                      rounds={rounds.filter(r => r.bracketType === 'winners')}
                      overrides={roundBoOverrides}
                      defaultBestOf={defaultBestOf}
                      seriesOptions={seriesOptions}
                      onRoundBoChange={handleRoundBoChange}
                      disabled={disabled}
                    />
                    <RoundGroup
                      title="Lower bracket"
                      rounds={rounds.filter(r => r.bracketType === 'losers')}
                      overrides={roundBoOverrides}
                      defaultBestOf={defaultBestOf}
                      seriesOptions={seriesOptions}
                      onRoundBoChange={handleRoundBoChange}
                      disabled={disabled}
                    />
                    <RoundGroup
                      title="Grand final"
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
      <h5 className={EYEBROW_CLASS}>
        {title}
      </h5>
      <div className="grid gap-px bg-white/[0.06]">
        {rounds.map((round) => (
          <div
            key={round.key}
            className={cn(
              "flex items-center justify-between bg-card px-4 py-2"
            )}
          >
            <span className="text-sm text-zinc-200">{round.label}</span>
            <Select
              value={String(overrides[round.key] ?? defaultBestOf)}
              onValueChange={(val) => onRoundBoChange(round.key, Number(val))}
              disabled={disabled}
            >
              <SelectTrigger className="h-9 w-36 rounded-none border-white/10 bg-black/30 text-sm">
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
