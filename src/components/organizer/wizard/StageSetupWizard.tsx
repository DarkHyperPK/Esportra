import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { CommandButton } from '@/components/management/CommandSurface';
import { EYEBROW_CLASS } from '@/components/ui/kit';
import { useToast } from '@/hooks/use-toast';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';
import { RECOMMENDED_TEMPLATES } from '@/data/recommended_templates';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { getGameByName } from '@/utils/gameFeatures';
import { buildStageConfigPayload, normalizeBestOf } from '@/utils/stageMapper';
import {
    DEFAULT_STAGE_CONFIG,
    calculateSwissConfig,
    getSeriesOptions,
    stageFromExisting,
    stagesFromTemplate,
    swissRoundsFor,
    validateStageConfig,
    type ExistingStageRow,
    type StageFieldUpdate,
    type StageConfig,
} from './stage-setup/stageSetupRules';
import { StageModeSelect } from './stage-setup/StageModeSelect';
import { StageTemplateSelect } from './stage-setup/StageTemplateSelect';
import { StageReview } from './stage-setup/StageReview';
import { TemplateStageStep } from './stage-setup/TemplateStageStep';
import { ManualStageStep } from './stage-setup/ManualStageStep';

export type { StageConfig } from './stage-setup/stageSetupRules';

interface StageSetupWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tournamentId?: string;
    game: string;
    existingStages?: ExistingStageRow[]; // For edit mode
    onComplete?: () => void;
    /** When true, skips all API calls and returns stages via onDraftSaved */
    draftMode?: boolean;
    initialDraftStages?: StageConfig[];
    onDraftSaved?: (stages: StageConfig[]) => void;
    /** Max teams from wizard data — used as Stage 1 capacity in draft mode */
    draftMaxTeams?: number;
}

type WizardStep = 'mode-select' | 'template-select' | 'template-config' | 'manual-config' | 'review';

const STANDARD_TEMPLATES = RECOMMENDED_TEMPLATES.filter((t) => t.category === 'standard' || !t.category);

const stepTransition = {
    initial: { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.25 } },
    exit: { opacity: 0, x: -16, transition: { duration: 0.15 } },
};

