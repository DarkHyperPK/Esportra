import { ChipGroup, Field, FormSection } from '@/components/ui/kit';
import type { GameMode, GameModeGroup } from '@/utils/gameFeatures';

interface GameModeSectionProps {
    groups: GameModeGroup[];
    activeGroup?: GameModeGroup;
    activeMode?: GameMode;
    activeModeValue: string;
    teamSize: number;
    locked: boolean;
    onGroupChange: (groupKey: string) => void;
    onModeChange: (modeValue: string) => void;
}

/** Solo / duo / squad (or the game's equivalent), then the variant inside that group. */
export function GameModeSection({ groups, activeGroup, activeMode, activeModeValue, teamSize, locked, onGroupChange, onModeChange }: GameModeSectionProps) {
    const individual = activeMode?.participantMode === 'solo' || teamSize === 1;
    const hint = individual
        ? 'Players sign up on their own.'
        : `${teamSize} starters per team${activeMode?.maxRosterSize ? `, up to ${activeMode.maxRosterSize} on the roster` : ''}.`;
    const activeVariant = activeGroup?.modes.find((m) => activeModeValue === m.value || activeModeValue === m.key);

    return (
        <FormSection title="Game mode" description="Sets team size and which maps and rules apply.">
            <Field label="Mode" hint={hint} lockedReason={locked ? 'Locked once the tournament exists, to protect registrations.' : undefined}>
                {locked ? (
                    <p className="text-sm text-zinc-200">{activeMode?.name ?? '—'}</p>
                ) : (
                    <div className="space-y-2">
                        <ChipGroup
                            label="Game mode"
                            value={activeGroup?.key ?? null}
                            onChange={onGroupChange}
                            options={groups.map((g) => ({ value: g.key, label: g.label }))}
                        />
                        {activeGroup && activeGroup.modes.length > 1 && (
                            <ChipGroup
                                label="Mode variant"
                                value={activeVariant ? activeVariant.key || activeVariant.value : null}
                                onChange={onModeChange}
                                options={activeGroup.modes.map((m) => ({ value: m.key || m.value, label: m.variantLabel || m.name }))}
                            />
                        )}
                    </div>
                )}
            </Field>
        </FormSection>
    );
}
