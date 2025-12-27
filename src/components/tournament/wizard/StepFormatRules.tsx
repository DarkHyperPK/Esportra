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

const StepFormatRules: React.FC<WizardStepProps> = ({ data, updateData, errors, tournamentId }) => {
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

            {/* Stages Section */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2 text-lg font-semibold">
                        <Layers className="w-5 h-5 text-white" />
                        Tournament Stages
                    </Label>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            const nextOrder = data.stages.length + 1;
                            updateData({
                                stages: [
                                    ...data.stages,
                                    { name: `Stage ${nextOrder}`, format: 'single_elimination', stage_order: nextOrder }
                                ]
                            });
                        }}
                        className="border-white/20 text-white hover:bg-white/10"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Stage
                    </Button>
                </div>

                <div className="space-y-3">
                    {data.stages.map((stage, index) => (
                        <div
                            key={index}
                            className="p-4 bg-white/[0.02] rounded-lg border border-white/10 space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="w-8 h-8 bg-white/10 rounded flex items-center justify-center text-sm font-bold text-white">
                                        {stage.stage_order}
                                    </div>
                                    <Input
                                        value={stage.name}
                                        onChange={(e) => {
                                            const newStages = [...data.stages];
                                            newStages[index] = { ...stage, name: e.target.value };
                                            updateData({ stages: newStages });
                                        }}
                                        placeholder="Stage Name (e.g. Qualifiers)"
                                        className="max-w-[200px] bg-gray-900/50"
                                    />
                                </div>
                                {data.stages.length > 1 && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            const newStages = data.stages.filter((_, i) => i !== index);
                                            // Re-order remaining stages
                                            const reorderedStages = newStages.map((s, i) => ({ ...s, stage_order: i + 1 }));
                                            updateData({ stages: reorderedStages });
                                        }}
                                        className="text-gray-500 hover:text-red-500"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {Object.entries(BRACKET_TYPE_LABELS)
                                    .filter(([value]) => value !== 'battle_royale')
                                    .map(([value, label]) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => {
                                                const newStages = [...data.stages];
                                                newStages[index] = { ...stage, format: value as any };
                                                updateData({ stages: newStages });
                                            }}
                                            className={cn(
                                                "p-3 rounded-lg border text-left transition-all text-sm",
                                                stage.format === value
                                                    ? "border-emerald-500 bg-emerald-500/10"
                                                    : "border-white/10 hover:border-white/20"
                                            )}
                                        >
                                            <div className="font-medium text-white">{label}</div>
                                            <div className="text-[10px] text-gray-400 mt-0.5">
                                                {value === 'single_elimination' && 'One loss = eliminated'}
                                                {value === 'double_elimination' && 'Two losses = eliminated'}
                                            </div>
                                        </button>
                                    ))}
                            </div>

                            {/* Best Of Selector (Match Format) */}
                            {!isBattleRoyale && (
                                <div className="space-y-2 pt-2 border-t border-white/5">
                                    <Label className="text-xs text-gray-400 uppercase tracking-wider">Match Format</Label>
                                    <div className="flex gap-2">
                                        {[1, 3, 5].map((bo) => (
                                            <button
                                                key={bo}
                                                type="button"
                                                onClick={() => {
                                                    const newStages = [...data.stages];
                                                    const currentConfig = stage.config || {};
                                                    newStages[index] = {
                                                        ...stage,
                                                        config: { ...currentConfig, bestOf: bo }
                                                    };
                                                    updateData({ stages: newStages });
                                                }}
                                                className={cn(
                                                    "flex-1 p-2 rounded border text-sm transition-all",
                                                    (stage.config?.bestOf || 1) === bo
                                                        ? "border-emerald-500 bg-emerald-500/20 text-white"
                                                        : "border-white/10 hover:border-white/20 text-gray-400"
                                                )}
                                            >
                                                Best of {bo}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Match Count - Only for Battle Royale */}
            {isBattleRoyale && (
                <div className="space-y-3">
                    <Label className="flex items-center gap-2">
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
                            className="w-24"
                        />
                        <span className="text-sm text-gray-400">matches</span>
                    </div>
                </div>
            )}

            {/* Max Teams */}
            <div className="space-y-3">
                <Label className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {isBattleRoyale ? 'Lobby Capacity' : 'Maximum Teams'}
                </Label>

                {isBattleRoyale ? (
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
                ) : (
                    <>
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-2 mb-2">
                            {POWER_OF_TWO_OPTIONS.slice(0, 8).map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => updateData({ maxTeams: num })}
                                    className={cn(
                                        "p-2 rounded-lg border text-sm transition-all",
                                        data.maxTeams === num
                                            ? "border-emerald-500 bg-emerald-500/20 text-white"
                                            : "border-white/10 hover:border-white/20 text-gray-300"
                                    )}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-3">
                            <Input
                                type="number"
                                min={2}
                                max={1024}
                                value={data.maxTeams}
                                onChange={(e) => updateData({ maxTeams: parseInt(e.target.value) || 2 })}
                                className="w-24"
                            />
                            <span className="text-sm text-gray-400">teams</span>
                            {!isPowerOfTwo(data.maxTeams) && (
                                <span className="text-sm text-yellow-500">
                                    ⚠️ Power of 2 recommended for elimination brackets
                                </span>
                            )}
                        </div>
                        {errors.maxTeams && <p className="text-sm text-red-500">{errors.maxTeams}</p>}
                    </>
                )}
            </div>

            {/* Team Size / Game Format */}
            <div className="space-y-3">
                <Label>Game Format</Label>
                {hasMultipleFormats ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {gameFormats.map((format) => (
                            <button
                                key={format.value}
                                type="button"
                                onClick={() => updateData({ teamSize: format.teamSize })}
                                className={cn(
                                    "p-3 rounded-lg border-2 text-center transition-all",
                                    data.teamSize === format.teamSize
                                        ? "border-emerald-500 bg-emerald-500/10"
                                        : "border-white/10 hover:border-white/20"
                                )}
                            >
                                <div className="font-medium text-white">{format.name}</div>
                                <div className="text-xs text-gray-400">{format.teamSize === 1 ? 'Solo' : `${format.teamSize} Players`}</div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="p-4 bg-white/[0.02] rounded-lg border border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white font-bold">
                                {data.teamSize}v{data.teamSize}
                            </div>
                            <div>
                                <div className="font-medium text-white">Standard Format</div>
                                <div className="text-sm text-gray-400">
                                    {selectedGame?.name} uses a fixed team size of {data.teamSize} players.
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Seeding Type - Only for Bracket Games */}
            {!isBattleRoyale && (
                <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                        <Shuffle className="w-4 h-4" />
                        Seeding Method
                    </Label>
                    <div className="grid grid-cols-3 gap-3">
                        {Object.entries(SEEDING_TYPE_LABELS).map(([value, label]) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() => updateData({ seedingType: value as any })}
                                className={cn(
                                    "p-3 rounded-lg border-2 text-center transition-all",
                                    data.seedingType === value
                                        ? "border-emerald-500 bg-emerald-500/10"
                                        : "border-white/10 hover:border-white/20"
                                )}
                            >
                                <div className="text-sm font-medium text-white">{label}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Third Place Match - Only for Bracket Games */}
            {!isBattleRoyale && (
                <div className="flex items-center justify-between p-4 bg-white/[0.02] rounded-lg border border-white/10">
                    <div className="flex items-center gap-3">
                        <Award className="w-5 h-5 text-white" />
                        <div>
                            <div className="font-medium text-white">Third Place Match</div>
                            <div className="text-sm text-gray-400">Play a match for 3rd/4th place</div>
                        </div>
                    </div>
                    <Switch
                        checked={data.thirdPlaceMatch}
                        onCheckedChange={(checked) => updateData({ thirdPlaceMatch: checked })}
                    />
                </div>
            )}
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
