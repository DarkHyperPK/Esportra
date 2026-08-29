/**
 * useTournamentWizard — Domain 4: Multi-step Tournament Create/Edit
 *
 * Migrated submit handler to .NET API:
 *   CREATE: POST /api/tournaments (handles tournament + stages + map pool in one transaction)
 *   UPDATE: PUT  /api/tournaments/{id} (tournament fields only)
 *           Stage diff + map pool management kept in Supabase (complex diff logic).
 *
 * All wizard state management (steps, validation, localStorage draft) is unchanged.
 */

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { fetchCurrentOrganizationId } from '@/lib/currentOrganization';
import { TournamentWizardData, DEFAULT_WIZARD_DATA, WIZARD_STEPS } from '@/types/tournamentWizard';
import { validateStep } from '@/schemas/tournamentSchema';
import { firstWizardErrorStep, summarizeWizardErrors } from '@/utils/wizardValidation';
import { getGameByName, getDefaultGameMode, getDefaultTeamSize, isBattleRoyale, getBRConfig, getEffectiveGameFeatures } from '@/utils/gameFeatures';
import { catalogGameHasBRMaps } from '@/utils/gameCatalogBr';
import { deriveDefaultLobbyUnits } from '@/utils/brGameContext';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import slugify from 'slugify';
import {
    launchStateToCreatePayload,
    launchStateToUpdatePayload,
    type LaunchState,
} from '@/utils/tournamentVisibilityUtils';

function migrateWizardDraft(parsed: Record<string, unknown>): TournamentWizardData {
    const merged = { ...DEFAULT_WIZARD_DATA, ...parsed } as TournamentWizardData & { visibility?: string };
    if (!merged.launchState && merged.visibility) {
        merged.launchState = merged.visibility === 'public' ? 'public' : 'draft';
    }
    if (!merged.launchState) {
        merged.launchState = 'draft';
    }
    return merged;
}

const STORAGE_KEY = 'tournament_wizard_draft';
const STEP_KEY = 'tournament_wizard_step';

function deriveGameDefaults(gameName: string): Partial<TournamentWizardData> {
    const game = getGameByName(gameName);
    if (!game) return {};

    const defaultMode = getDefaultGameMode(gameName);
    const gameMode = defaultMode?.value || '';
    const teamSize = getDefaultTeamSize(gameName, gameMode);
    const modeFeatures = getEffectiveGameFeatures(gameName, gameMode);

    const defaults: Partial<TournamentWizardData> = {
        gameMode,
        teamSize,
        mapVetoEnabled: modeFeatures.mapVeto,
        mapPoolIds: [],
    };

    if (isBattleRoyale(gameName)) {
        defaults.tournamentType = 'battle_royale';
        const brConfig = getBRConfig(gameName);
        if (brConfig) {
            defaults.brGameCount = brConfig.defaultGameCount;
            defaults.brScoringPreset = brConfig.defaultPreset;
            defaults.brDefaultLobbySize = deriveDefaultLobbyUnits(teamSize, brConfig.playersPerLobby);
            defaults.brDefaultMapMode = brConfig.defaultMapMode
              ?? (catalogGameHasBRMaps(brConfig) ? 'per_round' : 'none');
            const preset = brConfig.scoringPresets[brConfig.defaultPreset];
            if (preset) defaults.brKillCap = preset.killCap;
        }
    } else {
        defaults.tournamentType = 'bracket';
    }

    return defaults;
}

function deriveGameModeDefaults(gameName: string, gameMode: string, currentMapVeto: boolean | undefined): Partial<TournamentWizardData> {
    const modeFeatures = getEffectiveGameFeatures(gameName, gameMode);
    const result: Partial<TournamentWizardData> = {};
    result.mapVetoEnabled = modeFeatures.mapVeto ? currentMapVeto : false;
    if (!modeFeatures.mapPool) result.mapPoolIds = [];
    return result;
}

function parseMoney(val: string): number {
    if (val.toLowerCase() === 'free') return 0;
    const num = parseFloat(val.replace(/[^0-9.]/g, ''));
    if (!isFinite(num) || isNaN(num)) return 0;
    return Math.round(Math.min(Math.max(0, num), 99999999.99) * 100) / 100;
}

interface TournamentDates {
    startDateTime: Date;
    endDateTime: Date;
    registrationCloses: Date;
    registrationOpens: Date | null;
}

function buildTournamentDates(data: TournamentWizardData): TournamentDates {
    const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
    const endDateTime = data.endDate && data.endTime
        ? new Date(`${data.endDate}T${data.endTime}`)
        : new Date(startDateTime.getTime() + 4 * 60 * 60 * 1000);
    const registrationCloses = data.registrationCloses
        ? new Date(data.registrationCloses)
        : new Date(startDateTime.getTime() - 24 * 60 * 60 * 1000);
    const registrationOpens = data.registrationOpens
        ? new Date(data.registrationOpens)
        : null;
    return { startDateTime, endDateTime, registrationCloses, registrationOpens };
}

