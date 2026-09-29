import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CONTROL_CLASS, CONTROL_ERROR_CLASS, Field, FormSection, InlineNotice } from '@/components/ui/kit';
import { WizardStepProps } from '@/types/tournamentWizard';
import TournamentMapPoolSelector from './TournamentMapPoolSelector';
import InlineStageEditor from './InlineStageEditor';
import { GameModeSection } from './GameModeSection';
import { BRScoringSection } from './BRScoringSection';
import { WizardStepFrame } from './WizardStepFrame';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { getGameByName, isBattleRoyale, getBRConfig, getGameModes, getGameMode, getGameModeGroups, getEffectiveGameFeatures } from '@/utils/gameFeatures';
import { deriveDefaultLobbyUnits } from '@/utils/brGameContext';

const BRACKET_SIZES = [4, 8, 16, 32, 64, 128, 256, 512, 1024];

function brUnitNames(teamSize: number) {
    if (teamSize === 1) return { one: 'player', many: 'players' };
    if (teamSize === 2) return { one: 'duo', many: 'duos' };
    if (teamSize === 3) return { one: 'trio', many: 'trios' };
    return { one: 'squad', many: 'squads' };
}

function brCapacityOptions(teamSize: number, unitsPerLobby: number) {
    const raw = [1, 2, 3, 4, 5, 8, 10].map((n) => n * unitsPerLobby);
    const fixed = teamSize === 1 ? [20, 30, 40, 60, 100, 150, 200] : teamSize === 2 ? [10, 16, 20, 30, 50, 60, 100] : [8, 10, 16, 20, 30, 40, 50];
    return [...new Set([...raw, ...fixed])].filter((n) => n >= 4 && n <= 500).sort((a, b) => a - b);
}