export const StageSetupWizard: React.FC<StageSetupWizardProps> = ({
    open,
    onOpenChange,
    tournamentId,
    game,
    existingStages,
    onComplete,
    draftMode = false,
    initialDraftStages,
    onDraftSaved,
    draftMaxTeams,
}) => {
    useGameCatalog();
    const { toast } = useToast();
    const [step, setStep] = useState<WizardStep>('mode-select');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [stagesConfig, setStagesConfig] = useState<StageConfig[]>([]);
    const [deletedStageIds, setDeletedStageIds] = useState<string[]>([]);
    const [currentStageIndex, setCurrentStageIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [participantsCount, setParticipantsCount] = useState<number>(0);
    const [tournamentMaxParticipants, setTournamentMaxParticipants] = useState<number | null>(null);
    const [gameData, setGameData] = useState(() => (game ? getGameByName(game) : null));
    const [manualFormState, setManualFormState] = useState<StageConfig>({ ...DEFAULT_STAGE_CONFIG });
    const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);
    const prevOpenRef = useRef(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const isEditMode = Boolean(existingStages && existingStages.length > 0);
    const seriesOptions = getSeriesOptions(gameData);

    // Initialize wizard state only when the dialog opens (not on step/stage navigation).
    useEffect(() => {
        const justOpened = open && !prevOpenRef.current;
        prevOpenRef.current = open;
        if (!open || !justOpened) return;

        if (game) setGameData(getGameByName(game) || null);
        setSelectedTemplateId(null);
        setCurrentStageIndex(0);
        setEditingStageIndex(null);

        if (draftMode) {
            // Always reset on re-open to prevent stale state from a previous session
            const hasDraft = Boolean(initialDraftStages && initialDraftStages.length > 0);
            if (draftMaxTeams && draftMaxTeams > 0) setTournamentMaxParticipants(draftMaxTeams);
            setStagesConfig(hasDraft && initialDraftStages ? initialDraftStages : []);
            setStep(hasDraft ? 'review' : 'mode-select');
            return;
        }

        void apiClient
            .get<unknown[]>(`/api/tournaments/${tournamentId}/participants`)
            .catch(() => [])
            .then((participants) => setParticipantsCount(participants?.length ?? 0));

        void apiClient
            .get<{ tournament?: { max_teams?: number | null }; max_teams?: number | null }>(`/api/tournaments/${tournamentId}`)
            .catch(() => null)
            .then((response) => {
                const data = response?.tournament || response;
                if (!data) return;
                const maxTeams = data.max_teams === 0 ? null : (data.max_teams ?? null);
                setTournamentMaxParticipants(maxTeams);
                if (!existingStages || existingStages.length === 0) {
                    setManualFormState((prev) => ({ ...prev, capacity: maxTeams || '' }));
                }
            });

        const editing = Boolean(existingStages && existingStages.length > 0);
        setStagesConfig(editing && existingStages ? existingStages.map(stageFromExisting) : []);
        setDeletedStageIds([]);
        setStep(editing ? 'manual-config' : 'mode-select');
        setManualFormState({ ...DEFAULT_STAGE_CONFIG });
    }, [open, tournamentId, game, existingStages, draftMode, draftMaxTeams, initialDraftStages]);

    // Each step and stage starts at the top, not where the last one was scrolled to.
    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = 0;
    }, [step, currentStageIndex]);

    const handleTemplateSelect = (templateId: string) => {
        const template = RECOMMENDED_TEMPLATES.find((t) => t.id === templateId);
        if (!template) return;
        setSelectedTemplateId(templateId);
        setStagesConfig(stagesFromTemplate(template.stages, participantsCount, tournamentMaxParticipants));
        setCurrentStageIndex(0);
        setStep('template-config');
    };

    const updateStageConfig: StageFieldUpdate = (index, field, value) => {
        const newConfig = [...stagesConfig];
        newConfig[index] = { ...newConfig[index], [field]: value };

        // Places moving on from this stage become the next stage's field.
        if (field === 'advancement_count' && index < newConfig.length - 1 && value !== '' && !isNaN(Number(value))) {
            newConfig[index + 1] = { ...newConfig[index + 1], capacity: Number(value) };
        }

        // Swiss groups and rounds follow the field size and places.
        if (newConfig[index].format === 'swiss' && (field === 'capacity' || field === 'advancement_count')) {
            const cap = Number(newConfig[index].capacity) || participantsCount;
            const adv = Number(newConfig[index].advancement_count);
            if (cap > 0 && adv > 0) {
                const groups = calculateSwissConfig(cap, adv);
                newConfig[index] = {
                    ...newConfig[index],
                    settings: { ...newConfig[index].settings, swiss_groups: groups, swiss_rounds: swissRoundsFor(cap, groups) },
                };
            }
        }
        setStagesConfig(newConfig);
    };

    const removeStage = (index: number) => {
        const stageToRemove = stagesConfig[index];
        if (stageToRemove.id) setDeletedStageIds([...deletedStageIds, stageToRemove.id]);
        setStagesConfig(stagesConfig.filter((_, i) => i !== index));
        if (editingStageIndex === index) {
            setEditingStageIndex(null);
            setManualFormState({ ...DEFAULT_STAGE_CONFIG });
        }
    };

    const firstInvalidStage = (count: number, max: number | null) => {
        for (const stage of stagesConfig) {
            const validation = validateStageConfig(stage, count, max);
            if (!validation.valid) {
                toast({ title: `Check “${stage.name}”`, description: validation.error, variant: 'destructive' });
                return stage;
            }
        }
        return null;
    };

    const finish = (title: string, description: string) => {
        toast({ title, description });
        onComplete?.();
        onOpenChange(false);
    };

    const handleSaveStages = async () => {
        if (stagesConfig.length === 0 && deletedStageIds.length === 0) {
            toast({ title: 'Add a stage first', description: 'A tournament needs at least one stage to run.', variant: 'destructive' });
            return;
        }

        try {
            setLoading(true);

            // Draft mode: skip API calls, return stages to parent
            if (draftMode) {
                if (firstInvalidStage(0, null)) return;
                onDraftSaved?.(stagesConfig);
                onOpenChange(false);
                return;
            }

            if (stagesConfig.length === 0) {
                await apiClient.post(`/api/tournaments/${tournamentId}/stages/delete`, { deleteIds: deletedStageIds });
                finish('Stages removed', 'This tournament has no stages now. Add new ones when you’re ready.');
                return;
            }

            if (firstInvalidStage(participantsCount, tournamentMaxParticipants)) return;

            if (deletedStageIds.length > 0) {
                await apiClient.post(`/api/tournaments/${tournamentId}/stages/delete`, { deleteIds: deletedStageIds });
            }

            const stageDtos = stagesConfig.map((stage, i) => {
                const config = buildStageConfigPayload(stage.settings);
                const hasOverrides = stage.bo_mode === 'per_round' && Object.keys(stage.round_bo_overrides).length > 0;
                return {
                    id: stage.id || null,
                    name: stage.name,
                    format: stage.format,
                    stageOrder: i + 1,
                    capacity: stage.capacity === '' ? null : Number(stage.capacity),
                    advancementCount: stage.advancement_count === '' ? null : Number(stage.advancement_count),
                    bestOf: normalizeBestOf(stage.best_of),
                    boMode: stage.bo_mode,
                    ...(hasOverrides && { roundBoOverrides: stage.round_bo_overrides }),
                    ...(config && { config }),
                };
            });

            await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: stageDtos });
            finish('Stages saved', 'Brackets will follow the new structure.');
        } catch (error: unknown) {
            toast({
                title: 'Couldn’t save stages',
                description: getApiErrorMessage(error, 'Check each stage’s team count and how many move on, then try again.'),
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const goBack = () => {
        if (step === 'template-select' || step === 'manual-config') setStep('mode-select');
        else if (step === 'template-config') {
            if (currentStageIndex > 0) setCurrentStageIndex(currentStageIndex - 1);
            else setStep('template-select');
        } else if (step === 'review') setStep(selectedTemplateId ? 'template-config' : 'manual-config');
    };

    const currentTemplateStage = stagesConfig[currentStageIndex];
    const isTemplatePath = step === 'template-select' || step === 'template-config' || (step === 'review' && selectedTemplateId);
    const stepNumber = { 'mode-select': 1, 'template-select': 2, 'template-config': 3, 'manual-config': 2, review: isTemplatePath ? 4 : 3 }[step];
    const header: Record<WizardStep, { title: string; description: string }> = {
        'mode-select': { title: 'How do you want to set up stages?', description: 'Stages are the parts of your event, such as groups and then playoffs.' },
        'template-select': { title: 'Pick a template', description: 'You can change names, sizes and series lengths on the next screen.' },
        'template-config': {
            title: `Stage ${currentStageIndex + 1} of ${stagesConfig.length}: ${currentTemplateStage?.name ?? ''}`,
            description: 'We’ve filled this in from the template. Change anything that doesn’t fit your event.',
        },
        'manual-config': { title: 'Your stages', description: 'Add stages in the order they’re played. Teams that move on fill the next stage.' },
        review: { title: 'Check and save', description: 'Here’s the path from first match to final.' },
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] max-w-3xl !flex !flex-col gap-0 rounded-none border-white/10 bg-card p-0">
                <DialogHeader className="space-y-2 border-b border-white/[0.07] px-6 pb-5 pt-6 text-left">
                    <p className={EYEBROW_CLASS}>
                        {isEditMode ? 'Format and stages · Editing' : `Format and stages · Step ${stepNumber} of ${isTemplatePath || step === 'mode-select' ? 4 : 3}`}
                    </p>
                    <DialogTitle className="font-heading text-xl font-bold normal-case tracking-normal text-white">{header[step].title}</DialogTitle>
                    <DialogDescription className="text-sm text-zinc-400">{header[step].description}</DialogDescription>
                </DialogHeader>

                <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain px-6 py-6" data-lenis-prevent>
                    <AnimatePresence mode="wait">
                        <motion.div key={`${step}-${currentStageIndex}`} {...stepTransition}>
                            {step === 'mode-select' && (
                                <StageModeSelect
                                    onTemplates={() => setStep('template-select')}
                                    onManual={() => {
                                        setStagesConfig([]);
                                        setStep('manual-config');
                                    }}
                                />
                            )}
                            {step === 'template-select' && (
                                <StageTemplateSelect templates={STANDARD_TEMPLATES} selectedId={selectedTemplateId} onSelect={handleTemplateSelect} />
                            )}
                            {step === 'template-config' && currentTemplateStage && (
                                <TemplateStageStep
                                    stages={stagesConfig}
                                    index={currentStageIndex}
                                    tournamentMax={tournamentMaxParticipants}
                                    seriesOptions={seriesOptions}
                                    onFieldChange={(field, value) => updateStageConfig(currentStageIndex, field, value)}
                                />
                            )}
                            {step === 'manual-config' && (
                                <ManualStageStep
                                    stages={stagesConfig}
                                    form={manualFormState}
                                    setForm={setManualFormState}
                                    editingIndex={editingStageIndex}
                                    setEditingIndex={setEditingStageIndex}
                                    setStages={setStagesConfig}
                                    onRemove={removeStage}
                                    participantsCount={participantsCount}
                                    tournamentMax={tournamentMaxParticipants}
                                    seriesOptions={seriesOptions}
                                    onInvalid={(title, description) => toast({ title, description, variant: 'destructive' })}
                                />
                            )}
                            {step === 'review' && (
                                <StageReview stages={stagesConfig} removedCount={deletedStageIds.length} isEdit={isEditMode} gameData={gameData} />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {step !== 'mode-select' && (
                <DialogFooter className="flex-row items-center justify-between gap-2 border-t border-white/[0.07] px-6 py-4 sm:justify-between">
                    {/* Editing starts on "Your stages": going back to the mode screen would drop saved stages untracked. */}
                    {!(isEditMode && step === 'manual-config') ? (
                        <CommandButton variant="ghost" size="sm" onClick={goBack}>
                            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden /> Back
                        </CommandButton>
                    ) : <span />}

                    {step === 'template-select' && (
                        <CommandButton variant="primary" size="sm" slide disabled={!selectedTemplateId} onClick={() => selectedTemplateId && handleTemplateSelect(selectedTemplateId)}>
                            Next <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                        </CommandButton>
                    )}
                    {step === 'template-config' && (
                        <CommandButton
                            variant="primary"
                            size="sm"
                            slide
                            onClick={() => (currentStageIndex < stagesConfig.length - 1 ? setCurrentStageIndex(currentStageIndex + 1) : setStep('review'))}
                        >
                            {currentStageIndex < stagesConfig.length - 1 ? 'Next stage' : 'Review stages'} <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                        </CommandButton>
                    )}
                    {step === 'manual-config' && (
                        <CommandButton variant="primary" size="sm" slide onClick={() => setStep('review')} disabled={stagesConfig.length === 0 && deletedStageIds.length === 0}>
                            Review stages <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
                        </CommandButton>
                    )}
                    {step === 'review' && (
                        <CommandButton variant="primary" size="sm" slide onClick={handleSaveStages} disabled={loading || (stagesConfig.length === 0 && deletedStageIds.length === 0)} className="min-w-[140px]">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Saving" /> : isEditMode ? 'Save stages' : 'Create stages'}
                        </CommandButton>
                    )}
                </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
};