function buildTournamentSettings(
    data: TournamentWizardData,
    modeFeatures: { assistedReporting?: boolean; mapVeto?: boolean },
    registrationOpens: Date | null,
): Record<string, unknown> {
    return {
        assistedMatchReporting: modeFeatures.assistedReporting ? (data.assistedMatchReporting ?? false) : false,
        checkInWindowMinutes: data.checkInWindowMinutes || 30,
        mapVetoEnabled: modeFeatures.mapVeto ? (data.mapVetoEnabled ?? true) : false,
        reservedInviteSlots: data.invitedTeamsEnabled ? data.reservedInviteSlots : 0,
        inviteExpiryDays: data.inviteExpiryDays || 7,
        ...(registrationOpens ? { registrationOpensAt: registrationOpens.toISOString() } : {}),
        ...(data.tournamentType === 'battle_royale' ? {
            brScoringPreset: data.brScoringPreset,
            brCustomScoring: data.brCustomScoring,
            brKillCap: data.brKillCap,
            brTiebreaker: data.brTiebreaker,
            brDefaultLobbySize: data.brDefaultLobbySize,
            brDefaultMapMode: data.brDefaultMapMode,
        } : {}),
    };
}

function buildStagesForCreate(data: TournamentWizardData) {
    if (data.tournamentType === 'battle_royale') return [];
    return data.stages.map((s, i) => {
        const stageAny = s as any;
        const hasOverrides = stageAny.bo_mode === 'per_round' && Object.keys(stageAny.round_bo_overrides ?? {}).length > 0;
        return {
            name:             s.name,
            format:           s.format,
            stageOrder:       s.stage_order ?? i + 1,
            bestOf:           stageAny.best_of ?? 1,
            boMode:           stageAny.bo_mode ?? 'per_stage',
            capacity:         stageAny.capacity ?? null,
            advancementCount: stageAny.advancement_count ?? null,
            ...(hasOverrides ? { roundBoOverrides: stageAny.round_bo_overrides } : {}),
            ...(stageAny.config ? { config: stageAny.config } : {}),
        };
    });
}

function buildStagesForSync(data: TournamentWizardData) {
    if (data.tournamentType === 'battle_royale') return [];
    return data.stages.map(s => ({
        id:               (s as any).id || null,
        name:             s.name,
        format:           s.format,
        stageOrder:       s.stage_order,
        bestOf:           (s as any).best_of || 1,
        capacity:         (s as any).capacity || null,
        advancementCount: (s as any).advancement_count || null,
    }));
}

function validateReservedSlots(
    data: TournamentWizardData,
    tournamentId: string | undefined,
    activeInvitationCount: number | undefined,
): string | null {
    const count = activeInvitationCount ?? 0;
    const reserved = data.invitedTeamsEnabled ? data.reservedInviteSlots : 0;
    if (!tournamentId || count === 0 || reserved >= count) return null;
    return `Reserved slots cannot be less than ${count} active invitation${count === 1 ? '' : 's'}. Revoke invitations first.`;
}

function resolveGameMode(data: TournamentWizardData): string | undefined {
    return data.gameMode || getDefaultGameMode(data.game)?.value || undefined;
}

function emptyToNull(val: string | undefined | null): string | null {
    return val || null;
}

function buildCommonFields(
    data: TournamentWizardData,
    dates: TournamentDates,
    resolvedGameMode: string | undefined,
    settings: Record<string, unknown>,
): Record<string, unknown> {
    return {
        name:                 data.name,
        description:          data.description,
        maxTeams:             data.maxTeams,
        teamSize:             data.teamSize,
        gameMode:             resolvedGameMode,
        entryFee:             parseMoney(data.entryFee),
        prizePool:            parseMoney(data.prizePool),
        startDate:            dates.startDateTime.toISOString(),
        endDate:              dates.endDateTime.toISOString(),
        registrationDeadline: dates.registrationCloses.toISOString(),
        bannerUrl:            data.bannerUrl,
        logoUrl:              data.logoUrl,
        checkInRequired:      data.checkInRequired,
        checkInDeadline:      data.checkInRequired ? dates.startDateTime.toISOString() : undefined,
        streamUrl:            emptyToNull(data.streamUrl),
        rules:                emptyToNull(data.rules),
        paymentInstructions:  emptyToNull(data.paymentInstructions),
        region:               emptyToNull(data.region),
        currency:             data.currency || 'USD',
        payoutMethod:         data.payoutMethod || 'manual',
        manualPayoutNotes:    emptyToNull(data.manualPayoutNotes),
        prizeDistribution:    data.prizeDistribution ?? null,
        reservedInviteSlots:  data.invitedTeamsEnabled ? data.reservedInviteSlots : 0,
        inviteExpiryDays:     data.inviteExpiryDays || 7,
        settings,
    };
}

