import React, { useState, useEffect } from 'react';
import { User, Shield, Save, Loader2 } from 'lucide-react';
import { usePartnerData } from '@/hooks/usePartnerData';
import { usePartnerMutations } from '@/hooks/usePartnerMutations';

import { supabase } from '@/lib/supabase';

const Account = () => {
    const { data } = usePartnerData();
    const sponsor = data?.sponsor;

    const { updateProfile } = usePartnerMutations(sponsor?.id || '');

    const [formData, setFormData] = useState({
        name: '',
        website_url: '',
        cta_text: '',
        tagline: '',
        description: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (sponsor) {
            setFormData({
                name: sponsor.name,
                website_url: sponsor.website_url,
                cta_text: sponsor.cta_text || '',
                tagline: sponsor.tagline || '',
                description: sponsor.description || ''
            });
        }
    }, [sponsor]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateProfile.mutateAsync(formData);
        } catch {
            // mutation hook already shows a toast
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="border-l-2 border-rose-500 pl-6">
                <h2 className="text-3xl font-black font-heading tracking-tighter mb-2">ACCOUNT_SETTINGS</h2>
                <div className="flex items-center gap-3">
                    <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">Configuration & Security</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Main Profile Form */}
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-[#0a0a0c] border border-white/5 space-y-6">
                        <h3 className="text-lg font-bold flex items-center gap-3 mb-6">
                            <User className="w-5 h-5 text-rose-500" />
                            PROFILE_DATA
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Company Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Website URL</label>
                                <input
                                    type="url"
                                    value={formData.website_url}
                                    onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Tagline</label>
                                <input
                                    type="text"
                                    value={formData.tagline}
                                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Call to Action</label>
                                <input
                                    type="text"
                                    value={formData.cta_text}
                                    onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Public Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={4}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-white focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors outline-none resize-none"
                            />
                        </div>

                        <div className="pt-6 border-t border-white/5 flex justify-end">
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
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Subscription Status Removed */}\n

                    {/* Security */}
                    <div className="p-8 rounded-2xl bg-[#0a0a0c] border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-3">
                            <Shield className="w-5 h-5 text-zinc-500" />
                            SECURITY
                        </h3>
                        <button
                            onClick={() => supabase.auth.signOut()}
                            className="w-full py-3 bg-zinc-900 text-white border border-zinc-800 hover:bg-zinc-800 font-bold rounded-xl transition-colors text-sm"
                        >
                            Sign Out of Session
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Account;
