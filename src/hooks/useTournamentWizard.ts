import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
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
        // If initialData is provided (Edit Mode), use it
        if (initialData) {
            return initialData;
        }
        // Otherwise try to restore from localStorage (Create Mode)
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                try {
                    return { ...DEFAULT_WIZARD_DATA, ...JSON.parse(saved) };
                } catch { }
            }
        }
        return DEFAULT_WIZARD_DATA;
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [stepValidation, setStepValidation] = useState<Record<number, boolean>>({});

    // Auto-save to localStorage (only in Create Mode)
    useEffect(() => {
        if (typeof window !== 'undefined' && !tournamentId) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
    }, [data, tournamentId]);

    // Update data with partial updates
    const updateData = useCallback((updates: Partial<TournamentWizardData>) => {
        setData(prev => {
            const newData = { ...prev, ...updates };

            // Auto-set team size when game changes (only if not in edit mode or if game is editable)
            if (updates.game && updates.game !== prev.game) {
                const game = esportsGames.games.find(g =>
                    g.name.toLowerCase() === updates.game?.toLowerCase()
                );
                if (game) {
                    const defaultFormat = game.formats.find(f => f.value === game.defaultFormat);
                    if (defaultFormat) {
                        newData.teamSize = defaultFormat.teamSize;
                    }
                }
            }

            return newData;
        });
        // Clear related errors
        Object.keys(updates).forEach(key => {
            if (errors[key]) {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[key];
                    return newErrors;
                });
            }
        });
    }, [errors]);

    // Validate current step
    const validateCurrentStep = useCallback(() => {
        const result = validateStep(currentStep, data);
        setErrors(result.errors);
        setStepValidation(prev => ({ ...prev, [currentStep]: result.valid }));
        return result.valid;
    }, [currentStep, data]);

    // Go to next step
    const nextStep = useCallback(() => {
        if (validateCurrentStep()) {
            setCurrentStep(prev => Math.min(prev + 1, WIZARD_STEPS.length));
        } else {
            toast({
                title: 'Validation Error',
                description: 'Please fix the errors before proceeding.',
                variant: 'destructive',
            });
        }
    }, [validateCurrentStep, toast]);

    // Go to previous step
    const prevStep = useCallback(() => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    }, []);

    // Go to specific step
    const goToStep = useCallback((step: number) => {
        // Only allow going to completed steps or current step
        if (step <= currentStep || stepValidation[step - 1]) {
            setCurrentStep(step);
        }
    }, [currentStep, stepValidation]);

    // Clear draft
    const clearDraft = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setData(DEFAULT_WIZARD_DATA);
        setCurrentStep(1);
        setErrors({});
    }, []);

    // Submit tournament
    const submitTournament = useCallback(async () => {
        if (!user) {
            toast({
                title: 'Authentication Required',
                description: 'Please sign in to create a tournament.',
                variant: 'destructive',
            });
            return;
        }

        // Validate all steps
        const allValid = validateStep(5, data);
        if (!allValid.valid) {
            setErrors(allValid.errors);
            toast({
                title: 'Validation Error',
                description: 'Please fix the errors before submitting.',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Parse dates
            const startDateTime = new Date(`${data.startDate}T${data.startTime}`);
            const endDateTime = data.endDate && data.endTime
                ? new Date(`${data.endDate}T${data.endTime}`)
                : new Date(startDateTime.getTime() + (4 * 60 * 60 * 1000)); // 4 hours later
            const registrationOpens = data.registrationOpens
                ? new Date(data.registrationOpens)
                : new Date(); // Now
            const registrationCloses = data.registrationCloses
                ? new Date(data.registrationCloses)
                : new Date(startDateTime.getTime() - (24 * 60 * 60 * 1000)); // 1 day before

            // Parse money values
            const toMoney = (val: string) => {
                if (val.toLowerCase() === 'free') return 0;
                const num = parseFloat(val.replace(/[^0-9.]/g, ''));
                if (!isFinite(num) || isNaN(num)) return 0;
                return Math.round(Math.min(Math.max(0, num), 99999999.99) * 100) / 100;
            };

            // Calculate check-in deadline
            const checkInDeadline = data.checkInRequired
                ? new Date(startDateTime.getTime() - (data.checkInWindowMinutes * 60 * 1000))
                : null;

            if (tournamentId) {
                // UPDATE existing tournament
                const { error: updateError } = await supabase
                    .from('tournaments')
                    .update({
                        name: data.name,
                        description: data.description,
                        // game: data.game, // Game is usually locked in edit mode
                        // format: data.stages[0]?.format || data.bracketType, // Format might be locked too
                        max_teams: data.maxTeams,
                        team_size: data.teamSize,
                        entry_fee: toMoney(data.entryFee).toString(),
                        prize_pool: toMoney(data.prizePool).toString(),
                        start_date: startDateTime.toISOString(),
                        end_date: endDateTime.toISOString(),
                        registration_deadline: registrationCloses.toISOString(),
                        banner_url: data.bannerUrl,
                        logo_url: data.logoUrl,
                        is_public: data.visibility === 'public',
                        check_in_required: data.checkInRequired,
                        check_in_deadline: startDateTime.toISOString(), // Check-in ends at start time
                        auto_remove_unchecked: data.autoRemoveUnchecked,
                        status: data.status,
                        rewards: data.rewards,
                        stream_url: data.streamUrl || null,
                        settings: {
                            ...(data as any).settings,
                            checkInWindowMinutes: data.checkInWindowMinutes,
                            isOnline: data.isOnline,
                            venue: data.isOnline ? null : data.venue,
                            discordUrl: data.discordUrl || null,
                            twitterUrl: data.twitterUrl || null,
                        }
                    })
                    .eq('id', tournamentId);

                if (updateError) throw updateError;

                // Handle stage updates (upsert, insert, delete)
                if (data.stages.length > 0 || initialData?.stages) {
                    // Get current stage IDs from the database
                    const { data: existingDbStages } = await supabase
                        .from('tournament_stages')
                        .select('id')
                        .eq('tournament_id', tournamentId);

                    const existingDbStageIds = existingDbStages?.map(s => s.id) || [];
                    const currentStageIds = data.stages.filter(s => s.id).map(s => s.id);

                    // Find stages to delete (exist in DB but not in current data)
                    const stagesToDelete = existingDbStageIds.filter(id => !currentStageIds.includes(id));

                    // Delete removed stages
                    if (stagesToDelete.length > 0) {
                        const { error: deleteError } = await supabase
                            .from('tournament_stages')
                            .delete()
                            .in('id', stagesToDelete);

                        if (deleteError) throw deleteError;
                    }

                    // Separate stages with IDs (existing) from stages without IDs (new)
                    const existingStages = data.stages.filter(stage => stage.id);
                    const newStages = data.stages.filter(stage => !stage.id);

                    // Upsert existing stages
                    if (existingStages.length > 0) {
                        const stagesToUpsert = existingStages.map(stage => ({
                            id: stage.id,
                            tournament_id: tournamentId,
                            name: stage.name,
                            format: stage.format,
                            stage_order: stage.stage_order,
                            best_of: (stage as any).best_of || 1,
                            capacity: (stage as any).capacity || null,
                            advancement_count: (stage as any).advancement_count || null,
                        }));

                        const { error: upsertError } = await supabase
                            .from('tournament_stages')
                            .upsert(stagesToUpsert);

                        if (upsertError) throw upsertError;
                    }

                    // Insert new stages (they get auto-generated IDs)
                    if (newStages.length > 0) {
                        const stagesToInsert = newStages.map(stage => ({
                            tournament_id: tournamentId,
                            name: stage.name,
                            format: stage.format,
                            stage_order: stage.stage_order,
                            best_of: (stage as any).best_of || 1,
                            capacity: (stage as any).capacity || null,
                            advancement_count: (stage as any).advancement_count || null,
                        }));

                        const { error: insertError } = await supabase
                            .from('tournament_stages')
                            .insert(stagesToInsert);

                        if (insertError) throw insertError;
                    }
                }

                // Handle map pool updates
                if (data.mapPoolIds) {
                    // 1. Delete existing entries first
                    const { error: deletePoolError } = await supabase
                        .from('tournament_map_pools')
                        .delete()
                        .eq('tournament_id', tournamentId);

                    if (deletePoolError) {
                        console.error('Error deleting old map pool:', deletePoolError);
                    }

                    // 2. Insert new entries
                    if (data.mapPoolIds.length > 0) {
                        const mapPoolEntries = data.mapPoolIds.map(mapId => ({
                            tournament_id: tournamentId,
                            map_id: mapId,
                        }));

                        const { error: mapPoolError } = await supabase
                            .from('tournament_map_pools')
                            .insert(mapPoolEntries);

                        if (mapPoolError) {
                            console.error('Error updating map pool:', mapPoolError);
                        }
                    }
                }

                toast({
                    title: 'Tournament Updated',
                    description: 'Your tournament has been updated successfully.',
                });

                navigate(`/organizer/tournament/${tournamentId}`);

            } else {
                // CREATE new tournament

                // Generate unique slug
                let slug = slugify(data.name, { lower: true, strict: true });
                const { data: existing } = await supabase
                    .from('tournaments')
                    .select('id')
                    .eq('slug', slug)
                    .limit(1);
                if (existing && existing.length > 0) {
                    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
                }

                const { data: tournament, error: tournamentError } = await supabase
                    .from('tournaments')
                    .insert({
                        name: data.name,
                        description: data.description,
                        slug,
                        game: data.game,
                        // format is stored per-stage, not on tournament level
                        max_teams: data.maxTeams,
                        min_teams: 2,
                        team_size: data.teamSize,
                        entry_fee: toMoney(data.entryFee).toString(),
                        prize_pool: toMoney(data.prizePool).toString(),
                        start_date: startDateTime.toISOString(),
                        end_date: endDateTime.toISOString(),
                        registration_deadline: registrationCloses.toISOString(),
                        status: 'draft',
                        banner_url: data.bannerUrl,
                        logo_url: data.logoUrl,
                        organizer_id: user.id,
                        venue_id: data.isOnline ? null : null,
                        is_public: data.visibility === 'public' && false, // Force false for drafts, logic updated to be explicit
                        check_in_required: data.checkInRequired,
                        check_in_deadline: startDateTime.toISOString(), // Check-in ends at start time
                        auto_remove_unchecked: data.autoRemoveUnchecked,
                        rewards: data.rewards,
                        stream_url: data.streamUrl || null,
                        settings: {
                            ...(data as any).settings,
                            checkInWindowMinutes: data.checkInWindowMinutes,
                            isOnline: data.isOnline,
                            venue: data.isOnline ? null : data.venue,
                            discordUrl: data.discordUrl || null,
                            twitterUrl: data.twitterUrl || null,
                        },

                    } as any)
                    .select()
                    .single();

                if (tournamentError) throw tournamentError;

                // Insert stages
                if (data.stages.length > 0) {
                    const stagesToInsert = data.stages.map(stage => ({
                        tournament_id: tournament.id,
                        name: stage.name,
                        format: stage.format,
                        stage_order: stage.stage_order,
                        best_of: (stage as any).best_of || 1,
                        capacity: (stage as any).capacity || null,
                        advancement_count: (stage as any).advancement_count || null,
                    }));

                    const { error: stagesError } = await supabase
                        .from('tournament_stages')
                        .insert(stagesToInsert);

                    if (stagesError) throw stagesError;
                }

                // Insert map pool entries
                if (data.mapPoolIds && data.mapPoolIds.length > 0) {
                    const mapPoolEntries = data.mapPoolIds.map(mapId => ({
                        tournament_id: tournament.id,
                        map_id: mapId,
                    }));

                    const { error: mapPoolError } = await supabase
                        .from('tournament_map_pools')
                        .insert(mapPoolEntries);

                    if (mapPoolError) {
                        console.error('Error inserting map pool:', mapPoolError);
                        // Don't throw - tournament was created, this is secondary
                    }
                }

                // Clear draft
                clearDraft();


                toast({
                    title: 'Tournament Created!',
                    description: 'Your tournament has been created successfully.',
                });

                navigate(`/organizer/tournament/${tournament?.slug || tournament?.id}`);
            }
        } catch (error: any) {
            console.error('Error saving tournament:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to save tournament',
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [user, data, toast, navigate, clearDraft, tournamentId]);

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
