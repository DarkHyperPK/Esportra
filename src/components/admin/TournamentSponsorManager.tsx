import { useState } from 'react';
import { Plus, Trash2, GripVertical, Megaphone, Star, Radio, Loader2, X, ChevronDown } from 'lucide-react';
import { useTournamentSponsors, type TournamentSponsor } from '@/hooks/useTournamentSponsors';
import { useAllSponsors, type Sponsor } from '@/hooks/useSponsors';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const PLACEMENT_ZONES = [
    { key: 'header', label: 'Tournament Header', desc: 'Hero banner co-branding' },
    { key: 'sidebar', label: 'Sidebar Ad', desc: 'Right sidebar featured block' },
    { key: 'ticker', label: 'Logo Ticker', desc: 'Scrolling logo marquee' },
    { key: 'card_badge', label: 'Tournament Card', desc: 'Badge on listing cards' },
] as const;

const SPONSOR_TYPES = [
    { key: 'title_sponsor', label: 'Title Sponsor', icon: Star, color: 'text-amber-500', desc: 'Primary branding — "Presented by"' },
    { key: 'event_sponsor', label: 'Event Sponsor', icon: Megaphone, color: 'text-blue-400', desc: 'Featured placement — sidebar + ticker' },
    { key: 'media_sponsor', label: 'Media Sponsor', icon: Radio, color: 'text-emerald-400', desc: 'Ticker + overlay only' },
] as const;

interface Props {
    tournamentId: string;
    tournamentName: string;
}

