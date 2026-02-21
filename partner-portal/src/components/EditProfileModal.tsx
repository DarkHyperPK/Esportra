import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, Link as LinkIcon, FileText, Upload, Image as ImageIcon } from 'lucide-react';
import { usePartnerMutations } from '@/hooks/usePartnerMutations';
import { supabase } from '@/lib/supabase';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    sponsor: {
        id: string;
        name: string;
        website_url: string;
        tagline?: string | null;
        description?: string | null;
        logo_url?: string | null;
        banner_image_url?: string | null;
        cta_text?: string | null;
    };
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, onClose, sponsor }) => {
    const { updateProfile } = usePartnerMutations(sponsor.id);
    const [formData, setFormData] = useState({
        website_url: sponsor.website_url,
        tagline: sponsor.tagline || '',
        description: sponsor.description || '',
        logo_url: sponsor.logo_url || '',
        banner_image_url: sponsor.banner_image_url || '',
        cta_text: sponsor.cta_text || ''
    });

    const [isSaving, setIsSaving] = useState(false);
    const [uploadingField, setUploadingField] = useState<'logo' | 'banner' | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logo' | 'banner') => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingField(field);

            // Generate unique filename to avoid cache issues
            const ext = file.name.split('.').pop();
            const fileName = `${sponsor.id}/${field}-${Date.now()}.${ext}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('system.assets.partners')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Get public URL
            const { data } = supabase.storage
                .from('system.assets.partners')
                .getPublicUrl(fileName);

            const newUrl = data.publicUrl;

            // Update form data state
            setFormData(prev => ({
                ...prev,
                [field === 'logo' ? 'logo_url' : 'banner_image_url']: newUrl
            }));

        } catch (error) {
            console.error(`Error uploading ${field}:`, error);
        } finally {
            setUploadingField(null);
            // Clear input so same file can be selected again
            e.target.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateProfile.mutateAsync(formData);
            onClose();
        } catch (error) {
            console.error('Failed to update profile:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />

                    {/* Modal Wrapper — Flexbox centering avoids CSS transform conflicts with Framer Motion */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-[#0a0a0c] border border-zinc-800 rounded-2xl shadow-2xl pointer-events-auto"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-zinc-900/50">
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-rose-500" />
                                    Edit Profile
                                </h3>
                                <button
                                    onClick={onClose}
                                    className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2 block">Company Tagline</label>
                                        <input
                                            type="text"
                                            value={formData.tagline}
                                            onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors outline-none"
                                            placeholder="e.g. Powering the future of esports"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2 block">Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={4}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors outline-none resize-none"
                                            placeholder="Tell the community about your brand..."
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2 block flex items-center gap-2">
                                                <LinkIcon className="w-3 h-3" /> Website URL
                                            </label>
                                            <input
                                                type="url"
                                                value={formData.website_url}
                                                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-2 block">Call to Action</label>
                                            <input
                                                type="text"
                                                value={formData.cta_text}
                                                onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors outline-none"
                                                placeholder="e.g. SHOP NOW"
                                            />
                                        </div>
                                    </div>


                                </div>

                                {/* New Assets Section (File Uploaders) */}
                                <div className="space-y-4 pt-4 border-t border-white/5">
                                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-rose-500" />
                                        Assets
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Logo Upload */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest block">Logo</label>
                                            <div className="flex gap-4 items-start">
                                                {/* Preview Box */}
                                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center flex-shrink-0">
                                                    {formData.logo_url ? (
                                                        <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                                    ) : (
                                                        <ImageIcon className="w-6 h-6 text-zinc-700" />
                                                    )}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        id="logo-upload"
                                                        className="hidden"
                                                        onChange={(e) => handleFileUpload(e, 'logo')}
                                                        disabled={uploadingField === 'logo'}
                                                    />
                                                    <label
                                                        htmlFor="logo-upload"
                                                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-lg text-sm text-white transition-colors cursor-pointer ${uploadingField === 'logo' ? 'opacity-50 pointer-events-none' : ''}`}
                                                    >
                                                        {uploadingField === 'logo' ? (
                                                            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                                                        ) : (
                                                            <><Upload className="w-4 h-4 text-rose-500" /> Upload New Logo</>
                                                        )}
                                                    </label>
                                                    <p className="text-[10px] text-zinc-500 font-mono">Square image (1:1), transparent PNG recommended.</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Banner Upload */}
                                        <div className="space-y-2">
                                            <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest block">Banner / Ad Creative</label>
                                            <div className="flex flex-col gap-3">
                                                {/* Preview Box */}
                                                <div className="w-full h-24 rounded-lg overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center">
                                                    {formData.banner_image_url ? (
                                                        <img src={formData.banner_image_url} alt="Banner" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <ImageIcon className="w-8 h-8 text-zinc-700" />
                                                    )}
                                                </div>
                                                <div>
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        id="banner-upload"
                                                        className="hidden"
                                                        onChange={(e) => handleFileUpload(e, 'banner')}
                                                        disabled={uploadingField === 'banner'}
                                                    />
                                                    <label
                                                        htmlFor="banner-upload"
                                                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-lg text-sm text-white transition-colors cursor-pointer ${uploadingField === 'banner' ? 'opacity-50 pointer-events-none' : ''}`}
                                                    >
                                                        {uploadingField === 'banner' ? (
                                                            <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                                                        ) : (
                                                            <><Upload className="w-4 h-4 text-rose-500" /> Upload New Banner</>
                                                        )}
                                                    </label>
                                                    <p className="text-[10px] text-zinc-500 font-mono mt-2">16:9 ratio recommended for dashboard placements.</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-end gap-3 pt-6 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving || uploadingField !== null}
                                        className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSaving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4" />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default EditProfileModal;
