import { useState } from 'react';
import { Search, Trophy, ChevronRight, Megaphone, Loader2, Star, Radio, Plus, Eye, ToggleLeft, ToggleRight } from 'lucide-react';
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

/** Full-width live preview for a zone */
const ZonePreview = ({ zone, sponsor, assetUrl }: { zone: string; sponsor: Sponsor; assetUrl: string }) => {
    if (zone === 'homepage_banner') {
        return (
            <div className="rounded-xl overflow-hidden border border-zinc-700/50">
                <div className="bg-[#050505] border-b border-white/5 py-3 px-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Powered by</span>
                            <a className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all">
                                <img src={assetUrl} alt={sponsor.name} className="h-5 object-contain" />
                                <span className="text-xs font-semibold text-white">{sponsor.name}</span>
                            </a>
                        </div>
                        {sponsor.cta_text && (
                            <span className="text-[10px] text-rose-400 font-bold">{sponsor.cta_text} →</span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (zone === 'browse_sidebar') {
        return (
            <div className="rounded-xl overflow-hidden border border-zinc-700/50 max-w-[280px]">
                <div className="bg-[#080808] border border-white/5">
                    <div className="relative h-32 overflow-hidden">
                        <img src={assetUrl} alt={sponsor.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    </div>
                    <div className="p-4 -mt-6 relative z-10">
                        {sponsor.logo_url && (
                            <img src={sponsor.logo_url} alt="" className="h-8 object-contain mb-2" />
                        )}
                        <p className="text-xs font-bold text-white">{sponsor.name}</p>
                        {sponsor.tagline && <p className="text-[10px] text-zinc-500 mt-0.5">{sponsor.tagline}</p>}
                        {sponsor.cta_text && (
                            <span className="inline-block mt-2 text-[10px] text-rose-400 font-bold bg-rose-500/10 px-3 py-1 rounded-full">
                                {sponsor.cta_text} →
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (zone === 'global_ticker') {
        return (
            <div className="rounded-xl overflow-hidden border border-zinc-700/50">
                <div className="bg-[#050505]/95 backdrop-blur py-3 px-6">
                    <div className="flex items-center gap-10">
                        <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold flex-shrink-0">Our Partners</span>
                        <div className="flex items-center gap-10 overflow-hidden">
                            {[1, 2, 3, 4, 5].map(i => (
                                <img key={i} src={assetUrl} alt="" className="h-5 object-contain opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all flex-shrink-0" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

/** Single zone card with toggle, asset picker, and preview */
const ZoneCard = ({
    zone,
    active,
    sponsor,
    assets,
    availableAssets,
    isPending,
    previewOpen,
    onToggle,
    onSetAsset,
    onTogglePreview,
}: {
    zone: { key: string; label: string; desc: string };
    active: boolean;
    sponsor: Sponsor;
    assets: Record<string, string>;
    availableAssets: { label: string; url: string }[];
    isPending: boolean;
    previewOpen: boolean;
    onToggle: () => void;
    onSetAsset: (url: string | null) => void;
    onTogglePreview: () => void;
}) => {
    const currentAsset = assets[zone.key] ||
        (zone.key.includes('banner') || zone.key === 'browse_sidebar' ? sponsor.banner_image_url : sponsor.logo_url) || null;

    return (
        <div className={`rounded-2xl border transition-all ${active ? 'border-rose-500/30 bg-[#0d0a0b]' : 'border-zinc-800/50 bg-zinc-900/30'}`}>
            {/* Zone row */}
            <div className="flex items-center gap-4 p-4">
                <button
                    onClick={onToggle}
                    disabled={isPending}
                    aria-label={`Toggle ${zone.label}`}
                    className={`w-11 h-6 rounded-full relative transition-all flex-shrink-0 ${active ? 'bg-rose-500' : 'bg-zinc-700 hover:bg-zinc-600'}`}
                >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${active ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
                <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-zinc-500'}`}>{zone.label}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">{zone.desc}</p>
                </div>
                {active && currentAsset && (
                    <img src={currentAsset} alt="" className="w-10 h-10 rounded-xl object-cover flex-shrink-0 border border-zinc-700/50" />
                )}
                {active && (
                    <button
                        onClick={onTogglePreview}
                        aria-label={`Preview ${zone.label}`}
                        className={`p-2 rounded-xl transition-all ${previewOpen ? 'bg-rose-500/20 text-rose-300' : 'bg-zinc-800/60 text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Asset picker — always visible when zone is active */}
            {active && (
                <div className="px-4 pb-4 border-t border-zinc-800/30 pt-3">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-2">Choose Asset</p>
                    {availableAssets.length === 0 ? (
                        <p className="text-xs text-zinc-600 italic">No assets uploaded — add images in Sponsor CRM first</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {availableAssets.map(asset => {
                                const isSelected = assets[zone.key] === asset.url;
                                return (
                                    <button
                                        key={asset.url}
                                        onClick={() => onSetAsset(isSelected ? null : asset.url)}
                                        disabled={isPending}
                                        className={`group relative rounded-xl overflow-hidden transition-all border-2 ${
                                            isSelected ? 'border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.2)]' : 'border-zinc-800 hover:border-zinc-600'
                                        }`}
                                    >
                                        <img src={asset.url} alt={asset.label} className="w-24 h-16 object-cover" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                        <span className="absolute bottom-1 left-1.5 text-[9px] text-white/80 font-bold">{asset.label}</span>
                                        {isSelected && (
                                            <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center">
                                                <span className="text-white text-[9px] font-bold">✓</span>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Full-width slide-down live preview */}
            {active && previewOpen && currentAsset && (
                <div className="px-4 pb-4">
                    <div className="bg-[#050505] rounded-xl p-4 border border-zinc-800/40">
                        <div className="flex items-center gap-2 mb-3">
                            <Eye className="w-3.5 h-3.5 text-rose-400" />
                            <span className="text-[10px] text-rose-400 uppercase tracking-widest font-bold">Live Preview</span>
                        </div>
                        <ZonePreview zone={zone.key} sponsor={sponsor} assetUrl={currentAsset} />
                    </div>
                </div>
            )}
        </div>
    );
};

/** Sponsor detail: step-based flow */
const SponsorDetail = ({ sponsor, onBack, onRefresh }: { sponsor: Sponsor; onBack: () => void; onRefresh: () => void }) => {
    const { data: stats, isLoading: loadingStats } = useSponsorStats(sponsor.id);
    const updateSponsor = useAdminSponsorUpdate();
    const { toast } = useToast();
    const [view, setView] = useState<'main' | 'link'>('main');
    const [previewZone, setPreviewZone] = useState<string | null>(null);

    const currentZones = sponsor.placement || [];
    const assets = sponsor.placement_assets || {};

    const availableAssets: { label: string; url: string }[] = [];
    if (sponsor.logo_url) availableAssets.push({ label: 'Logo', url: sponsor.logo_url });
    if (sponsor.banner_image_url) availableAssets.push({ label: 'Banner', url: sponsor.banner_image_url });
    (sponsor.gallery_images || []).forEach((url, i) => {
        if (url) availableAssets.push({ label: `Gallery ${i + 1}`, url });
    });

    const toggleZone = (zone: string) => {
        const newZones = currentZones.includes(zone)
            ? currentZones.filter(z => z !== zone)
            : [...currentZones, zone];
        updateSponsor.mutate(
            { id: sponsor.id, updates: { placement: newZones } },
            { onSuccess: () => { toast({ title: `Placement updated` }); onRefresh(); } }
        );
    };

    const setZoneAsset = (zone: string, url: string | null) => {
        const newAssets = { ...assets };
        if (url) newAssets[zone] = url;
        else delete newAssets[zone];
        updateSponsor.mutate(
            { id: sponsor.id, updates: { placement_assets: newAssets } },
            { onSuccess: () => { toast({ title: `Asset updated` }); onRefresh(); } }
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
        <div className="space-y-8">
            {/* Back nav */}
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4 rotate-180" /> Back to sponsors
            </button>

            {/* ── STEP 1: Sponsor Identity ─────────────────────────────── */}
            <div className="p-5 bg-[#0a0a0c] border border-zinc-800/50 rounded-2xl">
                <div className="flex items-center gap-4">
                    {sponsor.logo_url && sponsor.logo_url.startsWith('http') ? (
                        <img src={sponsor.logo_url} alt={sponsor.name} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0 border border-zinc-700/30" />
                    ) : (
                        <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center flex-shrink-0">
                            <Megaphone className="w-7 h-7 text-zinc-500" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-white">{sponsor.name}</h3>
                        <p className="text-sm text-zinc-400 mt-0.5 truncate">{sponsor.tagline || sponsor.website_url || 'No tagline'}</p>
                    </div>
                    <button
                        onClick={toggleActive}
                        disabled={updateSponsor.isPending}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                            sponsor.is_active
                                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                        }`}
                    >
                        {sponsor.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                        {sponsor.is_active ? 'Active' : 'Inactive'}
                    </button>
                </div>

                {/* Quick stats inline */}
                <div className="grid grid-cols-3 gap-3 mt-5 pt-4 border-t border-zinc-800/40">
                    <div className="text-center">
                        <p className="text-lg font-bold text-white">{loadingStats ? '—' : (stats?.impressions ?? 0).toLocaleString()}</p>
                        <p className="text-[10px] text-zinc-500 uppercase">Impressions</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-bold text-white">{loadingStats ? '—' : (stats?.clicks ?? 0).toLocaleString()}</p>
                        <p className="text-[10px] text-zinc-500 uppercase">Clicks</p>
                    </div>
                    <div className="text-center">
                        <p className="text-lg font-bold text-white">{loadingStats ? '—' : (stats?.ctr ?? '0%')}</p>
                        <p className="text-[10px] text-zinc-500 uppercase">CTR</p>
                    </div>
                </div>
            </div>

            {/* ── STEP 2: Where should ads appear? ────────────────────── */}
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 text-xs font-bold">1</div>
                    <div>
                        <h4 className="text-sm font-bold text-white">Where should ads appear?</h4>
                        <p className="text-xs text-zinc-500">Toggle zones on, pick assets, then preview</p>
                    </div>
                </div>
                <div className="grid gap-3">
                    {GLOBAL_ZONES.map(zone => (
                        <ZoneCard
                            key={zone.key}
                            zone={zone}
                            active={currentZones.includes(zone.key)}
                            sponsor={sponsor}
                            assets={assets}
                            availableAssets={availableAssets}
                            isPending={updateSponsor.isPending}
                            previewOpen={previewZone === zone.key}
                            onToggle={() => toggleZone(zone.key)}
                            onSetAsset={(url) => setZoneAsset(zone.key, url)}
                            onTogglePreview={() => setPreviewZone(previewZone === zone.key ? null : zone.key)}
                        />
                    ))}
                </div>
            </div>

            {/* ── STEP 3: Tier & Priority ─────────────────────────────── */}
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 text-xs font-bold">2</div>
                    <div>
                        <h4 className="text-sm font-bold text-white">Tier & Priority</h4>
                        <p className="text-xs text-zinc-500">Higher tier = more prominent, higher priority = shown first</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#0a0a0c] border border-zinc-800/50 rounded-2xl">
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-3">Sponsor Tier</p>
                        <div className="grid grid-cols-2 gap-2">
                            {TIERS.map(t => (
                                <button
                                    key={t}
                                    onClick={() => updateTier(t)}
                                    disabled={updateSponsor.isPending}
                                    className={`px-3 py-2.5 rounded-xl text-xs font-bold capitalize transition-all border ${
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
                    <div className="p-4 bg-[#0a0a0c] border border-zinc-800/50 rounded-2xl">
                        <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-3">Display Priority</p>
                        <input
                            type="range"
                            min={1}
                            max={10}
                            value={sponsor.priority}
                            onChange={e => updatePriority(Number(e.target.value))}
                            className="w-full accent-rose-500 mt-2"
                        />
                        <div className="flex justify-between text-xs text-zinc-500 mt-2">
                            <span>Low</span>
                            <span className="text-white font-bold text-sm">{sponsor.priority}/10</span>
                            <span>High</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── STEP 4: Tournament Linking ───────────────────────────── */}
            <div>
                <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 text-xs font-bold">3</div>
                    <div>
                        <h4 className="text-sm font-bold text-white">Tournament Placements</h4>
                        <p className="text-xs text-zinc-500">Link to tournaments for header, sidebar, ticker, and card badges</p>
                    </div>
                </div>
                <button
                    onClick={() => setView('link')}
                    className="flex items-center gap-4 p-5 w-full bg-[#0a0a0c] border border-zinc-800/50 rounded-2xl hover:border-rose-500/30 hover:bg-rose-500/5 transition-all text-left group"
                >
                    <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                        <Plus className="w-6 h-6 text-rose-400" />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-white">Link to Tournament</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Assign this sponsor to a specific tournament for tournament-only zones</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-rose-400 transition-colors" />
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
