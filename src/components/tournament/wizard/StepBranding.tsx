import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { Image, DollarSign, FileText, Link as LinkIcon, MessageCircle, Twitter } from 'lucide-react';
import { WizardStepProps } from '@/types/tournamentWizard';
import ImageUploader from './ImageUploader';
import ArtworkPicker from '@/components/tournament/ArtworkPicker';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const StepBranding: React.FC<WizardStepProps> = ({ data, updateData, errors }) => {
    const { profile } = useAuth();
    const [bannerMode, setBannerMode] = useState<'upload' | 'artwork'>('upload');
    const [selectedArtwork, setSelectedArtwork] = useState<string | null>(null);

    // Sanitize names for storage path
    const sanitize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    const organizerName = sanitize(profile?.username || profile?.full_name || 'unknown-organizer');
    const tournamentName = sanitize(data.name || 'unnamed-tournament');

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
            <div className="max-w-2xl space-y-4">
                {/* Mode toggle */}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setBannerMode('upload')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            bannerMode === 'upload'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'
                        }`}
                    >
                        Upload Custom
                    </button>
                    <button
                        type="button"
                        onClick={() => setBannerMode('artwork')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            bannerMode === 'artwork'
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'
                        }`}
                    >
                        Use Artwork from Esportra Partners
                    </button>
                </div>

                {bannerMode === 'upload' ? (
                    <ImageUploader
                        value={data.bannerUrl}
                        onChange={(url) => updateData({ bannerUrl: url })}
                        aspectRatio="banner"
                        label="Tournament Card Banner"
                        helperText="This image will be displayed as the background of your tournament card and page header."
                        bucket="system.assets.website"
                        folder={`Tournament-card-banners/${organizerName}`}
                        customFileName={tournamentName}
                        useTimestamp={false}
                    />
                ) : (
                    <div className="space-y-3">
                        <ArtworkPicker
                            gameName={data.game || ''}
                            onSelect={setSelectedArtwork}
                            selectedUrl={selectedArtwork}
                        />
                        {selectedArtwork && (
                            <Button
                                type="button"
                                onClick={() => {
                                    updateData({ bannerUrl: selectedArtwork });
                                    setSelectedArtwork(null);
                                    setBannerMode('upload');
                                }}
                                className="bg-rose-500 hover:bg-rose-600 text-white"
                            >
                                USE SELECTED ARTWORK
                            </Button>
                        )}
                    </div>
                )}
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
                <div className="space-y-4">
                    <Label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        🏆 Prize Distribution
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label htmlFor="winnerPrize" className="text-xs text-gray-400">Winner %</Label>
                            <Input
                                id="winnerPrize"
                                placeholder="60%"
                                value={(() => {
                                    // Parse: "1st: 60% | 2nd: 30%" or "1st: 60%, 2nd: 30%"
                                    const match = (data.rewards || '').match(/1st:\s*(\d+)%/i);
                                    return match ? match[1] : '';
                                })()}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    const currentRunnerUpMatch = (data.rewards || '').match(/2nd:\s*(\d+)%/i);
                                    const runnerUpVal = currentRunnerUpMatch ? currentRunnerUpMatch[1] : '';

                                    const newRewards = val || runnerUpVal
                                        ? `1st: ${val || 0}% | 2nd: ${runnerUpVal || 0}%`
                                        : '';
                                    updateData({ rewards: newRewards });
                                }}
                                className="font-bold tracking-tight bg-black/20 border-gold-500/30 focus:border-gold-500"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="runnerUpPrize" className="text-xs text-gray-400">Runner-up %</Label>
                            <Input
                                id="runnerUpPrize"
                                placeholder="30%"
                                value={(() => {
                                    const match = (data.rewards || '').match(/2nd:\s*(\d+)%/i);
                                    return match ? match[1] : '';
                                })()}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9]/g, '');
                                    const currentWinnerMatch = (data.rewards || '').match(/1st:\s*(\d+)%/i);
                                    const winnerVal = currentWinnerMatch ? currentWinnerMatch[1] : '';

                                    const newRewards = winnerVal || val
                                        ? `1st: ${winnerVal || 0}% | 2nd: ${val || 0}%`
                                        : '';
                                    updateData({ rewards: newRewards });
                                }}
                                className="font-bold tracking-tight bg-black/20 border-silver-500/30 focus:border-silver-500"
                            />
                        </div>
                    </div>
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

            {/* Payment Instructions — only shown for paid tournaments */}
            {data.entryFee && data.entryFee.toLowerCase() !== 'free' && data.entryFee !== '0' && (
                <div className="space-y-2 mt-4">
                    <Label htmlFor="paymentInstructions" className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                        <DollarSign className="w-4 h-4" />
                        Payment Instructions
                    </Label>
                    <textarea
                        id="paymentInstructions"
                        rows={4}
                        placeholder="How should participants pay? E.g.:\nBank: ABC Bank, Account# 1234567890, IBAN: PK00...\nJazzCash/EasyPaisa: 0300-1234567\nAfter payment, upload receipt screenshot during registration."
                        value={data.paymentInstructions}
                        onChange={(e) => updateData({ paymentInstructions: e.target.value })}
                        className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-rose-500/50"
                    />
                    <p className="text-xs text-gray-500">Players will see these instructions when registering and be asked to upload a payment receipt</p>
                </div>
            )}

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
