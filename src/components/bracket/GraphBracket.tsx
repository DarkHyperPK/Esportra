import React, { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MatchRepository } from '@/services/bracket/MatchRepository';
import { AdvancementService } from '@/services/bracket/AdvancementService';
import { BracketNode, BracketEdge } from '@/types/bracket-graph';
import { apiClient } from '@/lib/apiClient';
import { GraphMatchService } from '@/services/bracket/GraphMatchService';
import { Loader2, ZoomIn, ZoomOut, FastForward, Trash2, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GraphMatchCard } from './GraphMatchCard';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

// Constants for layout
const MATCH_WIDTH = 300;
const MATCH_HEIGHT = 130;
const X_GAP = 80;
const Y_GAP = 30;

interface Team {
    id: string;
    name: string;
    logo_url?: string | null;
}

interface GraphBracketProps {
    versionId: string;
    tournamentId: string;
    isOrganizer: boolean;
    onMatchUpdated?: () => void;
}

const repo = new MatchRepository();
const advancementService = new AdvancementService();

export const GraphBracket: React.FC<GraphBracketProps> = ({
    versionId,
    tournamentId,
    isOrganizer,
    onMatchUpdated
}) => {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [zoom, setZoom] = useState(1);
    const [scoreDialogOpen, setScoreDialogOpen] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<BracketNode | null>(null);
    const [team1Score, setTeam1Score] = useState('');
    const [team2Score, setTeam2Score] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Fetch bracket structure
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['bracket-graph', versionId],
        queryFn: async () => {
            if (!versionId) throw new Error('Version ID is required');
            return repo.getGraphStructure(versionId);
        },
        enabled: !!versionId,
        staleTime: 1000 * 60 * 5,
    });

    // Fetch team names for all team IDs in the bracket
    const teamIds = useMemo(() => {
        if (!data?.nodes) return [];
        const ids = new Set<string>();
        data.nodes.forEach(n => {
            if (n.team1_id) ids.add(n.team1_id);
            if (n.team2_id) ids.add(n.team2_id);
        });
        return Array.from(ids);
    }, [data?.nodes]);

    const { data: teamsData } = useQuery({
        queryKey: ['bracket-teams', teamIds.join(',')],
        queryFn: async () => {
            if (teamIds.length === 0) return [];
            return apiClient.post('/api/teams/batch', { ids: teamIds }) as Promise<Team[]>;
        },
        enabled: teamIds.length > 0,
    });

    const teamsMap = useMemo(() => {
        const map = new Map<string, Team>();
        teamsData?.forEach(t => map.set(t.id, t));
        return map;
    }, [teamsData]);

    // Handle Go Live
    const handleGoLive = async (node: BracketNode) => {
        try {
            const result = await GraphMatchService.goLive(node.id, '');
            if (!result.success) throw new Error(result.error);
            toast({ title: 'Match is now LIVE' });
            refetch();
            onMatchUpdated?.();
        } catch (err) {
            toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
        }
    };

    // Handle Report Score
    const handleReportScore = (node: BracketNode) => {
        setSelectedMatch(node);
        setTeam1Score('');
        setTeam2Score('');
        setScoreDialogOpen(true);
    };

    const submitScore = async () => {
        if (!selectedMatch) return;

        const s1 = parseInt(team1Score) || 0;
        const s2 = parseInt(team2Score) || 0;

        if (s1 === s2) {
            toast({ title: 'Error', description: 'Scores cannot be equal', variant: 'destructive' });
            return;
        }

        const winnerId = s1 > s2 ? selectedMatch.team1_id : selectedMatch.team2_id;
        const loserId = s1 > s2 ? selectedMatch.team2_id : selectedMatch.team1_id;

        if (!winnerId || !loserId) {
            toast({ title: 'Error', description: 'Both teams must be present to submit a score', variant: 'destructive' });
            return;
        }

        try {
            setIsProcessing(true);
            const result = await GraphMatchService.saveScoreAndAdvance(
                selectedMatch.id, s1, s2,
                selectedMatch.team1_id || null,
                selectedMatch.team2_id || null
            );
            if (!result.success) throw new Error(result.error || 'Failed to record score.');

            toast({ title: 'Score recorded', description: `Winner: ${winnerId === selectedMatch.team1_id ? teamsMap.get(selectedMatch.team1_id!)?.name : teamsMap.get(selectedMatch.team2_id!)?.name}` });
            setScoreDialogOpen(false);
            refetch();
            onMatchUpdated?.();
        } catch (err) {
            toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle Auto-Advance BYEs
    const handleAutoAdvanceByes = async () => {
        setIsProcessing(true);
        try {
            const count = await advancementService.autoAdvanceByes(versionId);
            toast({ title: 'BYEs Advanced', description: `${count} BYE match(es) advanced.` });
            refetch();
            onMatchUpdated?.();
        } catch (err) {
            toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle Reset Bracket
    const handleResetBracket = async () => {
        if (!confirm('Reset all match results? Teams will remain seeded.')) return;
        setIsProcessing(true);
        try {
            await advancementService.resetBracket(versionId);
            toast({ title: 'Bracket Reset', description: 'All results cleared. Teams remain seeded.' });
            refetch();
            onMatchUpdated?.();
        } catch (err) {
            toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle Clear Bracket
    const handleClearBracket = async () => {
        if (!confirm('Delete this bracket completely? This cannot be undone.')) return;
        setIsProcessing(true);
        try {
            await advancementService.clearBracket(versionId);
            toast({ title: 'Bracket Deleted' });
            queryClient.invalidateQueries({ queryKey: ['bracket-graph'] });
            onMatchUpdated?.();
        } catch (err) {
            toast({ title: 'Error', description: (err as Error).message, variant: 'destructive' });
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (error) {
        return <div className="text-red-500 p-4">Error loading bracket: {(error as Error).message}</div>;
    }

    if (!data) return null;

    const { nodes, edges } = data;

    // Calculate canvas size
    const maxX = Math.max(...nodes.map(n => (n.x || 0) + MATCH_WIDTH), 800);
    const maxY = Math.max(...nodes.map(n => (n.y || 0) + MATCH_HEIGHT), 600);

    return (
        <div className="flex flex-col gap-4">
            {/* Organizer Toolbar */}
            {isOrganizer && (
                <div className="flex flex-wrap gap-2 items-center px-4 py-2 bg-slate-800/50 rounded-lg">
                    <span className="text-sm text-slate-400 mr-2">Organizer Tools:</span>

                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleAutoAdvanceByes}
                        disabled={isProcessing}
                        className="gap-1"
                    >
                        <FastForward className="h-4 w-4" />
                        Advance BYEs
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleResetBracket}
                        disabled={isProcessing}
                        className="gap-1 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/10"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Reset
                    </Button>

                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleClearBracket}
                        disabled={isProcessing}
                        className="gap-1 text-red-500 border-red-500/30 hover:bg-red-500/10"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete
                    </Button>

                    <div className="flex-1" />

                    {/* Zoom Controls */}
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
                        className="h-8 w-8 p-0"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setZoom(z => Math.min(2, z + 0.25))}
                        className="h-8 w-8 p-0"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Zoom Controls for non-organizers */}
            {!isOrganizer && (
                <div className="flex gap-2 items-center justify-end px-4">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setZoom(z => Math.max(0.25, z - 0.25))}
                        className="h-8 w-8 p-0"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setZoom(z => Math.min(2, z + 0.25))}
                        className="h-8 w-8 p-0"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </Button>
                </div>
            )}

            {/* Bracket Canvas */}
            <div className="relative w-full overflow-auto border rounded-lg bg-slate-950 p-10" style={{ height: '70vh' }}>
                <div
                    className="relative min-w-max min-h-max origin-top-left transition-transform"
                    style={{
                        transform: `scale(${zoom})`,
                        width: maxX + 100,
                        height: maxY + 100
                    }}
                >
                    {/* Edges (SVG) */}
                    <svg className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-visible">
                        {edges.filter(e => e.type !== 'loser').map(edge => (
                            <EdgePath key={edge.id} edge={edge} nodes={nodes} />
                        ))}
                    </svg>

                    {/* Match Nodes */}
                    {nodes.map(node => {
                        if (node.x === undefined || node.y === undefined) return null;

                        return (
                            <div
                                key={node.id}
                                className="absolute"
                                style={{
                                    left: node.x,
                                    top: node.y,
                                    width: MATCH_WIDTH,
                                    height: MATCH_HEIGHT
                                }}
                            >
                                <GraphMatchCard
                                    node={node}
                                    team1={node.team1_id ? teamsMap.get(node.team1_id) : null}
                                    team2={node.team2_id ? teamsMap.get(node.team2_id) : null}
                                    team1Score={(node as any).team1_score}
                                    team2Score={(node as any).team2_score}
                                    isOrganizer={isOrganizer}
                                    onGoLive={() => handleGoLive(node)}
                                    onReportScore={() => handleReportScore(node)}
                                    onOpenVeto={() => {
                                        // TODO: Open Map Veto dialog
                                        toast({ title: 'Map Veto', description: 'Coming soon...' });
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Score Dialog */}
            <Dialog open={scoreDialogOpen} onOpenChange={setScoreDialogOpen}>
                <DialogContent className="bg-slate-900 border-slate-700">
                    <DialogHeader>
                        <DialogTitle>Report Score</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4">
                        <div className="flex items-center gap-4">
                            <span className="flex-1 text-right truncate">
                                {selectedMatch?.team1_id ? teamsMap.get(selectedMatch.team1_id)?.name || 'Team 1' : 'Team 1'}
                            </span>
                            <Input
                                type="number"
                                className="w-20 text-center"
                                value={team1Score}
                                onChange={(e) => setTeam1Score(e.target.value)}
                                min={0}
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="flex-1 text-right truncate">
                                {selectedMatch?.team2_id ? teamsMap.get(selectedMatch.team2_id)?.name || 'Team 2' : 'Team 2'}
                            </span>
                            <Input
                                type="number"
                                className="w-20 text-center"
                                value={team2Score}
                                onChange={(e) => setTeam2Score(e.target.value)}
                                min={0}
                            />
                        </div>
                        <Button onClick={submitScore} className="bg-gaming-purple">
                            Submit Score
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

const EdgePath: React.FC<{ edge: BracketEdge; nodes: BracketNode[] }> = ({ edge, nodes }) => {
    const source = nodes.find(n => n.id === edge.source_match_id);
    const target = nodes.find(n => n.id === edge.target_match_id);

    if (!source || !target || source.x === undefined || source.y === undefined || target.x === undefined || target.y === undefined) {
        return null;
    }

    const startX = source.x + MATCH_WIDTH;
    const startY = source.y + MATCH_HEIGHT / 2;

    const endX = target.x;
    const endY = edge.target_slot === 1
        ? target.y + MATCH_HEIGHT * 0.3
        : target.y + MATCH_HEIGHT * 0.7;

    // Right-angle bracket connector: horizontal → vertical → horizontal
    const midX = startX + (endX - startX) / 2;

    return (
        <path
            d={`M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`}
            fill="none"
            stroke="#475569"
            strokeWidth="2"
            className="opacity-60 hover:opacity-100 transition-opacity"
        />
    );
};

export default GraphBracket;
