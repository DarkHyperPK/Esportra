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
    const setCurrentStep = useCallback((step: number) => {
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
                const game = getGameByName(updates.game);
                if (game) {
                    const defaultMode = getDefaultGameMode(updates.game);
                    newData.gameMode = defaultMode?.value || '';
                    newData.teamSize = getDefaultTeamSize(updates.game, newData.gameMode);
                    const modeFeatures = getEffectiveGameFeatures(updates.game, newData.gameMode);
                    newData.mapVetoEnabled = modeFeatures.mapVeto;
                    newData.mapPoolIds = [];
                    // Auto-set tournament type based on game
                    if (isBattleRoyale(updates.game)) {
                        newData.tournamentType = 'battle_royale';
                        const brConfig = getBRConfig(updates.game);
                        if (brConfig) {
                            newData.brGameCount = brConfig.defaultGameCount;
                            newData.brScoringPreset = brConfig.defaultPreset;
                            newData.brDefaultLobbySize = deriveDefaultLobbyUnits(
                              newData.teamSize,
                              brConfig.playersPerLobby,
                            );
                            newData.brDefaultMapMode = brConfig.defaultMapMode
                              ?? (catalogGameHasBRMaps(brConfig) ? 'per_round' : 'none');
                            const preset = brConfig.scoringPresets[brConfig.defaultPreset];
                            if (preset) {
                                newData.brKillCap = preset.killCap;
                            }
                        }
                    } else {
                        newData.tournamentType = 'bracket';
                    }
                }
            }
            if (updates.gameMode !== undefined && updates.gameMode !== prev.gameMode) {
                const modeFeatures = getEffectiveGameFeatures(newData.game, updates.gameMode);
                newData.mapVetoEnabled = modeFeatures.mapVeto ? newData.mapVetoEnabled : false;
                if (!modeFeatures.mapPool) {
                    newData.mapPoolIds = [];
                }
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

        const allValid = validateStep(6, data);
        if (!allValid.valid) {
            setErrors(allValid.errors);
            const errorStep = firstWizardErrorStep(allValid.errors);
            if (errorStep < 6) setCurrentStep(errorStep);
            toast({
                title: 'Fix these items before creating',
                description: summarizeWizardErrors(allValid.errors),
                variant: 'destructive',
            });
            return;
        }

        const activeInvitationCount = options?.activeInvitationCount ?? 0;
        const reservedSlots = data.invitedTeamsEnabled ? data.reservedInviteSlots : 0;
        if (tournamentId && activeInvitationCount > 0 && reservedSlots < activeInvitationCount) {
            const message = `Reserved slots cannot be less than ${activeInvitationCount} active invitation${activeInvitationCount === 1 ? '' : 's'}. Revoke invitations first.`;
            setErrors({ reservedInviteSlots: message });
            toast({ title: 'Validation Error', description: message, variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);

        try {
            // Money parser shared by both paths
            const toMoney = (val: string) => {
                if (val.toLowerCase() === 'free') return 0;
                const num = parseFloat(val.replace(/[^0-9.]/g, ''));
                if (!isFinite(num) || isNaN(num)) return 0;
                return Math.round(Math.min(Math.max(0, num), 99999999.99) * 100) / 100;
            };

            const startDateTime  = new Date(`${data.startDate}T${data.startTime}`);
            const endDateTime    = data.endDate && data.endTime
                ? new Date(`${data.endDate}T${data.endTime}`)
                : new Date(startDateTime.getTime() + 4 * 60 * 60 * 1000);
            const registrationCloses = data.registrationCloses
                ? new Date(data.registrationCloses)
                : new Date(startDateTime.getTime() - 24 * 60 * 60 * 1000);
            const registrationOpens = data.registrationOpens
                ? new Date(data.registrationOpens)
                : null;
            const resolvedGameMode = data.gameMode || getDefaultGameMode(data.game)?.value || undefined;
            const modeFeatures = getEffectiveGameFeatures(data.game, resolvedGameMode);

            if (tournamentId) {
                // ── UPDATE path ─────────────────────────────────────────────────

                // Tournament-level fields → .NET API
                const launchPayload = launchStateToUpdatePayload(
                    data.launchState,
                    data.status || initialData?.status,
                );
                const updatePayload: Record<string, unknown> = {
                    name:                 data.name,
                    description:          data.description,
                    maxTeams:             data.maxTeams,
                    teamSize:             data.teamSize,
                    gameMode:             resolvedGameMode,
                    entryFee:             toMoney(data.entryFee),
                    prizePool:            toMoney(data.prizePool),
                    startDate:            startDateTime.toISOString(),
                    endDate:              endDateTime.toISOString(),
                    registrationDeadline: registrationCloses.toISOString(),
                    bannerUrl:            data.bannerUrl,
                    logoUrl:              data.logoUrl,
                    isPublic:             launchPayload.isPublic,
                    checkInRequired:      data.checkInRequired,
                    checkInDeadline:      data.checkInRequired ? startDateTime.toISOString() : undefined,
                    rewards:              data.rewards,
                    streamUrl:            data.streamUrl || null,
                    rules:                data.rules || null,
                    paymentInstructions:  data.paymentInstructions || null,
                    region:               data.region || null,
                    currency:             data.currency || 'USD',
                    reservedInviteSlots:  data.invitedTeamsEnabled ? data.reservedInviteSlots : 0,
                    inviteExpiryDays:     data.inviteExpiryDays || 7,
                    settings:             {
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
                    },
                };

                if (launchPayload.status && launchPayload.status !== initialData?.status) {
                    updatePayload.status = launchPayload.status;
                }

                await apiClient.put(`/api/tournaments/${tournamentId}`, updatePayload);

                // Stage sync — single PUT replaces 3 sequential Supabase calls (delete/upsert/insert)
                const stagesToSync = (() => {
                    // BR stages are configured post-create via the stage setup wizard
                    if (data.tournamentType === 'battle_royale') {
                        return [];
                    }
                    return data.stages.map(s => ({
                        id:               s.id || null,
                        name:             s.name,
                        format:           s.format,
                        stageOrder:       s.stage_order,
                        bestOf:           (s as any).best_of || 1,
                        capacity:         (s as any).capacity || null,
                        advancementCount: (s as any).advancement_count || null,
                    }));
                })();

                // BR stages are managed in the organizer Stages tab — never sync from wizard on update
                if (data.tournamentType !== 'battle_royale' && (stagesToSync.length > 0 || initialData?.stages)) {
                    await apiClient.put(`/api/tournaments/${tournamentId}/stages`, {
                        stages: stagesToSync,
                    });
                }

                // Map pool — single PUT replaces delete + re-insert
                if (data.mapPoolIds) {
                    await apiClient.put(`/api/tournaments/${tournamentId}/map-pools`, {
                        mapIds: data.mapPoolIds,
                    });
                }

                toast({ title: 'Tournament Updated', description: 'Your tournament has been updated successfully.' });
                queryClient.invalidateQueries({ queryKey: ['tournament-dashboard'] });
                queryClient.invalidateQueries({ queryKey: ['tournament'] });
                navigate(`/organizer/tournament/${tournamentId}`);

            } else {
                // ── CREATE path ─────────────────────────────────────────────────
                const slug = slugify(data.name, { lower: true, strict: true });
                const organizationId = await fetchCurrentOrganizationId();

                const createLaunch = launchStateToCreatePayload(data.launchState as LaunchState);

                const tournament = await apiClient.post<{ slug: string; name?: string }>('/api/tournaments', {
                    name:                 data.name,
                    description:          data.description,
                    slug,
                    game:                 data.game,
                    gameMode:             resolvedGameMode,
                    status:               createLaunch.status,
                    maxTeams:             data.maxTeams,
                    teamSize:             data.teamSize,
                    entryFee:             toMoney(data.entryFee),
                    prizePool:            toMoney(data.prizePool),
                    startDate:            startDateTime.toISOString(),
                    endDate:              endDateTime.toISOString(),
                    registrationDeadline: registrationCloses.toISOString(),
                    bannerUrl:            data.bannerUrl,
                    logoUrl:              data.logoUrl,
                    isPublic:             createLaunch.isPublic,
                    organizationId:       organizationId ?? undefined,
                    checkInRequired:      data.checkInRequired,
                    checkInDeadline:      data.checkInRequired ? startDateTime.toISOString() : undefined,
                    autoRemoveUnchecked:  data.autoRemoveUnchecked,
                    rewards:              data.rewards,
                    streamUrl:            data.streamUrl || null,
                    rules:                data.rules || null,
                    paymentInstructions:  data.paymentInstructions || null,
                    region:               data.region || null,
                    currency:             data.currency || 'USD',
                    tournamentType:       data.tournamentType || 'bracket',
                    serverRegion:         data.serverRegion || null,
                    reservedInviteSlots:  data.invitedTeamsEnabled ? data.reservedInviteSlots : 0,
                    inviteExpiryDays:     data.inviteExpiryDays || 7,
                    settings: {
                        assistedMatchReporting: modeFeatures.assistedReporting ? (data.assistedMatchReporting ?? false) : false,
                        checkInWindowMinutes: data.checkInWindowMinutes || 30,
                        mapVetoEnabled: modeFeatures.mapVeto ? (data.mapVetoEnabled ?? true) : false,
                        reservedInviteSlots: data.invitedTeamsEnabled ? data.reservedInviteSlots : 0,
                        inviteExpiryDays: data.inviteExpiryDays || 7,
                        ...(registrationOpens ? { registrationOpensAt: registrationOpens.toISOString() } : {}),
                        // BR-specific settings
                        ...(data.tournamentType === 'battle_royale' ? {
                            brScoringPreset: data.brScoringPreset,
                            brCustomScoring: data.brCustomScoring,
                            brKillCap: data.brKillCap,
                            brTiebreaker: data.brTiebreaker,
                            brDefaultLobbySize: data.brDefaultLobbySize,
                            brDefaultMapMode: data.brDefaultMapMode,
                        } : {}),
                    },
                    // Backend handles stages + map pool in one transaction
                    stages: (() => {
                        // BR stages are configured post-create via the stage setup wizard
                        if (data.tournamentType === 'battle_royale') {
                            return [];
                        }
                        return data.stages.map((s, i) => ({
                            name:             s.name,
                            format:           s.format,
                            stageOrder:       s.stage_order ?? i,
                            bestOf:           (s as any).best_of ?? 1,
                            capacity:         (s as any).capacity ?? null,
                            advancementCount: (s as any).advancement_count ?? null,
                        }));
                    })(),
                    mapPoolIds: data.mapPoolIds ?? [],
                });

                clearDraft();
                toast({ title: 'Tournament Created!', description: 'Your tournament has been created successfully.' });
                navigate(`/organizer/tournament/${tournament.slug}`);
            }
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Failed to save tournament', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    }, [user, data, toast, navigate, clearDraft, tournamentId, initialData, queryClient, options?.activeInvitationCount]);

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
