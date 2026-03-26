import { useState } from 'react';
import { Search, Trophy, ChevronRight, Megaphone, Loader2, Globe, Star, Radio, Plus, Eye, ChevronDown } from 'lucide-react';
import { useAdminSponsors, useAdminTournaments } from '@/hooks/useAdminQueries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type Sponsor } from '@/hooks/useSponsors';
import { useTournamentSponsors } from '@/hooks/useTournamentSponsors';
import { useToast } from '@/hooks/use-toast';

const TIER_COLORS: Record<string, string> = {
    radiant: 'bg-amber-900/50 text-amber-300 border-amber-500/30',
    ascendant: 'bg-emerald-900/50 text-emerald-300 border-emerald-500/30',
    diamond: 'bg-cyan-900/50 text-cyan-300 border-cyan-500/30',
    standard: 'bg-zinc-800 text-zinc-300 border-zinc-600/30',
};

const SPONSOR_TYPES = [
    { key: 'title_sponsor', label: 'Title Sponsor', icon: Star, color: 'text-amber-500' },
    { key: 'event_sponsor', label: 'Event Sponsor', icon: Megaphone, color: 'text-blue-400' },
    { key: 'media_sponsor', label: 'Media Sponsor', icon: Radio, color: 'text-emerald-400' },
] as const;

const PLACEMENT_ZONES = [
    { key: 'header', label: 'Header' },
    { key: 'sidebar', label: 'Sidebar' },
    { key: 'ticker', label: 'Ticker' },
    { key: 'match_bar', label: 'Match Bar' },
    { key: 'overlay', label: 'Overlay' },
    { key: 'card_badge', label: 'Card Badge' },
] as const;

