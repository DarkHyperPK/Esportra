import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Users, Shield, GitBranch, AlertCircle } from 'lucide-react';

interface StageGuidelineModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const StageGuidelineModal: React.FC<StageGuidelineModalProps> = ({ open, onOpenChange }) => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[80vh] bg-gray-900 text-white border-gray-800">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Trophy className="h-6 w-6 text-emerald-500" />
                        Tournament Stages Guideline
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Learn how to structure your tournament for the best competitive experience.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="h-[60vh] pr-4">
                    <Tabs defaultValue="formats" className="w-full">
                        <TabsList className="bg-gray-800 w-full justify-start mb-4">
                            <TabsTrigger value="formats">Formats Explained</TabsTrigger>
                            <TabsTrigger value="advancement">Advancement & Flow</TabsTrigger>
                            <TabsTrigger value="sizing">Bracket Sizing</TabsTrigger>
                        </TabsList>

                        <TabsContent value="formats" className="space-y-6">
                            <div className="space-y-4">
                                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                    <h3 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
                                        <GitBranch className="h-5 w-5" /> Single Elimination
                                    </h3>
                                    <p className="text-gray-300 mt-2">
                                        The simplest format. Teams are paired up, winner advances, loser is out.
                                        Great for large numbers of teams when time is limited.
                                    </p>
                                    <ul className="list-disc list-inside mt-2 text-sm text-gray-400">
                                        <li>Fastest to complete</li>
                                        <li>High stakes (one loss = out)</li>
                                        <li>Requires power-of-2 team count (or BYEs)</li>
                                    </ul>
                                </div>

                                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                    <h3 className="text-lg font-semibold text-blue-400 flex items-center gap-2">
                                        <Shield className="h-5 w-5" /> Double Elimination
                                    </h3>
                                    <p className="text-gray-300 mt-2">
                                        Teams have a "second life". Losers drop to a Lower Bracket.
                                        A team must lose twice to be eliminated.
                                    </p>
                                    <ul className="list-disc list-inside mt-2 text-sm text-gray-400">
                                        <li>Fairer results (one bad game doesn't eliminate you)</li>
                                        <li>Takes ~2x longer than Single Elim</li>
                                        <li>Grand Finals can be complex (bracket reset)</li>
                                    </ul>
                                </div>

                                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                                    <h3 className="text-lg font-semibold text-purple-400 flex items-center gap-2">
                                        <Users className="h-5 w-5" /> Swiss System
                                    </h3>
                                    <p className="text-gray-300 mt-2">
                                        Non-elimination format. Teams play a set number of rounds against opponents with the same record (1-0 vs 1-0, 0-1 vs 0-1).
                                    </p>
                                    <ul className="list-disc list-inside mt-2 text-sm text-gray-400">
                                        <li>Every team plays multiple matches</li>
                                        <li>Good for seeding into a playoff bracket</li>
                                        <li>Requires even number of teams (or BYEs)</li>
                                    </ul>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="advancement" className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-white">Multi-Stage Tournaments</h3>
                                <p className="text-gray-300">
                                    You can chain stages together (e.g., Group Stage → Playoffs).
                                    The key is <strong>Advancement Count</strong>.
                                </p>

                                <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                                    <h4 className="font-semibold text-blue-400">The Golden Rule</h4>
                                    <p className="text-white mt-1">
                                        Stage 1 <strong>Advancement Count</strong> = Stage 2 <strong>Capacity</strong>
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-800 rounded-lg">
                                        <h4 className="font-semibold text-white">Example: World Cup</h4>
                                        <div className="mt-2 space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Stage 1: Groups</span>
                                                <span className="text-emerald-400">32 Teams</span>
                                            </div>
                                            <div className="text-center text-gray-500">↓ Advance 16</div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Stage 2: Playoffs</span>
                                                <span className="text-emerald-400">16 Teams</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="sizing" className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-xl font-bold text-white">Bracket Sizing & BYEs</h3>
                                <p className="text-gray-300">
                                    Elimination brackets work best with <strong>Power of 2</strong> team counts (2, 4, 8, 16, 32, 64, 128).
                                </p>

                                <div className="p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg flex gap-3">
                                    <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
                                    <div>
                                        <h4 className="font-semibold text-amber-400">What if I don't have a Power of 2?</h4>
                                        <p className="text-gray-300 text-sm mt-1">
                                            The system will automatically add <strong>BYEs</strong> (free wins) to fill the bracket.
                                            <br />
                                            Example: 10 teams → 16-slot bracket with 6 BYEs.
                                        </p>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-800 rounded-lg">
                                    <h4 className="font-semibold text-white mb-2">Ideal Capacities</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div className="p-2 bg-gray-700/50 rounded flex justify-between">
                                            <span>Small Cup</span>
                                            <span className="text-emerald-400">8 or 16</span>
                                        </div>
                                        <div className="p-2 bg-gray-700/50 rounded flex justify-between">
                                            <span>Medium</span>
                                            <span className="text-emerald-400">32 or 64</span>
                                        </div>
                                        <div className="p-2 bg-gray-700/50 rounded flex justify-between">
                                            <span>Large</span>
                                            <span className="text-emerald-400">128+</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};
