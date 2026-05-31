import React from 'react';
import { motion } from 'framer-motion';
import { Monitor, DollarSign, Twitter, Instagram, Disc as Discord, Upload } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { VerificationWizardStepProps } from '@/types/verificationWizard';

const StepExperience: React.FC<VerificationWizardStepProps> = ({ data, updateData, errors, role }) => {
    const isVenue = role === 'venue_owner';

    // Helper to handle social updates
    const updateSocial = (key: 'twitter' | 'discord' | 'instagram', val: string) => {
        updateData({
            social_media_links: {
                ...data.social_media_links,
                [key]: val
            }
        });
    };

    // Helper for file inputs (Venue Photos)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'venueExterior' | 'venueInterior' | 'gamingArea') => {
        const file = e.target.files?.[0] || null;
        updateData({ [field]: file });
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
        >
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">
                    {isVenue ? 'Specs & Media' : 'Experience & Socials'}
                </h2>
                <p className="text-gray-400">
                    {isVenue ? 'Showcase your gaming hardware and facility' : 'Demonstrate your track record and community'}
                </p>
            </div>

            <div className="w-full h-px bg-white/5 my-6" />

            {/* ORGANIZER VIEW */}
            {!isVenue && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-gray-400">Years Active *</Label>
                        <Input
                            type="number"
                            min={0}
                            value={data.years_experience}
                            onChange={(e) => updateData({ years_experience: parseInt(e.target.value) || 0 })}
                            className={cn(errors.years_experience && "border-red-500", "bg-[#0a0a0c] border-white/10 text-white")}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-400">Expected Tournaments/Month *</Label>
                        <Input
                            type="number"
                            min={0}
                            value={data.expected_tournaments_per_month}
                            onChange={(e) => updateData({ expected_tournaments_per_month: parseInt(e.target.value) || 0 })}
                            className={cn(errors.expected_tournaments_per_month && "border-red-500", "bg-[#0a0a0c] border-white/10 text-white")}
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-gray-400">Previous Tournaments</Label>
                        <Textarea
                            value={data.previous_tournaments}
                            onChange={(e) => updateData({ previous_tournaments: e.target.value })}
                            className="bg-[#0a0a0c] border-white/10 text-white min-h-[80px]"
                            placeholder="List major events you have hosted..."
                        />
                    </div>

                    {/* Socials */}
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-gray-400 flex items-center gap-2"><Twitter className="w-4 h-4" /> Twitter</Label>
                            <Input
                                value={data.social_media_links.twitter}
                                onChange={(e) => updateSocial('twitter', e.target.value)}
                                className="bg-[#0a0a0c] border-white/10 text-white"
                                placeholder="@handle"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-400 flex items-center gap-2"><Discord className="w-4 h-4" /> Discord</Label>
                            <Input
                                value={data.social_media_links.discord}
                                onChange={(e) => updateSocial('discord', e.target.value)}
                                className="bg-[#0a0a0c] border-white/10 text-white"
                                placeholder="Invite Link"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-gray-400 flex items-center gap-2"><Instagram className="w-4 h-4" /> Instagram</Label>
                            <Input
                                value={data.social_media_links.instagram}
                                onChange={(e) => updateSocial('instagram', e.target.value)}
                                className="bg-[#0a0a0c] border-white/10 text-white"
                                placeholder="@handle"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* VENUE OWNER VIEW */}
            {isVenue && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label className="text-gray-400">Total PCs *</Label>
                        <div className="relative">
                            <Monitor className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <Input
                                type="number"
                                min={0}
                                value={data.total_pcs}
                                onChange={(e) => updateData({ total_pcs: parseInt(e.target.value) || 0 })}
                                className={cn(errors.total_pcs && "border-red-500", "pl-10 bg-[#0a0a0c] border-white/10 text-white")}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-gray-400">Hourly Rate (PKR) *</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                            <Input
                                type="number"
                                min={0}
                                value={data.hourly_rate}
                                onChange={(e) => updateData({ hourly_rate: parseInt(e.target.value) || 0 })}
                                className={cn(errors.hourly_rate && "border-red-500", "pl-10 bg-[#0a0a0c] border-white/10 text-white")}
                            />
                        </div>
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <Label className="text-gray-400">PC Specifications *</Label>
                        <Textarea
                            value={data.pc_specs}
                            onChange={(e) => updateData({ pc_specs: e.target.value })}
                            className={cn(errors.pc_specs && "border-red-500", "bg-[#0a0a0c] border-white/10 text-white min-h-[100px]")}
                            placeholder="CPU, GPU, RAM, Peripherals..."
                        />
                    </div>

                    {/* Venue Capabilities */}
                    <div className="flex items-center gap-6 md:col-span-2">
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="streaming_setup"
                                checked={data.streaming_setup}
                                onChange={(e) => updateData({ streaming_setup: e.target.checked })}
                                className="rounded border-white/10 bg-[#0a0a0c]"
                            />
                            <Label htmlFor="streaming_setup" className="text-gray-300 pointer-events-none">Streaming Setup</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="tournament_capability"
                                checked={data.tournament_capability}
                                onChange={(e) => updateData({ tournament_capability: e.target.checked })}
                                className="rounded border-white/10 bg-[#0a0a0c]"
                            />
                            <Label htmlFor="tournament_capability" className="text-gray-300 pointer-events-none">Tournament Capable</Label>
                        </div>
                    </div>

                    {/* Image Uploads */}
                    <div className="md:col-span-2 space-y-4 pt-4 border-t border-white/5">
                        <Label className="text-lg font-bold text-white">Venue Photos</Label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-gray-400 text-xs uppercase">Exterior *</Label>
                                <div className="border border-dashed border-white/20 rounded-lg p-4 text-center hover:bg-white/5 transition-colors relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'venueExterior')}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                                    <span className="text-xs text-gray-400 block truncate">
                                        {data.venueExterior ? data.venueExterior.name : 'Upload Photo'}
                                    </span>
                                </div>
                                {errors.venueExterior && <p className="text-xs text-red-500">Required</p>}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-400 text-xs uppercase">Interior *</Label>
                                <div className="border border-dashed border-white/20 rounded-lg p-4 text-center hover:bg-white/5 transition-colors relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'venueInterior')}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                                    <span className="text-xs text-gray-400 block truncate">
                                        {data.venueInterior ? data.venueInterior.name : 'Upload Photo'}
                                    </span>
                                </div>
                                {errors.venueInterior && <p className="text-xs text-red-500">Required</p>}
                            </div>
                            <div className="space-y-2">
                                <Label className="text-gray-400 text-xs uppercase">Gaming Area *</Label>
                                <div className="border border-dashed border-white/20 rounded-lg p-4 text-center hover:bg-white/5 transition-colors relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleFileChange(e, 'gamingArea')}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                    <Upload className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                                    <span className="text-xs text-gray-400 block truncate">
                                        {data.gamingArea ? data.gamingArea.name : 'Upload Photo'}
                                    </span>
                                </div>
                                {errors.gamingArea && <p className="text-xs text-red-500">Required</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
};

export default StepExperience;
