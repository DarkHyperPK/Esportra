import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Layers, Plus, Users, Trophy, Lock, Unlock, Shuffle, ArrowRight, ArrowUp, ArrowDown, Trash2, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import { StageSetupWizard } from '@/components/organizer/wizard/StageSetupWizard';
import { SingleEliminationGenerator } from '@/services/bracket/SingleEliminationGenerator';
import { DoubleEliminationGenerator } from '@/services/bracket/DoubleEliminationGenerator';
import { MatchRepository } from '@/services/bracket/MatchRepository';
import { GraphValidator } from '@/services/bracket/BracketGenerator';

type TournamentStage = Database['public']['Tables']['tournament_stages']['Row'];

interface StageManagementTabProps {
    tournamentId: string;
    stages: TournamentStage[];
    onUpdate: () => void;
    game: string;
}

export const StageManagementTab: React.FC<StageManagementTabProps> = ({ tournamentId, stages, onUpdate, game }) => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const { slug } = useParams<{ slug: string }>();
    const [addStageDialogOpen, setAddStageDialogOpen] = useState(false);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [newStageName, setNewStageName] = useState('');
    const [newStageFormat, setNewStageFormat] = useState('single_elimination');
    const [newStageCapacity, setNewStageCapacity] = useState<number | ''>('');
    const [newStageAdvancement, setNewStageAdvancement] = useState<number | ''>('');
    const [hasBrackets, setHasBrackets] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const checkBrackets = async () => {
            const status: Record<string, boolean> = {};
            for (const stage of stages) {
                // Check brkt_versions (new graph engine) instead of tournament_matches
                const { count } = await (supabase as any)
                    .from('brkt_versions')
                    .select('*', { count: 'exact', head: true })
                    .eq('stage_id', stage.id);
                status[stage.id] = (count || 0) > 0;
            }
            setHasBrackets(status);
        };
        if (stages.length > 0) {
            checkBrackets();
        }
    }, [stages]);

    const handleAddStage = async () => {
        if (!tournamentId || !newStageName) return;
        try {
            const newOrder = stages.length + 1;
            const { error } = await supabase
                .from('tournament_stages')
                .insert({
                    tournament_id: tournamentId,
                    name: newStageName,
                    format: newStageFormat,
                    stage_order: newOrder,
                    capacity: newStageCapacity === '' ? null : Number(newStageCapacity),
                    advancement_count: newStageAdvancement === '' ? null : Number(newStageAdvancement),
                    status: 'upcoming',
                    config: {}
                });

            if (error) throw error;

            toast({ title: 'Stage added', description: `${newStageName} has been added to the tournament.` });
            setAddStageDialogOpen(false);
            setNewStageName('');
            setNewStageFormat('single_elimination');
            setNewStageCapacity('');
            setNewStageAdvancement('');
            onUpdate();
        } catch (error: any) {
            console.error('Error adding stage:', error);
            toast({ title: 'Error', description: error.message || 'Failed to add stage', variant: 'destructive' });
        }
    };

    const handleDeleteStage = async (stageId: string) => {
        try {
            const { error } = await supabase
                .from('tournament_stages')
                .delete()
                .eq('id', stageId);

            if (error) throw error;

            toast({ title: 'Stage deleted', description: 'The stage has been removed.' });
            onUpdate();
        } catch (error: any) {
            console.error('Error deleting stage:', error);
            toast({ title: 'Error', description: error.message || 'Failed to delete stage', variant: 'destructive' });
        }
    };

    const handleUpdateStage = async (stageId: string, updates: any) => {
        try {
            const { error } = await supabase
                .from('tournament_stages')
                .update(updates)
                .eq('id', stageId);

            if (error) throw error;
            toast({ title: 'Stage updated', description: 'The stage configuration has been saved.' });
            onUpdate();
        } catch (error: any) {
            console.error('Error updating stage:', error);
            toast({ title: 'Error', description: error.message || 'Failed to update stage', variant: 'destructive' });
        }
    };

    const handleGenerateStageBracket = async (stageId: string) => {
        // Find the stage to get its format
        const stage = stages.find(s => s.id === stageId);
        if (!stage) {
            toast({ title: 'Error', description: 'Stage not found', variant: 'destructive' });
            return;
        }

        try {
            // Get teams/participants for this tournament
            const { data: participants, error: partError } = await supabase
                .from('tournament_participants')
                .select('team_id, teams(id, name, logo_url)')
                .eq('tournament_id', tournamentId)
                .not('team_id', 'is', null);

            if (partError) throw partError;

            const teams = participants?.map((p: any) => ({
                id: p.team_id,
                name: p.teams?.name || 'Unknown',
                logo_url: p.teams?.logo_url
            })) || [];

            if (teams.length < 2) {
                toast({ title: 'Error', description: 'Need at least 2 teams to generate a bracket.', variant: 'destructive' });
                return;
            }

            // Get next version_number
            const { data: maxVersionData } = await (supabase as any)
                .from('brkt_versions')
                .select('version_number')
                .eq('tournament_id', tournamentId)
                .order('version_number', { ascending: false })
                .limit(1)
                .single();
            const nextVersionNumber = (maxVersionData?.version_number || 0) + 1;

            // Generate based on stage format
            const format = stage.format || 'single_elimination';
            let generator;
            if (format === 'single_elimination') {
                generator = new SingleEliminationGenerator();
            } else if (format === 'double_elimination') {
                generator = new DoubleEliminationGenerator();
            } else {
                toast({ title: 'Error', description: `Unsupported format: ${format}`, variant: 'destructive' });
                return;
            }

            const bestOf = (stage.config as any)?.best_of || 3;
            const bracketSize = stage.capacity || undefined;
            const graph = generator.generate(teams, tournamentId, stageId, bestOf, bracketSize);
            graph.version.version_number = nextVersionNumber;

            // Validate
            const errors = GraphValidator.validate(graph);
            if (errors.length > 0) {
                console.error('Validation errors:', errors);
                throw new Error('Graph validation failed: ' + errors.join(', '));
            }

            // Save to DB
            const repo = new MatchRepository();
            await repo.createVersion(graph);

            // Update state and navigate
            setHasBrackets(prev => ({ ...prev, [stageId]: true }));
            toast({ title: 'Success', description: 'Bracket generated successfully!' });
            navigate(`/organizer/tournament/${slug}/manage-bracket/${stageId}`);
        } catch (error: any) {
            console.error('Error generating bracket:', error);
            toast({ title: 'Error', description: error.message || 'Failed to generate bracket', variant: 'destructive' });
        }
    };

    const handleDeleteStageBracket = async (stageId: string) => {
        if (!confirm('Are you sure you want to delete this bracket? This action cannot be undone.')) return;

        try {
            // Delete all brkt_versions for this stage (cascade will delete matches, edges, etc.)
            const { error } = await (supabase as any)
                .from('brkt_versions')
                .delete()
                .eq('stage_id', stageId);

            if (error) throw error;

            // Update local state
            setHasBrackets(prev => ({ ...prev, [stageId]: false }));
            toast({ title: 'Success', description: 'Bracket deleted successfully.' });
            onUpdate();
        } catch (error: any) {
            console.error('Error deleting bracket:', error);
            toast({ title: 'Error', description: error.message || 'Failed to delete bracket', variant: 'destructive' });
        }
    };

    const handleViewBracket = (stageId: string) => {
        // Navigate to the organizer bracket management page
        navigate(`/organizer/tournament/${slug}/manage-bracket/${stageId}`);
    };

    const handleAdvanceTeams = async (stageId: string) => {
        try {
            const { data, error } = await supabase.rpc('advance_teams_to_next_stage', {
                p_current_stage_id: stageId
            });

            if (error) throw error;
            toast({ title: 'Teams Advanced', description: `${data} teams have been advanced to the next stage.` });
            onUpdate();
        } catch (error: any) {
            console.error('Error advancing teams:', error);
            toast({ title: 'Error', description: error.message || 'Failed to advance teams', variant: 'destructive' });
        }
    };

    const handleReorderStage = async (stageId: string, direction: 'up' | 'down') => {
        const currentIndex = stages.findIndex(s => s.id === stageId);
        if (currentIndex === -1) return;
        if (direction === 'up' && currentIndex === 0) return;
        if (direction === 'down' && currentIndex === stages.length - 1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        const currentStage = stages[currentIndex];
        const targetStage = stages[targetIndex];

        try {
            // Swap orders
            const { error: error1 } = await supabase
                .from('tournament_stages')
                .update({ stage_order: targetStage.stage_order })
                .eq('id', currentStage.id);

            if (error1) throw error1;

            const { error: error2 } = await supabase
                .from('tournament_stages')
                .update({ stage_order: currentStage.stage_order })
                .eq('id', targetStage.id);

            if (error2) throw error2;

            onUpdate();
        } catch (error: any) {
            console.error('Error reordering stages:', error);
            toast({ title: 'Error', description: 'Failed to reorder stages', variant: 'destructive' });
        }
    };

    return (
        <>
            <Card className="bg-gaming-dark border-gaming-gray/30">
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>Tournament Stages</CardTitle>
                        <p className="text-sm text-gray-400 mt-1">Manage the different phases of your tournament.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => setWizardOpen(true)}
                            variant="outline"
                            className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2"
                        >
                            <Layers className="w-4 h-4" />
                            {stages.length > 0 ? 'Manage Stages' : 'Create Tournament Stages'}
                        </Button>
                        <Button
                            onClick={() => setAddStageDialogOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Stage
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {stages.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-gaming-gray/20 rounded-xl">
                            <Layers className="w-12 h-12 text-gaming-gray/40 mx-auto mb-4" />
                            <p className="text-gray-400">No stages defined yet. Add your first stage to get started.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {stages.map((stage, index) => (
                                <div
                                    key={stage.id}
                                    className="p-6 bg-gaming-gray/10 border border-gaming-gray/30 rounded-lg hover:border-emerald-400/30 transition-all"
                                >
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-lg">{stage.name}</h4>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs text-gray-400 uppercase tracking-wider bg-gray-800 px-2 py-0.5 rounded">
                                                        {stage.format?.replace('_', ' ') || 'N/A'}
                                                    </span>
                                                    <span className={`text-xs uppercase tracking-wider px-2 py-0.5 rounded font-medium ${stage.status === 'live' ? "bg-red-500/20 text-red-400" :
                                                        stage.status === 'completed' ? "bg-emerald-500/20 text-emerald-400" :
                                                            "bg-blue-500/20 text-blue-400"
                                                        }`}>
                                                        {stage.status || 'upcoming'}
                                                    </span>
                                                    {stage.is_locked && (
                                                        <span className="bg-amber-500/20 text-amber-400 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                                                            <Lock className="w-3 h-3" /> Locked
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col gap-1 mr-2">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-gray-400 hover:text-white"
                                                    disabled={index === 0}
                                                    onClick={() => handleReorderStage(stage.id, 'up')}
                                                >
                                                    <ArrowUp className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 text-gray-400 hover:text-white"
                                                    disabled={index === stages.length - 1}
                                                    onClick={() => handleReorderStage(stage.id, 'down')}
                                                >
                                                    <ArrowDown className="w-4 h-4" />
                                                </Button>
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                onClick={() => handleDeleteStage(stage.id)}
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 p-4 bg-black/20 rounded-lg border border-white/5">
                                        <div>
                                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1 block">Capacity</label>
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-emerald-500" />
                                                <span className="text-white font-medium">{stage.capacity || 'Unlimited'}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1 block">Advancement</label>
                                            <div className="flex items-center gap-2">
                                                <Trophy className="w-4 h-4 text-amber-500" />
                                                <span className="text-white font-medium">{stage.advancement_count ? `Top ${stage.advancement_count} advance` : 'N/A'}</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-1 block">Status Control</label>
                                            <select
                                                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-xs text-white outline-none"
                                                value={stage.status || 'upcoming'}
                                                onChange={(e) => handleUpdateStage(stage.id, { status: e.target.value })}
                                            >
                                                <option value="upcoming">Upcoming</option>
                                                <option value="live">Live</option>
                                                <option value="completed">Completed</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-3">
                                        {/* Bracket Generation/Management Button */}
                                        {(() => {
                                            const stageBracketExists = hasBrackets[stage.id];
                                            const isFirstStage = index === 0;
                                            const previousStage = index > 0 ? stages[index - 1] : null;
                                            const previousStageCompleted = previousStage?.status === 'completed';
                                            const previousStageBracketExists = previousStage ? hasBrackets[previousStage.id] : true;

                                            // Can generate bracket if: first stage OR previous stage is completed with brackets
                                            const canGenerate = isFirstStage || (previousStageCompleted && previousStageBracketExists);
                                            const isBlocked = !stageBracketExists && !canGenerate && !stage.is_locked;

                                            return (
                                                <div className="relative group">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className={`text-xs ${stageBracketExists
                                                            ? 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                                                            : isBlocked
                                                                ? 'border-gray-600 text-gray-500 cursor-not-allowed'
                                                                : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                                                            }`}
                                                        onClick={() => stageBracketExists ? handleViewBracket(stage.id) : handleGenerateStageBracket(stage.id)}
                                                        disabled={(!stageBracketExists && (stage.is_locked || isBlocked))}
                                                    >
                                                        {stageBracketExists ? (
                                                            <>
                                                                <Layers className="w-3.5 h-3.5 mr-2" />
                                                                Manage Bracket
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Shuffle className="w-3.5 h-3.5 mr-2" />
                                                                Generate Bracket
                                                            </>
                                                        )}
                                                    </Button>
                                                    {/* Delete Bracket Button - only show when bracket exists */}
                                                    {stageBracketExists && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                                                            onClick={() => handleDeleteStageBracket(stage.id)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                            Delete Bracket
                                                        </Button>
                                                    )}
                                                    {isBlocked && (
                                                        <div className="absolute bottom-full left-0 mb-2 px-3 py-2 bg-gray-900 border border-white/10 rounded-lg text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                            Complete "{previousStage?.name}" stage first
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs"
                                            onClick={() => handleAdvanceTeams(stage.id)}
                                            disabled={stage.status !== 'completed'}
                                        >
                                            <ArrowRight className="w-3.5 h-3.5 mr-2" />
                                            Advance Teams
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className={`text-xs ${stage.is_locked ? "text-amber-400 hover:text-amber-300" : "text-gray-400 hover:text-white"}`}
                                            onClick={() => handleUpdateStage(stage.id, { is_locked: !stage.is_locked })}
                                        >
                                            {stage.is_locked ? <Unlock className="w-3.5 h-3.5 mr-2" /> : <Lock className="w-3.5 h-3.5 mr-2" />}
                                            {stage.is_locked ? 'Unlock Stage' : 'Lock Stage'}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={addStageDialogOpen} onOpenChange={setAddStageDialogOpen}>
                <DialogContent className="bg-gaming-dark border border-gaming-gray/30 sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add Tournament Stage</DialogTitle>
                        <DialogDescription>
                            Define a new stage for your tournament.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-200">Stage Name</label>
                            <input
                                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white outline-none focus:border-emerald-500/50"
                                placeholder="e.g. Qualifiers, Playoffs"
                                value={newStageName}
                                onChange={(e) => setNewStageName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-200">Format</label>
                            <select
                                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white outline-none focus:border-emerald-500/50"
                                value={newStageFormat}
                                onChange={(e) => setNewStageFormat(e.target.value)}
                            >
                                <option value="single_elimination">Single Elimination</option>
                                <option value="double_elimination">Double Elimination</option>
                                <option value="round_robin">Round Robin</option>
                                <option value="swiss">Swiss</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-200">Capacity</label>
                                <input
                                    type="number"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white outline-none focus:border-emerald-500/50"
                                    placeholder="Unlimited"
                                    value={newStageCapacity}
                                    onChange={(e) => setNewStageCapacity(e.target.value === '' ? '' : parseInt(e.target.value))}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-200">Advancement</label>
                                <input
                                    type="number"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white outline-none focus:border-emerald-500/50"
                                    placeholder="None"
                                    value={newStageAdvancement}
                                    onChange={(e) => setNewStageAdvancement(e.target.value === '' ? '' : parseInt(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddStageDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddStage} className="bg-emerald-600 hover:bg-emerald-500">Create Stage</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <StageSetupWizard
                open={wizardOpen}
                onOpenChange={setWizardOpen}
                tournamentId={tournamentId}
                game={game}
                existingStages={stages}
                onComplete={onUpdate}
            />
        </>
    );
};
