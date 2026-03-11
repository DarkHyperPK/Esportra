import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, Calendar, CheckCircle2, Clock, CircleDot, AlertTriangle, Layers, Lock, ArrowDown, Shield, Swords, Map as MapIcon, ChevronRight, Users } from 'lucide-react';
import { motion } from 'framer-motion';

interface StagesTabProps {
    tournamentId: string;
}

interface Stage {
    id: string;
    stage_order: number;
    name: string;
    format: string;
    status: 'upcoming' | 'pending' | 'active' | 'completed' | 'live';
    capacity: number | null;
    advancement_count: number | null;
    is_locked: boolean;
    best_of: number | null;
    map_pool: string[] | null;
    config: any;
}

export const StagesTab: React.FC<StagesTabProps> = ({ tournamentId }) => {
    const { data: stages, isLoading } = useQuery({
        queryKey: ['tournament-stages-public', tournamentId],
        queryFn: async () => {
            return await apiClient.get<Stage[]>(
                `/api/tournaments/${tournamentId}/stages`
            );
        }
    });

    const [selectedStage, setSelectedStage] = React.useState<Stage | null>(null);
    const [detailsOpen, setDetailsOpen] = React.useState(false);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <p className="text-zinc-500 text-sm animate-pulse">Loading stages...</p>
            </div>
        );
    }

    if (!stages || stages.length === 0) {
        return (
            <Card className="bg-[#09090b] border-white/5">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center text-zinc-400">
                    <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-white/5">
                        <Layers className="w-8 h-8 text-zinc-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">Tournament Structure</h3>
                    <p className="max-w-md mx-auto">The tournament stages haven't been announced yet. Check back soon for the official schedule and format details.</p>
                </CardContent>
            </Card>
        );
    }



    const handleOpenDetails = (stage: Stage) => {
        setSelectedStage(stage);
        setDetailsOpen(true);
    };

    const getFormatDisplay = (format: string) => {
        if (!format) return 'Unknown Format';
        return format.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const getStageStatusColor = (status: Stage['status']) => {
        switch (status) {
            case 'completed': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'active':
            case 'live': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            default: return 'text-zinc-400 bg-zinc-800/50 border-zinc-700/50';
        }
    };

    const isStageActive = (status: string) => status === 'active' || status === 'live';

    const getFlowDescription = () => {
        if (!stages || stages.length === 0) return '';

        const flow = stages.map((s, i) => {
            const format = s.format?.split('_')[0].charAt(0).toUpperCase() + s.format?.split('_')[0].slice(1) || 'Stage';
            if (i === stages.length - 1) return `Finals (${format})`;
            return `${format} (${s.advancement_count ? `Top ${s.advancement_count}` : 'Qualifiers'})`;
        });

        return flow.join(' → ');
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div className="pl-6 sm:pl-10 mb-8">
                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-center gap-4">
                    <div className="p-2 bg-purple-500/10 rounded-full">
                        <Trophy className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                        <h4 className="text-white font-semibold">Tournament Format</h4>
                        <p className="text-sm text-zinc-400 mt-1 mb-2">
                            Teams compete through <span className="text-white font-medium">{stages.length} stages</span> to determine the champion.
                        </p>
                        <div className="text-xs font-mono text-purple-300/80 bg-purple-500/5 px-2 py-1 rounded border border-purple-500/10 inline-block">
                            {getFlowDescription()}
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative pl-6 sm:pl-10 space-y-12 before:absolute before:inset-y-0 before:left-[11px] sm:before:left-[19px] before:w-0.5 before:bg-gradient-to-b before:from-zinc-800 before:via-zinc-800 before:to-transparent">
                {stages.map((stage, index) => {
                    const isActive = isStageActive(stage.status);
                    const isCompleted = stage.status === 'completed';
                    const isLast = index === stages.length - 1;
                    const previousStage = index > 0 ? stages[index - 1] : null;

                    // Calculate Capacity Display
                    // Stage 1: Hide Capacity (unless map pool needs showing, but logic below handles separation)
                    // Stage > 1: Capacity = Previous Stage Advancement Count
                    const showCapacity = index > 0;
                    const capacityValue = previousStage?.advancement_count || stage.capacity;
                    const capacityLabel = index > 0 ? "Qualified Teams" : "Capacity";

                    return (
                        <motion.div
                            key={stage.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="relative"
                        >
                            {/* Timeline Node */}
                            <div className={`absolute -left-[22px] sm:-left-[32px] top-6 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-4 z-10 flex items-center justify-center bg-[#050505]
                                ${isActive ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]' :
                                    isCompleted ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'border-zinc-700'}`}
                            >
                                {isCompleted && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                                {isActive && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                            </div>

                            {/* Stage Card */}
                            <div className={`relative rounded-xl border overflow-hidden transition-all duration-300 group
                                ${isActive ? 'bg-zinc-900/80 border-blue-500/30 shadow-lg shadow-blue-500/5' :
                                    'bg-[#09090b] border-white/5 hover:border-white/10 hover:bg-zinc-900/30'}`}
                            >
                                {isActive && (
                                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-cyan-500" />
                                )}

                                <div className="p-5 sm:p-6">
                                    {/* Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2.5">
                                                <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-widest">Stage 0{index + 1}</span>
                                                <Badge variant="outline" className={`border-0 uppercase text-[10px] tracking-wider font-semibold px-2 py-0.5 ${getStageStatusColor(stage.status)}`}>
                                                    {stage.status === 'live' ? 'Live Now' : stage.status}
                                                </Badge>
                                            </div>
                                            <h3 className={`text-2xl font-bold ${isActive ? 'text-white' : 'text-zinc-200'}`}>
                                                {stage.name}
                                            </h3>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <div className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/5 flex items-center gap-2">
                                                <Trophy className="w-4 h-4 text-purple-400" />
                                                <span className="text-zinc-300 text-sm font-medium">{getFormatDisplay(stage.format)}</span>
                                            </div>
                                            {stage.is_locked && (
                                                <div className="p-2 rounded-lg bg-zinc-900 border border-white/5" title="Stage Locked">
                                                    <Lock className="w-4 h-4 text-zinc-500" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {/* Advancement Rule */}
                                        <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex items-start gap-3">
                                            <div className="p-1.5 rounded bg-zinc-800/50">
                                                <ChevronRight className="w-4 h-4 text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-0.5">Progression</p>
                                                <p className="text-sm text-zinc-300">
                                                    {stage.advancement_count
                                                        ? <span className="text-emerald-400 font-semibold">Top {stage.advancement_count} teams</span>
                                                        : isLast ? 'Winner takes the trophy' : 'Standard progression'}
                                                    {stage.advancement_count ? ' advance' : ''}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Match Settings */}
                                        <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex items-start gap-3">
                                            <div className="p-1.5 rounded bg-zinc-800/50">
                                                <Swords className="w-4 h-4 text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-0.5">Match Settings</p>
                                                <p className="text-sm text-zinc-300">
                                                    Best of <span className="text-white font-semibold">{stage.best_of || 1}</span>
                                                    {stage.config?.veto_enabled && <span className="text-zinc-500 text-xs ml-1">(Veto On)</span>}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Groups & Rounds Info */}
                                        {['swiss', 'round_robin'].includes(stage.format) &&
                                            ((stage.config?.swiss_rounds) || (stage.config?.group_count) || (stage.config?.swiss_groups)) && (
                                                <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex items-start gap-3">
                                                    <div className="p-1.5 rounded bg-zinc-800/50">
                                                        <Users className="w-4 h-4 text-cyan-400" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-0.5">
                                                            {stage.format === 'swiss' ? 'Format' : 'Groups'}
                                                        </p>
                                                        <div className="text-sm text-zinc-300 flex flex-col">
                                                            {stage.format === 'swiss' && (
                                                                <>
                                                                    <span>
                                                                        {stage.config?.swiss_groups
                                                                            ? `${stage.config.swiss_groups} Groups`
                                                                            : 'Single Group'}
                                                                    </span>
                                                                    {stage.config?.swiss_rounds && (
                                                                        <span className="text-zinc-500 text-xs mt-0.5">
                                                                            {stage.config.swiss_rounds} Rounds
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}

                                                            {stage.format === 'round_robin' && stage.config?.group_count && (
                                                                <span>{stage.config.group_count} Groups</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                        {/* Map Pool */}
                                        {(stage.map_pool && stage.map_pool.length > 0) && (
                                            <div
                                                className="p-3 rounded-lg bg-black/20 border border-white/5 flex items-start gap-3 cursor-pointer hover:bg-white/5 transition-colors"
                                                onClick={() => handleOpenDetails(stage)}
                                            >
                                                <div className="p-1.5 rounded bg-zinc-800/50">
                                                    <MapIcon className="w-4 h-4 text-amber-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-0.5">Map Pool</p>
                                                    <p className="text-sm text-zinc-300 truncate max-w-[150px]" title={stage.map_pool.join(', ')}>
                                                        {stage.map_pool.length} maps configured
                                                    </p>
                                                    <p className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1 group-hover:text-zinc-400 transition-colors">
                                                        View List <ChevronRight className="w-3 h-3" />
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Capacity (Conditioned) */}
                                        {showCapacity && (
                                            <div className="p-3 rounded-lg bg-black/20 border border-white/5 flex items-start gap-3">
                                                <div className="p-1.5 rounded bg-zinc-800/50">
                                                    <Shield className="w-4 h-4 text-indigo-400" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-0.5">{capacityLabel}</p>
                                                    <p className="text-sm text-zinc-300">
                                                        {capacityValue ? `${capacityValue} Teams` : 'Depends on Results'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {!isLast && (
                                <div className="absolute left-[24px] sm:left-[32px] sm:-bottom-8 -bottom-8 flex flex-col items-center">
                                    <ArrowDown className="w-4 h-4 text-zinc-700" />
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Details Modal */}
            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="bg-[#09090b] border-white/10 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Layers className="w-5 h-5 text-purple-400" />
                            {selectedStage?.name} Details
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Configuration and Map Pool for {selectedStage?.name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Structure Details */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Stage Structure</h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                                    <span className="text-xs text-zinc-400 block mb-1">Format</span>
                                    <span className="text-sm font-medium text-white">{getFormatDisplay(selectedStage?.format || '')}</span>
                                </div>
                                {selectedStage?.config?.group_count && (
                                    <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                                        <span className="text-xs text-zinc-400 block mb-1">Groups</span>
                                        <span className="text-sm font-medium text-white">{selectedStage.config.group_count} Groups</span>
                                    </div>
                                )}
                                {selectedStage?.config?.swiss_rounds && (
                                    <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5">
                                        <span className="text-xs text-zinc-400 block mb-1">Rounds</span>
                                        <span className="text-sm font-medium text-white">{selectedStage.config.swiss_rounds} Rounds</span>
                                    </div>
                                )}
                                {/* Swiss Group Clarification */}
                                {selectedStage?.format === 'swiss' && (
                                    <div className="bg-zinc-900/50 p-3 rounded-lg border border-white/5 col-span-2">
                                        <span className="text-xs text-zinc-400 block mb-1">Grouping</span>
                                        <span className="text-sm font-medium text-white flex items-center gap-2">
                                            <Users className="w-3 h-3 text-blue-400" />
                                            {selectedStage.config?.swiss_groups
                                                ? `${selectedStage.config.swiss_groups} Group${selectedStage.config.swiss_groups > 1 ? 's' : ''}`
                                                : "Single Group"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Map Pool List */}
                        {selectedStage?.map_pool && selectedStage.map_pool.length > 0 && (
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center justify-between">
                                    Map Pool
                                    <Badge variant="secondary" className="text-[10px] h-5">{selectedStage.map_pool.length}</Badge>
                                </h4>
                                <ScrollArea className="h-[200px] w-full rounded-md border border-white/5 bg-zinc-900/30 p-4">
                                    <div className="grid grid-cols-1 gap-2">
                                        {selectedStage.map_pool.map((map, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors">
                                                <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0">
                                                    <MapIcon className="w-4 h-4 text-zinc-500" />
                                                </div>
                                                <span className="text-sm text-zinc-200">{map}</span>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};
