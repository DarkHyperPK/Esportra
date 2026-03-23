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
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, MapPin, Calendar, Clock, Eye, EyeOff, Lock } from 'lucide-react';
import esportsGames from '@/data/esportsGames.json';
import { WizardStepProps } from '@/types/tournamentWizard';
import { cn } from '@/lib/utils';
import { getGameByName, getDefaultTeamSize, EsportsGame } from '@/utils/gameFeatures';

const StepBasicInfo: React.FC<WizardStepProps> = ({ data, updateData, errors, isEditMode }) => {
    const selectedGame = getGameByName(data.game) as EsportsGame | undefined;

    const handleGameChange = (gameName: string) => {
        const game = getGameByName(gameName);
        const teamSize = game ? getDefaultTeamSize(gameName) : data.teamSize;
        const updates: Partial<typeof data> = { game: gameName, teamSize };
        // Auto-disable map veto for games that don't support it
        if (game && !game.features.mapVeto) {
            updates.mapVetoEnabled = false;
            updates.mapPoolIds = [];
        } else if (game?.features.mapVeto) {
            updates.mapVetoEnabled = true;
        }
        updateData(updates);
    };

    const handleFormatChange = (formatValue: string) => {
        const fmt = selectedGame?.formats.find(f => f.value === formatValue);
        if (fmt) {
            updateData({ teamSize: fmt.teamSize });
        }
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
                        {esportsGames.games.map((game) => (
                            <SelectItem
                                key={game.name}
                                value={game.name}
                                className="focus:bg-green-600 focus:text-white cursor-pointer"
                            >
                                <div className="flex items-center gap-2">
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
                        className="p-4 bg-white/[0.02] rounded-lg border border-white/10 space-y-3"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                                🎮
                            </div>
                            <div>
                                <div className="font-semibold text-white">{selectedGame.name}</div>
                                <div className="text-sm text-gray-400">
                                    {selectedGame.category} •
                                    {selectedGame.formats.length > 1
                                        ? ` ${selectedGame.formats.length} formats available`
                                        : ` ${selectedGame.defaultFormat}`
                                    }
                                </div>
                            </div>
                        </div>
                        {/* Format selector for games with multiple formats */}
                        {selectedGame.formats.length > 1 && !isEditMode && (
                            <div className="pt-2 border-t border-white/5">
                                <Label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Format</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    {selectedGame.formats.map((fmt) => (
                                        <button
                                            key={fmt.value}
                                            type="button"
                                            onClick={() => handleFormatChange(fmt.value)}
                                            className={cn(
                                                "px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                                                data.teamSize === fmt.teamSize
                                                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                                                    : "border-white/10 text-gray-400 hover:border-white/20"
                                            )}
                                        >
                                            {fmt.name}
                                        </button>
                                    ))}
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
                            "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                            data.isOnline
                                ? "border-emerald-500 bg-emerald-500/10"
                                : "border-white/10 hover:border-white/20"
                        )}
                    >
                        <RadioGroupItem value="online" className="sr-only" />
                        <Globe className={cn("w-5 h-5", data.isOnline ? "text-emerald-400" : "text-gray-400")} />
                        <div>
                            <div className="font-medium text-white">Online</div>
                            <div className="text-xs text-gray-400">Players compete remotely</div>
                        </div>
                    </label>
                    <label
                        className={cn(
                            "flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all",
                            !data.isOnline
                                ? "border-emerald-500 bg-emerald-500/10"
                                : "border-white/10 hover:border-white/20"
                        )}
                    >
                        <RadioGroupItem value="lan" className="sr-only" />
                        <MapPin className={cn("w-5 h-5", !data.isOnline ? "text-emerald-400" : "text-gray-400")} />
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
                            "flex flex-col items-center p-6 rounded-2xl border-2 transition-all text-center",
                            "border-emerald-500 bg-emerald-500/10"
                        )}
                    >
                        <EyeOff className="w-8 h-8 mb-3 text-emerald-400" />
                        <div className="text-base font-bold text-white uppercase tracking-tight">Unlisted (Draft)</div>
                        <div className="text-xs text-emerald-400/70 mt-1 font-medium">Only you can see this right now</div>
                    </div>

                    <div className="flex flex-col justify-center p-4 rounded-2xl border border-white/5 bg-white/[0.01] text-left">
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
