import React from 'react';
import { EyeOff, Globe, Link2, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ChipGroup,
    ChoiceCard,
    ChoiceGroup,
    CONTROL_CLASS,
    CONTROL_ERROR_CLASS,
    Field,
    FormSection,
    InlineNotice,
} from '@/components/ui/kit';
import type { LaunchState } from '@/utils/tournamentVisibilityUtils';
import { LAUNCH_STATE_DESCRIPTIONS, LAUNCH_STATE_LABELS } from '@/utils/tournamentVisibilityUtils';
import { WizardStepProps } from '@/types/tournamentWizard';
import { cn } from '@/lib/utils';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import {
    EsportsGame,
    getBRConfig,
    getDefaultGameMode,
    getDefaultTeamSize,
    getEffectiveGameFeatures,
    getGameByName,
    getGameModeGroups,
    getGameModes,
    isBattleRoyale,
    listCatalogGames,
} from '@/utils/gameFeatures';
import { GameLogoImageFromCatalog } from '@/components/games/GameLogoImage';
import { WizardStepFrame } from './WizardStepFrame';

const LOCKED = 'Locked once the tournament exists, to protect registrations.';

const REGIONS = [
    { value: 'na-east', label: 'North America East' },
    { value: 'na-west', label: 'North America West' },
    { value: 'latam', label: 'Latin America' },
    { value: 'eu', label: 'Europe' },
    { value: 'me', label: 'Middle East' },
    { value: 'sea', label: 'Southeast Asia' },
    { value: 'oce', label: 'Oceania' },
];

