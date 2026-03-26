import { useState } from 'react';
import { Search, Trophy, ChevronRight, Megaphone, Loader2, Globe, Star, Radio, Plus, Eye, BarChart3, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAdminSponsors, useAdminSponsorUpdate } from '@/hooks/useAdminQueries';
import { useSponsorStats, type Sponsor } from '@/hooks/useSponsors';
import { useTournamentSponsors } from '@/hooks/useTournamentSponsors';
import { useAdminTournaments } from '@/hooks/useAdminQueries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const TIER_COLORS: Record<string, string> = {
    radiant: 'bg-amber-900/50 text-amber-300 border-amber-500/30',
    ascendant: 'bg-emerald-900/50 text-emerald-300 border-emerald-500/30',
    diamond: 'bg-cyan-900/50 text-cyan-300 border-cyan-500/30',
    standard: 'bg-zinc-800 text-zinc-300 border-zinc-600/30',
};

// Global placements — sponsor-level, shown across the whole site
const GLOBAL_ZONES = [
    { key: 'homepage_banner', label: 'Homepage Banner', desc: 'Banner ad on the homepage' },
    { key: 'browse_sidebar', label: 'Browse Sidebar', desc: 'Sidebar ad on tournament browse page' },
    { key: 'global_ticker', label: 'Global Ticker', desc: 'Logo marquee in the site footer' },
] as const;

// Tournament placements — only when linked to a specific tournament
const TOURNAMENT_ZONES = [
    { key: 'header', label: 'Tournament Header', desc: 'Hero banner co-branding' },
    { key: 'sidebar', label: 'Tournament Sidebar', desc: 'Right sidebar featured block' },
    { key: 'ticker', label: 'Tournament Ticker', desc: 'Scrolling logo marquee' },
    { key: 'card_badge', label: 'Tournament Card', desc: 'Badge on listing cards' },
] as const;

const TIERS = ['standard', 'diamond', 'ascendant', 'radiant'] as const;

const SPONSOR_TYPES = [
    { key: 'title_sponsor', label: 'Title Sponsor', icon: Star, color: 'text-amber-500' },
    { key: 'event_sponsor', label: 'Event Sponsor', icon: Megaphone, color: 'text-blue-400' },
    { key: 'media_sponsor', label: 'Media Sponsor', icon: Radio, color: 'text-emerald-400' },
] as const;

