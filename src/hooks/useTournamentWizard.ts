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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { apiClient } from '@/lib/apiClient';
import { TournamentWizardData, DEFAULT_WIZARD_DATA, WIZARD_STEPS } from '@/types/tournamentWizard';
import { validateStep } from '@/schemas/tournamentSchema';
import esportsGames from '@/data/esportsGames.json';
import slugify from 'slugify';

const STORAGE_KEY = 'tournament_wizard_draft';

export const useTournamentWizard = (initialData?: TournamentWizardData, tournamentId?: string) => {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user } = useAuth();

    const [currentStep, setCurrentStep] = useState(1);
    const [data, setData] = useState<TournamentWizardData>(() => {
        if (initialData) return initialData;
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try { return { ...DEFAULT_WIZARD_DATA, ...JSON.parse(saved) }; } catch { }
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
                const game = esportsGames.games.find(g => g.name.toLowerCase() === updates.game?.toLowerCase());
                if (game) {
                    const defaultFormat = game.formats.find(f => f.value === game.defaultFormat);
                    if (defaultFormat) newData.teamSize = defaultFormat.teamSize;
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
        setErrors(result.errors);
        setStepValidation(prev => ({ ...prev, [currentStep]: result.valid }));
        return result.valid;
    }, [currentStep, data]);

    const nextStep = useCallback(() => {
        if (validateCurrentStep()) {
            setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length));
        } else {
            toast({ title: 'Validation Error', description: 'Please fix the errors before proceeding.', variant: 'destructive' });
        }
    }, [validateCurrentStep, toast]);

    const prevStep = useCallback(() => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    }, []);

    const goToStep = useCallback((step: number) => {
        if (step <= currentStep || stepValidation[step - 1]) setCurrentStep(step);
    }, [currentStep, stepValidation]);

    const clearDraft = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setData(DEFAULT_WIZARD_DATA);
        setCurrentStep(1);
        setErrors({});
    }, []);

    const submitTournament = useCallback(async () => {
        if (!user) {
            toast({ title: 'Authentication Required', description: 'Please sign in to create a tournament.', variant: 'destructive' });
            return;
        }

        const allValid = validateStep(5, data);
        if (!allValid.valid) {
            setErrors(allValid.errors);
            toast({ title: 'Validation Error', description: 'Please fix the errors before submitting.', variant: 'destructive' });
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

            if (tournamentId) {
                // ── UPDATE path ─────────────────────────────────────────────────

                // Tournament-level fields → .NET API
                await apiClient.put(`/api/tournaments/${tournamentId}`, {
                    name:                 data.name,
                    description:          data.description,
                    maxTeams:             data.maxTeams,
                    entryFee:             toMoney(data.entryFee),
                    prizePool:            toMoney(data.prizePool),
                    startDate:            startDateTime.toISOString(),
                    endDate:              endDateTime.toISOString(),
                    registrationDeadline: registrationCloses.toISOString(),
                    bannerUrl:            data.bannerUrl,
                    logoUrl:              data.logoUrl,
                    isPublic:             data.visibility === 'public',
                    checkInRequired:      data.checkInRequired,
                    checkInDeadline:      startDateTime.toISOString(),
                    rewards:              data.rewards,
                    streamUrl:            data.streamUrl || null,
                });

                // Stage sync — single PUT replaces 3 sequential Supabase calls (delete/upsert/insert)
                if (data.stages.length > 0 || initialData?.stages) {
                    await apiClient.put(`/api/tournaments/${tournamentId}/stages`, {
                        stages: data.stages.map(s => ({
                            id:               s.id || null,
                            name:             s.name,
                            format:           s.format,
                            stageOrder:       s.stage_order,
                            bestOf:           (s as any).best_of || 1,
                            capacity:         (s as any).capacity || null,
                            advancementCount: (s as any).advancement_count || null,
                        })),
                    });
                }

                // Map pool — single PUT replaces delete + re-insert
                if (data.mapPoolIds) {
                    await apiClient.put(`/api/tournaments/${tournamentId}/map-pools`, {
                        mapIds: data.mapPoolIds,
                    });
                }

                toast({ title: 'Tournament Updated', description: 'Your tournament has been updated successfully.' });
                navigate(`/organizer/tournament/${tournamentId}`);

            } else {
                // ── CREATE path ─────────────────────────────────────────────────
                // Get organization ID (still available from Supabase auth)
                const { data: orgData } = await supabase
                    .from('organizations').select('id').eq('owner_id', user.id).maybeSingle();

                const slug = slugify(data.name, { lower: true, strict: true });

                const tournament = await apiClient.post<{ id: string; slug: string }>('/api/tournaments', {
                    name:                 data.name,
                    description:          data.description,
                    slug,
                    game:                 data.game,
                    maxTeams:             data.maxTeams,
                    teamSize:             data.teamSize,
                    entryFee:             toMoney(data.entryFee),
                    prizePool:            toMoney(data.prizePool),
                    startDate:            startDateTime.toISOString(),
                    endDate:              endDateTime.toISOString(),
                    registrationDeadline: registrationCloses.toISOString(),
                    bannerUrl:            data.bannerUrl,
                    logoUrl:              data.logoUrl,
                    organizationId:       orgData?.id || null,
                    isPublic:             data.visibility === 'public',
                    checkInRequired:      data.checkInRequired,
                    checkInDeadline:      startDateTime.toISOString(),
                    autoRemoveUnchecked:  data.autoRemoveUnchecked,
                    rewards:              data.rewards,
                    streamUrl:            data.streamUrl || null,
                    // Backend handles stages + map pool in one transaction
                    stages: data.stages.map((s, i) => ({
                        name:             s.name,
                        format:           s.format,
                        stageOrder:       s.stage_order ?? i,
                        bestOf:           (s as any).best_of ?? 1,
                        capacity:         (s as any).capacity ?? null,
                        advancementCount: (s as any).advancement_count ?? null,
                    })),
                    mapPoolIds: data.mapPoolIds ?? [],
                });

                clearDraft();
                toast({ title: 'Tournament Created!', description: 'Your tournament has been created successfully.' });
                navigate(`/organizer/tournament/${tournament?.slug || tournament?.id}`);
            }
        } catch (err: any) {
            toast({ title: 'Error', description: err.message || 'Failed to save tournament', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    }, [user, data, toast, navigate, clearDraft, tournamentId, initialData]);

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