const STATUSES = [
    { value: 'draft', label: 'Draft' },
    { value: 'published', label: 'Published, not yet open' },
    { value: 'open', label: 'Registration open' },
    { value: 'closed', label: 'Registration closed' },
    { value: 'ongoing', label: 'Live' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

const LAUNCH_ICONS: Record<LaunchState, typeof Globe> = { draft: EyeOff, private: Link2, public: Globe };

const StepBasicInfo: React.FC<WizardStepProps> = ({ data, updateData, errors, isEditMode }) => {
    useGameCatalog();
    const catalogGames = listCatalogGames();
    const selectedGame = getGameByName(data.game) as EsportsGame | undefined;
    const selectedGameModes = selectedGame ? getGameModes(selectedGame.name) : [];
    const selectedGameModeGroups = selectedGame ? getGameModeGroups(selectedGame.name) : [];
    const selectedGameModeValue = data.gameMode || getDefaultGameMode(data.game)?.value || '';
    const today = new Date().toISOString().split('T')[0];
    const lockedReason = isEditMode ? LOCKED : undefined;

    const handleGameChange = (gameName: string) => {
        const game = getGameByName(gameName);
        const defaultMode = game ? getDefaultGameMode(game.name) : undefined;
        const teamSize = game ? getDefaultTeamSize(game.name, defaultMode?.value) : data.teamSize;
        const modeFeatures = getEffectiveGameFeatures(gameName, defaultMode?.value);
        updateData({ game: gameName, gameMode: defaultMode?.value || '', teamSize, mapVetoEnabled: modeFeatures.mapVeto, mapPoolIds: [] });
    };

    const handleModeChange = (modeValue: string) => {
        const mode = selectedGameModes.find((m) => (m.key || m.value) === modeValue || m.value === modeValue);
        if (!mode) return;
        const modeFeatures = getEffectiveGameFeatures(data.game || '', mode.value);
        updateData({ gameMode: mode.value, teamSize: mode.teamSize, mapVetoEnabled: modeFeatures.mapVeto, mapPoolIds: [] });
    };

    const activeModeGroup = selectedGameModeGroups.find((group) =>
        group.modes.some((mode) => selectedGameModeValue === mode.value || selectedGameModeValue === mode.key),
    );
    const brLobby = selectedGame && isBattleRoyale(selectedGame.name) ? getBRConfig(selectedGame.name)?.playersPerLobby : undefined;

    return (
        <WizardStepFrame
            title="The basics"
            description="What players will see first: the name, the game, when it happens and who can find it."
        >
            {isEditMode && (
                <FormSection title="Status" description="Moving a live or finished event back can confuse players. Change it only to fix a mistake.">
                    <Field label="Current status" htmlFor="status">
                        <Select value={data.status} onValueChange={(value) => updateData({ status: value })}>
                            <SelectTrigger id="status" className={CONTROL_CLASS}><SelectValue placeholder="Choose a status" /></SelectTrigger>
                            <SelectContent>
                                {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </Field>
                </FormSection>
            )}

            <FormSection title="Name and game">
                <Field label="Tournament name" htmlFor="name" hint="Shown on the listing, the bracket and every match page." error={errors.name}>
                    <Input
                        id="name"
                        placeholder="e.g. Karachi Winter Cup"
                        value={data.name}
                        onChange={(e) => updateData({ name: e.target.value })}
                        className={cn(CONTROL_CLASS, errors.name && CONTROL_ERROR_CLASS)}
                    />
                </Field>

                <Field label="Game" htmlFor="game" error={errors.game} lockedReason={lockedReason}>
                    <Select value={data.game} onValueChange={handleGameChange} disabled={isEditMode}>
                        <SelectTrigger id="game" className={cn(CONTROL_CLASS, errors.game && CONTROL_ERROR_CLASS)}>
                            <SelectValue placeholder="Choose a game" />
                        </SelectTrigger>
                        <SelectContent>
                            {catalogGames.filter((game) => game.slug !== 'cs2').map((game) => (
                                <SelectItem key={game.name} value={game.name}>
                                    <span className="flex items-center gap-2">
                                        <GameLogoImageFromCatalog game={game} className="h-5 w-5 object-cover" />
                                        {game.name}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </Field>

                {selectedGame && selectedGameModeGroups.length > 1 && !isEditMode && (
                    <Field label="Game mode" hint={`${data.teamSize} players per team`}>
                        <div className="space-y-2">
                            <ChipGroup
                                label="Game mode"
                                value={activeModeGroup?.key ?? null}
                                onChange={(key) => {
                                    const mode = selectedGameModeGroups.find((g) => g.key === key)?.modes[0];
                                    if (mode) handleModeChange(mode.key || mode.value);
                                }}
                                options={selectedGameModeGroups.map((g) => ({ value: g.key, label: g.label }))}
                            />
                            {activeModeGroup && activeModeGroup.modes.length > 1 && (
                                <ChipGroup
                                    label="Mode variant"
                                    value={(() => {
                                        const active = activeModeGroup.modes.find((m) => selectedGameModeValue === m.value || selectedGameModeValue === m.key);
                                        return active ? active.key || active.value : null;
                                    })()}
                                    onChange={(value) => handleModeChange(value)}
                                    options={activeModeGroup.modes.map((m) => ({ value: m.key || m.value, label: m.variantLabel || m.name }))}
                                />
                            )}
                        </div>
                    </Field>
                )}

                {brLobby !== undefined && selectedGame && (
                    <InlineNotice tone="neutral" title="Points-based format">
                        {selectedGame.name} is scored on placement and eliminations across several games
                        {brLobby ? `, with up to ${brLobby} players per lobby` : ''}.
                    </InlineNotice>
                )}
            </FormSection>

            <FormSection title="Where it's played">
                <ChoiceGroup label="Where it's played" columns={2}>
                    <ChoiceCard selected={data.isOnline} disabled={isEditMode} onSelect={() => updateData({ isOnline: true })}
                        icon={<Globe className="h-5 w-5" aria-hidden />} title="Online" description="Players join from home." />
                    <ChoiceCard selected={!data.isOnline} disabled={isEditMode} onSelect={() => updateData({ isOnline: false })}
                        icon={<MapPin className="h-5 w-5" aria-hidden />} title="LAN" description="Everyone plays at one venue." />
                </ChoiceGroup>
                {!data.isOnline && (
                    <Field label="Venue" htmlFor="venue" hint="Name or address, as players should type it into a map." error={errors.venue} lockedReason={lockedReason}>
                        <Input id="venue" placeholder="e.g. Arena 51, Clifton, Karachi" value={data.venue} disabled={isEditMode}
                            onChange={(e) => updateData({ venue: e.target.value })} className={cn(CONTROL_CLASS, errors.venue && CONTROL_ERROR_CLASS)} />
                    </Field>
                )}
                <Field label="Region" htmlFor="region" hint="The server region players connect to, or where the event takes place." error={errors.region} lockedReason={lockedReason}>
                    <Select value={data.region} onValueChange={(v) => updateData({ region: v })} disabled={isEditMode}>
                        <SelectTrigger id="region" className={cn(CONTROL_CLASS, errors.region && CONTROL_ERROR_CLASS)}>
                            <SelectValue placeholder="Choose a region" />
                        </SelectTrigger>
                        <SelectContent>
                            {REGIONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </Field>
            </FormSection>

            <FormSection title="When it happens" description="Registration and check-in times are set in the Registration step.">
                <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Start date" htmlFor="startDate" error={errors.startDate}>
                        <Input id="startDate" type="date" min={today} value={data.startDate}
                            onChange={(e) => updateData({ startDate: e.target.value })} className={cn(CONTROL_CLASS, errors.startDate && CONTROL_ERROR_CLASS)} />
                    </Field>
                    <Field label="Start time" htmlFor="startTime" hint="Your local time." error={errors.startTime}>
                        <Input id="startTime" type="time" value={data.startTime}
                            onChange={(e) => updateData({ startTime: e.target.value })} className={cn(CONTROL_CLASS, errors.startTime && CONTROL_ERROR_CLASS)} />
                    </Field>
                    <Field label="End date" htmlFor="endDate" optional error={errors.endDate}>
                        <Input id="endDate" type="date" min={data.startDate || today} value={data.endDate}
                            onChange={(e) => updateData({ endDate: e.target.value })} className={cn(CONTROL_CLASS, errors.endDate && CONTROL_ERROR_CLASS)} />
                    </Field>
                    <Field label="End time" htmlFor="endTime" optional error={errors.endTime}>
                        <Input id="endTime" type="time" value={data.endTime}
                            onChange={(e) => updateData({ endTime: e.target.value })} className={cn(CONTROL_CLASS, errors.endTime && CONTROL_ERROR_CLASS)} />
                    </Field>
                </div>
            </FormSection>

            <FormSection title="Who can find it" description="You can change this any time from the dashboard.">
                <ChoiceGroup label="Who can find it" columns={3}>
                    {(['draft', 'private', 'public'] as LaunchState[]).map((value) => {
                        const Icon = LAUNCH_ICONS[value];
                        return (
                            <ChoiceCard key={value} selected={data.launchState === value} onSelect={() => updateData({ launchState: value })}
                                icon={<Icon className="h-5 w-5" aria-hidden />} title={LAUNCH_STATE_LABELS[value]} description={LAUNCH_STATE_DESCRIPTIONS[value]} />
                        );
                    })}
                </ChoiceGroup>
                {errors.launchState && <p role="alert" className="text-xs text-red-300">{errors.launchState}</p>}
            </FormSection>
        </WizardStepFrame>
    );
};

export default StepBasicInfo;
