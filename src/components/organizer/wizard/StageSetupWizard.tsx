import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Check, ChevronRight, ArrowLeft, Trophy, Users, Shield, Map as MapIcon, AlertCircle, Plus, Trash2, Pencil, X, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import stageTemplates from '@/data/stage_templates.json';
import { getGameTableName } from '@/utils/gameTables';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface MapPool {
    id: string;
    name: string;
    map_image_url?: string;
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
    map_pool_id: string | null; // 'tournament_pool', 'custom', or null (all)
    custom_map_ids: string[]; // For custom map pool
}

const DEFAULT_STAGE_CONFIG: StageConfig = {
    name: '',
    format: 'single_elimination',
    capacity: '',
    advancement_count: '',
    best_of: 1,
    map_pool_id: null,
    custom_map_ids: []
};

const MapSelector = ({
    value,
    onChange,
    customIds,
    onCustomIdsChange,
    mapPools,
    hasTournamentMapPool,
    maxMaps = 7
}: {
    value: string | null,
    onChange: (val: string | null) => void,
    customIds: string[],
    onCustomIdsChange: (ids: string[]) => void,
    mapPools: MapPool[],
    hasTournamentMapPool: boolean,
    maxMaps?: number
}) => {
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Helper to get display text
    const getDisplayText = () => {
        if (value === 'tournament_pool') return 'Tournament Pool';
        if (value === 'custom') return `Custom Selection (${customIds.length}/${maxMaps} maps)`;
        return 'All Maps (Default)';
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-black/20 border border-white/10 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded bg-white/5">
                        {value === 'tournament_pool' ? <Trophy className="h-4 w-4 text-emerald-400" /> :
                            value === 'custom' ? <MapIcon className="h-4 w-4 text-blue-400" /> :
                                <MapIcon className="h-4 w-4 text-gray-400" />}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">{getDisplayText()}</span>
                        <span className="text-xs text-gray-500">
                            {value === 'custom' ? 'Specific maps selected' : 'Standard map pool'}
                        </span>
                    </div>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDialogOpen(true)}
                    className="h-8 border-white/10 hover:bg-white/5 text-xs"
                >
                    <Pencil className="h-3 w-3 mr-2" /> Configure
                </Button>
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md bg-gaming-dark border-gaming-gray/30">
                    <DialogHeader>
                        <DialogTitle>Configure Map Pool</DialogTitle>
                        <DialogDescription>
                            Select which maps will be available for this stage.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Pool Type Selection */}
                        <div className="space-y-3">
                            <Label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pool Type</Label>
                            <div className="grid grid-cols-1 gap-2">
                                <div
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                        (!value || value === 'none') ? "bg-emerald-500/10 border-emerald-500/50" : "bg-white/5 border-white/10 hover:bg-white/10"
                                    )}
                                    onClick={() => onChange(null)}
                                >
                                    <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center", (!value || value === 'none') ? "border-emerald-500" : "border-gray-500")}>
                                        {(!value || value === 'none') && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
                                    </div>
                                    <span className="text-sm font-medium text-white">All Maps (Default)</span>
                                </div>

                                {hasTournamentMapPool && (
                                    <div
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                            value === 'tournament_pool' ? "bg-emerald-500/10 border-emerald-500/50" : "bg-white/5 border-white/10 hover:bg-white/10"
                                        )}
                                        onClick={() => onChange('tournament_pool')}
                                    >
                                        <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center", value === 'tournament_pool' ? "border-emerald-500" : "border-gray-500")}>
                                            {value === 'tournament_pool' && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Trophy className="h-3 w-3 text-emerald-400" />
                                            <span className="text-sm font-medium text-white">Tournament Pool</span>
                                        </div>
                                    </div>
                                )}

                                <div
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                                        value === 'custom' ? "bg-emerald-500/10 border-emerald-500/50" : "bg-white/5 border-white/10 hover:bg-white/10"
                                    )}
                                    onClick={() => onChange('custom')}
                                >
                                    <div className={cn("h-4 w-4 rounded-full border flex items-center justify-center", value === 'custom' ? "border-emerald-500" : "border-gray-500")}>
                                        {value === 'custom' && <div className="h-2 w-2 rounded-full bg-emerald-500" />}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapIcon className="h-3 w-3 text-blue-400" />
                                        <span className="text-sm font-medium text-white">Custom Selection</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Custom Map Selection */}
                        {value === 'custom' && (
                            <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Select Maps ({customIds.length}/{maxMaps})
                                    </Label>
                                    <span className={cn("text-xs", customIds.length === maxMaps ? "text-amber-400" : "text-emerald-400")}>
                                        {customIds.length === maxMaps ? "Limit Reached" : `${maxMaps - customIds.length} remaining`}
                                    </span>
                                </div>
                                <ScrollArea className="h-[200px] pr-4 border border-white/10 rounded-lg bg-black/20 p-2">
                                    <div className="space-y-1">
                                        {mapPools.map((map) => {
                                            const isSelected = customIds.includes(map.id);
                                            return (
                                                <div
                                                    key={map.id}
                                                    className={cn(
                                                        "flex items-center justify-between p-2 rounded hover:bg-white/5 cursor-pointer transition-colors",
                                                        isSelected && "bg-emerald-500/10"
                                                    )}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            onCustomIdsChange(customIds.filter(id => id !== map.id));
                                                        } else if (customIds.length < maxMaps) {
                                                            onCustomIdsChange([...customIds, map.id]);
                                                        }
                                                    }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "h-4 w-4 rounded border flex items-center justify-center transition-colors",
                                                            isSelected ? "bg-emerald-500 border-emerald-500" : "border-gray-500",
                                                            (!isSelected && customIds.length >= maxMaps) && "opacity-50 cursor-not-allowed"
                                                        )}>
                                                            {isSelected && <Check className="h-3 w-3 text-white" />}
                                                        </div>
                                                        <span className={cn(
                                                            "text-sm",
                                                            isSelected ? "text-white font-medium" : "text-gray-400",
                                                            (!isSelected && customIds.length >= maxMaps) && "opacity-50"
                                                        )}>
                                                            {map.name}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button onClick={() => setIsDialogOpen(false)} className="bg-emerald-600 hover:bg-emerald-500 text-white w-full sm:w-auto">
                            Save Configuration
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};


export const StageSetupWizard: React.FC<StageSetupWizardProps> = ({
    open,
    onOpenChange,
    tournamentId,
    game,
    existingStages,
    onComplete
}) => {
    const { toast } = useToast();
    const [step, setStep] = useState<'mode-select' | 'template-select' | 'template-config' | 'manual-config' | 'review'>('mode-select');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [stagesConfig, setStagesConfig] = useState<StageConfig[]>([]);
    const [deletedStageIds, setDeletedStageIds] = useState<string[]>([]);
    const [currentStageIndex, setCurrentStageIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [mapPools, setMapPools] = useState<MapPool[]>([]); // This will now hold ALL available maps
    const [hasTournamentMapPool, setHasTournamentMapPool] = useState(false);

    // Manual Form State (Lifted up for Edit capability)
    const [manualFormState, setManualFormState] = useState<StageConfig>(DEFAULT_STAGE_CONFIG);
    const [editingStageIndex, setEditingStageIndex] = useState<number | null>(null);

    // Reset state when opening
    useEffect(() => {
        console.log('[StageWizard] Open changed:', open, 'Existing stages:', existingStages?.length);
        console.log('[StageWizard] Current step:', step);
        console.log('[StageWizard] Stages config:', stagesConfig.length);

        if (open) {
            fetchMaps();

            if (existingStages && existingStages.length > 0) {
                // Edit Mode
                console.log('[StageWizard] Loading existing stages:', existingStages.map(s => ({ id: s.id, name: s.name })));
                setStagesConfig(existingStages.map(s => {
                    // Use new columns directly instead of config JSONB
                    let mapPoolId = null;
                    let customMapIds: string[] = [];
                    const stageAny = s as any;

                    // Read map_pool from new column
                    if (stageAny.map_pool && Array.isArray(stageAny.map_pool) && stageAny.map_pool.length > 0) {
                        mapPoolId = 'custom';
                        customMapIds = stageAny.map_pool;
                    }

                    // Read bestOf from new column
                    const bestOf = stageAny.best_of || 1;

                    const result = {
                        id: s.id,
                        name: s.name,
                        format: s.format,
                        capacity: s.capacity || '',
                        advancement_count: s.advancement_count || '',
                        best_of: bestOf,
                        map_pool_id: mapPoolId,
                        custom_map_ids: customMapIds
                    };
                    console.log('[StageWizard] Mapped stage:', result);
                    return result;
                }));
                setDeletedStageIds([]);
                setStep('manual-config');
            } else {
                // Create Mode
                setStep('mode-select');
                setStagesConfig([]);
            }

            setSelectedTemplateId(null);
            setCurrentStageIndex(0);
            setManualFormState(DEFAULT_STAGE_CONFIG);
            setEditingStageIndex(null);
        }
    }, [open, tournamentId, game, existingStages]);

    const fetchMaps = async () => {
        if (!game) return;
        try {
            // 1. Check for tournament-specific pool (legacy/simple mode)
            if (tournamentId) {
                const tableName = getGameTableName(game, 'map_pools');
                const { count, error } = await supabase
                    .from(tableName as any)
                    .select('*', { count: 'exact', head: true })
                    .eq('tournament_id', tournamentId);

                if (!error && count !== null && count > 0) {
                    setHasTournamentMapPool(true);
                } else {
                    setHasTournamentMapPool(false);
                }
            }

            // 2. Fetch ALL available maps for the game
            const { data: maps, error } = await supabase
                .from('game_maps')
                .select('id, map_name, map_image_url')
                .eq('game', game)
                .eq('is_active', true)
                .order('map_name');

            if (error) throw error;

            setMapPools(maps.map(m => ({
                id: m.id,
                name: m.map_name,
                map_image_url: m.map_image_url || undefined
            })));

        } catch (err) {
            console.warn('Could not fetch maps:', err);
            setHasTournamentMapPool(false);
        }
    };

    const handleTemplateSelect = (templateId: string) => {
        setSelectedTemplateId(templateId);
        const template = stageTemplates.templates.find(t => t.id === templateId);
        if (template) {
            setStagesConfig(template.stages.map(s => ({
                name: s.name,
                format: s.format,
                capacity: s.capacity,
                advancement_count: s.advancement_count,
                best_of: 1, // Default to BO1
                map_pool_id: hasTournamentMapPool ? 'tournament_pool' : null,
                custom_map_ids: []
            })));
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

        setStagesConfig(newConfig);
    };

    const handleSaveStages = async () => {
        try {
            setLoading(true);

            // 1. Handle Deletions
            if (deletedStageIds.length > 0) {
                const { error: deleteError } = await supabase
                    .from('tournament_stages')
                    .delete()
                    .in('id', deletedStageIds);
                if (deleteError) throw deleteError;
            }

            // 2. Handle Upserts (Update or Insert)
            console.log('[StageWizard] Saving stages:', stagesConfig.map(s => ({ id: s.id, name: s.name, capacity: s.capacity })));
            for (let i = 0; i < stagesConfig.length; i++) {
                const stage = stagesConfig[i];

                // Normalize bestOf to valid values: 1, 3, or 5
                const normalizedBestOf = stage.best_of === 3 ? 3 : stage.best_of === 5 ? 5 : 1;

                // Always build complete config for easy overriding
                const config: any = {
                    bestOf: normalizedBestOf,
                    veto: {
                        best_of: normalizedBestOf,
                        use_tournament_pool: stage.map_pool_id === 'tournament_pool',
                        map_pool: stage.map_pool_id === 'custom' ? stage.custom_map_ids : null
                    }
                };

                const stageData = {
                    tournament_id: tournamentId,
                    name: stage.name,
                    format: stage.format,
                    stage_order: i + 1,
                    capacity: stage.capacity === '' ? null : Number(stage.capacity),
                    advancement_count: stage.advancement_count === '' ? null : Number(stage.advancement_count),
                    status: 'upcoming',
                    config: config
                };

                if (stage.id) {
                    // Update
                    console.log('[StageWizard] Updating stage:', {
                        id: stage.id,
                        name: stageData.name,
                        capacity: stageData.capacity,
                        capacityType: typeof stageData.capacity,
                        advancement_count: stageData.advancement_count
                    });
                    const { error, data } = await supabase
                        .from('tournament_stages')
                        .update({
                            name: stageData.name,
                            format: stageData.format,
                            stage_order: stageData.stage_order,
                            capacity: stageData.capacity,
                            advancement_count: stageData.advancement_count,
                            best_of: stageData.best_of || 1,
                            map_pool: stageData.map_pool || [],
                            veto_enabled: stageData.veto_enabled !== false
                        })
                        .eq('id', stage.id)
                        .select();
                    console.log('[StageWizard] Update result:', { error, data });
                    if (error) throw error;
                } else {
                    // Insert
                    const { error } = await supabase
                        .from('tournament_stages')
                        .insert({
                            ...stageData,
                            status: 'upcoming'
                        });
                    if (error) throw error;
                }
            }

            toast({
                title: 'Stages Saved',
                description: 'Tournament stages have been successfully updated.',
            });
            onComplete();
            onOpenChange(false);
        } catch (error: any) {
            console.error('Error saving stages:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to save stages',
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
                className="group cursor-pointer relative overflow-hidden border-gaming-gray/30 bg-gaming-dark hover:border-emerald-500/50 transition-all duration-300"
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
                        Use predefined structures like "Qualifiers to Finals" or "Double Elimination". Best for standard tournaments.
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
                className="group cursor-pointer relative overflow-hidden border-gaming-gray/30 bg-gaming-dark hover:border-blue-500/50 transition-all duration-300"
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
            {stageTemplates.templates.map((template) => (
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
                            disabled={selectedTemplateId === 'single_elimination' || selectedTemplateId === 'double_elimination'}
                        >
                            <SelectTrigger className="bg-black/20 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="single_elimination">Single Elimination</SelectItem>
                                <SelectItem value="double_elimination">Double Elimination</SelectItem>
                                <SelectItem value="round_robin">Round Robin</SelectItem>
                                <SelectItem value="swiss">Swiss</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
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
                            disabled={isCapacityLinked}
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
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-300">Advancement (Teams to Next)</Label>
                        <Input
                            type="number"
                            value={stage.advancement_count}
                            onChange={(e) => updateStageConfig(currentStageIndex, 'advancement_count', e.target.value === '' ? '' : Number(e.target.value))}
                            disabled={currentStageIndex === stagesConfig.length - 1} // Last stage doesn't advance
                            placeholder="None"
                            className="bg-black/20 border-white/10 focus:border-emerald-500/50"
                        />
                    </div>
                </div>

                <div className="border-t border-white/10 pt-6 mt-6">
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2 text-emerald-400">
                        <Shield className="h-4 w-4" /> Veto Settings
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-gray-300">Best Of (Matches)</Label>
                            <Select
                                value={String(stage.best_of)}
                                onValueChange={(val) => updateStageConfig(currentStageIndex, 'best_of', Number(val))}
                            >
                                <SelectTrigger className="bg-black/20 border-white/10">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Best of 1</SelectItem>
                                    <SelectItem value="3">Best of 3</SelectItem>
                                    <SelectItem value="5">Best of 5</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-300">Map Pool</Label>
                            <MapSelector
                                value={stage.map_pool_id}
                                onChange={(val) => updateStageConfig(currentStageIndex, 'map_pool_id', val)}
                                customIds={stage.custom_map_ids}
                                onCustomIdsChange={(ids) => updateStageConfig(currentStageIndex, 'custom_map_ids', ids)}
                                mapPools={mapPools}
                                hasTournamentMapPool={hasTournamentMapPool}
                            />
                        </div>
                    </div>
                </div>
            </motion.div>
        );
    };

    const renderManualSetup = () => {
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
                                        <SelectItem value="double_elimination">Double Elimination</SelectItem>
                                        <SelectItem value="round_robin">Round Robin</SelectItem>
                                        <SelectItem value="swiss">Swiss</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Capacity</Label>
                                <Input
                                    type="number"
                                    value={manualFormState.capacity}
                                    onChange={(e) => setManualFormState({ ...manualFormState, capacity: e.target.value === '' ? '' : Number(e.target.value) })}
                                    placeholder="Unlimited"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Advancement</Label>
                                <Input
                                    type="number"
                                    value={manualFormState.advancement_count}
                                    onChange={(e) => setManualFormState({ ...manualFormState, advancement_count: e.target.value === '' ? '' : Number(e.target.value) })}
                                    placeholder="None"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Best Of</Label>
                                <Select
                                    value={String(manualFormState.best_of)}
                                    onValueChange={(val) => setManualFormState({ ...manualFormState, best_of: Number(val) })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">Best of 1</SelectItem>
                                        <SelectItem value="3">Best of 3</SelectItem>
                                        <SelectItem value="5">Best of 5</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Map Pool</Label>
                                <MapSelector
                                    value={manualFormState.map_pool_id}
                                    onChange={(val) => setManualFormState({ ...manualFormState, map_pool_id: val })}
                                    customIds={manualFormState.custom_map_ids}
                                    onCustomIdsChange={(ids) => setManualFormState({ ...manualFormState, custom_map_ids: ids })}
                                    mapPools={mapPools}
                                    hasTournamentMapPool={hasTournamentMapPool}
                                />
                            </div>
                        </div>

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
                                    if (!manualFormState.name) return;

                                    if (editingStageIndex !== null) {
                                        // Update existing
                                        const newConfig = [...stagesConfig];
                                        newConfig[editingStageIndex] = manualFormState;
                                        setStagesConfig(newConfig);
                                        setEditingStageIndex(null);
                                    } else {
                                        // Add new
                                        setStagesConfig([...stagesConfig, manualFormState]);
                                    }
                                    setManualFormState(DEFAULT_STAGE_CONFIG);
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
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-gaming-dark border-2 border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold z-10 shadow-lg shadow-black/50">
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
                                        <span>Best of <span className="text-gray-300">{stage.best_of}</span></span>
                                    </div>
                                    {stage.map_pool_id === 'tournament_pool' && (
                                        <div className="flex items-center gap-2 text-emerald-400/80">
                                            <MapIcon className="h-3.5 w-3.5" />
                                            <span>Tournament Map Pool</span>
                                        </div>
                                    )}
                                    {stage.map_pool_id === 'custom' && (
                                        <div className="flex items-center gap-2 text-blue-400/80">
                                            <MapIcon className="h-3.5 w-3.5" />
                                            <span>Custom Pool ({stage.custom_map_ids.length} maps)</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </ScrollArea>
        </motion.div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-gaming-dark border-gaming-gray/30">
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

                <div className="flex-1 overflow-y-auto min-h-[400px] px-1 overflow-x-hidden">
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
                            Review <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    )}

                    {step === 'review' && (
                        <Button onClick={handleSaveStages} disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                            {loading ? 'Saving...' : (stagesConfig.some(s => s.id) ? 'Update Stages' : 'Create Stages')}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