/** Sub-view: link sponsor to tournament */
const LinkToTournament = ({ sponsor, onBack }: { sponsor: Sponsor; onBack: () => void }) => {
    const { data: tournaments, isLoading: loadingT } = useAdminTournaments();
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [sponsorType, setSponsorType] = useState<string>('event_sponsor');
    const [zones, setZones] = useState<string[]>(['ticker']);
    const [priority, setPriority] = useState(5);
    const { toast } = useToast();

    const selected = tournaments?.find((t: any) => t.id === selectedId);
    const { assign } = useTournamentSponsors(selectedId || '');

    const filtered = (tournaments ?? []).filter((t: any) =>
        (t.name || t.title || '').toLowerCase().includes(search.toLowerCase())
    );

    const toggleZone = (z: string) => setZones(prev => prev.includes(z) ? prev.filter(x => x !== z) : [...prev, z]);

    const handleAssign = () => {
        if (!selectedId || zones.length === 0) return;
        assign.mutate(
            { sponsor_id: sponsor.id, sponsor_type: sponsorType, placement_zones: zones, priority },
            { onSuccess: () => { toast({ title: `${sponsor.name} linked to ${selected?.name || selected?.title}` }); onBack(); } }
        );
    };

    return (
        <div className="space-y-4">
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back
            </button>
            <h3 className="text-lg font-bold text-white">Link {sponsor.name} to Tournament</h3>

            {!selectedId ? (
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tournaments..."
                            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600" />
                    </div>
                    {loadingT && <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 text-zinc-500 animate-spin" /></div>}
                    <div className="grid gap-2 max-h-[350px] overflow-y-auto">
                        {filtered.map((t: any) => (
                            <button key={t.id} onClick={() => setSelectedId(t.id)}
                                className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-xl hover:border-zinc-700 transition-all text-left">
                                <Trophy className="w-4 h-4 text-zinc-500" />
                                <span className="text-sm text-white truncate flex-1">{t.name || t.title}</span>
                                <ChevronRight className="w-4 h-4 text-zinc-600" />
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-700 rounded-xl">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <span className="text-sm font-semibold text-white flex-1">{selected?.name || selected?.title}</span>
                        <button onClick={() => setSelectedId(null)} className="text-xs text-zinc-500 hover:text-white">Change</button>
                    </div>

                    <div>
                        <label className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-2 block">Sponsor Type</label>
                        <div className="grid grid-cols-3 gap-2">
                            {SPONSOR_TYPES.map(st => {
                                const Icon = st.icon;
                                return (
                                    <button key={st.key} onClick={() => setSponsorType(st.key)}
                                        className={`p-3 rounded-xl border text-center transition-all ${sponsorType === st.key ? 'border-rose-500/50 bg-rose-500/10' : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'}`}>
                                        <Icon className={`w-5 h-5 mx-auto mb-1 ${st.color}`} />
                                        <p className="text-[11px] font-bold text-white">{st.label}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-2 block">Placement Zones</label>
                        <div className="flex flex-wrap gap-2">
                            {TOURNAMENT_ZONES.map(z => (
                                <button key={z.key} onClick={() => toggleZone(z.key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${zones.includes(z.key) ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'}`}>
                                    {z.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-2 block">Priority (1-10)</label>
                        <input type="range" min={1} max={10} value={priority} onChange={e => setPriority(Number(e.target.value))} className="w-full accent-rose-500" />
                        <div className="flex justify-between text-[10px] text-zinc-500 mt-1"><span>Low</span><span className="text-white font-bold">{priority}</span><span>High</span></div>
                    </div>

                    <Button onClick={handleAssign} disabled={zones.length === 0 || assign.isPending} className="w-full bg-rose-600 hover:bg-rose-700 text-white">
                        {assign.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        Link to Tournament
                    </Button>
                </div>
            )}
        </div>
    );
};

/** Sponsor detail: zones, priority, stats, link to tournament */
const SponsorDetail = ({ sponsor, onBack, onRefresh }: { sponsor: Sponsor; onBack: () => void; onRefresh: () => void }) => {
    const { data: stats, isLoading: loadingStats } = useSponsorStats(sponsor.id);
    const updateSponsor = useAdminSponsorUpdate();
    const { toast } = useToast();
    const [view, setView] = useState<'main' | 'link'>('main');

    const currentZones = sponsor.placement || [];

    const toggleZone = (zone: string) => {
        const newZones = currentZones.includes(zone)
            ? currentZones.filter(z => z !== zone)
            : [...currentZones, zone];
        updateSponsor.mutate(
            { id: sponsor.id, updates: { placement: newZones } },
            { onSuccess: () => { toast({ title: `Placement updated` }); onRefresh(); } }
        );
    };

    const toggleActive = () => {
        updateSponsor.mutate(
            { id: sponsor.id, updates: { is_active: !sponsor.is_active } },
            { onSuccess: () => { toast({ title: sponsor.is_active ? 'Sponsor deactivated' : 'Sponsor activated' }); onRefresh(); } }
        );
    };

    const updatePriority = (p: number) => {
        updateSponsor.mutate(
            { id: sponsor.id, updates: { priority: p } },
            { onSuccess: () => { toast({ title: `Priority set to ${p}` }); onRefresh(); } }
        );
    };

    const updateTier = (tier: string) => {
        updateSponsor.mutate(
            { id: sponsor.id, updates: { tier } },
            { onSuccess: () => { toast({ title: `Tier changed to ${tier}` }); onRefresh(); } }
        );
    };

    if (view === 'link') {
        return <LinkToTournament sponsor={sponsor} onBack={() => setView('main')} />;
    }

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to sponsors
            </button>

            {/* Sponsor header */}
            <div className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800/60 rounded-2xl">
                {sponsor.logo_url && sponsor.logo_url.startsWith('http') ? (
                    <img src={sponsor.logo_url} alt={sponsor.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                ) : (
                    <div className="w-14 h-14 rounded-xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <Megaphone className="w-6 h-6 text-zinc-500" />
                    </div>
                )}
                <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-white">{sponsor.name}</h3>
                    <p className="text-sm text-zinc-400 truncate">{sponsor.tagline || sponsor.website_url}</p>
                </div>
                <button
                    onClick={toggleActive}
                    disabled={updateSponsor.isPending}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        sponsor.is_active
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                    }`}
                >
                    {sponsor.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                    {sponsor.is_active ? 'Active' : 'Inactive'}
                </button>
            </div>

            {/* Stats */}
            <div>
                <h4 className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-3 flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5" /> Performance
                </h4>
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-xl text-center">
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">Impressions</p>
                        <p className="text-xl font-bold text-white">{loadingStats ? '...' : (stats?.impressions ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-xl text-center">
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">Clicks</p>
                        <p className="text-xl font-bold text-white">{loadingStats ? '...' : (stats?.clicks ?? 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-xl text-center">
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">CTR</p>
                        <p className="text-xl font-bold text-white">{loadingStats ? '...' : (stats?.ctr ?? '0%')}</p>
                    </div>
                </div>
            </div>

            {/* Global Placement Zones */}
            <div>
                <h4 className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-1">Global Placements</h4>
                <p className="text-[11px] text-zinc-600 mb-3">These show across the whole site — no tournament link needed</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {GLOBAL_ZONES.map(zone => {
                        const active = currentZones.includes(zone.key);
                        return (
                            <button
                                key={zone.key}
                                onClick={() => toggleZone(zone.key)}
                                disabled={updateSponsor.isPending}
                                className={`p-3 rounded-xl border transition-all text-left ${
                                    active
                                        ? 'bg-rose-500/10 border-rose-500/40 hover:bg-rose-500/20'
                                        : 'bg-zinc-900/50 border-zinc-800/60 hover:border-zinc-700'
                                }`}
                            >
                                <p className={`text-xs font-bold ${active ? 'text-rose-300' : 'text-zinc-400'}`}>{zone.label}</p>
                                <p className="text-[10px] text-zinc-600 mt-0.5">{zone.desc}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tier + Priority */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <h4 className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-3">Tier</h4>
                    <div className="grid grid-cols-2 gap-2">
                        {TIERS.map(t => (
                            <button
                                key={t}
                                onClick={() => updateTier(t)}
                                disabled={updateSponsor.isPending}
                                className={`px-3 py-2 rounded-lg text-xs font-bold capitalize transition-all border ${
                                    sponsor.tier === t
                                        ? `${TIER_COLORS[t]}`
                                        : 'bg-zinc-900/50 text-zinc-500 border-zinc-800 hover:border-zinc-700'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <h4 className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-3">Priority</h4>
                    <input
                        type="range"
                        min={1}
                        max={10}
                        value={sponsor.priority}
                        onChange={e => updatePriority(Number(e.target.value))}
                        className="w-full accent-rose-500"
                    />
                    <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                        <span>Low (1)</span>
                        <span className="text-white font-bold">{sponsor.priority}</span>
                        <span>High (10)</span>
                    </div>
                </div>
            </div>

            {/* Tournament-Specific Placements */}
            <div className="pt-2 border-t border-zinc-800/60">
                <h4 className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-1">Tournament Placements</h4>
                <p className="text-[11px] text-zinc-600 mb-3">Link this sponsor to a tournament to enable tournament-specific ad zones</p>
                <button
                    onClick={() => setView('link')}
                    className="flex items-center gap-3 p-4 w-full bg-zinc-900/50 border border-zinc-800/60 rounded-xl hover:border-rose-500/40 hover:bg-rose-500/5 transition-all text-left group"
                >
                    <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">Link to Tournament</p>
                        <p className="text-[11px] text-zinc-500">Assign this sponsor to a specific tournament</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors ml-auto" />
                </button>
            </div>
        </div>
    );
};

/** Main dashboard: sponsor list */
const AdPlacementDashboard = () => {
    const { data: sponsors, isLoading, error, refetch } = useAdminSponsors();
    const [search, setSearch] = useState('');
    const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);

    const filtered = (sponsors ?? []).filter((s: any) =>
        (s.name || '').toLowerCase().includes(search.toLowerCase())
    );

    // When returning from detail, re-select updated data
    const handleRefresh = () => {
        refetch().then(res => {
            if (selectedSponsor && res.data) {
                const updated = res.data.find((s: any) => s.id === selectedSponsor.id);
                if (updated) setSelectedSponsor(updated);
            }
        });
    };

    if (selectedSponsor) {
        return <SponsorDetail sponsor={selectedSponsor} onBack={() => setSelectedSponsor(null)} onRefresh={handleRefresh} />;
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Megaphone className="w-6 h-6 text-rose-400" />
                    Ad Placement Manager
                </h2>
                <p className="text-zinc-400 mt-1">Select a sponsor to manage their placements, priority, and stats</p>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sponsors..."
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600" />
            </div>

            {isLoading && <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-zinc-500 animate-spin" /></div>}
            {error && <div className="text-center py-12"><p className="text-red-400 mb-2">Failed to load sponsors</p><p className="text-zinc-500 text-sm">{(error as Error).message}</p></div>}

            {!isLoading && !error && filtered.length === 0 && (
                <div className="text-center py-12">
                    <Megaphone className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400">{search ? 'No sponsors match your search' : 'No sponsors found'}</p>
                    <p className="text-zinc-600 text-sm mt-1">Add sponsors via Sponsor CRM first</p>
                </div>
            )}

            {!isLoading && !error && filtered.length > 0 && (
                <div className="grid gap-3">
                    {filtered.map((s: any) => (
                        <button key={s.id} onClick={() => setSelectedSponsor(s)}
                            className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800/60 rounded-xl hover:border-zinc-700 hover:bg-zinc-900 transition-all text-left group">
                            {s.logo_url && s.logo_url.startsWith('http') ? (
                                <img src={s.logo_url} alt={s.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                                <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0">
                                    <Megaphone className="w-5 h-5 text-zinc-500" />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                                <p className="text-xs text-zinc-500 mt-0.5 truncate">{s.tagline || s.website_url || 'No tagline'}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge className={`text-[10px] border ${TIER_COLORS[s.tier] || TIER_COLORS.standard}`}>{s.tier}</Badge>
                                <div className={`w-2 h-2 rounded-full ${s.is_active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdPlacementDashboard;
