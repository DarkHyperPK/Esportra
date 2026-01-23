import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { Image, DollarSign, FileText, Link as LinkIcon, MessageCircle, Twitter } from 'lucide-react';
import { WizardStepProps } from '@/types/tournamentWizard';
import ImageUploader from './ImageUploader';
import { cn } from '@/lib/utils';

const StepBranding: React.FC<WizardStepProps> = ({ data, updateData, errors }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Branding & Details</h2>
                <p className="text-gray-400">Make your tournament stand out with images and information</p>
            </div>

            {/* Image Uploads */}
            <div className="w-full h-px bg-white/5 my-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:border-r border-white/10 pr-6">
                    <ImageUploader
                        value={data.bannerUrl}
                        onChange={(url) => updateData({ bannerUrl: url })}
                        aspectRatio="banner"
                        label="Tournament Banner"
                        helperText="Displayed on the tournament page header"
                    />
                </div>
                <div>
                    <ImageUploader
                        value={data.logoUrl}
                        onChange={(url) => updateData({ logoUrl: url })}
                        aspectRatio="logo"
                        label="Tournament Logo"
                        helperText="Displayed on cards and brackets"
                    />
                </div>
            </div>

            {/* Prize Pool & Entry Fee */}
            <div className="w-full h-px bg-white/5 my-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2 md:border-r border-white/10 pr-6">
                    <Label htmlFor="prizePool" className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <DollarSign className="w-4 h-4" />
                        Prize Pool (PKR) *
                    </Label>
                    <Input
                        id="prizePool"
                        placeholder="e.g., 50000"
                        value={data.prizePool}
                        onChange={(e) => updateData({ prizePool: e.target.value })}
                        className={cn("font-bold tracking-tight", errors.prizePool && 'border-red-500')}
                    />
                    {errors.prizePool && <p className="text-sm text-red-500">{errors.prizePool}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="entryFee" className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <DollarSign className="w-4 h-4" />
                        Entry Fee (PKR)
                    </Label>
                    <Input
                        id="entryFee"
                        placeholder="Enter amount or 'Free'"
                        value={data.entryFee}
                        onChange={(e) => updateData({ entryFee: e.target.value })}
                        className={cn("font-bold tracking-tight", errors.entryFee && 'border-red-500')}
                    />
                    {errors.entryFee && <p className="text-sm text-red-500">{errors.entryFee}</p>}
                    <p className="text-xs text-gray-500">Type "Free" for no entry fee</p>
                </div>
            </div>

            {/* Description */}
            <div className="w-full h-px bg-white/5 my-6" />
            <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <FileText className="w-4 h-4" />
                    Tournament Description *
                </Label>
                <textarea
                    id="description"
                    rows={6}
                    placeholder="Describe your tournament, rules, prize distribution, and any other important information..."
                    value={data.description}
                    onChange={(e) => updateData({ description: e.target.value })}
                    className={cn(
                        "w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none",
                        errors.description && 'border-red-500'
                    )}
                />
                <div className="flex justify-between text-xs">
                    {errors.description ? (
                        <p className="text-red-500">{errors.description}</p>
                    ) : (
                        <p className="text-gray-500">Minimum 20 characters</p>
                    )}
                    <p className={cn(
                        "text-gray-500",
                        data.description.length > 4800 && "text-yellow-500",
                        data.description.length > 5000 && "text-red-500"
                    )}>
                        {data.description.length}/5000
                    </p>
                </div>
            </div>

            {/* Social Links */}
            <div className="w-full h-px bg-white/5 my-6" />
            <div className="space-y-4">
                <Label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <LinkIcon className="w-4 h-4" />
                    Social Links (optional)
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2 md:border-r border-white/10 pr-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <MessageCircle className="w-4 h-4" />
                            Discord
                        </div>
                        <Input
                            placeholder="https://discord.gg/..."
                            value={data.discordUrl}
                            onChange={(e) => updateData({ discordUrl: e.target.value })}
                            className={cn(errors.discordUrl && 'border-red-500')}
                        />
                        {errors.discordUrl && <p className="text-xs text-red-500">{errors.discordUrl}</p>}
                    </div>
                    <div className="space-y-2 md:border-r border-white/10 pr-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                            <Twitter className="w-4 h-4" />
                            Twitter/X
                        </div>
                        <Input
                            placeholder="https://twitter.com/..."
                            value={data.twitterUrl}
                            onChange={(e) => updateData({ twitterUrl: e.target.value })}
                            className={cn(errors.twitterUrl && 'border-red-500')}
                        />
                        {errors.twitterUrl && <p className="text-xs text-red-500">{errors.twitterUrl}</p>}
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                            📺 Stream
                        </div>
                        <Input
                            placeholder="https://twitch.tv/..."
                            value={data.streamUrl}
                            onChange={(e) => updateData({ streamUrl: e.target.value })}
                            className={cn(errors.streamUrl && 'border-red-500')}
                        />
                        {errors.streamUrl && <p className="text-xs text-red-500">{errors.streamUrl}</p>}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default StepBranding;
