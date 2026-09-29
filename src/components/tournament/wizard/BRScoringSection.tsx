import { Minus, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OutlineButton } from '@/components/ui/app-buttons';
import { ChoiceCard, ChoiceGroup, CONTROL_CLASS, Field, FormSection } from '@/components/ui/kit';
import { cn } from '@/lib/utils';
import type { BRConfig, BRScoringPreset } from '@/types/battleRoyale';
import type { TournamentWizardData } from '@/types/tournamentWizard';

interface BRScoringSectionProps {
    config: BRConfig;
    data: TournamentWizardData;
    locked: boolean;
    updateData: (updates: Partial<TournamentWizardData>) => void;
}

const DEFAULT_CUSTOM: BRScoringPreset = { name: 'Custom', placements: [10, 6, 5, 4, 3, 2, 1, 1], killPoints: 1, killCap: null };
const KILL_CAPS = [0, 3, 5, 6, 8, 10];
const MEDAL = ['text-amber-300', 'text-zinc-200', 'text-amber-600'];

function PlacementStrip({ placements }: { placements: number[] }) {
    return (
        <div className="grid grid-cols-4 gap-px bg-white/[0.06] sm:grid-cols-8">
            {placements.map((pts, i) => (
                <div key={i} className="bg-card px-2 py-2 text-center">
                    <div className="font-mono text-[10px] text-zinc-500">#{i + 1}</div>
                    <div className={cn('text-sm font-bold tabular-nums', MEDAL[i] ?? 'text-zinc-400')}>{pts}</div>
                </div>
            ))}
        </div>
    );
}

/** Points-based scoring for battle royale: a preset (or custom table), a kill cap and a tiebreaker. */
export function BRScoringSection({ config, data, locked, updateData }: BRScoringSectionProps) {
    const preset = data.brScoringPreset && data.brScoringPreset !== 'custom' ? config.scoringPresets[data.brScoringPreset] : undefined;
    const custom = data.brScoringPreset === 'custom' ? data.brCustomScoring : null;

    const setCustom = (next: BRScoringPreset) => updateData({ brCustomScoring: next });
    const setKillCap = (value: number) => {
        const cap = value === 0 ? null : value;
        updateData({ brKillCap: cap, ...(custom ? { brCustomScoring: { ...custom, killCap: cap } } : {}) });
    };

    return (
        <FormSection title="Scoring" description="Teams earn points for where they finish and for eliminations. The totals decide the standings.">
            <ChoiceGroup label="Scoring preset" columns={2}>
                {Object.entries(config.scoringPresets).map(([key, p]) => (
                    <ChoiceCard
                        key={key}
                        disabled={locked}
                        selected={data.brScoringPreset === key}
                        onSelect={() => updateData({ brScoringPreset: key, brKillCap: p.killCap, brCustomScoring: null })}
                        title={p.name}
                        description={`Winner gets ${p.placements[0]} pts · ${p.killPoints} per kill${p.killCap ? ` (max ${p.killCap})` : ''}`}
                    />
                ))}
                <ChoiceCard
                    disabled={locked}
                    selected={data.brScoringPreset === 'custom'}
                    onSelect={() => updateData({ brScoringPreset: 'custom', brCustomScoring: data.brCustomScoring || DEFAULT_CUSTOM })}
                    title="Custom"
                    description="Set your own points for each placement and each kill."
                />
            </ChoiceGroup>

            {preset && <PlacementStrip placements={preset.placements} />}

            {custom && (
                <div className="space-y-4">
                    <Field label="Points per placement" hint="First place is on the left. Positions past the last box score 0.">
                        <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                            {custom.placements.map((pts, i) => (
                                <label key={i} className="block text-center">
                                    <span className="mb-1 block font-mono text-[10px] text-zinc-500">#{i + 1}</span>
                                    <Input
                                        type="number" min={0} max={100} value={pts} disabled={locked}
                                        aria-label={`Points for place ${i + 1}`}
                                        onChange={(e) => {
                                            const placements = [...custom.placements];
                                            placements[i] = parseInt(e.target.value, 10) || 0;
                                            setCustom({ ...custom, placements });
                                        }}
                                        className={cn(CONTROL_CLASS, 'h-9 px-1 text-center text-sm')}
                                    />
                                </label>
                            ))}
                        </div>
                    </Field>
                    {!locked && (
                        <div className="flex gap-2">
                            <OutlineButton type="button" size="sm" onClick={() => setCustom({ ...custom, placements: [...custom.placements, 0] })}>
                                <Plus className="mr-1 h-3 w-3" aria-hidden /> Add a place
                            </OutlineButton>
                            {custom.placements.length > 3 && (
                                <OutlineButton type="button" size="sm" onClick={() => setCustom({ ...custom, placements: custom.placements.slice(0, -1) })}>
                                    <Minus className="mr-1 h-3 w-3" aria-hidden /> Remove last place
                                </OutlineButton>
                            )}
                        </div>
                    )}
                    <Field label="Points per kill" htmlFor="br-kill-points">
                        <Input
                            id="br-kill-points" type="number" min={0} max={10} value={custom.killPoints} disabled={locked}
                            onChange={(e) => setCustom({ ...custom, killPoints: parseInt(e.target.value, 10) || 0 })}
                            className={cn(CONTROL_CLASS, 'w-32')}
                        />
                    </Field>
                </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Kill cap" htmlFor="br-kill-cap" hint="The most kill points a team can earn in one game. Applies to every stage.">
                    <Select value={data.brKillCap === null ? '0' : String(data.brKillCap)} onValueChange={(v) => setKillCap(parseInt(v, 10))} disabled={locked}>
                        <SelectTrigger id="br-kill-cap" className={CONTROL_CLASS}><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {KILL_CAPS.map((cap) => <SelectItem key={cap} value={String(cap)}>{cap === 0 ? 'No cap' : `${cap} kills per game`}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </Field>
                <Field label="Tiebreaker" htmlFor="br-tiebreaker" hint="Used when two teams finish on the same points.">
                    <Select value={data.brTiebreaker} onValueChange={(v) => updateData({ brTiebreaker: v as TournamentWizardData['brTiebreaker'] })} disabled={locked}>
                        <SelectTrigger id="br-tiebreaker" className={CONTROL_CLASS}><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="most_wins">Most first places</SelectItem>
                            <SelectItem value="most_kills">Most total kills</SelectItem>
                            <SelectItem value="head_to_head">Best average placement</SelectItem>
                        </SelectContent>
                    </Select>
                </Field>
            </div>
        </FormSection>
    );
}