const StepFormatRules: React.FC<WizardStepProps> = ({ data, updateData, errors, isEditMode, tournamentId, participantsCount }) => {
    const { toast } = useToast();
    const selectedGame = getGameByName(data.game || '');
    const isBR = isBattleRoyale(data.game || '');
    const brConfig = getBRConfig(data.game || '');
    const selectedGameModes = selectedGame ? getGameModes(selectedGame.name) : [];
    const selectedGameModeGroups = selectedGame ? getGameModeGroups(selectedGame.name) : [];
    const explicitGameMode = data.gameMode ? getGameMode(data.game || '', data.gameMode) : undefined;
    const activeGameMode = explicitGameMode
        ?? selectedGameModes.find((mode) => mode.teamSize === data.teamSize)
        ?? (selectedGame ? getGameMode(selectedGame.name, selectedGame.defaultMode || selectedGame.defaultFormat) : undefined)
        ?? selectedGameModes[0];
    const activeGameModeValue = activeGameMode ? (activeGameMode.key || activeGameMode.value) : '';
    const gameFeatures = getEffectiveGameFeatures(data.game || '', activeGameModeValue);
    const hasMapPool = gameFeatures.mapPool;
    const mapPoolSizeLimit = gameFeatures.mapPoolSize ?? 7;
    const mapVetoEnabled = gameFeatures.mapVeto && (data.mapVetoEnabled ?? true);
    const exactMapPoolRequired = hasMapPool && mapVetoEnabled;
    const activeTeamSize = activeGameMode?.teamSize ?? data.teamSize ?? 1;
    const isGameModeLocked = Boolean(isEditMode || tournamentId);
    const activeModeGroup = selectedGameModeGroups.find((group) =>
        group.modes.some((mode) => activeGameModeValue === mode.value || activeGameModeValue === mode.key),
    );

    const handleGameModeChange = (modeValue: string) => {
        const mode = selectedGameModes.find((c) => (c.key || c.value) === modeValue || c.value === modeValue);
        if (!mode) return;
        const modeFeatures = getEffectiveGameFeatures(data.game || '', mode.value);
        const updates: Partial<typeof data> = { gameMode: mode.value, teamSize: mode.teamSize, mapVetoEnabled: modeFeatures.mapVeto, mapPoolIds: [] };
        if (isBR && brConfig) {
            const unitsPerLobby = deriveDefaultLobbyUnits(mode.teamSize, brConfig.playersPerLobby);
            const validOptions = [20, 30, 40, 60, 100, 150, 200];
            updates.maxTeams = validOptions.find((n) => n >= unitsPerLobby * 5) ?? validOptions[validOptions.length - 1];
            updates.brDefaultLobbySize = unitsPerLobby;
        }
        updateData(updates);
    };

    useEffect(() => {
        if (!selectedGame || !activeGameMode) return;
        if (data.gameMode !== activeGameMode.value || data.teamSize !== activeGameMode.teamSize) {
            updateData({ gameMode: activeGameMode.value, teamSize: activeGameMode.teamSize });
        }
    }, [selectedGame, activeGameMode, data.game, data.gameMode, data.teamSize, updateData]);

    const [availableMaps, setAvailableMaps] = useState<{ id: string; map_name: string; map_image_url?: string }[]>([]);
    const [loadingMaps, setLoadingMaps] = useState(false);

    useEffect(() => {
        const fetchMaps = async () => {
            if (!data.game || !hasMapPool) {
                setAvailableMaps([]);
                return;
            }
            setLoadingMaps(true);
            try {
                const gameLower = data.game.toLowerCase();
                const dbGameName = ['cs2', 'counter-strike 2'].includes(gameLower)
                    ? 'Counter-Strike 2'
                    : ['r6', 'r6s', 'rainbow six siege', 'rainbow-six-siege'].includes(gameLower) ? 'Rainbow Six Siege' : data.game;
                const maps = await apiClient.get<{ id: string; map_name: string; map_image_url?: string }[]>(
                    `/api/games/maps?game=${encodeURIComponent(dbGameName)}${activeGameModeValue ? `&mode=${encodeURIComponent(activeGameModeValue)}` : ''}`,
                );
                setAvailableMaps(maps || []);
                // Auto-select only on initial load for this game/mode (not when the user toggles maps).
                if (maps && maps.length > 0) {
                    if (!data.mapPoolIds || data.mapPoolIds.length === 0) updateData({ mapPoolIds: maps.slice(0, mapPoolSizeLimit).map((m) => m.id) });
                } else {
                    updateData({ mapPoolIds: [] });
                }
            } catch {
                setAvailableMaps([]);
            } finally {
                setLoadingMaps(false);
            }
        };
        fetchMaps();
        // Intentionally omit data.mapPoolIds — selection changes must not re-fetch the catalog.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data.game, activeGameModeValue, hasMapPool, mapPoolSizeLimit, updateData]);

    const handleMaxTeams = (value: string) => {
        const next = parseInt(value, 10);
        if (participantsCount && next !== 0 && next < participantsCount) {
            toast({
                title: 'That limit is too low',
                description: `${participantsCount} teams have already registered. Choose ${participantsCount} or more.`,
                variant: 'destructive',
            });
            return;
        }
        updateData({ maxTeams: next });
    };

    const errorSummary = Object.values(errors).filter(Boolean) as string[];
    const modeSection = selectedGameModes.length > 1 ? (
        <GameModeSection
            groups={selectedGameModeGroups}
            activeGroup={activeModeGroup}
            activeMode={activeGameMode}
            activeModeValue={activeGameModeValue}
            teamSize={activeTeamSize}
            locked={isGameModeLocked}
            onGroupChange={(key) => {
                const mode = selectedGameModeGroups.find((g) => g.key === key)?.modes[0];
                if (mode) handleGameModeChange(mode.key || mode.value);
            }}
            onModeChange={handleGameModeChange}
        />
    ) : null;

    const brUnits = brUnitNames(data.teamSize ?? 1);
    const unitsPerLobby = brConfig ? deriveDefaultLobbyUnits(data.teamSize ?? 1, brConfig.playersPerLobby) : deriveDefaultLobbyUnits(data.teamSize ?? 1);

    return (
        <WizardStepFrame
            title={isBR ? 'Format and scoring' : 'Format and rules'}
            description={isBR
                ? 'How many teams play, how points are scored and how ties are broken.'
                : 'How teams progress, how big the bracket is and which maps are played.'}
            errorSummary={errorSummary}
        >
            {isBR && brConfig ? (
                <>
                    {modeSection}
                    <BRScoringSection config={brConfig} data={data} locked={Boolean(isEditMode)} updateData={updateData} />
                    <FormSection title="Capacity">
                        <Field
                            label={`Maximum ${brUnits.many}`}
                            htmlFor="br-max"
                            error={errors.maxTeams}
                            hint={brConfig.playersPerLobby
                                ? `One lobby fits ${unitsPerLobby} ${brUnits.many}${(data.teamSize ?? 1) > 1 ? ` of ${data.teamSize} players` : ''}. Lobby sizes can be tuned per stage later.`
                                : undefined}
                        >
                            <Select value={String(data.maxTeams)} onValueChange={(v) => updateData({ maxTeams: parseInt(v, 10) })} disabled={isEditMode}>
                                <SelectTrigger id="br-max" className={cn(CONTROL_CLASS, errors.maxTeams && CONTROL_ERROR_CLASS)}>
                                    <SelectValue placeholder={`Choose a limit`} />
                                </SelectTrigger>
                                <SelectContent>
                                    {brCapacityOptions(data.teamSize ?? 1, unitsPerLobby).map((n) => (
                                        <SelectItem key={n} value={String(n)}>{n} {brUnits.many}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </Field>
                    </FormSection>
                </>
            ) : (
                <>
                    <FormSection
                        title="Stages"
                        description={tournamentId ? undefined : 'Most events use one bracket. Add a group or Swiss stage before playoffs for longer events.'}
                    >
                        {tournamentId ? (
                            <InlineNotice tone="neutral">
                                Stages, advancement and seeding are managed from the dashboard, under Format and stages.
                            </InlineNotice>
                        ) : (
                            <InlineStageEditor stages={data.stages} maxTeams={data.maxTeams} onChange={(stages) => updateData({ stages })} />
                        )}
                    </FormSection>

                    {modeSection}

                    <FormSection title="Size">
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field label="Maximum teams" htmlFor="max-teams" hint="If fewer sign up, the bracket shrinks to fit.">
                                <Select value={String(data.maxTeams)} onValueChange={handleMaxTeams} disabled={isEditMode}>
                                    <SelectTrigger id="max-teams" className={CONTROL_CLASS}><SelectValue placeholder="Choose a limit" /></SelectTrigger>
                                    <SelectContent>
                                        {BRACKET_SIZES.map((n) => <SelectItem key={n} value={String(n)}>{n} teams</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field
                                label="Players per team"
                                htmlFor="team-size"
                                hint={activeGameMode ? `Set by ${activeGameMode.name}.` : 'Include substitutes.'}
                            >
                                <Input
                                    id="team-size" type="number" min={1} max={10} value={activeTeamSize} disabled={Boolean(activeGameMode)}
                                    onChange={(e) => updateData({ teamSize: parseInt(e.target.value, 10) || 1 })}
                                    className={CONTROL_CLASS}
                                />
                            </Field>
                        </div>
                    </FormSection>

                    {hasMapPool && data.game && (
                        <FormSection
                            title="Map pool"
                            description={!mapVetoEnabled
                                ? 'Pick the maps you will rotate through. There is no captain veto in this mode.'
                                : exactMapPoolRequired
                                    ? `Pick exactly ${mapPoolSizeLimit} maps. Captains ban and pick from these before each match.`
                                    : 'Pick the maps captains ban and pick from before each match.'}
                        >
                            {errors.mapPoolIds && <p role="alert" className="text-xs text-red-300">{errors.mapPoolIds}</p>}
                            <TournamentMapPoolSelector
                                game={data.game}
                                requiredCount={mapPoolSizeLimit}
                                availableMaps={availableMaps}
                                selectedIds={data.mapPoolIds || []}
                                onChange={(mapPoolIds) => updateData({ mapPoolIds })}
                                mapVetoEnabled={exactMapPoolRequired}
                                loading={loadingMaps}
                            />
                        </FormSection>
                    )}
                </>
            )}

            <FormSection title="Rules">
                <Field label="Tournament rules" htmlFor="rules" optional hint="Shown on the public page under Rules. One rule per line reads best.">
                    <Textarea
                        id="rules"
                        value={data.rules || ''}
                        onChange={(e) => updateData({ rules: e.target.value })}
                        placeholder={'1. Check in 30 minutes before your first match.\n2. No third-party software.\n3. Report disputes within 5 minutes of the match ending.'}
                        rows={7}
                        className={cn(CONTROL_CLASS, 'h-auto resize-y py-3 text-sm leading-relaxed')}
                    />
                </Field>
            </FormSection>
        </WizardStepFrame>
    );
};

export default StepFormatRules;
