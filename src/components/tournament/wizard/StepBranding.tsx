import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { motion } from 'framer-motion';
import { FileText, Link as LinkIcon, MessageCircle, Twitter } from 'lucide-react';
import { WizardStepProps } from '@/types/tournamentWizard';
import ImageUploader from './ImageUploader';
import ArtworkPicker from '@/components/tournament/ArtworkPicker';
import RichTextEditor from '@/components/ui/RichTextEditor';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const StepBranding: React.FC<WizardStepProps> = ({ data, updateData, errors }) => {
    const { profile } = useAuth();
    const [bannerMode, setBannerMode] = useState<'upload' | 'artwork'>('upload');

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
                    <ArtworkPicker
                        gameName={data.game || ''}
                        onSelect={(url) => {
                            updateData({ bannerUrl: url });
                            setBannerMode('upload');
                        }}
                        uploadConfig={{
                            bucket: 'system.assets.website',
                            folder: `Tournament-card-banners/${organizerName}`,
                        }}
                    />
                )}
            </div>

            {/* Description */}
            <div className="w-full h-px bg-white/5 my-6" />
            <div className="space-y-2">
                <Label htmlFor="description" className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                    <FileText className="w-4 h-4" />
                    Tournament Description *
                </Label>
                <RichTextEditor
                    content={data.description || ''}
                    onChange={(content) => updateData({ description: content })}
                    className={errors.description ? 'border-red-500' : ''}
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
