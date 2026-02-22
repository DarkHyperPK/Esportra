import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Loader2, Link as LinkIcon, FileText } from 'lucide-react';
import { usePartnerMutations } from '@/hooks/usePartnerMutations';

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
        cta_text: sponsor.cta_text || ''
    });

    const [isSaving, setIsSaving] = useState(false);

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
                                        disabled={isSaving}
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
