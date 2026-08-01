import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronRight, ArrowLeft, Trophy, Users, Shield, Plus, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiClient, getApiErrorMessage } from '@/lib/apiClient';

import { RECOMMENDED_TEMPLATES } from '@/data/recommended_templates';
import { RoundBoConfigSection } from './RoundBoConfigSection';
import { cn } from '@/lib/utils';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { getGameByName } from '@/utils/gameFeatures';
import { buildStageConfigPayload, normalizeBestOf } from '@/utils/stageMapper';

// Maps series format strings from catalog game features to display labels and numeric best_of values
const SERIES_FORMAT_MAP: Record<string, { label: string; value: number }> = {
    bo1: { label: "Best of 1", value: 1 },
    bo2: { label: "Best of 2", value: 2 },
    bo3: { label: "Best of 3", value: 3 },
    bo5: { label: "Best of 5", value: 5 },
    bo7: { label: "Best of 7", value: 7 },
    ft2: { label: "First to 2", value: 3 },
    ft3: { label: "First to 3", value: 5 },
    ft5: { label: "First to 5", value: 9 },
};

const DEFAULT_SERIES_OPTIONS = [
    { label: "Best of 1", value: 1 },
    { label: "Best of 3", value: 3 },
    { label: "Best of 5", value: 5 },
];

/** Returns the dropdown options for a game's series formats */
function getSeriesOptions(gameData: { features?: { seriesFormats?: string[] } } | null) {
    const formats = gameData?.features?.seriesFormats;
    if (!formats || formats.length === 0) return DEFAULT_SERIES_OPTIONS;
    return formats
        .map(f => SERIES_FORMAT_MAP[f])
        .filter(Boolean);
}

/** Returns the display label for a best_of value given the game context */
function getBestOfLabel(bestOf: number, gameData: { features?: { seriesFormats?: string[] } } | null): string {
    const formats = gameData?.features?.seriesFormats;
    if (formats) {
        const match = formats.map(f => SERIES_FORMAT_MAP[f]).find(m => m && m.value === bestOf);
        if (match) return match.label;
    }
    return `Best of ${bestOf}`;
}

interface StageSetupWizardProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tournamentId: string;
    game: string;
    existingStages?: any[]; // For edit mode
    onComplete: () => void;
}

interface StageConfig {
    id?: string; // For editing existing stages
    name: string;
    format: string;
    capacity: number | '';
    advancement_count: number | '';
    best_of: number;
    bo_mode: 'per_stage' | 'per_round';
    round_bo_overrides: Record<string, number>;
    settings?: {
        swiss_rounds?: number;
        group_count?: number;
        swiss_groups?: number;
        points_per_win?: number;
        points_per_draw?: number;
        points_per_loss?: number;
        use_check_in_only?: boolean;
    };
}

const DEFAULT_STAGE_CONFIG: StageConfig = {
    name: '',
    format: 'single_elimination',
    capacity: '',
    advancement_count: '',
    best_of: 1,
    bo_mode: 'per_stage',
    round_bo_overrides: {},
};

// Validation helper functions
const isPowerOfTwo = (n: number): boolean => n > 0 && (n & (n - 1)) === 0;

const validateStageConfig = (stage: StageConfig, totalParticipants: number = 0, tournamentMaxParticipants: number | null = null): { valid: boolean; error?: string } => {
    const format = stage.format;
    const configuredCapacity = typeof stage.capacity === 'number' ? stage.capacity : 0;
    // If capacity is not set (Auto/Unlimited), use totalParticipants as the effective capacity for validation
    const effectiveCapacity = configuredCapacity > 0 ? configuredCapacity : totalParticipants;

    const advancementCount = typeof stage.advancement_count === 'number' ? stage.advancement_count : 0;

    const minCapacity: Record<string, number> = {
        'single_elimination': 2,
        'double_elimination': 4,
        'swiss': 4,
        'round_robin': 3
    };

    const minMatches = minCapacity[format] || 2;

    // Only validate minimum capacity if we have a known capacity (configured or actual)
    if (effectiveCapacity > 0 && effectiveCapacity < minMatches) {
        return { valid: false, error: `${format.replace('_', ' ')} requires at least ${minMatches} teams.` };
    }

    // Rule 2: Advancement count must be power of 2 for elimination formats
    if (advancementCount > 0 && (format === 'single_elimination' || format === 'double_elimination')) {
        if (!isPowerOfTwo(advancementCount)) {
            return { valid: false, error: `Advancement count must be a power of 2 (1, 2, 4, 8...) for ${format.replace('_', ' ')}.` };
        }
    }

    // Rule 3: Advancement count must be strictly less than capacity (to ensure elimination)
    if (advancementCount > 0 && effectiveCapacity > 0 && advancementCount >= effectiveCapacity) {
        return { valid: false, error: 'Advancement count must be strictly less than capacity to ensure elimination.' };
    }

    // Rule 4: Stage capacity cannot exceed tournament max participants
    if (tournamentMaxParticipants !== null && configuredCapacity > 0 && configuredCapacity > tournamentMaxParticipants) {
        return { valid: false, error: `Stage capacity (${configuredCapacity}) cannot exceed tournament limit (${tournamentMaxParticipants}).` };
    }

    return { valid: true };
};

// Helper to generate power of 2 advancement options
const getAdvancementOptions = (capacity: number): number[] => {
    const options: number[] = [];
    // If capacity is 0 (unknown), provide reasonable defaults up to 128
    const max = capacity > 0 ? capacity : 256;

    let n = 2;
    while (n < max) {
        options.push(n);
        n *= 2;
    }
    return options.reverse(); // Descending (64, 32, 16...)
};

