import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Plus, Trophy, ArrowUp, ArrowDown, Trash2, Lock, Users, ArrowRight, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type TournamentStage = Database['public']['Tables']['tournament_stages']['Row'];

interface BRStageManagementTabProps {
    tournamentId: string;
    stages: TournamentStage[];
    onUpdate: () => void;
}

export const BRStageManagementTab: React.FC<BRStageManagementTabProps> = ({ tournamentId, stages, onUpdate }) => {
    const { toast } = useToast();
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [editingStage, setEditingStage] = useState<string | null>(null);

    // Add stage form
    const [newName, setNewName] = useState('');
    const [newCapacity, setNewCapacity] = useState<string>('20');
    const [newAdvancement, setNewAdvancement] = useState<string>('');

    // Edit stage form
    const [editName, setEditName] = useState('');
    const [editCapacity, setEditCapacity] = useState<string>('');
    const [editAdvancement, setEditAdvancement] = useState<string>('');

    const sortedStages = [...stages].sort((a, b) => a.stage_order - b.stage_order);

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
                    <Button
                        onClick={() => setAddDialogOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Add Stage
                    </Button>
                </CardHeader>

                <CardContent className="p-0">
                    {sortedStages.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed border-white/10 rounded-xl">
                            <Layers className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                            <p className="text-gray-400 mb-2">No stages defined yet.</p>
                            <p className="text-sm text-gray-500">
                                Add stages to set up the tournament flow — e.g., Group Stage → Finals.
                            </p>
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
        </>
    );
};
