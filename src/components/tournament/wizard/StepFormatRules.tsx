import React, { useEffect, useState } from 'react';
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
import { Trophy, Users, Shuffle, Award, Target, Plus, Trash2, Layers, Map as MapIcon, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { WizardStepProps } from '@/types/tournamentWizard';
import {
    BRACKET_TYPE_LABELS,
    SEEDING_TYPE_LABELS,
    POWER_OF_TWO_OPTIONS
} from '@/schemas/tournamentSchema';
import { cn } from '@/lib/utils';
import esportsGames from '@/data/esportsGames.json';
import { apiClient } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';
import { getWebsiteAssetUrl } from '@/lib/storage';

/* ──────────────────────────────────────────────────────────────
   Sub-components
   ────────────────────────────────────────────────────────────── */

interface MapCardProps {
    map: { id: string; map_name: string; map_image_url?: string };
    isSelected: boolean;
    onToggle: (id: string) => void;
    index: number;
}

const MapCard: React.FC<MapCardProps> = ({ map, isSelected, onToggle, index }) => {
    const [isImgLoaded, setIsImgLoaded] = useState(false);

    return (
        <div
            className={cn(
                "group relative aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all duration-200",
                isSelected
                    ? "border-emerald-500 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500"
                    : "border-white/10 hover:border-white/30 opacity-70 hover:opacity-100"
            )}
            onClick={() => onToggle(map.id)}
        >
            {/* Skeleton / Shimmer Overlay */}
            {!isImgLoaded && (
                <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-emerald-500/20 border-t-emerald-500/80 animate-spin" />
                </div>
            )}

            <img
                src={map.map_image_url || getWebsiteAssetUrl('Backgrounds/grid-pattern.png')}
                alt={map.map_name}
                loading={index < 8 ? "eager" : "lazy"}
                onLoad={() => setIsImgLoaded(true)}
                className={cn(
                    "object-cover w-full h-full transition-all duration-700",
                    isImgLoaded ? "opacity-100 scale-100" : "opacity-0 scale-110",
                    isSelected && isImgLoaded ? "scale-105" : "scale-100 group-hover:scale-105"
                )}
            />
            <div className={cn(
                "absolute inset-0 bg-gradient-to-t transition-opacity duration-300",
                isSelected ? "from-black/90 via-black/40 to-transparent" : "from-black/80 via-transparent to-transparent"
            )} />

            {/* Selection Badge */}
            {isSelected && (
                <div className="absolute top-2 right-2 z-20 bg-emerald-500 rounded-full p-1 shadow-lg">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                </div>
            )}

            <div className="absolute bottom-2 left-2 right-2">
                <span className={cn(
                    "text-[10px] sm:text-xs font-bold uppercase tracking-wide drop-shadow-md transition-colors",
                    isSelected ? "text-emerald-400" : "text-white"
                )}>
                    {map.map_name}
                </span>
            </div>
        </div>
    );
};

/* ──────────────────────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────────────────────── */

const StepFormatRules: React.FC<WizardStepProps> = ({ data, updateData, errors, tournamentId, participantsCount }) => {
    const { toast } = useToast();
    const selectedGame = esportsGames.games.find(
        g => g.name.toLowerCase() === (data.game || '').toLowerCase()
    );

    const isPowerOfTwo = (n: number) => n > 0 && (n & (n - 1)) === 0;

    // Map Pool State
    const [availableMaps, setAvailableMaps] = useState<{ id: string; map_name: string; map_image_url?: string }[]>([]);
    const [loadingMaps, setLoadingMaps] = useState(false);

    // Fetch maps when game changes
    useEffect(() => {
        const fetchMaps = async () => {
            if (!data.game) {
                setAvailableMaps([]);
                return;
            }

            setLoadingMaps(true);
            try {
                // Normalize game name for DB query
                const isCS2 = ['cs2', 'counter-strike 2'].includes(data.game.toLowerCase());
                const dbGameName = isCS2 ? 'Counter-Strike 2' : data.game;

                const maps = await apiClient.get<{ id: string; map_name: string; map_image_url?: string }[]>(
                    `/api/games/maps?game=${encodeURIComponent(dbGameName)}`
                );

                setAvailableMaps(maps || []);

                // Auto-select first 7 active maps by default if none selected
                if (maps && maps.length > 0 && (!data.mapPoolIds || data.mapPoolIds.length === 0)) {
                    updateData({ mapPoolIds: maps.slice(0, 7).map(m => m.id) });
                }
            } catch (err) {
                console.error('[StepFormatRules] Error fetching maps:', err);
                setAvailableMaps([]);
            } finally {
                setLoadingMaps(false);
            }
        };

        fetchMaps();
    }, [data.game]);


    // Toggle map selection
    const toggleMap = (mapId: string) => {
        const currentIds = data.mapPoolIds || [];
        if (currentIds.includes(mapId)) {
            updateData({ mapPoolIds: currentIds.filter(id => id !== mapId) });
        } else {
            if (currentIds.length >= 7) {
                toast({
                    title: "Map Limit Reached",
                    description: "You can only select up to 7 maps for the map pool.",
                    variant: "destructive"
                });
                return;
            }
            updateData({ mapPoolIds: [...currentIds, mapId] });
        }
    };

    // Preload images
    useEffect(() => {
        if (availableMaps.length > 0) {
            availableMaps.forEach(map => {
                if (map.map_image_url) {
                    const img = new Image();
                    img.src = map.map_image_url;
                }
            });
        }
    }, [availableMaps]);


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

            {/* Stages Info */}
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

            {/* Tournament Format Info */}
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


            {/* Max Teams */}
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
                        <SelectItem value="32">32 Teams</SelectItem>
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
                    Maximum players per team (including subs). Standard for {data.game} is {selectedGame?.formats?.find(f => f.value === selectedGame.defaultFormat)?.teamSize || 5}.
                </p>
            </div>

            {/* Game Format Selector */}
            {hasMultipleFormats && (
                <div className="space-y-3">
                    <div className="w-full h-px bg-white/5 my-6" />
                    <Label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <Users className="w-4 h-4" />
                        Team Size Format
                    </Label>
                    <Select
                        value={gameFormats.find(f => f.teamSize === data.teamSize)?.value || selectedGame?.defaultFormat}
                        onValueChange={(value) => {
                            const newFormat = gameFormats.find(f => f.value === value);
                            if (newFormat) {
                                updateData({ teamSize: newFormat.teamSize });
                                toast({
                                    title: "Format Updated",
                                    description: `Team size set to ${newFormat.teamSize} (${newFormat.name})`,
                                });
                            }
                        }}
                    >
                        <SelectTrigger className="w-full font-bold tracking-tight">
                            <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                            {gameFormats.map((format: any) => (
                                <SelectItem key={format.value} value={format.value}>
                                    {format.name} ({format.teamSize === 1 ? 'Solo' : `${format.teamSize} Players`})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-400">
                        Select standard team size for this game.
                    </p>
                </div>
            )}


            {/* Map Pool Selection - Only show if game is selected */}
            {data.game && (
                <div className="space-y-4">
                    <div className="w-full h-px bg-white/5 my-6" />
                    <Label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <MapIcon className="w-4 h-4" />
                        Map Pool
                    </Label>
                    <p className="text-sm text-gray-400">
                        Select maps for this tournament. These will be used in map veto during matches.
                    </p>

                    {loadingMaps ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
                        </div>
                    ) : availableMaps.length === 0 ? (
                        <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/30">
                            <p className="text-amber-400 text-sm">No maps found for {data.game}. Maps can be added to the database.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm text-gray-400">
                                    {(data.mapPoolIds || []).length} of {availableMaps.length} maps selected
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            const mapsToSelect = availableMaps.slice(0, 7);
                                            updateData({ mapPoolIds: mapsToSelect.map(m => m.id) });
                                            if (availableMaps.length > 7) {
                                                toast({
                                                    title: "Selection Limited",
                                                    description: "Selected the first 7 maps due to map pool limit.",
                                                });
                                            }
                                        }}
                                        className="text-xs"
                                    >
                                        {availableMaps.length > 7 ? 'Select Top 7' : 'Select All'}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => updateData({ mapPoolIds: [] })}
                                        className="text-xs"
                                    >
                                        Clear All
                                    </Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {availableMaps.map((map, index) => (
                                    <MapCard
                                        key={map.id}
                                        map={map}
                                        index={index}
                                        isSelected={(data.mapPoolIds || []).includes(map.id)}
                                        onToggle={toggleMap}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Assisted Match Reporting - Valorant only */}
            {data.game?.toLowerCase() === 'valorant' && (
                <div className="space-y-4">
                    <div className="w-full h-px bg-white/5 my-6" />
                    <Label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <Zap className="w-4 h-4" />
                        Assisted Match Reporting
                    </Label>
                    <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5">
                        <Switch
                            checked={data.assistedMatchReporting}
                            onCheckedChange={(checked) => updateData({ assistedMatchReporting: checked })}
                        />
                        <div className="flex-1">
                            <p className="font-medium text-white text-sm">Enable Assisted Match Reporting</p>
                            <p className="text-xs text-gray-400 mt-1">
                                Automatically detects match results from Riot's API. Captains can scan their recent matches to report scores instantly.
                            </p>
                            {data.assistedMatchReporting && (
                                <p className="text-xs text-amber-400 mt-2">
                                    ⚠ Players will be required to link their Riot account before registering.
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </motion.div>
    );
};

export default StepFormatRules;
