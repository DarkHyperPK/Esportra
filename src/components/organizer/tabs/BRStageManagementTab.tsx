import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Plus, Trophy, ArrowUp, ArrowDown, Trash2, Users, ArrowRight, AlertTriangle, ChevronDown, ChevronRight, FileText, Hash, LogOut, LogIn, Pencil, Check, X, RotateCcw, Calendar } from 'lucide-react';
import { apiClient, ApiError } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';
import BRStageGroupSection from '@/components/organizer/br/BRStageGroupSection';
import { BRScheduleDialog } from '@/components/organizer/br/BRScheduleDialog';

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
        name: 'Qualifier → Finals',
        description: '2-stage format. All teams compete in qualifiers, top performers advance to a single finals lobby.',
        icon: '',
        teamRange: '20–60 teams',
        stages: [
            { name: 'Qualifiers', capacity: 20, advancementCount: 10 },
            { name: 'Grand Finals', capacity: null, advancementCount: null },
        ],
    },
    {
        id: 'triple_stage',
        name: 'Groups → Semis → Finals',
        description: '3-stage progression. Large pool narrows through semi-finals into a single finals lobby.',
        icon: '',
        teamRange: '40–100 teams',
        stages: [
            { name: 'Group Stage', capacity: 20, advancementCount: 10 },
            { name: 'Semi-Finals', capacity: 20, advancementCount: 10 },
            { name: 'Grand Finals', capacity: null, advancementCount: null },
        ],
    },
    {
        id: 'four_stage',
        name: 'Full Circuit (4 Stages)',
        description: 'Open → Quarter → Semi → Finals. Best for large-scale tournaments with high team counts.',
        icon: '',
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
        name: 'Single Lobby',
        description: 'All teams in one lobby. Best for small events with 20 teams or fewer. No advancement needed.',
        icon: '',
        teamRange: '4–20 teams',
        stages: [
            { name: 'Main Event', capacity: null, advancementCount: null },
        ],
    },
    {
        id: 'dual_group',
        name: 'Dual Group → Finals',
        description: '2 parallel groups compete separately, top teams from each merge into one finals lobby.',
        icon: '',
        teamRange: '30–40 teams',
        stages: [
            { name: 'Group Stage', capacity: 20, advancementCount: 8 },
            { name: 'Grand Finals', capacity: null, advancementCount: null },
        ],
    },
];

