import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, MousePointer2, Loader2, Calendar, ArrowUpRight, Settings } from 'lucide-react';
import { usePartnerData } from '@/hooks/usePartnerData';
import { supabase } from '@/lib/supabase';
import EditProfileModal from '@/components/EditProfileModal';

const Dashboard = () => {
    const { data, isLoading, error } = usePartnerData();
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    if (isLoading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4 text-zinc-500">
                <Loader2 className="w-10 h-10 animate-spin text-rose-500" />
                <p className="font-mono text-xs tracking-widest uppercase animate-pulse">Synchronizing_Data...</p>
            </div>
        );
    }

    if (error || !data) {
        const errorMsg = (error as Error)?.message || 'SYNC_FAILURE';
        const isAuthError = errorMsg.includes('Not authenticated') || errorMsg.includes('Unauthorized');

        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-6 text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-2">
                    <TrendingUp className="w-8 h-8 text-rose-500" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white mb-2">{isAuthError ? 'AUTHENTICATION_REQUIRED' : 'ACCESS_DENIED or SYNC_FAILURE'}</h3>
                    <p className="text-zinc-500 max-w-md mx-auto mb-6">
                        {isAuthError
                            ? 'Your session has expired or is invalid. Please log in again to access the terminal.'
                            : "We could not retrieve your partner profile. This usually means your account hasn't been linked to a sponsor yet."}
                    </p>
                    <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-lg text-xs font-mono text-rose-400 mb-8 max-w-sm mx-auto">
                        ERROR_CODE: {isAuthError ? 'SESSION_INVALID' : (errorMsg === 'NO_SPONSOR_LINKED' ? 'NO_SPONSOR_LINKED' : 'DATA_FETCH_ERROR')}<br />
                        DETAILS: {errorMsg}
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-white text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors mr-4"
                    >
                        RETRY_CONNECTION
                    </button>
                    <button
                        onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
                        className="px-6 py-2 bg-zinc-900 border border-zinc-800 text-white font-bold rounded-lg hover:bg-zinc-800 transition-colors"
                    >
                        {isAuthError ? 'GO_TO_LOGIN' : 'SYSTEM_LOGOUT'}
                    </button>
                </div>
            </div>
        );
    }

    const { sponsor, stats } = data;

    const cards = [
        { label: 'TOTAL_IMPRESSIONS', value: stats.impressions.toLocaleString(), icon: TrendingUp, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        { label: 'TOTAL_CLICKS', value: stats.clicks.toLocaleString(), icon: MousePointer2, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: 'CLICK_THROUGH_RATE', value: `${stats.ctr.toFixed(2)}%`, icon: BarChart3, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    ];

    // Harden tier mapping for legacy support
    const rawTier = (sponsor?.tier || 'diamond').toLowerCase();
    const isRadiant = rawTier === 'radiant' || rawTier === 'platinum';
    const isAscendant = rawTier === 'ascendant' || rawTier === 'gold';
    const isDiamond = rawTier === 'diamond' || rawTier === 'standard' || rawTier === 'bronze';

    // Normalized tier name for display
    const displayTier = isRadiant ? 'Radiant' : isAscendant ? 'Ascendant' : 'Diamond';

    return (
        <div className="space-y-12 pb-20">
            {/* Header / Hero */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-l-2 border-rose-500 pl-8">
                <div>
                    <h2 className="text-4xl md:text-5xl font-black font-heading tracking-tighter mb-2">
                        SYSTEM_OVERVIEW
                    </h2>
                    <p className="text-zinc-500 font-mono text-sm uppercase tracking-widest">
                        Protocol_Status: <span className="text-emerald-500">Active</span> // Node: {sponsor?.name}
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsEditModalOpen(true)}
                        className="px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-rose-500/50 hover:bg-zinc-800 transition-all flex items-center gap-2 text-xs font-mono uppercase tracking-wider"
                    >
                        <Settings className="w-4 h-4" />
                        Edit_Profile
                    </button>
                    <div className={`px-4 py-2 border rounded-lg flex items-center gap-3 ${isRadiant ? 'bg-amber-500/10 border-amber-500/20' :
                        isAscendant ? 'bg-emerald-500/10 border-emerald-500/20' :
                            'bg-pink-500/10 border-pink-500/20'
                        }`}>
                        <div className={`w-2 h-2 rounded-full animate-ping ${isRadiant ? 'bg-amber-500' :
                            isAscendant ? 'bg-emerald-500' :
                                'bg-pink-500'
                            }`} />
                        <span className={`text-xs font-mono uppercase tracking-widest font-bold ${isRadiant ? 'text-amber-500' :
                            isAscendant ? 'text-emerald-500' :
                                'text-pink-500'
                            }`}>
                            {displayTier}_access
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Grid - Hidden for Diamond if they have zero access, but let's show them as 0/N/A or a small prompt */}
            {!isDiamond ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {cards.map((card, i) => (
                        <motion.div
                            key={card.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="group relative p-8 rounded-2xl bg-[#0a0a0c] border border-zinc-900 hover:border-rose-500/30 transition-all duration-500 overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 transition-opacity">
                                <card.icon className={`w-24 h-24 ${card.color}`} />
                            </div>

                            <div className={`mb-6 p-3 rounded-xl w-fit ${card.bg} transition-transform group-hover:scale-110 duration-500`}>
                                <card.icon className={`w-6 h-6 ${card.color}`} />
                            </div>

                            <p className="text-[10px] font-mono text-zinc-500 tracking-[0.2em] mb-2">{card.label}</p>
                            <h3 className="text-4xl font-black font-heading tracking-tighter text-white tabular-nums">
                                {card.value}
                            </h3>

                            <div className="mt-6 flex items-center gap-2 text-[10px] font-mono text-emerald-500 tracking-wider">
                                <ArrowUpRight className="w-3 h-3" />
                                LIVE_REALTIME_SYNC
                            </div>
                        </motion.div>
                    ))}
                </div>
            ) : (
                <div className="p-12 rounded-2xl bg-[#0a0a0c] border border-pink-500/10 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="p-4 rounded-3xl bg-pink-500/5 border border-pink-500/10">
                        <TrendingUp className="w-10 h-10 text-pink-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">DIAMOND_ELEVATION_ACTIVE</h3>
                        <p className="text-zinc-500 text-sm font-mono max-w-md">
                            Your brand is currently active in our global partner ticker. Impression tracking is available in Ascendant & Radiant tiers.
                        </p>
                    </div>
                </div>
            )}

            {/* Campaign Config */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
                <div className="space-y-6">
                    <div className="p-8 rounded-2xl bg-[#0a0a0c] border border-white/5 flex flex-col h-full">
                        <h3 className="text-lg font-bold mb-8 flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-rose-500" />
                            CAMPAIGN_INFO
                        </h3>

                        <div className="space-y-8 flex-1">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-mono text-zinc-500 tracking-[0.2em] uppercase">Initialize_Date</label>
                                <div className="text-white font-bold font-heading tracking-tight">
                                    {sponsor?.created_at ? new Date(sponsor.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase() : 'N/A'}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-mono text-zinc-500 tracking-[0.2em] uppercase">Target_Buffer</label>
                                <div className="text-rose-400 font-mono text-sm underline underline-offset-4 truncate block">
                                    {sponsor?.website_url}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-mono text-zinc-500 tracking-[0.2em] uppercase">Call_to_Action</label>
                                <div className="text-white font-bold font-heading tracking-tight uppercase">
                                    {sponsor?.cta_text || 'INITIATE_LINK'}
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5 text-[10px] font-mono text-zinc-600 leading-relaxed uppercase tracking-widest">
                            System_Verified // 256-Bit_Encryption <br />
                            Data_Integrity: 100%
                        </div>
                    </div>
                </div>
            </div>

            <EditProfileModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                sponsor={sponsor}
            />
        </div>
    );
};

export default Dashboard;