const TournamentSponsorManager = ({ tournamentId, tournamentName }: Props) => {
    const { data: linked, isLoading, assign, update, remove } = useTournamentSponsors(tournamentId);
    const { data: allSponsors } = useAllSponsors();
    const [showAssign, setShowAssign] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [removingId, setRemovingId] = useState<{ id: string; name: string } | null>(null);

    // Sponsors not yet linked to this tournament
    const linkedIds = new Set(linked?.map(l => l.sponsor_id) ?? []);
    const available = allSponsors?.filter(s => s.is_active && !linkedIds.has(s.id)) ?? [];

    const handleAssign = (sponsor: Sponsor, type: string) => {
        const defaultZones = type === 'title_sponsor'
            ? ['header', 'ticker', 'card_badge', 'match_bar']
            : type === 'event_sponsor'
                ? ['sidebar', 'ticker']
                : ['ticker'];

        assign.mutate({
            sponsor_id: sponsor.id,
            sponsor_type: type,
            placement_zones: defaultZones,
            priority: type === 'title_sponsor' ? 100 : type === 'event_sponsor' ? 50 : 10,
        });
        setShowAssign(false);
    };

    const handleRemove = (sponsorId: string, name: string) => {
        setRemovingId({ id: sponsorId, name });
    };

    const confirmRemove = () => {
        if (removingId) {
            remove.mutate(removingId.id);
            setRemovingId(null);
        }
    };

    const toggleZone = (ts: TournamentSponsor, zone: string) => {
        const zones = ts.placement_zones.includes(zone)
            ? ts.placement_zones.filter(z => z !== zone)
            : [...ts.placement_zones, zone];
        update.mutate({ sponsorId: ts.sponsor_id, placement_zones: zones });
    };

    const changeType = (ts: TournamentSponsor, newType: string) => {
        update.mutate({ sponsorId: ts.sponsor_id, sponsor_type: newType });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white">Sponsor Placements</h3>
                    <p className="text-xs text-zinc-500 font-mono mt-1">
                        {linked?.length || 0} sponsor{(linked?.length || 0) !== 1 ? 's' : ''} linked to {tournamentName}
                    </p>
                </div>
                <Button
                    onClick={() => setShowAssign(!showAssign)}
                    className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold gap-2"
                    size="sm"
                    disabled={available.length === 0}
                >
                    <Plus className="w-3 h-3" />
                    Assign Sponsor
                </Button>
            </div>

            {/* Assign Panel */}
            {showAssign && (
                <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-white">Select a sponsor to assign</p>
                        <button onClick={() => setShowAssign(false)} aria-label="Close assign panel" className="text-zinc-500 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {available.length === 0 ? (
                        <p className="text-xs text-zinc-500">All active sponsors are already linked.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                            {available.map(sponsor => (
                                <div key={sponsor.id} className="flex items-center gap-3 p-3 rounded-lg bg-black/40 border border-zinc-800 hover:border-zinc-700 transition-colors">
                                    {sponsor.logo_url ? (
                                        <img src={sponsor.logo_url} className="w-8 h-8 object-contain flex-shrink-0" alt="" />
                                    ) : (
                                        <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 flex-shrink-0">
                                            {sponsor.name[0]}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{sponsor.name}</p>
                                        <p className="text-[10px] text-zinc-500 uppercase">{sponsor.tier}</p>
                                    </div>
                                    <div className="flex gap-1 flex-shrink-0">
                                        {SPONSOR_TYPES.map(t => (
                                            <button
                                                key={t.key}
                                                onClick={() => handleAssign(sponsor, t.key)}
                                                className={`px-2 py-1 text-[10px] font-bold rounded border border-zinc-700 hover:border-zinc-500 ${t.color} transition-colors`}
                                                title={t.desc}
                                            >
                                                {t.label.replace(' Sponsor', '')}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Linked Sponsors */}
            {!linked?.length ? (
                <div className="text-center py-12 text-zinc-600">
                    <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No sponsors linked yet.</p>
                    <p className="text-xs mt-1">Click "Assign Sponsor" to get started.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {linked.map(ts => {
                        const typeInfo = SPONSOR_TYPES.find(t => t.key === ts.sponsor_type) ?? SPONSOR_TYPES[1];
                        const TypeIcon = typeInfo.icon;
                        const isEditing = editingId === ts.id;

                        return (
                            <div
                                key={ts.id}
                                className="p-4 rounded-xl bg-[#08080a] border border-white/5 hover:border-white/10 transition-colors"
                            >
                                {/* Sponsor header */}
                                <div className="flex items-center gap-3 mb-3">
                                    <GripVertical className="w-4 h-4 text-zinc-700 flex-shrink-0" />
                                    {ts.sponsor.logo_url ? (
                                        <img src={ts.sponsor.logo_url} className="w-10 h-10 object-contain flex-shrink-0" alt="" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-500 flex-shrink-0">
                                            {ts.sponsor.name[0]}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">{ts.sponsor.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <TypeIcon className={`w-3 h-3 ${typeInfo.color}`} />
                                            <span className={`text-[10px] font-bold uppercase ${typeInfo.color}`}>
                                                {typeInfo.label}
                                            </span>
                                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-zinc-700 text-zinc-400">
                                                Priority: {ts.priority}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <button
                                            onClick={() => setEditingId(isEditing ? null : ts.id)}
                                            aria-label={isEditing ? 'Collapse editor' : 'Expand editor'}
                                            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                                        >
                                            <ChevronDown className={`w-4 h-4 transition-transform ${isEditing ? 'rotate-180' : ''}`} />
                                        </button>
                                        <button
                                            onClick={() => handleRemove(ts.sponsor_id, ts.sponsor.name)}
                                            aria-label={`Remove ${ts.sponsor.name}`}
                                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Placement zones */}
                                <div className="flex flex-wrap gap-1.5 ml-8">
                                    {PLACEMENT_ZONES.map(zone => {
                                        const active = ts.placement_zones.includes(zone.key);
                                        return (
                                            <button
                                                key={zone.key}
                                                onClick={() => toggleZone(ts, zone.key)}
                                                className={`px-2.5 py-1 text-[10px] font-bold rounded-full border transition-all ${
                                                    active
                                                        ? 'border-rose-500/50 bg-rose-500/10 text-rose-400'
                                                        : 'border-zinc-800 bg-zinc-900/50 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700'
                                                }`}
                                                title={zone.desc}
                                            >
                                                {zone.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Expanded edit panel */}
                                {isEditing && (
                                    <div className="mt-4 pt-4 border-t border-zinc-800 ml-8 space-y-3">
                                        {/* Type selector */}
                                        <div>
                                            <p className="text-[10px] text-zinc-500 font-mono uppercase mb-2">Sponsor Type</p>
                                            <div className="flex gap-2">
                                                {SPONSOR_TYPES.map(t => (
                                                    <button
                                                        key={t.key}
                                                        onClick={() => changeType(ts, t.key)}
                                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                                                            ts.sponsor_type === t.key
                                                                ? 'border-rose-500 bg-rose-500/10 text-white'
                                                                : 'border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600'
                                                        }`}
                                                    >
                                                        {t.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Media preview */}
                                        {(ts.sponsor.banner_image_url || ts.sponsor.gallery_images?.length > 0) && (
                                            <div>
                                                <p className="text-[10px] text-zinc-500 font-mono uppercase mb-2">Available Media</p>
                                                <div className="flex gap-2 overflow-x-auto pb-2">
                                                    {ts.sponsor.banner_image_url && (
                                                        <div className="flex-shrink-0 w-32 h-20 rounded-lg overflow-hidden border border-zinc-800">
                                                            <img src={ts.sponsor.banner_image_url} className="w-full h-full object-cover" alt="Banner" />
                                                        </div>
                                                    )}
                                                    {ts.sponsor.gallery_images?.map((img, i) => (
                                                        <div key={i} className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-zinc-800">
                                                            <img src={img} className="w-full h-full object-cover" alt={`Gallery ${i + 1}`} />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Placement Legend */}
            <div className="p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/50">
                <p className="text-[10px] text-zinc-600 font-mono uppercase mb-2">Placement Zone Guide</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {PLACEMENT_ZONES.map(zone => (
                        <div key={zone.key} className="text-[10px]">
                            <span className="text-zinc-400 font-bold">{zone.label}</span>
                            <span className="text-zinc-600"> — {zone.desc}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Remove Confirmation Dialog */}
            <AlertDialog open={!!removingId} onOpenChange={() => setRemovingId(null)}>
                <AlertDialogContent className="bg-[#0a0a0c] border-zinc-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Remove Sponsor?</AlertDialogTitle>
                        <AlertDialogDescription className="text-zinc-400">
                            This will remove <strong className="text-white">{removingId?.name}</strong> from this tournament. Their ads will stop displaying immediately.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-zinc-700 text-zinc-300 hover:bg-zinc-800">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmRemove} className="bg-red-600 hover:bg-red-700 text-white">
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default TournamentSponsorManager;
