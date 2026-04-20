import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Plus, Trophy, ArrowUp, ArrowDown, Trash2, Users, ArrowRight, AlertTriangle, ChevronDown, ChevronRight, Zap, FileText } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import BRStageGroupSection from '@/components/organizer/br/BRStageGroupSection';

type TournamentStage = Database['public']['Tables']['tournament_stages']['Row'];

interface Participant {
    team_id?: string | null;
    status?: string;
}

interface ScoringPreset {
    placements: number[];
    killPoints: number;
    killCap: number | null;
}

interface StageTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    teamRange: string;
    stages: { name: string; capacity: number | null; advancementCount: number | null }[];
}

const BR_TEMPLATES: StageTemplate[] = [
    {
        id: 'open_qualifier',
        name: 'Open Qualifier → Finals',
        description: '2-stage format. All teams play group stage, top performers advance to a single finals lobby.',
        icon: '🏆',
        teamRange: '20–60 teams',
        stages: [
            { name: 'Open Qualifiers', capacity: 20, advancementCount: 10 },
            { name: 'Grand Finals', capacity: null, advancementCount: null },
        ],
    },
    {
        id: 'triple_stage',
        name: 'Groups → Semis → Finals',
        description: '3-stage progression. Large pool narrows through semis to a final lobby. Used in ALGS & PCS.',
        icon: '🔥',
        teamRange: '40–100 teams',
        stages: [
            { name: 'Group Stage', capacity: 20, advancementCount: 10 },
            { name: 'Semi-Finals', capacity: 20, advancementCount: 10 },
            { name: 'Grand Finals', capacity: null, advancementCount: null },
        ],
    },
    {
        id: 'fncs_style',
        name: 'FNCS-Style (4 Stages)',
        description: 'Open → Quarter → Semi → Finals. The gold standard for large-scale Fortnite tournaments.',
        icon: '⚡',
        teamRange: '80–200 teams',
        stages: [
            { name: 'Open Qualifiers', capacity: 20, advancementCount: 12 },
            { name: 'Quarter-Finals', capacity: 20, advancementCount: 10 },
            { name: 'Semi-Finals', capacity: 20, advancementCount: 10 },
            { name: 'Grand Finals', capacity: null, advancementCount: null },
        ],
    },
    {
        id: 'single_lobby',
        name: 'Single Lobby (No Stages)',
        description: 'All teams in one lobby. Best for small events with ≤20 teams. No advancement needed.',
        icon: '🎯',
        teamRange: '4–20 teams',
        stages: [
            { name: 'Main Event', capacity: null, advancementCount: null },
        ],
    },
    {
        id: 'dual_group',
        name: 'Dual Group → Unified Finals',
        description: '2 parallel groups play separately, top teams merge into one finals lobby. Clean and fast.',
        icon: '⚔️',
        teamRange: '30–40 teams',
        stages: [
            { name: 'Group Stage', capacity: 20, advancementCount: 8 },
            { name: 'Grand Finals', capacity: null, advancementCount: null },
        ],
    },
];

interface BRStageManagementTabProps {
    tournamentId: string;
    stages: TournamentStage[];
    participants: Participant[];
    scoringPreset: ScoringPreset;
    onUpdate: () => void;
}