async function submitUpdateTournament(
    data: TournamentWizardData,
    tournamentId: string,
    dates: TournamentDates,
    resolvedGameMode: string | undefined,
    settings: Record<string, unknown>,
    initialData?: TournamentWizardData,
): Promise<void> {
    const launchPayload = launchStateToUpdatePayload(
        data.launchState,
        data.status || initialData?.status,
    );
    const updatePayload: Record<string, unknown> = {
        ...buildCommonFields(data, dates, resolvedGameMode, settings),
        isPublic: launchPayload.isPublic,
    };

    if (launchPayload.status && launchPayload.status !== initialData?.status) {
        updatePayload.status = launchPayload.status;
    }

    await apiClient.put(`/api/tournaments/${tournamentId}`, updatePayload);

    const stagesToSync = buildStagesForSync(data);
    if (data.tournamentType !== 'battle_royale' && (stagesToSync.length > 0 || initialData?.stages)) {
        await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: stagesToSync });
    }

    if (data.mapPoolIds) {
        await apiClient.put(`/api/tournaments/${tournamentId}/map-pools`, { mapIds: data.mapPoolIds });
    }
}

async function submitCreateTournament(
    data: TournamentWizardData,
    slug: string,
    organizationId: string | null | undefined,
    dates: TournamentDates,
    resolvedGameMode: string | undefined,
    settings: Record<string, unknown>,
): Promise<{ slug: string }> {
    const createLaunch = launchStateToCreatePayload(data.launchState as LaunchState);

    return await apiClient.post<{ slug: string }>('/api/tournaments', {
        ...buildCommonFields(data, dates, resolvedGameMode, settings),
        slug,
        game:                 data.game,
        status:               createLaunch.status,
        isPublic:             createLaunch.isPublic,
        organizationId:       organizationId ?? undefined,
        autoRemoveUnchecked:  data.autoRemoveUnchecked,
        tournamentType:       data.tournamentType || 'bracket',
        serverRegion:         emptyToNull(data.serverRegion),
        stages:               buildStagesForCreate(data),
        mapPoolIds:           data.mapPoolIds ?? [],
    });
}

