import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, MapPin, Calendar, Clock, EyeOff, Lock, Target } from 'lucide-react';
import { WizardStepProps } from '@/types/tournamentWizard';
import { cn } from '@/lib/utils';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { getGameByName, getDefaultGameMode, getDefaultTeamSize, getGameModes, getGameModeGroups, isBattleRoyale, getBRConfig, EsportsGame, getEffectiveGameFeatures, listCatalogGames } from '@/utils/gameFeatures';

const StepBasicInfo: React.FC<WizardStepProps> = ({ data, updateData, errors, isEditMode }) => {
    useGameCatalog();
    const catalogGames = listCatalogGames();
    const selectedGame = getGameByName(data.game) as EsportsGame | undefined;
    const selectedGameModes = selectedGame ? getGameModes(selectedGame.name) : [];
    const selectedGameModeGroups = selectedGame ? getGameModeGroups(selectedGame.name) : [];
    const selectedGameModeValue = data.gameMode || getDefaultGameMode(data.game)?.value || '';

    const handleGameChange = (gameName: string) => {
        const game = getGameByName(gameName);
        const defaultMode = game ? getDefaultGameMode(game.name) : undefined;
        const teamSize = game ? getDefaultTeamSize(game.name, defaultMode?.value) : data.teamSize;
        const updates: Partial<typeof data> = { game: gameName, gameMode: defaultMode?.value || '', teamSize };
        const modeFeatures = getEffectiveGameFeatures(gameName, defaultMode?.value);
        updates.mapVetoEnabled = modeFeatures.mapVeto;
        updates.mapPoolIds = [];
        updateData(updates);
    };

    const handleFormatChange = (modeValue: string) => {
        const mode = selectedGameModes.find(m => (m.key || m.value) === modeValue || m.value === modeValue);
        if (mode) {
            const modeFeatures = getEffectiveGameFeatures(data.game || '', mode.value);
            updateData({
                gameMode: mode.value,
                teamSize: mode.teamSize,
                mapVetoEnabled: modeFeatures.mapVeto,
                mapPoolIds: [],
            });
        }
    };

    const activeModeGroup = selectedGameModeGroups.find((group) =>
        group.modes.some((mode) => selectedGameModeValue === mode.value || selectedGameModeValue === mode.key)
    );

    const handleModeGroupChange = (groupKey: string) => {
        const group = selectedGameModeGroups.find((candidate) => candidate.key === groupKey);
        const mode = group?.modes[0];
        if (mode) handleFormatChange(mode.key || mode.value);
    };

    // Get today's date for min date validation
    const today = new Date().toISOString().split('T')[0];

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Tournament Basics</h2>
                <p className="text-gray-400">Let's start with the essential information</p>
            </div>

            {/* Status (Edit Mode Only) */}
            {isEditMode && (
                <div className="space-y-2">
                    <Label htmlFor="status">Tournament Status</Label>
                    <Select
                        value={data.status}
                        onValueChange={(value) => updateData({ status: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published (Upcoming)</SelectItem>
                            <SelectItem value="open">Registration Open</SelectItem>
                            <SelectItem value="closed">Registration Closed</SelectItem>
                            <SelectItem value="ongoing">Ongoing (Live)</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Tournament Name */}
            <div className="w-full h-px bg-white/5 my-6" />
            <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tournament Name *</Label>
                <Input
                    id="name"
                    placeholder="e.g., Summer Showdown 2024"
                    value={data.name}
                    onChange={(e) => updateData({ name: e.target.value })}
                    className={cn("font-bold tracking-tight", errors.name && 'border-red-500')}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Game Selection */}
            <div className="w-full h-px bg-white/5 my-6" />
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Game *</Label>
                    {isEditMode && <Lock className="w-3 h-3 text-gray-500" />}
                </div>
                <Select
                    value={data.game}
                    onValueChange={handleGameChange}
                    disabled={isEditMode}
                >
                    <SelectTrigger className={cn(errors.game && 'border-red-500', isEditMode && "opacity-50 cursor-not-allowed")}>
                        <SelectValue placeholder="Select a game" />
                    </SelectTrigger>
                    <SelectContent>
                        {catalogGames
                            .filter((game) => game.slug !== 'cs2')
                            .map((game) => (
                            <SelectItem
                                key={game.name}
                                value={game.name}
                                className="focus:bg-green-600 focus:text-white cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
                                    <img src={game.logo} alt="" className="w-5 h-5 rounded object-cover" />
                                    <span>{game.name}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.game && <p className="text-sm text-red-500">{errors.game}</p>}
            </div>

            {/* Selected Game Info Card */}
            <AnimatePresence>
                {selectedGame && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="p-4 bg-white/[0.02] rounded-none border border-white/10 space-y-3"
                    >
                        <div className="flex items-center gap-3">
                            <img src={selectedGame.logo} alt={selectedGame.name} className="w-10 h-10 object-cover rounded" />
                            <div>
                                <div className="font-semibold text-white">{selectedGame.name}</div>
                                <div className="text-sm text-gray-400">
                                    {selectedGame.category} •
                                    {selectedGameModes.length > 1
                                        ? ` ${selectedGameModes.length} modes available`
                                        : ` ${selectedGameModes[0]?.name || selectedGame.defaultFormat}`
                                    }
                                </div>
                            </div>
                        </div>
                        {/* Mode selector for games with multiple playable modes */}
                        {selectedGameModes.length > 1 && !isEditMode && (
                            <div className="pt-3 border-t border-white/10 space-y-3">
                                <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">Game Mode</Label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {selectedGameModeGroups.map((group) => {
                                        const isSelected = activeModeGroup?.key === group.key;
                                        return (
                                            <button
                                                key={group.key}
                                                type="button"
                                                onClick={() => handleModeGroupChange(group.key)}
                                                className={cn(
                                                    "rounded-none border px-3 py-2 text-left text-sm font-bold uppercase tracking-wide transition-colors",
                                                    isSelected
                                                        ? "border-rose-500 bg-rose-500 text-white"
                                                        : "border-white/10 bg-black/40 text-gray-400 hover:border-white/30 hover:text-white"
                                                )}
                                            >
                                                {group.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                {activeModeGroup && activeModeGroup.modes.length > 1 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {activeModeGroup.modes.map((mode) => {
                                            const modeValue = mode.key || mode.value;
                                            const isSelected = selectedGameModeValue === mode.value || selectedGameModeValue === mode.key;
                                            return (
                                                <button
                                                    key={modeValue}
                                                    type="button"
                                                    onClick={() => handleFormatChange(modeValue)}
                                                    className={cn(
                                                        "rounded-none border px-3 py-2 text-sm font-mono font-bold uppercase tracking-wider transition-colors",
                                                        isSelected
                                                            ? "border-white bg-white text-black"
                                                            : "border-white/10 bg-white/[0.02] text-gray-400 hover:border-rose-500/50 hover:text-white"
                                                    )}
                                                >
                                                    {mode.variantLabel || mode.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* BR format notice */}
                        {isBattleRoyale(selectedGame.name) && (
                            <div className="pt-2 border-t border-white/5">
                                <div className="flex items-start gap-3 p-3 rounded-none bg-amber-500/5 border border-amber-500/20">
                                    <Target className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <p className="font-medium text-amber-300 text-sm">Points-Based Tournament</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {selectedGame.name} uses a points-based format with placement &amp; elimination scoring across multiple games.
                                            {getBRConfig(selectedGame.name)?.playersPerLobby && (
                                                <span className="text-amber-400/70"> Up to {getBRConfig(selectedGame.name)!.playersPerLobby} players per lobby.</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tournament Type */}
            <div className="w-full h-px bg-white/5 my-6" />
            <div className="space-y-3">
                <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tournament Type</Label>
                <RadioGroup
                    value={data.isOnline ? 'online' : 'lan'}
                    onValueChange={(value) => updateData({ isOnline: value === 'online' })}
                    className="grid grid-cols-2 gap-4"
                >
                    <label
                        className={cn(
                            "flex items-center gap-3 p-4 rounded-none border-2 cursor-pointer transition-all",
                            data.isOnline
                                ? "border-rose-500 bg-rose-500/10"
                                : "border-white/10 hover:border-white/20"
                        )}
                    >
                        <RadioGroupItem value="online" className="sr-only" />
                        <Globe className={cn("w-5 h-5", data.isOnline ? "text-rose-400" : "text-gray-400")} />
                        <div>
                            <div className="font-medium text-white">Online</div>
                            <div className="text-xs text-gray-400">Players compete remotely</div>
                        </div>
                    </label>
                    <label
                        className={cn(
                            "flex items-center gap-3 p-4 rounded-none border-2 cursor-pointer transition-all",
                            !data.isOnline
                                ? "border-rose-500 bg-rose-500/10"
                                : "border-white/10 hover:border-white/20"
                        )}
                    >
                        <RadioGroupItem value="lan" className="sr-only" />
                        <MapPin className={cn("w-5 h-5", !data.isOnline ? "text-rose-400" : "text-gray-400")} />
                        <div>
                            <div className="font-medium text-white">LAN</div>
                            <div className="text-xs text-gray-400">In-person at a venue</div>
                        </div>
                    </label>
                </RadioGroup>
            </div>

            {/* Venue (for LAN) */}
            <AnimatePresence>
                {!data.isOnline && (
                    <motion.div
                        initial={{ opacity: 0, gridTemplateRows: '0fr' }}
                        animate={{ opacity: 1, gridTemplateRows: '1fr' }}
                        exit={{ opacity: 0, gridTemplateRows: '0fr' }}
                        transition={{ duration: 0.2 }}
                        style={{ display: 'grid', overflow: 'hidden' }}
                    >
                    <div style={{ minHeight: 0, overflow: 'hidden' }} className="space-y-2">
                        <div className="w-full h-px bg-white/5 my-6" />
                        <Label htmlFor="venue" className="text-xs font-bold text-gray-500 uppercase tracking-widest">Venue *</Label>
                        <Input
                            id="venue"
                            placeholder="Enter venue name or address"
                            value={data.venue}
                            onChange={(e) => updateData({ venue: e.target.value })}
                            className={cn(errors.venue && 'border-red-500')}
                        />
                        {errors.venue && <p className="text-sm text-red-500">{errors.venue}</p>}
                    </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Region */}
            <div className="w-full h-px bg-white/5 my-6" />
            <div className="space-y-2">
                <Label htmlFor="region" className="text-xs font-bold text-gray-500 uppercase tracking-widest">Region *</Label>
                <p className="text-xs text-gray-500 mb-2">The server region or geographical area for this tournament.</p>
                <Select value={data.region} onValueChange={(v) => updateData({ region: v })}>
                    <SelectTrigger id="region" className={cn(errors.region && 'border-red-500')}>
                        <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="na-east">NA East</SelectItem>
                        <SelectItem value="na-west">NA West</SelectItem>
                        <SelectItem value="latam">LATAM</SelectItem>
                        <SelectItem value="eu">EU</SelectItem>
                        <SelectItem value="me">ME</SelectItem>
                        <SelectItem value="sea">SEA</SelectItem>
                        <SelectItem value="oce">OCE</SelectItem>
                    </SelectContent>
                </Select>
                {errors.region && <p className="text-sm text-red-500">{errors.region}</p>}
            </div>

            {/* Visibility - Simplified to Draft only */}
            <div className="w-full h-px bg-white/5 my-6" />
            <div className="space-y-4">
                <div>
                    <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Visibility</Label>
                    <p className="text-sm text-gray-400 mt-1">Tournaments start as unlisted drafts and can be published after setup.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div
                        className={cn(
                            "flex flex-col items-center p-6 rounded-none border-2 transition-all text-center",
                            "border-rose-500 bg-rose-500/10"
                        )}
                    >
                        <EyeOff className="w-8 h-8 mb-3 text-rose-400" />
                        <div className="text-base font-bold text-white uppercase tracking-tight">Unlisted (Draft)</div>
                        <div className="text-xs text-rose-400/70 mt-1 font-medium">Only you can see this right now</div>
                    </div>

                    <div className="flex flex-col justify-center p-4 rounded-none border border-white/5 bg-white/[0.01] text-left">
                        <div className="flex items-center gap-2 mb-2 text-white/40">
                            <Globe className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-widest">Go Public Later</span>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            Once your tournament details and bracket are ready, you can publish it to the public listing with one click from the dashboard.
                        </p>
                    </div>
                </div>
            </div>

            {/* Date and Time */}
            <div className="w-full h-px bg-white/5 my-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2 md:border-r border-white/10 pr-4">
                    <Label htmlFor="startDate" className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <Calendar className="w-4 h-4" />
                        Start Date *
                    </Label>
                    <Input
                        id="startDate"
                        type="date"
                        min={today}
                        value={data.startDate}
                        onChange={(e) => updateData({ startDate: e.target.value })}
                        className={cn(errors.startDate && 'border-red-500', "[color-scheme:dark] font-bold tracking-tight")}
                    />
                    {errors.startDate && <p className="text-sm text-red-500">{errors.startDate}</p>}
                </div>
                <div className="space-y-2 pl-2">
                    <Label htmlFor="startTime" className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <Clock className="w-4 h-4" />
                        Start Time *
                    </Label>
                    <Input
                        id="startTime"
                        type="time"
                        value={data.startTime}
                        onChange={(e) => updateData({ startTime: e.target.value })}
                        className={cn(errors.startTime && 'border-red-500', "[color-scheme:dark] font-bold tracking-tight")}
                    />
                </div>
            </div>

            {/* End Date and Time */}
            <div className="w-full h-px bg-white/5 my-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2 md:border-r border-white/10 pr-4">
                    <Label htmlFor="endDate" className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <Calendar className="w-4 h-4" />
                        End Date
                    </Label>
                    <Input
                        id="endDate"
                        type="date"
                        min={data.startDate || today}
                        value={data.endDate}
                        onChange={(e) => updateData({ endDate: e.target.value })}
                        className={cn(errors.endDate && 'border-red-500', "[color-scheme:dark] font-bold tracking-tight")}
                    />
                    {errors.endDate && <p className="text-sm text-red-500">{errors.endDate}</p>}
                </div>
                <div className="space-y-2 pl-2">
                    <Label htmlFor="endTime" className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <Clock className="w-4 h-4" />
                        End Time
                    </Label>
                    <Input
                        id="endTime"
                        type="time"
                        value={data.endTime}
                        onChange={(e) => updateData({ endTime: e.target.value })}
                        className={cn(errors.endTime && 'border-red-500', "[color-scheme:dark] font-bold tracking-tight")}
                    />
                    {errors.endTime && <p className="text-sm text-red-500">{errors.endTime}</p>}
                </div>
            </div>


        </motion.div>
    );
};

export default StepBasicInfo;