interface StageFlowInfo {
    teamsEntering: number;
    groupsFormed: number;
    teamsAdvancing: number | null;
    isFinal: boolean;
}

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
    const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [applyingTemplate, setApplyingTemplate] = useState(false);
    const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

    // Template config step
    const [selectedTemplate, setSelectedTemplate] = useState<StageTemplate | null>(null);
    const [templateConfig, setTemplateConfig] = useState<{ capacity: number; advancement: number }[]>([]);

    // Advance teams confirmation
    const [advanceConfirmStageId, setAdvanceConfirmStageId] = useState<string | null>(null);
    const [isAdvancing, setIsAdvancing] = useState(false);

    // Schedule dialog
    const [scheduleStageId, setScheduleStageId] = useState<string | null>(null);

    // Inline editing state
    const [editingField, setEditingField] = useState<{ stageId: string; field: 'name' | 'capacity' | 'advancement' } | null>(null);
    const [editValue, setEditValue] = useState('');

    // Add stage form
    const [newName, setNewName] = useState('');
    const [newCapacity, setNewCapacity] = useState<string>('20');
    const [newAdvancement, setNewAdvancement] = useState<string>('none');

    const sortedStages = useMemo(() => [...stages].sort((a, b) => a.stage_order - b.stage_order), [stages]);

    const registeredTeamCount = useMemo(() => {
        const teamIds = new Set<string>();
        for (const p of participants) {
            if (p.team_id && (p.status === 'accepted' || p.status === 'approved')) {
                teamIds.add(p.team_id);
            }
        }
        return teamIds.size;
    }, [participants]);

    // Compute flow info for each stage (teams entering, groups formed, teams advancing)
    const stageFlows = useMemo((): Map<string, StageFlowInfo> => {
        const flows = new Map<string, StageFlowInfo>();
        let teamsEntering = registeredTeamCount;

        for (let i = 0; i < sortedStages.length; i++) {
            const stage = sortedStages[i];
            const isFinal = i === sortedStages.length - 1;
            const cap = stage.capacity || teamsEntering;
            const groupsFormed = cap > 0 ? Math.ceil(teamsEntering / cap) : 1;
            const advPerGroup = stage.advancement_count || null;
            const teamsAdvancing = advPerGroup && !isFinal ? advPerGroup * groupsFormed : null;

            flows.set(stage.id, { teamsEntering, groupsFormed, isFinal, teamsAdvancing });
            teamsEntering = teamsAdvancing || teamsEntering;
        }
        return flows;
    }, [sortedStages, registeredTeamCount]);

    // Save a single field inline
    const saveInlineEdit = useCallback(async (stageId: string, field: 'name' | 'capacity' | 'advancement', value: string) => {
        try {
            const stageDtos = stages.map(s => {
                const dto: any = {
                    id: s.id,
                    name: s.name,
                    format: s.format || 'battle_royale',
                    stageOrder: s.stage_order,
                    bestOf: 1,
                    capacity: s.capacity,
                    advancementCount: s.advancement_count,
                    startsAt: s.starts_at || null,
                    endsAt: s.ends_at || null,
                };
                if (s.id === stageId) {
                    if (field === 'name') dto.name = value.trim();
                    if (field === 'capacity') dto.capacity = value && value !== 'none' ? parseInt(value) : null;
                    if (field === 'advancement') dto.advancementCount = value && value !== 'none' ? parseInt(value) : null;
                }
                return dto;
            });

            await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: stageDtos });
            toast({ title: 'Updated', description: `Stage ${field} saved.` });
            setEditingField(null);
            onUpdate();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to update', variant: 'destructive' });
        }
    }, [stages, tournamentId, toast, onUpdate]);

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
                startsAt: s.starts_at || null,
                endsAt: s.ends_at || null,
            }));

            stageDtos.push({
                id: null as any,
                name: newName.trim(),
                format: 'battle_royale',
                stageOrder: newOrder,
                bestOf: 1,
                capacity: newCapacity && newCapacity !== 'none' ? parseInt(newCapacity) : null,
                advancementCount: newAdvancement && newAdvancement !== 'none' ? parseInt(newAdvancement) : null,
                startsAt: null,
                endsAt: null,
            });

            await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: stageDtos });
            toast({ title: 'Stage added', description: `${newName} has been added.` });
            setAddDialogOpen(false);
            setNewName('');
            setNewCapacity('20');
            setNewAdvancement('none');
            onUpdate();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to add stage', variant: 'destructive' });
        }
    };

    const handleDeleteStage = async (stageId: string) => {
        try {
            await apiClient.post(`/api/tournaments/${tournamentId}/stages/delete`, { deleteIds: [stageId] });
            const remaining = stages.filter(s => s.id !== stageId).sort((a, b) => a.stage_order - b.stage_order);
            for (let i = 0; i < remaining.length; i++) {
                if (remaining[i].stage_order !== i + 1) {
                    await apiClient.patch(`/api/stages/${remaining[i].id}/order`, { stageOrder: i + 1 });
                }
            }
            toast({ title: 'Stage deleted' });
            setDeleteConfirmId(null);
            if (expandedStageId === stageId) setExpandedStageId(null);
            onUpdate();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to delete stage', variant: 'destructive' });
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
                startsAt: s.starts_at || null,
                endsAt: s.ends_at || null,
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

    const handleResetAllStages = async () => {
        setIsResetting(true);
        try {
            const deleteIds = stages.map(s => s.id);
            await apiClient.post(`/api/tournaments/${tournamentId}/stages/delete`, { deleteIds });
            toast({ title: 'All stages cleared', description: 'You can start fresh with templates or add stages manually.' });
            setResetConfirmOpen(false);
            setExpandedStageId(null);
            onUpdate();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to reset stages', variant: 'destructive' });
        } finally {
            setIsResetting(false);
        }
    };

    const handleSelectTemplate = (template: StageTemplate) => {
        setSelectedTemplate(template);
        setTemplateConfig(
            template.stages.map(s => ({
                capacity: s.capacity ?? 20,
                advancement: s.advancementCount ?? 0,
            }))
        );
    };

    const handleApplyTemplate = async () => {
        if (!selectedTemplate) return;
        setApplyingTemplate(true);
        try {
            if (stages.length > 0) {
                await apiClient.post(`/api/tournaments/${tournamentId}/stages/delete`, {
                    deleteIds: stages.map(s => s.id),
                });
            }
            const stageDtos = selectedTemplate.stages.map((ts, i) => ({
                id: null as any,
                name: ts.name,
                format: 'battle_royale',
                stageOrder: i + 1,
                bestOf: 1,
                capacity: i < selectedTemplate.stages.length - 1 ? templateConfig[i]?.capacity || null : null,
                advancementCount: i < selectedTemplate.stages.length - 1 ? templateConfig[i]?.advancement || null : null,
                startsAt: null,
                endsAt: null,
            }));

            await apiClient.put(`/api/tournaments/${tournamentId}/stages`, { stages: stageDtos });
            toast({ title: 'Template Applied', description: `"${selectedTemplate.name}" — ${selectedTemplate.stages.length} stages created.` });
            setTemplateDialogOpen(false);
            setSelectedTemplate(null);
            onUpdate();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Failed to apply template', variant: 'destructive' });
        } finally {
            setApplyingTemplate(false);
        }
    };

    const handleAdvanceTeams = async (stageId: string, advancementCount: number) => {
        setIsAdvancing(true);
        try {
            const data = await apiClient.post<{ advanced: number; to_stage: string }>(
                `/api/stages/${stageId}/br/advance?preview=false`,
                { teamsPerGroup: advancementCount }
            );
            toast({ title: `${data.advanced} teams advanced to ${data.to_stage}` });
            setAdvanceConfirmStageId(null);
            onUpdate();
        } catch (error: any) {
            const msg = error instanceof ApiError && typeof error.body === 'object' && error.body?.error
                ? error.body.error : error.message;
            toast({ title: 'Advancement failed', description: msg, variant: 'destructive' });
        } finally {
            setIsAdvancing(false);
        }
    };

    // Pre-fill add stage dialog from previous stage's output
    const openAddStageDialog = () => {
        if (sortedStages.length > 0) {
            const lastStage = sortedStages[sortedStages.length - 1];
            const lastFlow = stageFlows.get(lastStage.id);
            const teamsReceiving = lastFlow?.teamsAdvancing || lastFlow?.teamsEntering || registeredTeamCount;
            setNewCapacity(teamsReceiving <= 30 ? 'none' : '20');
            setNewAdvancement('none');
            setNewName(sortedStages.length === 1 ? 'Grand Finals' : `Stage ${sortedStages.length + 1}`);
        } else {
            setNewName('Group Stage');
            setNewCapacity('20');
            setNewAdvancement('none');
        }
        setAddDialogOpen(true);
    };

    const startInlineEdit = (stageId: string, field: 'name' | 'capacity' | 'advancement', currentValue: string) => {
        setEditingField({ stageId, field });
        setEditValue(currentValue);
    };

    // Context info for the add stage dialog
    const addStageContext = useMemo(() => {
        if (sortedStages.length === 0) return null;
        const lastStage = sortedStages[sortedStages.length - 1];
        const lastFlow = stageFlows.get(lastStage.id);
        return {
            fromStageName: lastStage.name,
            teamsReceiving: lastFlow?.teamsAdvancing || lastFlow?.teamsEntering || 0,
        };
    }, [sortedStages, stageFlows]);

    return (
        <>
            <Card className="relative bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden p-6 sm:p-8 mb-6">
                <CardHeader className="p-0 pb-4 border-b border-white/5 mb-4 flex flex-row items-center justify-between space-y-0">
                    <div>
                        <CardTitle>Battle Royale Stages</CardTitle>
                        <p className="text-sm text-gray-400 mt-1">
                            Configure the tournament progression. Click any value to edit it inline.
                        </p>
                    </div>
                    {sortedStages.length > 0 && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setResetConfirmOpen(true)}
                                className="border-red-500/20 text-red-400/70 hover:text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setTemplateDialogOpen(true)}
                                className="border-white/10 text-gray-300 hover:text-white flex items-center gap-2"
                            >
                                <FileText className="w-4 h-4" />
                                Templates
                            </Button>
                            <Button
                                onClick={openAddStageDialog}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Stage
                            </Button>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="p-0">
                    {/* Pipeline Summary */}
                    {sortedStages.length > 1 && (
                        <div className="mb-5 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                            <div className="flex items-center gap-2 flex-wrap justify-center">
                                <span className="text-xs font-medium text-white bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                                    <Users className="w-3 h-3" />
                                    {registeredTeamCount} teams
                                </span>
                                {sortedStages.map((stage, i) => {
                                    const flow = stageFlows.get(stage.id);
                                    return (
                                        <React.Fragment key={stage.id}>
                                            <ArrowRight className="w-3.5 h-3.5 text-emerald-500/40 flex-shrink-0" />
                                            <span className="text-xs text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg whitespace-nowrap">
                                                {stage.name}
                                                {flow && flow.groupsFormed > 1 && (
                                                    <span className="text-gray-600 ml-1">({flow.groupsFormed}g)</span>
                                                )}
                                            </span>
                                            {flow?.teamsAdvancing && i < sortedStages.length - 1 && (
                                                <>
                                                    <ArrowRight className="w-3.5 h-3.5 text-amber-500/40 flex-shrink-0" />
                                                    <span className="text-xs text-amber-400/80 whitespace-nowrap">{flow.teamsAdvancing}t</span>
                                                </>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {sortedStages.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
                            <Layers className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                            <p className="text-gray-400 mb-1">No stages defined yet.</p>
                            <p className="text-sm text-gray-500 mb-4">
                                Use a template for a quick setup, or add stages manually.
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <Button
                                    variant="outline"
                                    onClick={() => setTemplateDialogOpen(true)}
                                    className="border-white/10 text-gray-300 hover:text-white"
                                >
                                    <FileText className="w-4 h-4 mr-2" />
                                    Browse Templates
                                </Button>
                                <Button
                                    onClick={openAddStageDialog}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Stage
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-0">
                            {sortedStages.map((stage, index) => {
                                const flow = stageFlows.get(stage.id);
                                const isExpanded = expandedStageId === stage.id;
                                const isLast = index === sortedStages.length - 1;
                                const prevStage = index > 0 ? sortedStages[index - 1] : null;

                                return (
                                    <div key={stage.id}>
                                        {/* Stage Card */}
                                        <div className={`p-5 border rounded-xl transition-all ${
                                            isExpanded
                                                ? 'bg-emerald-500/[0.03] border-emerald-500/20'
                                                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                                        }`}>
                                            {/* Header Row */}
                                            <div className="flex flex-col gap-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    {/* Left: Stage number + name + status */}
                                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                                                            stage.status === 'live' ? 'bg-red-500/15 border border-red-500/30 text-red-400' :
                                                            stage.status === 'completed' ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400' :
                                                            'bg-white/5 border border-white/10 text-gray-400'
                                                        }`}>
                                                            {index + 1}
                                                        </div>
                                                        <div className="min-w-0">
                                                            {editingField?.stageId === stage.id && editingField.field === 'name' ? (
                                                                <div className="flex items-center gap-1.5">
                                                                    <Input
                                                                        value={editValue}
                                                                        onChange={(e) => setEditValue(e.target.value)}
                                                                        className="h-7 text-sm w-48 [color-scheme:dark]"
                                                                        autoFocus
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' && editValue.trim()) saveInlineEdit(stage.id, 'name', editValue);
                                                                            if (e.key === 'Escape') setEditingField(null);
                                                                        }}
                                                                    />
                                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-emerald-400" onClick={() => editValue.trim() && saveInlineEdit(stage.id, 'name', editValue)}>
                                                                        <Check className="w-3 h-3" />
                                                                    </Button>
                                                                    <Button size="icon" variant="ghost" className="h-6 w-6 text-gray-500" onClick={() => setEditingField(null)}>
                                                                        <X className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    className="text-left group/name"
                                                                    onClick={() => startInlineEdit(stage.id, 'name', stage.name)}
                                                                >
                                                                    <h4 className="font-bold text-white text-base flex items-center gap-1.5">
                                                                        {stage.name}
                                                                        <Pencil className="w-3 h-3 text-gray-600 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                                                                    </h4>
                                                                </button>
                                                            )}
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded font-semibold ${
                                                                    stage.status === 'live' ? "bg-red-500/20 text-red-400" :
                                                                    stage.status === 'completed' ? "bg-emerald-500/20 text-emerald-400" :
                                                                    "bg-blue-500/15 text-blue-400"
                                                                }`}>
                                                                    {stage.status || 'upcoming'}
                                                                </span>
                                                                {isLast && (
                                                                    <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-semibold">
                                                                        Finals
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right: Actions */}
                                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                                        <Select
                                                            value={stage.status || 'upcoming'}
                                                            onValueChange={(v) => handleStatusChange(stage.id, v)}
                                                        >
                                                            <SelectTrigger className="w-[110px] h-7 text-[11px]">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="upcoming">Upcoming</SelectItem>
                                                                <SelectItem value="live">Live</SelectItem>
                                                                <SelectItem value="completed">Completed</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <div className="flex flex-col">
                                                            <Button size="icon" variant="ghost" className="h-5 w-5 text-gray-500 hover:text-white" disabled={index === 0} onClick={() => handleReorder(stage.id, 'up')}>
                                                                <ArrowUp className="w-2.5 h-2.5" />
                                                            </Button>
                                                            <Button size="icon" variant="ghost" className="h-5 w-5 text-gray-500 hover:text-white" disabled={isLast} onClick={() => handleReorder(stage.id, 'down')}>
                                                                <ArrowDown className="w-2.5 h-2.5" />
                                                            </Button>
                                                        </div>
                                                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-400/60 hover:text-red-400 hover:bg-red-400/10" onClick={() => setDeleteConfirmId(stage.id)}>
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Flow Metrics Row */}
                                                <div className="grid grid-cols-3 gap-2">
                                                    {/* Teams Entering */}
                                                    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5 text-center">
                                                        <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                                                            <LogIn className="w-3 h-3" />
                                                            <span className="text-[10px] uppercase tracking-wider font-medium">Teams In</span>
                                                        </div>
                                                        <p className="text-lg font-bold text-white">{flow?.teamsEntering || '—'}</p>
                                                        {prevStage && (
                                                            <p className="text-[10px] text-gray-600 mt-0.5 truncate">from {prevStage.name}</p>
                                                        )}
                                                    </div>

                                                    {/* Lobby Size */}
                                                    <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2.5 text-center">
                                                        <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                                                            <Hash className="w-3 h-3" />
                                                            <span className="text-[10px] uppercase tracking-wider font-medium">Lobby Size</span>
                                                        </div>
                                                        {editingField?.stageId === stage.id && editingField.field === 'capacity' ? (
                                                            <div className="flex items-center gap-1 justify-center">
                                                                <Select value={editValue} onValueChange={(v) => { setEditValue(v); saveInlineEdit(stage.id, 'capacity', v); }}>
                                                                    <SelectTrigger className="h-7 w-24 text-xs">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="none">No limit</SelectItem>
                                                                        {[10, 12, 15, 16, 20, 25, 30, 40, 60].map(n => (
                                                                            <SelectItem key={n} value={String(n)}>{n} teams</SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                className="group/cap w-full"
                                                                onClick={() => startInlineEdit(stage.id, 'capacity', stage.capacity?.toString() || 'none')}
                                                            >
                                                                <p className="text-lg font-bold text-white flex items-center justify-center gap-1">
                                                                    {stage.capacity ? `${stage.capacity}` : '∞'}
                                                                    <Pencil className="w-2.5 h-2.5 text-gray-600 opacity-0 group-hover/cap:opacity-100 transition-opacity" />
                                                                </p>
                                                                <p className="text-[10px] text-gray-600 mt-0.5">
                                                                    {(flow?.groupsFormed || 1) > 1
                                                                        ? `→ ${flow?.groupsFormed} groups`
                                                                        : 'single lobby'}
                                                                </p>
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Teams Advancing */}
                                                    <div className={`border rounded-lg p-2.5 text-center ${
                                                        isLast
                                                            ? 'bg-amber-500/[0.04] border-amber-500/10'
                                                            : !stage.advancement_count
                                                                ? 'bg-red-500/[0.04] border-red-500/10'
                                                                : 'bg-white/[0.03] border-white/5'
                                                    }`}>
                                                        <div className="flex items-center justify-center gap-1 text-gray-500 mb-1">
                                                            <LogOut className="w-3 h-3" />
                                                            <span className="text-[10px] uppercase tracking-wider font-medium">
                                                                {isLast ? 'Winner' : 'Advance'}
                                                            </span>
                                                        </div>
                                                        {isLast ? (
                                                            <div>
                                                                <Trophy className="w-5 h-5 text-amber-400 mx-auto" />
                                                                <p className="text-[10px] text-amber-400/70 mt-0.5">Final stage</p>
                                                            </div>
                                                        ) : editingField?.stageId === stage.id && editingField.field === 'advancement' ? (
                                                            <div className="flex items-center gap-1 justify-center">
                                                                <Select
                                                                    value={editValue}
                                                                    onValueChange={(v) => {
                                                                        setEditValue(v);
                                                                        const groups = flow?.groupsFormed || 1;
                                                                        const perGroup = v !== 'none' ? String(Math.floor(parseInt(v) / groups)) : v;
                                                                        saveInlineEdit(stage.id, 'advancement', perGroup);
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="h-7 w-32 text-xs">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="none">Not set</SelectItem>
                                                                        {(() => {
                                                                            const g = flow?.groupsFormed || 1;
                                                                            const maxTeams = flow?.teamsEntering || 100;
                                                                            if (g <= 1) {
                                                                                return [2, 4, 6, 8, 10, 12, 16, 20]
                                                                                    .filter(n => n < maxTeams)
                                                                                    .map(n => (
                                                                                        <SelectItem key={n} value={String(n)}>{n} teams</SelectItem>
                                                                                    ));
                                                                            }
                                                                            const options: number[] = [];
                                                                            for (let i = 1; i <= 20; i++) {
                                                                                const total = g * i;
                                                                                if (total >= maxTeams) break;
                                                                                options.push(total);
                                                                            }
                                                                            return options.map(n => (
                                                                                <SelectItem key={n} value={String(n)}>
                                                                                    {n} total — {n / g}/grp
                                                                                </SelectItem>
                                                                            ));
                                                                        })()}
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                className="group/adv w-full"
                                                                onClick={() => {
                                                                    const advTotal = stage.advancement_count && flow
                                                                        ? String(stage.advancement_count * flow.groupsFormed)
                                                                        : 'none';
                                                                    startInlineEdit(stage.id, 'advancement', advTotal);
                                                                }}
                                                            >
                                                                {stage.advancement_count ? (
                                                                    <>
                                                                        <p className="text-lg font-bold text-white flex items-center justify-center gap-1">
                                                                            {flow?.teamsAdvancing || '—'}
                                                                            <Pencil className="w-2.5 h-2.5 text-gray-600 opacity-0 group-hover/adv:opacity-100 transition-opacity" />
                                                                        </p>
                                                                        <p className="text-[10px] text-gray-600 mt-0.5">
                                                                            {(flow?.groupsFormed || 1) > 1
                                                                                ? `${stage.advancement_count}/grp × ${flow?.groupsFormed} grps`
                                                                                : `top ${stage.advancement_count}`}
                                                                        </p>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <p className="text-sm font-medium text-red-400 flex items-center justify-center gap-1">
                                                                            <AlertTriangle className="w-3 h-3" />
                                                                            Not set
                                                                            <Pencil className="w-2.5 h-2.5 text-gray-600 opacity-0 group-hover/adv:opacity-100 transition-opacity" />
                                                                        </p>
                                                                        <p className="text-[10px] text-red-400/50 mt-0.5">click to set</p>
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Schedule summary + button */}
                                                <button
                                                    onClick={() => setScheduleStageId(stage.id)}
                                                    className="w-full flex items-center gap-2 px-3 py-2 bg-white/[0.02] border border-white/5 rounded-lg hover:border-white/15 transition-colors group/sched"
                                                >
                                                    <Calendar className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                                    {stage.starts_at || stage.ends_at ? (
                                                        <span className="text-xs text-gray-300 flex-1 text-left">
                                                            {stage.starts_at ? new Date(stage.starts_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                            {' '}&rarr;{' '}
                                                            {stage.ends_at ? new Date(stage.ends_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-500 flex-1 text-left">No schedule set</span>
                                                    )}
                                                    <span className="text-[10px] text-gray-600 group-hover/sched:text-white transition-colors">Configure</span>
                                                </button>

                                                {/* Manage Groups Button */}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className={`w-full text-xs ${
                                                        isExpanded
                                                            ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5'
                                                            : 'border-white/10 text-gray-400 hover:text-white'
                                                    }`}
                                                    onClick={() => setExpandedStageId(isExpanded ? null : stage.id)}
                                                >
                                                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 mr-1.5" /> : <ChevronRight className="w-3.5 h-3.5 mr-1.5" />}
                                                    {isExpanded ? 'Collapse Group Management' : 'Manage Groups & Rounds'}
                                                </Button>

                                                {/* Advance Teams Button — simple trigger for non-final stages */}
                                                {!isLast && stage.advancement_count && (
                                                    <Button
                                                        size="sm"
                                                        className="w-full text-xs bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-all"
                                                        onClick={() => setAdvanceConfirmStageId(stage.id)}
                                                    >
                                                        <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                                                        Advance Top {flow?.teamsAdvancing || '?'} Teams
                                                    </Button>
                                                )}
                                            </div>

                                            {/* Inline Group Management (expanded) */}
                                            {isExpanded && (
                                                <div className="mt-4 pt-4 border-t border-white/5">
                                                    <BRStageGroupSection
                                                        stageId={stage.id}
                                                        stageCapacity={stage.capacity}
                                                        registeredTeamCount={flow?.teamsEntering || registeredTeamCount}
                                                        scoringPreset={scoringPreset}
                                                        hasNextStage={!isLast}
                                                        advancementCount={stage.advancement_count}
                                                        stageStatus={stage.status}
                                                        onUpdate={onUpdate}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Advancement Connector */}
                                        {!isLast && (
                                            <div className="flex justify-center py-1.5">
                                                <div className="flex flex-col items-center gap-0.5">
                                                    <div className="w-px h-2 bg-emerald-500/20" />
                                                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 bg-white/[0.02] border border-white/5 px-3 py-1 rounded-full">
                                                        <ArrowDown className="w-3 h-3 text-emerald-500/50" />
                                                        {stage.advancement_count ? (
                                                            <span>
                                                                <span className="text-emerald-400 font-medium">{flow?.teamsAdvancing || '?'}</span>
                                                                {' '}teams advance
                                                                {flow && flow.groupsFormed > 1 && (
                                                                    <span className="text-gray-600">
                                                                        {' '}({stage.advancement_count}/grp × {flow.groupsFormed} grps)
                                                                    </span>
                                                                )}
                                                            </span>
                                                        ) : (
                                                            <span className="text-amber-400 flex items-center gap-1">
                                                                <AlertTriangle className="w-3 h-3" />
                                                                Set advancement count above
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="w-px h-2 bg-emerald-500/20" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Add Stage Dialog */}
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogContent className="bg-[#0a0a0c] border-white/10">
                    <DialogHeader>
                        <DialogTitle>Add Stage</DialogTitle>
                        <DialogDescription>
                            {addStageContext
                                ? `This stage will receive teams advancing from "${addStageContext.fromStageName}".`
                                : 'Add the first stage of your tournament.'}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Context Banner */}
                    {addStageContext && addStageContext.teamsReceiving > 0 && (
                        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm">
                            <LogIn className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <span className="text-emerald-300">
                                ~<strong>{addStageContext.teamsReceiving}</strong> teams expected from {addStageContext.fromStageName}
                            </span>
                        </div>
                    )}

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
                                    <SelectItem value="none">No limit (single lobby)</SelectItem>
                                    {[10, 12, 15, 16, 20, 25, 30, 40, 60].map(n => (
                                        <SelectItem key={n} value={String(n)}>{n} teams per group</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {newCapacity && newCapacity !== 'none' && addStageContext && addStageContext.teamsReceiving > 0 && (
                                <p className="text-xs text-emerald-500/80">
                                    → {Math.ceil(addStageContext.teamsReceiving / parseInt(newCapacity))} groups will be formed
                                </p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label>Advance Top N per Group</Label>
                            <Select value={newAdvancement} onValueChange={setNewAdvancement}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None (this is the final stage)</SelectItem>
                                    {[2, 3, 4, 5, 6, 8, 10, 12, 15, 16, 20].map(n => (
                                        <SelectItem key={n} value={String(n)}>Top {n} per group</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {newAdvancement && newAdvancement !== 'none' && newCapacity && newCapacity !== 'none' && addStageContext && addStageContext.teamsReceiving > 0 && (
                                <p className="text-xs text-amber-400/80">
                                    → {parseInt(newAdvancement) * Math.ceil(addStageContext.teamsReceiving / parseInt(newCapacity))} teams will advance to the next stage
                                </p>
                            )}
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

            {/* Template Picker Dialog — two-step: browse → configure → apply */}
            <Dialog open={templateDialogOpen} onOpenChange={(open) => {
                setTemplateDialogOpen(open);
                if (!open) setSelectedTemplate(null);
            }}>
                <DialogContent className="bg-[#0a0a0c] border-white/10 max-w-2xl p-0 overflow-hidden">
                    {!selectedTemplate ? (
                        <>
                            <div className="px-6 pt-6 pb-4 border-b border-white/5">
                                <DialogHeader>
                                    <DialogTitle className="text-lg font-semibold text-white">
                                        Stage Templates
                                    </DialogTitle>
                                    <DialogDescription className="text-gray-500 text-sm">
                                        {stages.length > 0
                                            ? 'Applying a template will replace all existing stages.'
                                            : 'Select a structure that fits your tournament size.'}
                                    </DialogDescription>
                                </DialogHeader>
                            </div>
                            <div className="px-6 py-4 space-y-3 max-h-[65vh] overflow-y-auto">
                                {BR_TEMPLATES.map((t) => (
                                    <button
                                        key={t.id}
                                        onClick={() => handleSelectTemplate(t)}
                                        className="w-full text-left p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-emerald-500/30 hover:bg-emerald-500/[0.04] transition-all group"
                                    >
                                        <div className="flex items-center justify-between mb-2.5">
                                            <h4 className="font-semibold text-white text-sm group-hover:text-emerald-300 transition-colors">
                                                {t.name}
                                            </h4>
                                            <span className="text-[10px] uppercase tracking-widest text-gray-600 font-medium bg-white/[0.03] px-2 py-0.5 rounded">
                                                {t.teamRange}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 leading-relaxed">{t.description}</p>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="px-6 pt-6 pb-4 border-b border-white/5">
                                <DialogHeader>
                                    <DialogTitle className="text-lg font-semibold text-white">
                                        Configure — {selectedTemplate.name}
                                    </DialogTitle>
                                    <DialogDescription className="text-gray-500 text-sm">
                                        Adjust lobby size and advancement for each stage. {registeredTeamCount > 0 ? `${registeredTeamCount} teams registered.` : ''}
                                    </DialogDescription>
                                </DialogHeader>
                            </div>
                            <div className="px-6 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
                                {selectedTemplate.stages.map((s, i) => {
                                    const isFinalStage = i === selectedTemplate.stages.length - 1;
                                    const cfg = templateConfig[i];
                                    const teamsIn = i === 0
                                        ? registeredTeamCount || 60
                                        : templateConfig[i - 1]?.advancement || 10;
                                    const groups = cfg?.capacity > 0 ? Math.ceil(teamsIn / cfg.capacity) : 1;

                                    return (
                                        <div key={i} className={`p-4 rounded-xl border ${isFinalStage ? 'border-amber-500/15 bg-amber-500/[0.03]' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold ${isFinalStage ? 'bg-amber-500/15 text-amber-400' : 'bg-white/5 text-gray-400'}`}>
                                                    {i + 1}
                                                </div>
                                                <h4 className="font-semibold text-white text-sm">{s.name}</h4>
                                                {isFinalStage && <span className="text-[10px] text-amber-400 uppercase tracking-widest">Finals</span>}
                                            </div>

                                            {!isFinalStage ? (
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-gray-500">Lobby Size</Label>
                                                        <Select
                                                            value={String(cfg?.capacity || 20)}
                                                            onValueChange={(v) => {
                                                                const next = [...templateConfig];
                                                                next[i] = { ...next[i], capacity: parseInt(v) };
                                                                setTemplateConfig(next);
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-9 bg-white/5 border-white/10 text-white text-sm">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {[10, 12, 15, 16, 20, 25, 30, 40, 60].map(n => (
                                                                    <SelectItem key={n} value={String(n)}>{n} teams</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {groups > 1 && (
                                                            <p className="text-[10px] text-gray-600">{groups} groups auto-formed</p>
                                                        )}
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs text-gray-500">Advance per Group</Label>
                                                        <Select
                                                            value={String(cfg?.advancement || 4)}
                                                            onValueChange={(v) => {
                                                                const next = [...templateConfig];
                                                                next[i] = { ...next[i], advancement: parseInt(v) };
                                                                setTemplateConfig(next);
                                                            }}
                                                        >
                                                            <SelectTrigger className="h-9 bg-white/5 border-white/10 text-white text-sm">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 16, 20].map(n => (
                                                                    <SelectItem key={n} value={String(n)}>Top {n}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {groups > 1 && cfg?.advancement && (
                                                            <p className="text-[10px] text-emerald-500/70">{cfg.advancement * groups} total advance</p>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-500">Receives teams from previous stage. No configuration needed.</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="px-6 py-4 border-t border-white/5 flex items-center gap-3">
                                <Button variant="ghost" className="text-gray-400" onClick={() => setSelectedTemplate(null)}>
                                    Back
                                </Button>
                                <Button
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white"
                                    onClick={handleApplyTemplate}
                                    disabled={applyingTemplate}
                                >
                                    {applyingTemplate ? 'Applying...' : `Apply ${selectedTemplate.stages.length} Stages`}
                                </Button>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>

            {/* Advance Teams Confirmation */}
            <AlertDialog open={!!advanceConfirmStageId} onOpenChange={() => setAdvanceConfirmStageId(null)}>
                <AlertDialogContent className="bg-[#0a0a0c] border-white/10">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white flex items-center gap-2">
                            <ArrowRight className="w-5 h-5 text-emerald-400" />
                            Advance Teams
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            {(() => {
                                const stage = sortedStages.find(s => s.id === advanceConfirmStageId);
                                const flow = stage ? stageFlows.get(stage.id) : null;
                                if (!stage) return '';
                                return `This will advance the top ${flow?.teamsAdvancing || '?'} teams (${stage.advancement_count}/group) from "${stage.name}" to the next stage. This stage will be marked as completed.`;
                            })()}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-emerald-600 hover:bg-emerald-500 text-white"
                            disabled={isAdvancing}
                            onClick={() => {
                                const stage = sortedStages.find(s => s.id === advanceConfirmStageId);
                                if (stage?.advancement_count && advanceConfirmStageId) {
                                    handleAdvanceTeams(advanceConfirmStageId, stage.advancement_count);
                                }
                            }}
                        >
                            {isAdvancing ? 'Advancing...' : 'Advance Teams'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reset All Stages Confirmation */}
            <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
                <AlertDialogContent className="bg-[#0a0a0c] border-white/10">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            Reset All Stages
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-400">
                            This will permanently delete all {sortedStages.length} stages, including their groups, rounds, and results. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isResetting}
                            onClick={handleResetAllStages}
                        >
                            {isResetting ? 'Resetting...' : 'Reset All Stages'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Schedule Dialog */}
            {scheduleStageId && (() => {
                const schedStage = sortedStages.find(s => s.id === scheduleStageId);
                if (!schedStage) return null;
                return (
                    <BRScheduleDialog
                        open={true}
                        onOpenChange={(o) => { if (!o) setScheduleStageId(null); }}
                        stage={schedStage}
                        tournamentId={tournamentId}
                        allStages={stages}
                        onUpdate={onUpdate}
                    />
                );
            })()}
        </>
    );
};