// Helper to calculate optimal Swiss groups (Strictly Power of 2 for fair advancement)
const calculateSwissConfig = (capacity: number, advancement: number): number => {
    if (capacity <= 0) return 1;

    // We only consider Power of 2 groups to ensure equal advancement spots per group.
    // Since advancement is a Power of 2, if groups is a Power of 2 (and <= advancement),
    // then advancement % groups will always be 0.
    const candidates = [1, 2, 4, 8, 16];
    let bestGroups = 1;
    let minDiff = Number.MAX_VALUE;

    for (const g of candidates) {
        // Constraint: Groups must not exceed advancement count (if advancement is set)
        if (advancement > 0 && g > advancement) continue;

        const groupSize = capacity / g;

        // Constraint: Group size shouldn't be too small (e.g. < 16) unless capacity is tiny
        if (groupSize < 16 && g > 1) continue;

        // Find the group count that gets us closest to ~32 teams per group
        const diff = Math.abs(groupSize - 32);

        // If diff is significantly better, or if it's similar but allows more groups (better distribution), pick it
        if (diff < minDiff) {
            minDiff = diff;
            bestGroups = g;
        }
    }

    return bestGroups;
};

// Format transition validation (Medium Priority)
const getFormatTransitionWarning = (prevFormat: string | undefined, newFormat: string): string | null => {
    if (!prevFormat) return null;

    // Unusual transitions that should trigger a warning
    const unusualTransitions: Record<string, string[]> = {
        'single_elimination': ['round_robin'], // SE -> RR is unusual
        'double_elimination': ['swiss', 'round_robin'], // DE -> Swiss/RR is unusual
    };

    if (unusualTransitions[prevFormat]?.includes(newFormat)) {
        return `Transitioning from ${prevFormat.replace('_', ' ')} to ${newFormat.replace('_', ' ')} is unusual. Consider using Swiss → Elimination or RR → Elimination flows instead.`;
    }

    return null;
};





