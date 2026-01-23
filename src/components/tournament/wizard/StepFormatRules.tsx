import React, { useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { motion } from 'framer-motion';
import { Trophy, Users, Shuffle, Award, Target, Plus, Trash2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WizardStepProps } from '@/types/tournamentWizard';
import {
    BRACKET_TYPE_LABELS,
    SEEDING_TYPE_LABELS,
    POWER_OF_TWO_OPTIONS
} from '@/schemas/tournamentSchema';
import { cn } from '@/lib/utils';
import esportsGames from '@/data/esportsGames.json';
import { MapPoolManager } from '@/components/organizer/MapPoolManager';
import { useToast } from '@/hooks/use-toast';

const StepFormatRules: React.FC<WizardStepProps> = ({ data, updateData, errors, tournamentId, participantsCount }) => {
    const { toast } = useToast();
    const selectedGame = esportsGames.games.find(
        g => g.name.toLowerCase() === data.game.toLowerCase()
    );

    const isBattleRoyale = selectedGame?.type === 'battle_royale';
    const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;

    // Auto-set bracket type for Battle Royale
    useEffect(() => {
        if (isBattleRoyale) {
            if (data.bracketType !== 'battle_royale') {
                updateData({ bracketType: 'battle_royale' });
            }
            // Auto-calculate max teams based on lobby size
            const lobbySize = selectedGame?.lobbySize || 100;
            const calculatedMaxTeams = Math.floor(lobbySize / data.teamSize);
            if (data.maxTeams !== calculatedMaxTeams) {
                updateData({ maxTeams: calculatedMaxTeams });
            }
        } else if (!isBattleRoyale && data.bracketType === 'battle_royale') {
            updateData({ bracketType: 'single_elimination' });
        }
    }, [isBattleRoyale, data.bracketType, data.teamSize, selectedGame, data.maxTeams, updateData]);

    // Determine available formats for the selected game
    const gameFormats = selectedGame?.formats || [];
    const hasMultipleFormats = gameFormats.length > 1;

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Format & Rules</h2>
                <p className="text-gray-400">Configure the tournament structure and match settings</p>
            </div>

            {/* Stages Info - Configuration done in Manage Stages */}
            {tournamentId ? (
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                    <div className="flex items-center gap-3">
                        <Layers className="w-5 h-5 text-blue-400" />
                        <div>
                            <div className="font-medium text-white">Tournament Stages</div>
                            <div className="text-sm text-gray-400">
                                Configure stages, advancement counts, and settings in the "Stages" tab of tournament management.
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-4 bg-emerald-500/10 rounded-lg border border-emerald-500/30">
                    <div className="flex items-center gap-3">
                        <Layers className="w-5 h-5 text-emerald-400" />
                        <div>
                            <div className="font-medium text-white">Tournament Stages</div>
                            <div className="text-sm text-gray-400">
                                A default stage will be created. You can add more stages and configure advancement after creating the tournament via the "Manage Stages" option.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tournament Format Info - Configured in Stage Management */}
            {!isBattleRoyale && (
                <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                    <div className="flex items-center gap-3">
                        <Trophy className="w-5 h-5 text-blue-400" />
                        <div>
                            <div className="font-medium text-white">Tournament Format</div>
                            <div className="text-sm text-gray-400">
                                Format (Single Elim, Double Elim, Swiss, etc.) will be configured when setting up stages after creating the tournament.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Match Count - Only for Battle Royale */}
            {isBattleRoyale && (
                <div className="space-y-3">
                    <div className="w-full h-px bg-white/5 my-6" />
                    <Label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <Target className="w-4 h-4" />
                        Matches to Play
                    </Label>
                    <div className="flex items-center gap-3">
                        <Input
                            type="number"
                            min={1}
                            max={20}
                            value={data.matchCount || 1}
                            onChange={(e) => updateData({ matchCount: parseInt(e.target.value) || 1 })}
                            className="w-24 font-bold tracking-tight"
                        />
                        <span className="text-sm text-gray-400">matches</span>
                    </div>
                </div>
            )}

            {/* Max Teams */}
            {!isBattleRoyale && (
                <div className="space-y-3">
                    <div className="w-full h-px bg-white/5 my-6" />
                    <Label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <Users className="w-4 h-4" />
                        Maximum Teams
                    </Label>
                    <Select
                        value={String(data.maxTeams)}
                        onValueChange={(value) => {
                            const newValue = parseInt(value);
                            if (participantsCount && newValue !== 0 && newValue < participantsCount) {
                                toast({
                                    title: "Invalid Configuration",
                                    description: `Cannot set Max Teams to ${newValue} when ${participantsCount} teams are already registered.`,
                                    variant: "destructive"
                                });
                                return;
                            }
                            updateData({ maxTeams: newValue })
                        }}
                    >
                        <SelectTrigger className="w-full font-bold tracking-tight">
                            <SelectValue placeholder="Select max teams" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0">Unlimited</SelectItem>
                            <SelectItem value="4">4 Teams</SelectItem>
                            <SelectItem value="8">8 Teams</SelectItem>
                            <SelectItem value="16">16 Teams</SelectItem>
                            <SelectItem value="32">32 Teams (Recommended for Testing)</SelectItem>
                            <SelectItem value="64">64 Teams</SelectItem>
                            <SelectItem value="128">128 Teams</SelectItem>
                            <SelectItem value="256">256 Teams</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-400">
                        {data.maxTeams === 0
                            ? "No limit on registrations. Bracket will auto-size based on registered teams."
                            : "If fewer teams register, the bracket will automatically adjust."}
                    </p>
                </div>
            )}

            {/* Auto-set default maxTeams to 32 for testing efficiency if it's 0/Unlimited is handled in useEffect above */}
            {isBattleRoyale && (
                <div className="space-y-3">
                    <div className="w-full h-px bg-white/5 my-6" />
                    <Label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <Users className="w-4 h-4" />
                        Lobby Capacity
                    </Label>
                    <div className="p-4 bg-white/[0.02] rounded-lg border border-white/10">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-2xl font-bold text-white">
                                    {Math.floor((selectedGame?.lobbySize || 100) / data.teamSize)} Teams
                                </div>
                                <div className="text-sm text-gray-400">
                                    Based on {selectedGame?.lobbySize || 100} players / {data.teamSize} per team
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-medium text-white">
                                    Auto-calculated
                                </div>
                                <div className="text-xs text-gray-500">
                                    Max capacity for {selectedGame?.name}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Team Size - Configured in Stage Setup */}
            {/* Team Size */}
            <div className="space-y-3">
                <div className="w-full h-px bg-white/5 my-6" />
                <Label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <Users className="w-4 h-4" />
                    Team Size (Max Players)
                </Label>
                <Input
                    type="number"
                    min={1}
                    max={10}
                    value={data.teamSize}
                    onChange={(e) => updateData({ teamSize: parseInt(e.target.value) || 1 })}
                    className="[color-scheme:dark] font-bold tracking-tight"
                />
                <p className="text-sm text-gray-400">
                    Maximum players per team. Default is 7 (5 mandatory + 2 subs). Teams with 5-7 players can register.
                </p>
            </div>


            {/* Seeding and Third Place Match removed - using defaults */}
            {/* Map Pool Manager - Only in Edit Mode */}
            {tournamentId && (
                <div className="space-y-3 pt-6 border-t border-white/10">
                    <MapPoolManager tournamentId={tournamentId} game={data.game} />
                </div>
            )}
        </motion.div>
    );
};

export default StepFormatRules;