export const useTournamentWizard = (
    initialData?: TournamentWizardData,
    tournamentId?: string,
    options?: { activeInvitationCount?: number },
) => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    useGameCatalog();

    const [currentStep, setCurrentStepRaw] = useState(() => {
        if (typeof window !== 'undefined' && !tournamentId) {
            const saved = parseInt(localStorage.getItem(STEP_KEY) || '1', 10);
            return saved >= 1 && saved <= 7 ? saved : 1;
        }
        return 1;
    });
    const setCurrentStep = useCallback((step: number | ((prev: number) => number)) => {
        setCurrentStepRaw(step);
        if (typeof window !== 'undefined' && !tournamentId) {
            localStorage.setItem(STEP_KEY, String(step));
        }
    }, [tournamentId]);
    const [data, setData] = useState<TournamentWizardData>(() => {
        if (initialData) return initialData;
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try { return migrateWizardDraft(JSON.parse(saved)); } catch { /* ignore corrupt draft */ }
            }
        }
        return DEFAULT_WIZARD_DATA;
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stepValidation, setStepValidation] = useState<Record<number, boolean>>({});

    useEffect(() => {
        if (typeof window !== 'undefined' && !tournamentId) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
    }, [data, tournamentId]);

    const updateData = useCallback((updates: Partial<TournamentWizardData>) => {
        setData(prev => {
            const newData = { ...prev, ...updates };
            if (updates.game && updates.game !== prev.game) {
                Object.assign(newData, deriveGameDefaults(updates.game));
            }
            if (updates.gameMode !== undefined && updates.gameMode !== prev.gameMode) {
                Object.assign(newData, deriveGameModeDefaults(newData.game, updates.gameMode, newData.mapVetoEnabled));
            }
            return newData;
        });
        Object.keys(updates).forEach(key => {
            if (errors[key]) {
                setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
            }
        });
    }, [errors]);

    const validateCurrentStep = useCallback(() => {
        const result = validateStep(currentStep, data);

        // Map veto games require an exact map pool size (e.g. Valorant/CS2 = 7, R6 = 9)
        if (currentStep === 2 && data.game) {
            const modeFeatures = getEffectiveGameFeatures(data.game, data.gameMode);
            const mapVetoEnabled = modeFeatures.mapVeto && (data.mapVetoEnabled ?? true);
            if (modeFeatures.mapPool && mapVetoEnabled) {
                const requiredCount = modeFeatures.mapPoolSize ?? 7;
                const selectedCount = data.mapPoolIds?.length ?? 0;
                if (selectedCount !== requiredCount) {
                    result.valid = false;
                    result.errors.mapPoolIds = `Select exactly ${requiredCount} maps for the veto pool (${selectedCount} selected).`;
                }
            }
        }

        setErrors(result.errors);
        setStepValidation(prev => ({ ...prev, [currentStep]: result.valid }));
        return result.valid;
    }, [currentStep, data]);

    const nextStep = useCallback(() => {
        const result = validateStep(currentStep, data);
        if (currentStep === 2 && data.game) {
            const modeFeatures = getEffectiveGameFeatures(data.game, data.gameMode);
            const mapVetoEnabled = modeFeatures.mapVeto && (data.mapVetoEnabled ?? true);
            if (modeFeatures.mapPool && mapVetoEnabled) {
                const requiredCount = modeFeatures.mapPoolSize ?? 7;
                const selectedCount = data.mapPoolIds?.length ?? 0;
                if (selectedCount !== requiredCount) {
                    result.valid = false;
                    result.errors.mapPoolIds = `Select exactly ${requiredCount} maps for the veto pool (${selectedCount} selected).`;
                }
            }
        }

        if (result.valid) {
            setErrors({});
            setStepValidation(prev => ({ ...prev, [currentStep]: true }));
            setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length));
            return;
        }

        setErrors(result.errors);
        setStepValidation(prev => ({ ...prev, [currentStep]: false }));
        toast({
            title: 'Fix these items to continue',
            description: summarizeWizardErrors(result.errors),
            variant: 'destructive',
        });
    }, [currentStep, data, toast, setCurrentStep]);

    const prevStep = useCallback(() => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    }, [setCurrentStep]);

    const goToStep = useCallback((step: number) => {
        if (step <= currentStep || stepValidation[step - 1]) setCurrentStep(step);
    }, [currentStep, stepValidation, setCurrentStep]);

    const clearDraft = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STEP_KEY);
        setData(DEFAULT_WIZARD_DATA);
        setCurrentStepRaw(1);
        setErrors({});
    }, []);

    const submitTournament = useCallback(async () => {
        if (!user) {
            toast({ title: 'Authentication Required', description: 'Please sign in to create a tournament.', variant: 'destructive' });
            return;
        }

        const allValid = validateStep(7, data);
        if (!allValid.valid) {
            setErrors(allValid.errors);
            const errorStep = firstWizardErrorStep(allValid.errors);
            if (errorStep < 7) setCurrentStep(errorStep);
            toast({
                title: 'Fix these items before creating',
                description: summarizeWizardErrors(allValid.errors),
                variant: 'destructive',
            });
            return;
        }

        const inviteError = validateReservedSlots(data, tournamentId, options?.activeInvitationCount);
        if (inviteError) {
            setErrors({ reservedInviteSlots: inviteError });
            toast({ title: 'Validation Error', description: inviteError, variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);

        try {
            const dates = buildTournamentDates(data);
            const resolvedGameMode = resolveGameMode(data);
            const modeFeatures = getEffectiveGameFeatures(data.game, resolvedGameMode);
            const settings = buildTournamentSettings(data, modeFeatures, dates.registrationOpens);

            if (tournamentId) {
                await submitUpdateTournament(data, tournamentId, dates, resolvedGameMode, settings, initialData);

                toast({ title: 'Tournament Updated', description: 'Your tournament has been updated successfully.' });
                queryClient.invalidateQueries({ queryKey: ['tournament-dashboard'] });
                queryClient.invalidateQueries({ queryKey: ['tournament'] });
                navigate(`/organizer/tournament/${tournamentId}`);
            } else {
                const slug = slugify(data.name, { lower: true, strict: true });
                const organizationId = await fetchCurrentOrganizationId();
                const tournament = await submitCreateTournament(data, slug, organizationId, dates, resolvedGameMode, settings);

                clearDraft();
                toast({ title: 'Tournament Created!', description: 'Your tournament has been created successfully.' });
                navigate(`/organizer/tournament/${tournament.slug}`);
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to save tournament';
            toast({ title: 'Error', description: message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    }, [user, data, toast, navigate, clearDraft, tournamentId, initialData, queryClient, options?.activeInvitationCount, setCurrentStep]);

    return {
        currentStep,
        data,
        errors,
        isSubmitting,
        stepValidation,
        updateData,
        validateCurrentStep,
        nextStep,
        prevStep,
        goToStep,
        clearDraft,
        submitTournament,
    };
};