export const StageSetupWizard: React.FC<StageSetupWizardProps> = ({
    open,
    onOpenChange,
    tournamentId,
    game,
    existingStages,
    onComplete
}) => {
    useGameCatalog();
    const { toast } = useToast();
    const [step, setStep] = useState<'mode-select' | 'template-select' | 'template-config' | 'manual-config' | 'review'>('mode-select');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [stagesConfig, setStagesConfig] = useState<StageConfig[]>([]);
    const [deletedStageIds, setDeletedStageIds] = useState<string[]>([]);
    const [currentStageIndex, setCurrentStageIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [participantsCount, setParticipantsCount] = useState<number>(0);
    const [tournamentMaxParticipants, setTournamentMaxParticipants] = useState<number | null>(null);
    const [gameData, setGameData] = useState(() => (game ? getGameByName(game) : null));

    // Manual Form State (Lifted up for Edit capability)
    const [manualFormState, setManualFormState] = useState<StageConfig>({
        ...DEFAULT_STAGE_CONFIG,
        format: 'single_elimination'
    });
    const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);
    const prevOpenRef = useRef(false);

    // Initialize wizard state only when the dialog opens (not on step/stage navigation).
    useEffect(() => {
        const justOpened = open && !prevOpenRef.current;
        prevOpenRef.current = open;

        if (!open || !justOpened) {
            return;
        }

        const fetchParticipants = async () => {
            const participants = await apiClient.get<any[]>(`/api/tournaments/${tournamentId}/participants`).catch(() => []);
            if (participants) setParticipantsCount(participants.length);
        };
        fetchParticipants();

        const fetchTournamentSettings = async () => {
            const response = await apiClient.get<any>(`/api/tournaments/${tournamentId}`).catch(() => null);
            const data = response?.tournament || response;
            if (!data) return;

            const d = data as any;
            const maxTeams = d.max_teams === 0 ? null : d.max_teams;
            setTournamentMaxParticipants(maxTeams);

            if (game) {
                setGameData(getGameByName(game) || null);
            }

            if (!existingStages || existingStages.length === 0) {
                setManualFormState(prev => ({
                    ...prev,
                    capacity: maxTeams || '',
                }));
            }
        };
        fetchTournamentSettings();

        const isEditMode = Boolean(existingStages && existingStages.length > 0);

        if (isEditMode) {
            setStagesConfig(existingStages.map(s => {
                const stageAny = s as any;
                const bestOf = stageAny.best_of || 1;
                const boMode = stageAny.bo_mode || 'per_stage';
                // Parse round_bo_overrides - may be JSON string from database
                let roundBoOverrides = stageAny.round_bo_overrides || {};
                if (typeof roundBoOverrides === 'string') {
                    try { roundBoOverrides = JSON.parse(roundBoOverrides); } catch { roundBoOverrides = {}; }
                }
                const stageConfig = typeof stageAny.config === 'string'
                    ? (() => { try { return JSON.parse(stageAny.config); } catch { return {}; } })()
                    : (stageAny.config || {});
                const result: StageConfig = {
                    id: s.id,
                    name: s.name,
                    format: s.format,
                    capacity: s.capacity || '',
                    advancement_count: s.advancement_count || '',
                    best_of: bestOf,
                    bo_mode: boMode,
                    round_bo_overrides: roundBoOverrides,
                    settings: {
                        ...(stageConfig.swiss_groups != null && { swiss_groups: stageConfig.swiss_groups }),
                        ...(stageConfig.swiss_rounds != null && { swiss_rounds: stageConfig.swiss_rounds }),
                        ...(stageConfig.group_count != null && { group_count: stageConfig.group_count }),
                        ...(stageConfig.points_per_win != null && { points_per_win: stageConfig.points_per_win }),
                        ...(stageConfig.points_per_draw != null && { points_per_draw: stageConfig.points_per_draw }),
                        ...(stageConfig.points_per_loss != null && { points_per_loss: stageConfig.points_per_loss }),
                        ...(stageConfig.use_check_in_only != null && { use_check_in_only: stageConfig.use_check_in_only }),
                    },
                };
                return result;
            }));
            setDeletedStageIds([]);
            setStep('manual-config');
            setManualFormState(DEFAULT_STAGE_CONFIG);
        } else {
            setStep('mode-select');
            setStagesConfig([]);
            setManualFormState({ ...DEFAULT_STAGE_CONFIG, format: 'single_elimination' });
        }

        setSelectedTemplateId(null);
        setCurrentStageIndex(0);
        setEditingStageIndex(null);
    }, [open, tournamentId, game, existingStages]);


    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplateId(templateId);
        const template = RECOMMENDED_TEMPLATES.find(t => t.id === templateId);
        if (template) {
            setStagesConfig(template.stages.map((s, i) => {
                let adv = s.advancement_count;
                // Auto-adjust advancement count if it exceeds current participants
                if (typeof adv === 'number' && participantsCount > 0 && adv >= participantsCount) {
                    // Find largest power of 2 strictly less than participantsCount
                    let adjusted = 1;
                    while (adjusted * 2 < participantsCount) {
                        adjusted *= 2;
                    }
                    adv = adjusted;
                }

                const cap = (i === 0 && tournamentMaxParticipants) ? tournamentMaxParticipants : (Number(s.capacity) || 0);
                let swissGroups = s.settings?.swiss_groups || 1;
                let swissRounds = s.settings?.swiss_rounds;

                if (s.format === 'swiss') {
                    const effectiveCap = cap || participantsCount;
                    if (effectiveCap > 0 && (typeof adv === 'number' ? adv : 0) > 0) {
                        swissGroups = calculateSwissConfig(effectiveCap, typeof adv === 'number' ? adv : 0);
                        if (!swissRounds) {
                            const groupSize = effectiveCap / swissGroups;
                            swissRounds = Math.ceil(Math.log2(groupSize)) + 2;
                        }
                    }
                }

                return {
                    name: s.name,
                    format: s.format,
                    capacity: (i === 0 && tournamentMaxParticipants) ? tournamentMaxParticipants : '',
                    advancement_count: adv || '',
                    best_of: s.best_of,
                    bo_mode: s.bo_mode || 'per_stage',
                    round_bo_overrides: s.round_bo_overrides || {},
                    settings: {
                        ...s.settings,
                        swiss_groups: swissGroups,
                        swiss_rounds: swissRounds
                    }
                };
            }));
            setCurrentStageIndex(0);
            setStep('template-config');
        }
    };

    const updateStageConfig = (index: number, field: keyof StageConfig, value: any) => {
        const newConfig = [...stagesConfig];
        newConfig[index] = { ...newConfig[index], [field]: value };

        // Logic: If updating advancement_count, auto-update next stage's capacity
        if (field === 'advancement_count' && index < newConfig.length - 1) {
            // Only if value is a valid number
            if (value !== '' && !isNaN(Number(value))) {
                newConfig[index + 1] = { ...newConfig[index + 1], capacity: Number(value) };
            }
        }

        // Logic: Recalculate Swiss groups if capacity or advancement changes
        if (newConfig[index].format === 'swiss' && (field === 'capacity' || field === 'advancement_count')) {
            const cap = Number(newConfig[index].capacity) || participantsCount;
            const adv = Number(newConfig[index].advancement_count);
            if (cap > 0 && adv > 0) {
                const groups = calculateSwissConfig(cap, adv);
                const groupSize = cap / groups;
                const rounds = Math.ceil(Math.log2(groupSize)) + 2;

                newConfig[index].settings = {
                    ...newConfig[index].settings,
                    swiss_groups: groups,
                    swiss_rounds: rounds
                };
            }
        }

        setStagesConfig(newConfig);
    };

    const handleSaveStages = async () => {
        if (stagesConfig.length === 0 && deletedStageIds.length === 0) {
            toast({
                title: 'No stages to save',
                description: 'Add at least one stage before saving your tournament setup.',
                variant: 'destructive',
            });
            return;
        }

        try {
            setLoading(true);

            if (stagesConfig.length === 0 && deletedStageIds.length > 0) {
                await apiClient.post(`/api/tournaments/${tournamentId}/stages/delete`, { deleteIds: deletedStageIds });
                toast({
                    title: 'Stages Removed',
                    description: 'All tournament stages have been deleted.',
                });
                onComplete();
                onOpenChange(false);
                return;
            }

            // 0. Validate all stages
            for (const stage of stagesConfig) {
                const validation = validateStageConfig(stage, participantsCount, tournamentMaxParticipants);
                if (!validation.valid) {
                    toast({
                        title: `Invalid Stage: ${stage.name}`,
                        description: validation.error,
                        variant: "destructive"
                    });
                    setLoading(false);
                    return;
                }
            }

            // 1. Handle Deletions via dedicated delete endpoint
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

            toast({
                title: 'Stages Saved',
                description: 'Tournament stages have been successfully updated.',
            });
            onComplete();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Error saving stages:', error);
            toast({
                title: 'Could not save stages',
                description: getApiErrorMessage(
                    error,
                    'We could not save the stage setup. Check stage advancement and capacity rules, then try again.',
                ),
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
        exit: { opacity: 0, x: -20, transition: { duration: 0.2 } }
    };

    const renderModeSelection = () => (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-cols-1 md:grid-cols-2 gap-6 py-8"
        >
            <Card
                className="group cursor-pointer relative overflow-hidden border-white/10/30 bg-[#0a0a0c] hover:border-emerald-500/50 transition-all duration-300"
                onClick={() => setStep('template-select')}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-emerald-400 text-xl">
                        <div className="p-2 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                            <Trophy className="h-6 w-6" />
                        </div>
                        Advanced Templates
                    </CardTitle>
                    <CardDescription className="text-base pt-2">
                        Use predefined structures like 'Qualifiers to Finals' or 'Double Elimination'. Best for standard tournaments.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm text-gray-400 space-y-2">
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Quick setup</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Proven formats</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500" /> Automated advancement rules</li>
                    </ul>
                </CardContent>
            </Card>

            <Card
                className="group cursor-pointer relative overflow-hidden border-white/10/30 bg-[#0a0a0c] hover:border-blue-500/50 transition-all duration-300"
                onClick={() => {
                    setStagesConfig([]);
                    setStep('manual-config');
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-blue-400 text-xl">
                        <div className="p-2 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                            <Users className="h-6 w-6" />
                        </div>
                        Manual Setup
                    </CardTitle>
                    <CardDescription className="text-base pt-2">
                        Build your tournament stage by stage. Perfect for custom formats or complex events.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm text-gray-400 space-y-2">
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-500" /> Full control</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-500" /> Custom ordering</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-500" /> Mix and match formats</li>
                    </ul>
                </CardContent>
            </Card>
        </motion.div>
    );

    const renderTemplateSelection = () => (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4"
        >
            {RECOMMENDED_TEMPLATES
                .filter(t => t.category === 'standard' || !t.category)
                .map((template) => (
                    <Card
                        key={template.id}
                        className={cn(
                            "cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                            selectedTemplateId === template.id
                                ? "border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500/20"
                                : "border-white/10 hover:border-white/20 hover:bg-white/5"
                        )}
                        onClick={() => handleTemplateSelect(template.id)}
                    >
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between text-lg">
                                {template.name}
                                {selectedTemplateId === template.id && (
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="bg-emerald-500 rounded-full p-1"
                                    >
                                        <Check className="h-3 w-3 text-white" />
                                    </motion.div>
                                )}
                            </CardTitle>
                            <CardDescription>{template.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                                <Badge variant="secondary" className="bg-white/10">{template.stages.length} Stages</Badge>
                                {template.stages.map((s, i) => (
                                    <span key={i} className="flex items-center text-xs">
                                        {i > 0 && <ChevronRight className="h-3 w-3 mx-1 text-gray-600" />}
                                        {s.name}
                                    </span>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
        </motion.div>
    );

    const renderTemplateConfig = () => {
        const stage = stagesConfig[currentStageIndex];
        if (!stage) return null;

        // Check if previous stage has advancement count to link capacity
        const prevStage = currentStageIndex > 0 ? stagesConfig[currentStageIndex - 1] : null;
        const isCapacityLinked = prevStage && prevStage.advancement_count !== '' && prevStage.advancement_count !== null;

        return (
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6 py-4"
            >
                <div className="flex items-center justify-between mb-6 bg-white/5 p-4 rounded-lg border border-white/10">
                    <div>
                        <h3 className="text-lg font-medium text-white flex items-center gap-2">
                            Configure Stage {currentStageIndex + 1}
                            <span className="text-gray-500 text-sm font-normal">of {stagesConfig.length}</span>
                        </h3>
                        <p className="text-sm text-gray-400">Set up the rules for this stage.</p>
                    </div>
                    <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 px-3 py-1 text-sm">
                        {stage.name}
                    </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-gray-300">Stage Name</Label>
                        <Input
                            value={stage.name}
                            onChange={(e) => updateStageConfig(currentStageIndex, 'name', e.target.value)}
                            className="bg-black/20 border-white/10 focus:border-emerald-500/50"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-300">Format</Label>
                        <Select
                            value={stage.format}
                            onValueChange={(val) => updateStageConfig(currentStageIndex, 'format', val)}
                            disabled={selectedTemplateId === 'recommended_multi_stage' && currentStageIndex === 0 && stage.format === 'single_elimination'}
                        >
                            <SelectTrigger className="bg-black/20 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="single_elimination">Single Elimination</SelectItem>
                                <SelectItem
                                    value="double_elimination"
                                    disabled={selectedTemplateId === 'recommended_multi_stage' && currentStageIndex === 0}
                                >
                                    Double Elimination
                                </SelectItem>
                                <SelectItem value="round_robin">Round Robin</SelectItem>
                                <SelectItem value="swiss">Swiss</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        {currentStageIndex === 0 ? (
                            <div className="border border-white/10 bg-white/[0.03] p-4">
                                <Label className="text-gray-300">Stage 1 Capacity</Label>
                                <p className="mt-2 text-sm text-gray-400">
                                    Stage 1 uses tournament max capacity:
                                    <span className="ml-1 font-bold text-white">{tournamentMaxParticipants ?? 'Unlimited'}</span>
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                    Change this from tournament details. Stage management keeps the opening field locked so brackets and registrations stay aligned.
                                </p>
                            </div>
                        ) : (
                            <>
                                <Label className="text-gray-300 flex items-center justify-between">
                                    Capacity (Teams)
                                    {isCapacityLinked && (
                                        <span className="text-xs text-emerald-400 flex items-center gap-1">
                                            <Check className="h-3 w-3" /> Linked to Prev. Stage
                                        </span>
                                    )}
                                </Label>
                                <Input
                                    type="number"
                                    value={stage.capacity}
                                    onChange={(e) => updateStageConfig(currentStageIndex, 'capacity', e.target.value === '' ? '' : Number(e.target.value))}
                                    placeholder="Unlimited"
                                    disabled={!!isCapacityLinked}
                                    className={cn(
                                        "bg-black/20 border-white/10 focus:border-emerald-500/50",
                                        isCapacityLinked && "border-emerald-500/30 bg-emerald-500/5 text-gray-400 cursor-not-allowed"
                                    )}
                                />
                                {isCapacityLinked && (
                                    <p className="text-xs text-gray-500">
                                        Recommended: {prevStage.advancement_count} teams (from Stage {currentStageIndex})
                                    </p>
                                )}
                            </>
                        )}
                    </div>


                    {/* Format Specific Settings */}
                    {stage.format === 'swiss' && (
                        <>
                            <div className="space-y-2">
                                <Label className="text-gray-300">Number of Groups</Label>
                                <Input
                                    type="number"
                                    value={stage.settings?.swiss_groups || ''}
                                    onChange={(e) => {
                                        const val = e.target.value === '' ? undefined : Number(e.target.value);
                                        const newSettings = { ...stage.settings, swiss_groups: val };
                                        updateStageConfig(currentStageIndex, 'settings', newSettings);
                                    }}
                                    placeholder="1"
                                    className="bg-black/20 border-white/10 focus:border-emerald-500/50"
                                />
                                <p className="text-xs text-gray-500">Split teams into multiple Swiss groups.</p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-300">Number of Rounds</Label>
                                <Input
                                    type="number"
                                    value={stage.settings?.swiss_rounds || ''}
                                    onChange={(e) => {
                                        const val = e.target.value === '' ? undefined : Number(e.target.value);
                                        const newSettings = { ...stage.settings, swiss_rounds: val };
                                        updateStageConfig(currentStageIndex, 'settings', newSettings);
                                    }}
                                    placeholder="Auto (Log2)"
                                    className="bg-black/20 border-white/10 focus:border-emerald-500/50"
                                />
                                <p className="text-xs text-gray-500">Leave empty for automatic calculation.</p>
                            </div>
                        </>
                    )}

                    {stage.format === 'round_robin' && (
                        <div className="space-y-2">
                            <Label className="text-gray-300">Group Configuration</Label>
                            {(() => {
                                const cap = typeof stage.capacity === 'number' ? stage.capacity : (tournamentMaxParticipants || participantsCount || 0);
                                const groupSize = 4; // Fixed group size
                                const groupCount = cap > 0 ? Math.ceil(cap / groupSize) : 0;
                                // Auto-update settings
                                if (groupCount > 0 && stage.settings?.group_count !== groupCount) {
                                    updateStageConfig(currentStageIndex, 'settings', { ...stage.settings, group_count: groupCount });
                                }
                                return (
                                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                                        <p className="text-emerald-400 font-medium">
                                            {groupCount} Groups × {groupSize} Teams each
                                        </p>
                                        {cap > 0 && cap % groupSize !== 0 && (
                                            <p className="text-xs text-yellow-400 mt-1">
                                                ⚠ {cap} teams isn't divisible by {groupSize}. Some groups may have {cap % groupSize} extra team(s).
                                            </p>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-gray-300">Advancement (Teams to Next)</Label>
                        {stage.format === 'swiss' || stage.format === 'single_elimination' || stage.format === 'double_elimination' ? (
                            <Select
                                value={String(stage.advancement_count || '')}
                                onValueChange={(val) => {
                                    const adv = Number(val);
                                    updateStageConfig(currentStageIndex, 'advancement_count', adv);
                                }}
                                disabled={currentStageIndex === stagesConfig.length - 1}
                            >
                                <SelectTrigger className="bg-black/20 border-white/10">
                                    <SelectValue placeholder="Select count" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getAdvancementOptions(typeof stage.capacity === 'number' ? stage.capacity : (tournamentMaxParticipants || 256)).map(opt => (
                                        <SelectItem key={opt} value={String(opt)}>{opt} Teams</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <Input
                                type="number"
                                value={stage.advancement_count}
                                onChange={(e) => updateStageConfig(currentStageIndex, 'advancement_count', e.target.value === '' ? '' : Number(e.target.value))}
                                disabled={currentStageIndex === stagesConfig.length - 1} // Last stage doesn't advance
                                placeholder="None"
                                className="bg-black/20 border-white/10 focus:border-emerald-500/50"
                            />
                        )}
                    </div>
                </div>

                <div className="border-t border-white/10 pt-6 mt-6">
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2 text-emerald-400">
                        <Shield className="h-4 w-4" /> Series Format
                    </h4>
                    <div className="grid grid-cols-1 gap-6">
                        {/* Only show default selector when NOT in per-round mode */}
                        {stage.bo_mode !== 'per_round' && (
                            <div className="space-y-2">
                                <Label className="text-gray-300">Series Format (All Rounds)</Label>
                                <Select
                                    value={String(stage.best_of)}
                                    onValueChange={(val) => updateStageConfig(currentStageIndex, 'best_of', Number(val))}
                                >
                                    <SelectTrigger className="bg-black/20 border-white/10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {getSeriesOptions(gameData).map(opt => (
                                            <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <RoundBoConfigSection
                            format={stage.format}
                            bracketSize={typeof stage.capacity === 'number' && stage.capacity > 0 ? stage.capacity : 8}
                            boMode={stage.bo_mode}
                            defaultBestOf={stage.best_of}
                            roundBoOverrides={stage.round_bo_overrides}
                            seriesOptions={getSeriesOptions(gameData)}
                            onBoModeChange={(mode) => updateStageConfig(currentStageIndex, 'bo_mode', mode)}
                            onOverridesChange={(overrides) => updateStageConfig(currentStageIndex, 'round_bo_overrides', overrides)}
                        />
                    </div>
                </div>
            </motion.div>
        );
    };

    const renderManualSetup= () => {
        return (
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6 py-4"
            >
                {stagesConfig.length > 0 && (
                    <div className="space-y-3">
                        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Configured Stages</h3>
                        <div className="space-y-2">
                            <AnimatePresence>
                                {stagesConfig.map((s, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className={cn(
                                            "flex items-center justify-between p-4 bg-white/5 rounded-lg border transition-colors",
                                            editingStageIndex === i ? "border-emerald-500/50 bg-emerald-500/5" : "border-white/10 hover:border-white/20"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-sm">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <div className="font-medium text-white">{s.name}</div>
                                                <div className="text-xs text-gray-400 flex items-center gap-2 mt-1">
                                                    <Badge variant="secondary" className="text-[10px] h-5">{s.format.replace('_', ' ')}</Badge>
                                                    <span>•</span>
                                                    <span>{s.capacity || 'Unlimited'} Teams</span>
                                                    {s.advancement_count && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-emerald-400">Top {s.advancement_count} advance</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 transition-colors"
                                                onClick={() => {
                                                    setEditingStageIndex(i);
                                                    setManualFormState(s);
                                                }}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                                onClick={() => {
                                                    const stageToRemove = stagesConfig[i];
                                                    if (stageToRemove.id) {
                                                        setDeletedStageIds([...deletedStageIds, stageToRemove.id]);
                                                    }
                                                    const newConfig = [...stagesConfig];
                                                    newConfig.splice(i, 1);
                                                    setStagesConfig(newConfig);
                                                    if (editingStageIndex === i) {
                                                        setEditingStageIndex(null);
                                                        setManualFormState(DEFAULT_STAGE_CONFIG);
                                                    }
                                                }}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}

                <div className={cn(
                    "p-6 border border-dashed rounded-xl transition-colors",
                    editingStageIndex !== null ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/20 bg-white/5 hover:bg-white/[0.07]"
                )}>
                    <h3 className="text-sm font-medium text-white mb-6 flex items-center gap-2">
                        {editingStageIndex !== null ? (
                            <>
                                <div className="p-1 rounded bg-emerald-500/20">
                                    <Pencil className="h-4 w-4 text-emerald-400" />
                                </div>
                                Edit Stage {editingStageIndex + 1}
                            </>
                        ) : (
                            <>
                                <div className="p-1 rounded bg-emerald-500/20">
                                    <Plus className="h-4 w-4 text-emerald-400" />
                                </div>
                                Add New Stage
                            </>
                        )}
                    </h3>

                    {/* Manual Form Inputs */}
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Stage Name</Label>
                                <Input
                                    value={manualFormState.name}
                                    onChange={(e) => setManualFormState({ ...manualFormState, name: e.target.value })}
                                    placeholder="e.g. Group Stage"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Format</Label>
                                <Select
                                    value={manualFormState.format}
                                    onValueChange={(val) => setManualFormState({ ...manualFormState, format: val })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="single_elimination">Single Elimination</SelectItem>
                                        <SelectItem
                                            value="double_elimination"
                                            disabled={typeof manualFormState.capacity === 'number' && manualFormState.capacity < 4}
                                        >
                                            Double Elimination {typeof manualFormState.capacity === 'number' && manualFormState.capacity < 4 && '(min 4 teams)'}
                                        </SelectItem>
                                        <SelectItem
                                            value="round_robin"
                                            disabled={typeof manualFormState.capacity === 'number' && manualFormState.capacity < 3}
                                        >
                                            Round Robin {typeof manualFormState.capacity === 'number' && manualFormState.capacity < 3 && '(min 3 teams)'}
                                        </SelectItem>
                                        <SelectItem
                                            value="swiss"
                                            disabled={typeof manualFormState.capacity === 'number' && manualFormState.capacity < 4}
                                        >
                                            Swiss {typeof manualFormState.capacity === 'number' && manualFormState.capacity < 4 && '(min 4 teams)'}
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Format Specific Settings (Manual) */}
                            {manualFormState.format === 'swiss' && (
                                <>
                                    <div className="space-y-2">
                                        <Label>Number of Rounds</Label>
                                        <Input
                                            type="number"
                                            value={manualFormState.settings?.swiss_rounds || ''}
                                            onChange={(e) => {
                                                const val = e.target.value === '' ? undefined : Number(e.target.value);
                                                const newSettings = { ...manualFormState.settings, swiss_rounds: val };
                                                setManualFormState({ ...manualFormState, settings: newSettings });
                                            }}
                                            placeholder="Auto (Log2)"
                                        />
                                        <p className="text-xs text-gray-500">Leave empty for automatic calculation.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Number of Groups</Label>
                                        <Input
                                            type="number"
                                            value={manualFormState.settings?.swiss_groups || ''}
                                            onChange={(e) => {
                                                const val = e.target.value === '' ? undefined : Number(e.target.value);
                                                const newSettings = { ...manualFormState.settings, swiss_groups: val };
                                                setManualFormState({ ...manualFormState, settings: newSettings });
                                            }}
                                            placeholder="1"
                                        />
                                        <p className="text-xs text-gray-500">Split teams into multiple Swiss groups.</p>
                                    </div>
                                </>
                            )}

                            {manualFormState.format === 'round_robin' && (
                                <div className="space-y-2">
                                    <Label>Group Configuration</Label>
                                    {(() => {
                                        const cap = typeof manualFormState.capacity === 'number' ? manualFormState.capacity : (tournamentMaxParticipants || participantsCount || 0);
                                        const groupSize = 4; // Fixed group size
                                        const groupCount = cap > 0 ? Math.ceil(cap / groupSize) : 0;
                                        return (
                                            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                                                <p className="text-emerald-400 font-medium">
                                                    {groupCount > 0 ? `${groupCount} Groups × ${groupSize} Teams each` : 'Set capacity to calculate groups'}
                                                </p>
                                                {cap > 0 && cap % groupSize !== 0 && (
                                                    <p className="text-xs text-yellow-400 mt-1">
                                                        ⚠ {cap} teams isn't divisible by {groupSize}. Some groups may have {cap % groupSize} extra team(s).
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}

                            <div className="space-y-2">
                                {(() => {
                                    // Stage 1 (index 0 or new stage when no stages exist): capacity comes from tournament
                                    const isFirstStage = editingStageIndex === 0 || (editingStageIndex === null && stagesConfig.length === 0);
                                    // Later stages: capacity may be linked to previous stage's advancement
                                    const prevStageIdx = editingStageIndex !== null ? editingStageIndex - 1 : stagesConfig.length - 1;
                                    const prevStage = prevStageIdx >= 0 ? stagesConfig[prevStageIdx] : null;
                                    const isLinkedToPrev = !isFirstStage && prevStage && prevStage.advancement_count;

                                    return (
                                        <>
                                            {isFirstStage ? (
                                                <div className="border border-white/10 bg-white/[0.03] p-4">
                                                    <Label>Stage 1 Capacity</Label>
                                                    <p className="mt-2 text-sm text-gray-400">
                                                        Stage 1 uses tournament max capacity:
                                                        <span className="ml-1 font-bold text-white">{tournamentMaxParticipants ?? 'Unlimited'}</span>
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-500">
                                                        Change this from tournament details. Stage management keeps this locked to protect registration and bracket integrity.
                                                    </p>
                                                </div>
                                            ) : (
                                                <>
                                                    <Label className="flex items-center justify-between">
                                                        <span>Capacity</span>
                                                        {isLinkedToPrev && (
                                                            <span className="text-xs text-emerald-400">← From Stage {prevStageIdx + 1} Advancement</span>
                                                        )}
                                                    </Label>
                                                    <Input
                                                        type="number"
                                                        value={isLinkedToPrev ? prevStage.advancement_count : manualFormState.capacity}
                                                        onChange={(e) => {
                                                            const val = e.target.value === '' ? '' : Number(e.target.value);
                                                            let newSettings = { ...manualFormState.settings };

                                                            if (manualFormState.format === 'swiss' && typeof val === 'number' && val > 0) {
                                                                const groups = calculateSwissConfig(val, Number(manualFormState.advancement_count) || 0);
                                                                const groupSize = val / groups;
                                                                const rounds = Math.ceil(Math.log2(groupSize)) + 2;
                                                                newSettings = { ...newSettings, swiss_groups: groups, swiss_rounds: rounds };
                                                            }

                                                            setManualFormState({ ...manualFormState, capacity: val, settings: newSettings });
                                                        }}
                                                        placeholder="Unlimited"
                                                        disabled={!!isLinkedToPrev}
                                                        className={cn(
                                                            isLinkedToPrev && "bg-gray-800/50 text-gray-400 cursor-not-allowed"
                                                        )}
                                                    />
                                                </>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                            <div className="space-y-2">
                                {(() => {
                                    // Check if this is/will be the last stage
                                    const isLastStage = editingStageIndex !== null
                                        ? editingStageIndex === stagesConfig.length - 1
                                        : true; // New stages are always "last" until another is added

                                    return (
                                        <>
                                            <Label className="flex items-center justify-between">
                                                <span>Advancement Count</span>
                                                {isLastStage && stagesConfig.length > 0 && editingStageIndex !== null && (
                                                    <span className="text-xs text-amber-400">Last Stage - No Next Stage</span>
                                                )}
                                            </Label>
                                            <Select
                                                value={String(manualFormState.advancement_count || '')}
                                                onValueChange={(val) => {
                                                    const adv = Number(val);
                                                    setManualFormState({
                                                        ...manualFormState,
                                                        advancement_count: adv
                                                    });
                                                }}
                                                disabled={isLastStage && editingStageIndex !== null && stagesConfig.length > 0}
                                            >
                                                <SelectTrigger className={cn(
                                                    (isLastStage && editingStageIndex !== null) && "bg-gray-800/50 text-gray-400 cursor-not-allowed"
                                                )}>
                                                    <SelectValue placeholder={isLastStage && editingStageIndex !== null ? "N/A (Final Stage)" : "Select teams advancing"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {getAdvancementOptions(typeof manualFormState.capacity === 'number' ? manualFormState.capacity : participantsCount).map(opt => (
                                                        <SelectItem key={opt} value={String(opt)}>{opt} Teams</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {isLastStage && editingStageIndex !== null && stagesConfig.length > 0 ? (
                                                <p className="text-xs text-gray-500">Add another stage first to enable advancement</p>
                                            ) : (
                                                <p className="text-xs text-gray-500">Must be a power of 2 less than capacity</p>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label>Series Format</Label>
                                <Select
                                    value={String(manualFormState.best_of)}
                                    onValueChange={(val) => setManualFormState({ ...manualFormState, best_of: Number(val) })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {getSeriesOptions(gameData).map(opt => (
                                            <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Per-Round BO Configuration for elimination formats */}
                        <RoundBoConfigSection
                            format={manualFormState.format}
                            bracketSize={typeof manualFormState.capacity === 'number' && manualFormState.capacity > 0 ? manualFormState.capacity : 8}
                            boMode={manualFormState.bo_mode}
                            defaultBestOf={manualFormState.best_of}
                            roundBoOverrides={manualFormState.round_bo_overrides}
                            seriesOptions={getSeriesOptions(gameData)}
                            onBoModeChange={(mode) => setManualFormState({ ...manualFormState, bo_mode: mode })}
                            onOverridesChange={(overrides) => setManualFormState({ ...manualFormState, round_bo_overrides: overrides })}
                        />

                        <div className="flex justify-end gap-2 pt-2">
                            {editingStageIndex !== null && (
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        setEditingStageIndex(null);
                                        setManualFormState(DEFAULT_STAGE_CONFIG);
                                    }}
                                >
                                    Cancel
                                </Button>
                            )}
                            <Button
                                onClick={() => {
                                    if (!manualFormState.name) {
                                        toast({
                                            title: "Name Required",
                                            description: "Please enter a name for this stage.",
                                            variant: "destructive"
                                        });
                                        return;
                                    }

                                    // Validate stage configuration
                                    const validation = validateStageConfig(manualFormState, participantsCount, tournamentMaxParticipants);
                                    if (!validation.valid) {
                                        toast({
                                            title: "Invalid Configuration",
                                            description: validation.error,
                                            variant: "destructive"
                                        });
                                        return;
                                    }

                                    // Check for unusual format transitions (Medium Priority)
                                    if (stagesConfig.length > 0) {
                                        const prevStage = stagesConfig[stagesConfig.length - 1];
                                        const transitionWarning = getFormatTransitionWarning(prevStage.format, manualFormState.format);
                                        if (transitionWarning) {
                                            toast({
                                                title: "Unusual Format Transition",
                                                description: transitionWarning,
                                                variant: "destructive"
                                            });
                                            // Note: This is a warning, not a block - we still allow the user to proceed
                                        }
                                    }

                                    if (editingStageIndex !== null) {
                                        // Update existing stage
                                        const newConfig = [...stagesConfig];
                                        // Create a copy to avoid mutation
                                        const updatedStage = { ...manualFormState };

                                        // Apply advancement linking
                                        if (updatedStage.advancement_count && editingStageIndex < newConfig.length - 1) {
                                            const advCount = Number(updatedStage.advancement_count);
                                            if (!isNaN(advCount)) {
                                                newConfig[editingStageIndex + 1] = {
                                                    ...newConfig[editingStageIndex + 1],
                                                    capacity: advCount
                                                };
                                            }
                                        }

                                        newConfig[editingStageIndex] = updatedStage;
                                        setStagesConfig(newConfig);
                                        setEditingStageIndex(null);
                                    } else {
                                        // Add new stage
                                        // Create a copy to avoid mutation
                                        const newStage = { ...manualFormState };
                                        const newStages = [...stagesConfig, newStage];

                                        // If previous stage has advancement_count, link this stage's capacity
                                        if (stagesConfig.length > 0) {
                                            const prevStage = stagesConfig[stagesConfig.length - 1];
                                            if (prevStage.advancement_count) {
                                                // Update the NEW stage's capacity, which is the last one in newStages
                                                newStages[newStages.length - 1] = {
                                                    ...newStages[newStages.length - 1],
                                                    capacity: Number(prevStage.advancement_count)
                                                };
                                            }
                                        }

                                        setStagesConfig(newStages);
                                    }
                                    setManualFormState({ ...DEFAULT_STAGE_CONFIG });
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                                {editingStageIndex !== null ? 'Save Changes' : 'Add Stage'}
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    const renderReview = () => (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-6 py-4"
        >
            <div className="bg-emerald-500/10 p-6 rounded-xl border border-emerald-500/20 flex items-start gap-4">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                    <Trophy className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                    <h3 className="font-medium text-emerald-400 text-lg">Ready to Create?</h3>
                    <p className="text-sm text-gray-400 mt-1">
                        You are about to create a tournament with <strong>{stagesConfig.length} stages</strong>.
                        Please review the configuration below to ensure everything is correct.
                    </p>
                </div>
            </div>

            <ScrollArea className="h-[350px] pr-4">
                <div className="space-y-4 relative">
                    {/* Connecting Line */}
                    {stagesConfig.length > 1 && (
                        <div className="absolute left-[19px] top-8 bottom-8 w-0.5 bg-white/10 -z-10" />
                    )}

                    {stagesConfig.map((stage, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative pl-12"
                        >
                            {/* Step Number Bubble */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[#0a0a0c] border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold z-10 shadow-lg shadow-black/50">
                                {index + 1}
                            </div>

                            <Card className="bg-card/50 border-white/10 hover:border-emerald-500/30 transition-colors">
                                <CardHeader className="py-3 px-4 border-b border-white/5">
                                    <CardTitle className="text-base flex justify-between items-center">
                                        <span className="text-white">{stage.name}</span>
                                        <Badge variant="outline" className="bg-white/5 border-white/10">{stage.format.replace('_', ' ')}</Badge>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="py-3 px-4 text-sm grid grid-cols-2 gap-y-2 gap-x-4">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Users className="h-3.5 w-3.5 text-gray-500" />
                                        <span>Capacity: <span className="text-gray-300">{stage.capacity || 'Unlimited'}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <ChevronRight className="h-3.5 w-3.5 text-gray-500" />
                                        <span>Advances: <span className="text-gray-300">{stage.advancement_count || 'None'}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Shield className="h-3.5 w-3.5 text-gray-500" />
                                        <span className="text-gray-300">{getBestOfLabel(stage.best_of, gameData)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </ScrollArea>
        </motion.div>
    );

    return (

        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl max-h-[90vh] !flex !flex-col bg-[#0a0a0c] border-white/10/30">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold text-white">
                            {step === 'mode-select' && 'Create Tournament Stages'}
                            {step === 'template-select' && 'Select a Template'}
                            {step === 'template-config' && 'Configure Stages'}
                            {step === 'manual-config' && 'Manual Stage Setup'}
                            {step === 'review' && 'Review & Create'}
                        </DialogTitle>
                        <DialogDescription className="text-gray-400">
                            {step === 'mode-select' && 'Choose how you want to set up your tournament structure.'}
                            {step === 'template-select' && 'Pick a starting point for your tournament.'}
                            {step === 'template-config' && 'Customize the details for each stage.'}
                            {step === 'manual-config' && 'Add and configure stages one by one.'}
                            {step === 'review' && 'Double check everything before creating.'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-1 pr-2 overscroll-contain" data-lenis-prevent>
                        <AnimatePresence mode="wait">
                            {step === 'mode-select' && renderModeSelection()}
                            {step === 'template-select' && renderTemplateSelection()}
                            {step === 'template-config' && renderTemplateConfig()}
                            {step === 'manual-config' && renderManualSetup()}
                            {step === 'review' && renderReview()}
                        </AnimatePresence>
                    </div>

                    <DialogFooter className="mt-4 border-t border-white/10 pt-4">
                        {step !== 'mode-select' && (
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (step === 'template-select') setStep('mode-select');
                                    else if (step === 'template-config') {
                                        if (currentStageIndex > 0) setCurrentStageIndex(currentStageIndex - 1);
                                        else setStep('template-select');
                                    }
                                    else if (step === 'manual-config') setStep('mode-select');
                                    else if (step === 'review') {
                                        // Go back to where we came from
                                        // We need to know if we came from template or manual
                                        // Simple heuristic: if selectedTemplateId is set, go to template-config, else manual-config
                                        if (selectedTemplateId) setStep('template-config');
                                        else setStep('manual-config');
                                    }
                                }}
                                className="border-white/10 hover:bg-white/5 text-gray-300"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" /> Back
                            </Button>
                        )}

                        {step === 'template-select' && (
                            <Button
                                disabled={!selectedTemplateId}
                                onClick={() => handleTemplateSelect(selectedTemplateId!)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                                Next <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        )}

                        {step === 'template-config' && (
                            <Button
                                onClick={() => {
                                    if (currentStageIndex < stagesConfig.length - 1) {
                                        setCurrentStageIndex(currentStageIndex + 1);
                                    } else {
                                        setStep('review');
                                    }
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                                {currentStageIndex < stagesConfig.length - 1 ? 'Next Stage' : 'Review'} <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        )}

                        {step === 'manual-config' && (
                            <Button
                                onClick={() => setStep('review')}
                                disabled={stagesConfig.length === 0}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                                Finish & Review ({stagesConfig.length}) <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                        )}

                        {step === 'review' && (
                            <Button
                                onClick={handleSaveStages}
                                disabled={loading || (stagesConfig.length === 0 && deletedStageIds.length === 0)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                                {loading ? 'Saving...' : (stagesConfig.some(s => s.id) ? 'Update Stages' : 'Create Stages')}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>

            </Dialog>
        </>
    );
};