/** Sub-view: assign a sponsor to a tournament */
const AssignToTournament = ({ sponsor, onBack }: { sponsor: Sponsor; onBack: () => void }) => {
    const { data: tournaments, isLoading: loadingTournaments } = useAdminTournaments();
    const [search, setSearch] = useState('');
    const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);
    const [sponsorType, setSponsorType] = useState<string>('event_sponsor');
    const [zones, setZones] = useState<string[]>(['ticker']);
    const [priority, setPriority] = useState(5);
    const { toast } = useToast();

    const selectedTournament = tournaments?.find((t: any) => t.id === selectedTournamentId);
    const selectedName = selectedTournament?.name || selectedTournament?.title || '';

    // Use the hook for the selected tournament to do the actual assign
    const { assign } = useTournamentSponsors(selectedTournamentId || '');

    const filtered = (tournaments ?? []).filter((t: any) =>
        (t.name || t.title || '').toLowerCase().includes(search.toLowerCase())
    );

    const toggleZone = (z: string) => {
        setZones(prev => prev.includes(z) ? prev.filter(x => x !== z) : [...prev, z]);
    };

    const handleAssign = () => {
        if (!selectedTournamentId || zones.length === 0) return;
        assign.mutate(
            { sponsor_id: sponsor.id, sponsor_type: sponsorType, placement_zones: zones, priority },
            {
                onSuccess: () => {
                    toast({ title: `${sponsor.name} assigned to ${selectedName}` });
                    onBack();
                },
            }
        );
    };

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back to {sponsor.name}
            </button>

            <div>
                <h3 className="text-lg font-bold text-white">Assign {sponsor.name} to a Tournament</h3>
                <p className="text-zinc-500 text-sm mt-1">Select a tournament, choose sponsor type and placement zones</p>
            </div>

            {/* Step 1: Pick tournament */}
            {!selectedTournamentId ? (
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search tournaments..."
                            className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
                        />
                    </div>

                    {loadingTournaments && (
                        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-zinc-500 animate-spin" /></div>
                    )}

                    <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                        {filtered.map((t: any) => (
                            <button
                                key={t.id}
                                onClick={() => setSelectedTournamentId(t.id)}
                                className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-xl hover:border-zinc-700 transition-all text-left"
                            >
                                <Trophy className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{t.name || t.title}</p>
                                    <p className="text-[11px] text-zinc-500">{t.game || 'No game'} • {t.status?.replace(/_/g, ' ')}</p>
                                </div>
                                <ChevronRight className="w-4 h-4 text-zinc-600" />
                            </button>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-5">
                    {/* Selected tournament */}
                    <div className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-700 rounded-xl">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        <span className="text-sm font-semibold text-white flex-1">{selectedName}</span>
                        <button onClick={() => setSelectedTournamentId(null)} className="text-xs text-zinc-500 hover:text-white">Change</button>
                    </div>

                    {/* Step 2: Sponsor type */}
                    <div>
                        <label className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-2 block">Sponsor Type</label>
                        <div className="grid grid-cols-3 gap-2">
                            {SPONSOR_TYPES.map(st => {
                                const Icon = st.icon;
                                const active = sponsorType === st.key;
                                return (
                                    <button
                                        key={st.key}
                                        onClick={() => setSponsorType(st.key)}
                                        className={`p-3 rounded-xl border text-center transition-all ${
                                            active
                                                ? 'border-rose-500/50 bg-rose-500/10'
                                                : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
                                        }`}
                                    >
                                        <Icon className={`w-5 h-5 mx-auto mb-1 ${st.color}`} />
                                        <p className="text-[11px] font-bold text-white">{st.label}</p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Step 3: Placement zones */}
                    <div>
                        <label className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-2 block">Placement Zones</label>
                        <div className="flex flex-wrap gap-2">
                            {PLACEMENT_ZONES.map(z => (
                                <button
                                    key={z.key}
                                    onClick={() => toggleZone(z.key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        zones.includes(z.key)
                                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                            : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
                                    }`}
                                >
                                    {z.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Step 4: Priority */}
                    <div>
                        <label className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-2 block">Priority (1-10)</label>
                        <input
                            type="range"
                            min={1}
                            max={10}
                            value={priority}
                            onChange={(e) => setPriority(Number(e.target.value))}
                            className="w-full accent-rose-500"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                            <span>Low</span>
                            <span className="text-white font-bold">{priority}</span>
                            <span>High</span>
                        </div>
                    </div>

                    <Button
                        onClick={handleAssign}
                        disabled={zones.length === 0 || assign.isPending}
                        className="w-full bg-rose-600 hover:bg-rose-700 text-white"
                    >
                        {assign.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                        Assign to Tournament
                    </Button>
                </div>
            )}
        </div>
    );
};

/** Sub-view: sponsor detail with current placements + actions */
const SponsorDetail = ({ sponsor, onBack }: { sponsor: Sponsor; onBack: () => void }) => {
    const [view, setView] = useState<'overview' | 'assign'>('overview');

    if (view === 'assign') {
        return <AssignToTournament sponsor={sponsor} onBack={() => setView('overview')} />;
    }

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4 rotate-180" />
                Back to sponsors
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
                    <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-[10px] border ${TIER_COLORS[sponsor.tier] || TIER_COLORS.standard}`}>
                            {sponsor.tier}
                        </Badge>
                        <Badge variant={sponsor.is_active ? 'default' : 'secondary'} className="text-[10px]">
                            {sponsor.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                    onClick={() => setView('assign')}
                    className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-zinc-800/60 rounded-xl hover:border-rose-500/40 hover:bg-rose-500/5 transition-all text-left group"
                >
                    <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
                        <Plus className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">Assign to Tournament</p>
                        <p className="text-[11px] text-zinc-500">Link this sponsor to a tournament</p>
                    </div>
                </button>
                {sponsor.website_url && (
                    <a
                        href={sponsor.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-zinc-800/60 rounded-xl hover:border-zinc-700 transition-all text-left"
                    >
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Visit Website</p>
                            <p className="text-[11px] text-zinc-500 truncate max-w-[200px]">{sponsor.website_url}</p>
                        </div>
                    </a>
                )}
            </div>

            {/* Current placements info */}
            <div>
                <h4 className="text-xs text-zinc-400 uppercase tracking-wider font-bold mb-3">Sponsor Info</h4>
                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-xl">
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">Priority</p>
                        <p className="text-lg font-bold text-white">{sponsor.priority}</p>
                    </div>
                    <div className="p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-xl">
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">CTA</p>
                        <p className="text-sm font-medium text-white truncate">{sponsor.cta_text || '—'}</p>
                    </div>
                    <div className="p-3 bg-zinc-900/50 border border-zinc-800/60 rounded-xl col-span-2">
                        <p className="text-[10px] text-zinc-500 uppercase mb-1">Default Placements</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                            {(sponsor.placement || []).length > 0 ? sponsor.placement.map(p => (
                                <Badge key={p} variant="outline" className="text-[10px] border-zinc-700 text-zinc-300">{p}</Badge>
                            )) : <span className="text-xs text-zinc-600">None configured</span>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/** Main dashboard: sponsor list */
const AdPlacementDashboard = () => {
    const { data: sponsors, isLoading, error } = useAdminSponsors();
    const [search, setSearch] = useState('');
    const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);

    const filtered = (sponsors ?? []).filter((s: any) =>
        (s.name || '').toLowerCase().includes(search.toLowerCase())
    );

    if (selectedSponsor) {
        return <SponsorDetail sponsor={selectedSponsor} onBack={() => setSelectedSponsor(null)} />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Megaphone className="w-6 h-6 text-rose-400" />
                    Ad Placement Manager
                </h2>
                <p className="text-zinc-400 mt-1">Select a sponsor to manage their ad placements across tournaments</p>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search sponsors..."
                    className="w-full pl-10 pr-4 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600"
                />
            </div>

            {/* States */}
            {isLoading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
                </div>
            )}

            {error && (
                <div className="text-center py-12">
                    <p className="text-red-400 mb-2">Failed to load sponsors</p>
                    <p className="text-zinc-500 text-sm">{(error as Error).message}</p>
                </div>
            )}

            {!isLoading && !error && filtered.length === 0 && (
                <div className="text-center py-12">
                    <Megaphone className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                    <p className="text-zinc-400">{search ? 'No sponsors match your search' : 'No sponsors found'}</p>
                    <p className="text-zinc-600 text-sm mt-1">Add sponsors via Sponsor CRM first</p>
                </div>
            )}

            {/* Sponsor Grid */}
            {!isLoading && !error && filtered.length > 0 && (
                <div className="grid gap-3">
                    {filtered.map((s: any) => (
                        <button
                            key={s.id}
                            onClick={() => setSelectedSponsor(s)}
                            className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800/60 rounded-xl hover:border-zinc-700 hover:bg-zinc-900 transition-all text-left group"
                        >
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
                            <Badge className={`text-[10px] border ${TIER_COLORS[s.tier] || TIER_COLORS.standard}`}>
                                {s.tier}
                            </Badge>
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.is_active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                            <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdPlacementDashboard;
