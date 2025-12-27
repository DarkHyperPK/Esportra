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

const StepBasicInfo: React.FC<WizardStepProps> = ({ data, updateData, errors, isEditMode }) => {
    const selectedGame = esportsGames.games.find(
        g => g.name.toLowerCase() === data.game.toLowerCase()
    );

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
                            <SelectItem value="upcoming">Upcoming</SelectItem>
                            <SelectItem value="ongoing">Ongoing (Live)</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Tournament Name */}
            <div className="space-y-2">
                <Label htmlFor="name">Tournament Name *</Label>
                <Input
                    id="name"
                    placeholder="e.g., Summer Showdown 2024"
                    value={data.name}
                    onChange={(e) => updateData({ name: e.target.value })}
                    className={cn(errors.name && 'border-red-500')}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            {/* Game Selection */}
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <Label>Game *</Label>
                    {isEditMode && <Lock className="w-3 h-3 text-gray-500" />}
                </div>
                <Select
                    value={data.game}
                    onValueChange={(value) => updateData({ game: value })}
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
                        className="p-4 bg-white/[0.02] rounded-lg border border-white/10"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                                🎮
                            </div>
                            <div>
                                <div className="font-semibold text-white">{selectedGame.name}</div>
                                <div className="text-sm text-gray-400">
                                    Default: {selectedGame.defaultFormat} •
                                    {selectedGame.formats.length} format{selectedGame.formats.length > 1 ? 's' : ''} available
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tournament Type */}
            <div className="space-y-3">
                <Label>Tournament Type</Label>
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
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2 overflow-hidden"
                    >
                        <Label htmlFor="venue">Venue *</Label>
                        <Input
                            id="venue"
                            placeholder="Enter venue name or address"
                            value={data.venue}
                            onChange={(e) => updateData({ venue: e.target.value })}
                            className={cn(errors.venue && 'border-red-500')}
                        />
                        {errors.venue && <p className="text-sm text-red-500">{errors.venue}</p>}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Visibility */}
            <div className="space-y-3">
                <Label>Visibility</Label>
                <RadioGroup
                    value={data.visibility}
                    onValueChange={(value: any) => updateData({ visibility: value })}
                    className="grid grid-cols-3 gap-3"
                >
                    {[
                        { value: 'public', icon: Eye, label: 'Public', desc: 'Anyone can see' },
                        { value: 'unlisted', icon: EyeOff, label: 'Unlisted', desc: 'Link only' },
                        { value: 'private', icon: Lock, label: 'Private', desc: 'Invite only' },
                    ].map((option) => (
                        <label
                            key={option.value}
                            className={cn(
                                "flex flex-col items-center p-3 rounded-lg border-2 cursor-pointer transition-all text-center",
                                data.visibility === option.value
                                    ? "border-emerald-500 bg-emerald-500/10"
                                    : "border-white/10 hover:border-white/20"
                            )}
                        >
                            <RadioGroupItem value={option.value} className="sr-only" />
                            <option.icon className={cn(
                                "w-5 h-5 mb-1",
                                data.visibility === option.value ? "text-emerald-400" : "text-gray-400"
                            )} />
                            <div className="text-sm font-medium text-white">{option.label}</div>
                            <div className="text-xs text-gray-500">{option.desc}</div>
                        </label>
                    ))}
                </RadioGroup>
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="startDate" className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Start Date *
                    </Label>
                    <Input
                        id="startDate"
                        type="date"
                        min={today}
                        value={data.startDate}
                        onChange={(e) => updateData({ startDate: e.target.value })}
                        className={cn(errors.startDate && 'border-red-500', "[color-scheme:dark]")}
                    />
                    {errors.startDate && <p className="text-sm text-red-500">{errors.startDate}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="startTime" className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Start Time *
                    </Label>
                    <Input
                        id="startTime"
                        type="time"
                        value={data.startTime}
                        onChange={(e) => updateData({ startTime: e.target.value })}
                        className={cn(errors.startTime && 'border-red-500', "[color-scheme:dark]")}
                    />
                    {errors.startTime && <p className="text-sm text-red-500">{errors.startTime}</p>}
                </div>
            </div>


        </motion.div>
    );
};

export default StepBasicInfo;
