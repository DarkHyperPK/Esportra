import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamStanding } from '@/services/bracket/StandingsService';
import { Info, ArrowUp } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StandingsTableProps {
    standings: TeamStanding[];
    title?: string;
    advancementCount?: number;
    eliminationCount?: number;
}

export const StandingsTable: React.FC<StandingsTableProps> = ({
    standings,
    title = "Standings",
    advancementCount,
    eliminationCount
}) => {
    return (
        <Card className="overflow-hidden bg-zinc-950 border-white/10">
            <CardHeader className="pb-2 bg-zinc-900/50 border-b border-white/5">
                <CardTitle className="text-lg font-medium flex items-center gap-2 text-white">
                    {title}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="h-4 w-4 text-zinc-500 hover:text-zinc-300 transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Ranked by: Points {'>'} Buchholz {'>'} Round Diff</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="w-full text-sm">
                    {/* Header */}
                    <div className="grid grid-cols-[40px_1fr_40px_60px_40px_40px_40px_80px] gap-2 px-4 py-3 bg-zinc-900/30 text-zinc-500 font-medium border-b border-white/5 items-center">
                        <div>#</div>
                        <div>Team</div>
                        <div className="text-center">P</div>
                        <div className="text-center">W-L</div>
                        <div className="text-center">Pts</div>
                        <div className="text-center">BHZ</div>
                        <div className="text-center" title="Round Differential">RD</div>
                        <div className="text-right">Status</div>
                    </div>

                    {/* Rows */}
                    <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                        <AnimatePresence mode='popLayout'>
                            {standings.map((team, index) => {
                                const isAdvancing = advancementCount && index < advancementCount;
                                const isEliminated = eliminationCount && team.losses >= eliminationCount;

                                return (
                                    <motion.div
                                        key={team.teamId}
                                        layout
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
                                        className={cn(
                                            "grid grid-cols-[40px_1fr_40px_60px_40px_40px_40px_80px] gap-2 px-4 py-3 border-b border-white/5 items-center hover:bg-white/5 transition-colors",
                                            isAdvancing ? "bg-green-500/5 hover:bg-green-500/10" : "",
                                            isEliminated ? "bg-red-500/5 hover:bg-red-500/10" : ""
                                        )}
                                    >
                                        <div className="font-bold text-white/70">{team.rank}</div>
                                        <div className="font-medium text-white truncate" title={team.teamName}>{team.teamName}</div>
                                        <div className="text-center text-zinc-400">{team.played}</div>
                                        <div className="text-center text-zinc-400">{team.wins}-{team.losses}</div>
                                        <div className="text-center font-bold text-yellow-500">{team.points}</div>
                                        <div className="text-center text-zinc-500">{team.buchholz}</div>
                                        <div className="text-center text-zinc-500 text-xs">
                                            {team.scoreDiff > 0 ? `+${team.scoreDiff}` : team.scoreDiff}
                                        </div>
                                        <div className="text-right">
                                            {isAdvancing && (
                                                <div className="flex items-center justify-end gap-1">
                                                    <ArrowUp className="w-3 h-3 text-green-500" />
                                                    <Badge variant="default" className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border-0 text-[10px] px-1.5 h-5">Q</Badge>
                                                </div>
                                            )}
                                            {isEliminated && (
                                                <Badge variant="destructive" className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-0 text-[10px] px-1.5 h-5">ELIM</Badge>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                        {standings.length === 0 && (
                            <div className="text-center py-8 text-zinc-500">
                                No matches played yet.
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};
