import React, { useState, useEffect } from 'react';
import { User, Shield, Save, Loader2, Mail } from 'lucide-react';
import { usePartnerData } from '@/hooks/usePartnerData';
import { usePartnerMutations } from '@/hooks/usePartnerMutations';
import { supabase } from '@/lib/supabase';

const Account = () => {
    const { data } = usePartnerData();
    const sponsor = data?.sponsor;
    const { updateProfile } = usePartnerMutations(sponsor?.id || '');

    const [formData, setFormData] = useState({ name: '', website_url: '' });
    const [userEmail, setUserEmail] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (sponsor) {
            setFormData({ name: sponsor.name, website_url: sponsor.website_url });
        }
    }, [sponsor]);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user?.email) setUserEmail(data.user.email);
        });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateProfile.mutateAsync(formData);
        } catch {
            // mutation hook shows toast
        } finally {
            setIsSaving(false);
        }
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut({ scope: 'local' });
        for (const key of Object.keys(localStorage)) {
            if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
                localStorage.removeItem(key);
            }
        }
        window.location.href = '/login';
    };

    return (
        <div className="space-y-8">
            <div className="border-l-2 border-rose-500 pl-6">
                <h2 className="text-3xl font-black font-heading tracking-tighter mb-2">ACCOUNT_SETTINGS</h2>
                <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">Identity & Security</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Profile Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="p-8 rounded-2xl bg-[#0a0a0c] border border-white/5 space-y-6">
                        <h3 className="text-lg font-bold flex items-center gap-3 mb-6">
                            <User className="w-5 h-5 text-rose-500" />
                            COMPANY_IDENTITY
                        </h3>

                        {/* Contact Email (read-only) */}
                        <div className="space-y-2">
                            <label className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Contact Email</label>
                            <div className="flex items-center gap-3 w-full bg-zinc-950/50 border border-zinc-800/50 rounded-lg px-4 py-3 text-zinc-400">
                                <Mail className="w-4 h-4 text-zinc-600" />
                                <span className="text-sm">{userEmail || '—'}</span>
                            </div>
                        </div>

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

                        <div className="pt-6 border-t border-white/5 flex justify-end">
                            <button
                                type="submit"
                                disabled={isSaving}
                                className="px-6 py-2 bg-rose-500 hover:bg-rose-600 text-white text-sm font-bold rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Partnership Tier */}
                    {sponsor && (
                        <div className="p-8 rounded-2xl bg-[#0a0a0c] border border-white/5 space-y-4">
                            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Partnership Tier</h3>
                            <div className="text-2xl font-black text-white uppercase tracking-tight">
                                {sponsor.tier === 'radiant' && <span className="text-amber-500">Radiant</span>}
                                {sponsor.tier === 'ascendant' && <span className="text-emerald-500">Ascendant</span>}
                                {sponsor.tier === 'diamond' && <span className="text-blue-400">Diamond</span>}
                                {sponsor.tier === 'standard' && <span className="text-zinc-400">Standard</span>}
                            </div>
                            <p className="text-[10px] font-mono text-zinc-600">TIER_MANAGED_BY_ADMIN</p>
                        </div>
                    )}

                    {/* Security */}
                    <div className="p-8 rounded-2xl bg-[#0a0a0c] border border-white/5 space-y-4">
                        <h3 className="text-lg font-bold flex items-center gap-3">
                            <Shield className="w-5 h-5 text-zinc-500" />
                            SECURITY
                        </h3>
                        <button
                            onClick={handleSignOut}
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