export const BRStageManagementTab: React.FC<BRStageManagementTabProps> = ({ tournamentId, stages, participants, scoringPreset, onUpdate }) => {
    const { toast } = useToast();
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [editingStage, setEditingStage] = useState<string | null>(null);
    const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [applyingTemplate, setApplyingTemplate] = useState(false);

    // Add stage form
    const [newName, setNewName] = useState('');
    const [newCapacity, setNewCapacity] = useState<string>('20');
    const [newAdvancement, setNewAdvancement] = useState<string>('');

    // Edit stage form
    const [editName, setEditName] = useState('');
    const [editCapacity, setEditCapacity] = useState<string>('');
    const [editAdvancement, setEditAdvancement] = useState<string>('');

    const sortedStages = [...stages].sort((a, b) => a.stage_order - b.stage_order);

    const registeredTeamCount = useMemo(() => {
        const teamIds = new Set<string>();
        for (const p of participants) {
            if (p.team_id && (p.status === 'accepted' || p.status === 'approved')) {
                teamIds.add(p.team_id);
            }
        }
        return teamIds.size;
    }, [participants]);

    const handleAddStage = async () => {
        if (!newName.trim()) return;
        try {
            const newOrder = stages.length + 1;
            const stageDtos = stages.map(s => ({
                id: s.id,
                name: s.name,
                format: s.format || 'battle_royale',
                stageOrder: s.stage_order,
                bestOf: 1,
                capacity: s.capacity,
                advancementCount: s.advancement_count,
            }));

            stageDtos.push({
                id: null as any,
                name: newName.trim(),
                format: 'battle_royale',
                stageOrder: newOrder,
                bestOf: 1,
                capacity: newCapacity && newCapacity !== 'none' ? parseInt(newCapacity) : null,
                advancementCount: newAdvancement && newAdvancement !== 'none' ? parseInt(newAdvancement) : null,
            });

            await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: stageDtos });
            toast({ title: 'Stage added', description: `${newName} has been added.` });
            setAddDialogOpen(false);
            setNewName('');
            setNewCapacity('20');
            setNewAdvancement('');
            onUpdate();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to add stage', variant: 'destructive' });
        }
    };

    const handleDeleteStage = async (stageId: string) => {
        try {
            await apiClient.post(`/api/tournaments/${tournamentId}/stages/delete`, { deleteIds: [stageId] });

            // Reorder remaining stages
            const remaining = stages.filter(s => s.id !== stageId).sort((a, b) => a.stage_order - b.stage_order);
            for (let i = 0; i < remaining.length; i++) {
                if (remaining[i].stage_order !== i + 1) {
                    await apiClient.patch(`/api/stages/${remaining[i].id}/order`, { stageOrder: i + 1 });
                }
            }

            toast({ title: 'Stage deleted' });
            setDeleteConfirmId(null);
            onUpdate();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to delete stage', variant: 'destructive' });
        }
    };

    const handleEditStage = (stage: TournamentStage) => {
        setEditingStage(stage.id);
        setEditName(stage.name);
        setEditCapacity(stage.capacity?.toString() || 'none');
        setEditAdvancement(stage.advancement_count?.toString() || 'none');
    };

    const handleSaveEdit = async () => {
        if (!editingStage || !editName.trim()) return;
        try {
            const stageDtos = stages.map(s => ({
                id: s.id,
                name: s.id === editingStage ? editName.trim() : s.name,
                format: s.format || 'battle_royale',
                stageOrder: s.stage_order,
                bestOf: 1,
                capacity: s.id === editingStage ? (editCapacity && editCapacity !== 'none' ? parseInt(editCapacity) : null) : s.capacity,
                advancementCount: s.id === editingStage ? (editAdvancement && editAdvancement !== 'none' ? parseInt(editAdvancement) : null) : s.advancement_count,
            }));

            await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: stageDtos });
            toast({ title: 'Stage updated' });
            setEditingStage(null);
            onUpdate();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to update stage', variant: 'destructive' });
        }
    };

    const handleReorder = async (stageId: string, direction: 'up' | 'down') => {
        const idx = sortedStages.findIndex(s => s.id === stageId);
        if (idx === -1) return;
        if (direction === 'up' && idx === 0) return;
        if (direction === 'down' && idx === sortedStages.length - 1) return;

        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        const current = sortedStages[idx];
        const target = sortedStages[targetIdx];

        try {
            const stageDtos = stages.map(s => ({
                id: s.id,
                name: s.name,
                format: s.format || 'battle_royale',
                stageOrder: s.id === current.id ? target.stage_order : s.id === target.id ? current.stage_order : s.stage_order,
                bestOf: 1,
                capacity: s.capacity,
                advancementCount: s.advancement_count,
            }));

            await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: stageDtos });
            onUpdate();
        } catch (error: any) {
            toast({ title: 'Error', description: 'Failed to reorder stages', variant: 'destructive' });
        }
    };

    const handleStatusChange = async (stageId: string, status: string) => {
        try {
            await apiClient.patch(`/api/stages/${stageId}/status`, { status });
            toast({ title: 'Status updated', description: `Stage is now ${status}.` });
            onUpdate();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to update status', variant: 'destructive' });
        }
    };

    const handleApplyTemplate = async (template: StageTemplate) => {
        setApplyingTemplate(true);
        try {
            // Delete existing stages first if any
            if (stages.length > 0) {
                await apiClient.post(`/api/tournaments/${tournamentId}/stages/delete`, {
                    deleteIds: stages.map(s => s.id),
                });
            }

            // Create new stages from template
            const stageDtos = template.stages.map((ts, i) => ({
                id: null as any,
                name: ts.name,
                format: 'battle_royale',
                stageOrder: i + 1,
                bestOf: 1,
                capacity: ts.capacity,
                advancementCount: ts.advancementCount,
            }));

            await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: stageDtos });
            toast({ title: 'Template Applied', description: `"${template.name}" — ${template.stages.length} stages created.` });
            setTemplateDialogOpen(false);
            onUpdate();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to apply template', variant: 'destructive' });
        } finally {
            setApplyingTemplate(false);
        }
    };

    return (
        <>
            <Card className="relative bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden p-6 sm:p-8 mb-6">
                <CardHeader className="p-0 pb-4 border-b border-white/5 mb-4 flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle>Battle Royale Stages</CardTitle>
                        <p className="text-sm text-gray-400 mt-1">
                            Configure the tournament progression — group stages, qualifiers, and finals.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setTemplateDialogOpen(true)}
                            className="border-white/10 text-gray-300 hover:text-white flex items-center gap-2"
                        >
                            <FileText className="w-4 h-4" />
                            Templates
                        </Button>
                        <Button
                            onClick={() => setAddDialogOpen(true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Stage
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {sortedStages.length === 0 ? (
                        <div className="space-y-6">
                            <div className="text-center py-6">
                                <Layers className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                                <p className="text-gray-400 mb-1">No stages defined yet.</p>
                                <p className="text-sm text-gray-500">
                                    Choose a template below to get started, or add stages manually.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {BR_TEMPLATES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => handleApplyTemplate(t)}
                                        disabled={applyingTemplate}
                                        className="text-left p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group disabled:opacity-50"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-lg">{t.icon}</span>
                                            <h4 className="font-semibold text-white text-sm group-hover:text-emerald-300 transition-colors">{t.name}</h4>
                                        </div>
                                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{t.description}</p>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600">{t.teamRange}</span>
                                            <span className="text-xs text-emerald-500/70">{t.stages.length} {t.stages.length === 1 ? 'stage' : 'stages'}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sortedStages.map((stage, index) => (
                                <div key={stage.id}>
                                    <div className="p-5 bg-white/[0.02] border border-white/10 rounded-xl hover:border-emerald-500/20 transition-all">
                                        {editingStage === stage.id ? (
                                            /* Edit Mode */
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-gray-500">Stage Name</Label>
                                                        <Input
                                                            value={editName}
                                                            onChange={(e) => setEditName(e.target.value)}
                                                            className="[color-scheme:dark]"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-gray-500">Teams per Group (Lobby Size)</Label>
                                                        <Select value={editCapacity} onValueChange={setEditCapacity}>
                                                            <SelectTrigger><SelectValue placeholder="No limit" /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none">No limit</SelectItem>
                                                                {[10, 12, 15, 16, 20, 25, 30, 40, 60].map(n => (
                                                                    <SelectItem key={n} value={String(n)}>{n} teams</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-gray-500">Advance Top N</Label>
                                                        <Select value={editAdvancement} onValueChange={setEditAdvancement}>
                                                            <SelectTrigger><SelectValue placeholder="None (final stage)" /></SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="none">None (final stage)</SelectItem>
                                                                {[2, 3, 4, 5, 6, 8, 10, 12, 15, 16, 20].map(n => (
                                                                    <SelectItem key={n} value={String(n)}>Top {n}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" onClick={handleSaveEdit} className="bg-emerald-600 hover:bg-emerald-500">
                                                        Save
                                                    </Button>
                                                    <Button size="sm" variant="ghost" onClick={() => setEditingStage(null)}>
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* View Mode */
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-lg">
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-white text-lg">{stage.name}</h4>
                                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                            <span className="text-xs text-gray-400 uppercase tracking-wider bg-gray-800 px-2 py-0.5 rounded">
                                                                Battle Royale
                                                            </span>
                                                            <span className={`text-xs uppercase tracking-wider px-2 py-0.5 rounded font-medium ${
                                                                stage.status === 'live' ? "bg-red-500/20 text-red-400" :
                                                                stage.status === 'completed' ? "bg-emerald-500/20 text-emerald-400" :
                                                                "bg-blue-500/20 text-blue-400"
                                                            }`}>
                                                                {stage.status || 'upcoming'}
                                                            </span>
                                                            {stage.capacity && (
                                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                                    <Users className="w-3 h-3" />
                                                                    {stage.capacity} per group
                                                                </span>
                                                            )}
                                                            {stage.advancement_count && (
                                                                <span className="text-xs text-amber-400 flex items-center gap-1">
                                                                    <Trophy className="w-3 h-3" />
                                                                    Top {stage.advancement_count} advance
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {/* Expand/Collapse Groups */}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className={`text-xs ${expandedStageId === stage.id ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5' : 'border-white/10'}`}
                                                        onClick={() => setExpandedStageId(expandedStageId === stage.id ? null : stage.id)}
                                                    >
                                                        {expandedStageId === stage.id ? <ChevronDown className="w-3.5 h-3.5 mr-1.5" /> : <ChevronRight className="w-3.5 h-3.5 mr-1.5" />}
                                                        Manage Groups
                                                    </Button>

                                                    {/* Status Dropdown */}
                                                    <Select
                                                        value={stage.status || 'upcoming'}
                                                        onValueChange={(v) => handleStatusChange(stage.id, v)}
                                                    >
                                                        <SelectTrigger className="w-[120px] h-8 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="upcoming">Upcoming</SelectItem>
                                                            <SelectItem value="live">Live</SelectItem>
                                                            <SelectItem value="completed">Completed</SelectItem>
                                                        </SelectContent>
                                                    </Select>

                                                    {/* Reorder */}
                                                    <div className="flex flex-col gap-0.5">
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-400 hover:text-white" disabled={index === 0} onClick={() => handleReorder(stage.id, 'up')}>
                                                            <ArrowUp className="w-3 h-3" />
                                                        </Button>
                                                        <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-400 hover:text-white" disabled={index === sortedStages.length - 1} onClick={() => handleReorder(stage.id, 'down')}>
                                                            <ArrowDown className="w-3 h-3" />
                                                        </Button>
                                                    </div>

                                                    {/* Edit */}
                                                    <Button size="sm" variant="outline" className="text-xs border-white/10" onClick={() => handleEditStage(stage)}>
                                                        Edit
                                                    </Button>

                                                    {/* Delete */}
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-400/10" onClick={() => setDeleteConfirmId(stage.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Inline Group Management (expanded) */}
                                        {expandedStageId === stage.id && editingStage !== stage.id && (
                                            <BRStageGroupSection
                                                stageId={stage.id}
                                                registeredTeamCount={registeredTeamCount}
                                                scoringPreset={scoringPreset}
                                                hasNextStage={sortedStages.some(s => s.stage_order > stage.stage_order)}
                                                advancementCount={stage.advancement_count}
                                                stageStatus={stage.status}
                                                onUpdate={onUpdate}
                                            />
                                        )}
                                    </div>

                                    {/* Advancement Arrow */}
                                    {index < sortedStages.length - 1 && (
                                        <div className="flex justify-center py-2">
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <ArrowRight className="w-4 h-4 text-emerald-500" />
                                                {stage.advancement_count ? (
                                                    <span>Top {stage.advancement_count} advance to next stage</span>
                                                ) : (
                                                    <span className="text-amber-400 flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        No advancement count set
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Stage Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent className="bg-[#0a0a0c] border-white/10">
                    <DialogHeader>
                        <DialogTitle>Add BR Stage</DialogTitle>
                        <DialogDescription>
                            Add a new stage to the tournament flow. Teams progress from one stage to the next.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Stage Name</Label>
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g., Group Stage, Semi-Finals, Grand Finals"
                                className="[color-scheme:dark]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Teams per Group (Lobby Size)</Label>
                            <Select value={newCapacity} onValueChange={setNewCapacity}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No limit</SelectItem>
                                    {[10, 12, 15, 16, 20, 25, 30, 40, 60].map(n => (
                                        <SelectItem key={n} value={String(n)}>{n} teams</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500">
                                How many teams fit in each lobby. Groups will be created in the Groups tab.
                            </p>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Advance Top N per Group</Label>
                            <Select value={newAdvancement} onValueChange={setNewAdvancement}>
                                <SelectTrigger><SelectValue placeholder="None (final stage)" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None (final stage)</SelectItem>
                                    {[2, 3, 4, 5, 6, 8, 10, 12, 15, 16, 20].map(n => (
                                        <SelectItem key={n} value={String(n)}>Top {n}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-gray-500">
                                Leave empty for the final stage. Set a number for qualifier stages.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddStage} disabled={!newName.trim()} className="bg-emerald-600 hover:bg-emerald-500">
                            Add Stage
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
                <DialogContent className="bg-[#0a0a0c] border-white/10">
                    <DialogHeader>
                        <DialogTitle>Delete Stage?</DialogTitle>
                        <DialogDescription>
                            This will remove the stage and all its groups, rounds, and results. This cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => deleteConfirmId && handleDeleteStage(deleteConfirmId)}>
                            Delete Stage
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Template Picker Dialog */}
            <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-emerald-400" />
                            Stage Templates
                        </DialogTitle>
                        <DialogDescription>
                            {stages.length > 0
                                ? 'Applying a template will replace all existing stages. Choose a structure that fits your tournament.'
                                : 'Choose a pre-built stage structure to get started quickly.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 gap-3 py-2 max-h-[60vh] overflow-y-auto">
                        {BR_TEMPLATES.map((t) => (
                            <div
                                key={t.id}
                                className="p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">{t.icon}</span>
                                            <h4 className="font-semibold text-white">{t.name}</h4>
                                            <span className="text-xs text-gray-600 ml-auto hidden sm:block">{t.teamRange}</span>
                                        </div>
                                        <p className="text-xs text-gray-400 mb-3">{t.description}</p>
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {t.stages.map((s, i) => (
                                                <React.Fragment key={i}>
                                                    <span className="text-xs bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-gray-300">
                                                        {s.name}
                                                        {s.capacity && <span className="text-gray-500 ml-1">({s.capacity}/grp)</span>}
                                                    </span>
                                                    {i < t.stages.length - 1 && (
                                                        <ArrowRight className="w-3 h-3 text-emerald-500/50 flex-shrink-0" />
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleApplyTemplate(t)}
                                        disabled={applyingTemplate}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white flex-shrink-0"
                                    >
                                        {applyingTemplate ? 'Applying...' : 'Apply'}
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
