
import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Edit, Trash2, MapPin, Eye, Copy, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/Footer';
import { VenueEditModal } from '@/components/admin/VenueEditModal';
import { Venue, VenueStatus } from '@/types/venue';
import { JackButton } from '@/components/ui/JackButton';

const STATUS_CONFIG: Record<VenueStatus, { label: string; classes: string }> = {
    draft:          { label: 'Draft',          classes: 'bg-zinc-700 text-zinc-200' },
    pending_review: { label: 'Pending Review', classes: 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/40' },
    published:      { label: 'Published',      classes: 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' },
    rejected:       { label: 'Rejected',       classes: 'bg-rose-600/30 text-rose-300 border border-rose-500/40' },
    suspended:      { label: 'Suspended',      classes: 'bg-orange-600/30 text-orange-300 border border-orange-500/40' },
    archived:       { label: 'Archived',       classes: 'bg-zinc-800 text-zinc-500' },
};

function StatusBadge({ status }: { status?: VenueStatus }) {
    if (!status) return null;
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.classes}`}>
            {cfg.label}
        </span>
    );
}

function VenueIdBadge({ venueId }: { venueId?: string }) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    if (!venueId) return null;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(venueId);
            setCopied(true);
            toast({ title: 'Copied', description: `${venueId} copied to clipboard` });
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast({ title: 'Copy failed', variant: 'destructive' });
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-xs text-gray-400 font-mono transition-colors"
        >
            {venueId}
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
        </button>
    );
}

const ManageVenues = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [editVenue, setEditVenue] = useState<Venue | null>(null);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [submitting, setSubmitting] = useState<string | null>(null);

    const fetchMyVenues = useCallback(async () => {
        try {
            setLoading(true);
            const data = await apiClient.get<Venue[]>(`/api/venues?owner_id=${user?.id}`);
            setVenues(data || []);
        } catch (error: any) {
            console.error('Error fetching venues:', error);
            toast({
                title: 'Error',
                description: 'Failed to load your venues.',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [user?.id, toast]);

    useEffect(() => {
        if (user) {
            fetchMyVenues();
        }
    }, [user, fetchMyVenues]);

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this venue? This cannot be undone.')) return;

        try {
            await apiClient.delete(`/api/venues/${id}`);
            toast({ title: 'Venue Deleted', description: 'The venue has been removed.' });
            setVenues(venues.filter(v => v.id !== id));
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        }
    };

    const handleSubmitForReview = async (venue: Venue) => {
        setSubmitting(venue.id);
        try {
            await apiClient.put(`/api/venues/${venue.id}`, {
                status: 'pending_review',
            });
            toast({ title: 'Submitted for Review', description: `${venue.name} is now pending review.` });
            setVenues(prev => prev.map(v => v.id === venue.id ? { ...v, status: 'pending_review' } : v));
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setSubmitting(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-transparent flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent text-white">
            <div className="container mx-auto px-4 py-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold">My Venues</h1>
                        <p className="text-gray-400">Manage your listed gaming centers</p>
                    </div>
                    <JackButton onClick={() => navigate('/venues/list-venue')} size="sm">
                        <Plus className="w-4 h-4 mr-2" /> List New Venue
                    </JackButton>
                </div>

                {venues.length === 0 ? (
                    <div className="text-center py-20 bg-[#0a0a0c] border border-white/5 rounded-2xl">
                        <h2 className="text-xl font-semibold mb-2">No Venues Listed</h2>
                        <p className="text-gray-500 mb-6">You haven't listed any venues yet.</p>
                        <JackButton onClick={() => navigate('/venues/list-venue')} variant="invert" size="sm">
                            List Your First Venue
                        </JackButton>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {venues.map((venue) => (
                            <div key={venue.id} className="bg-[#0a0a0c] border border-white/5 rounded-xl overflow-hidden group hover:border-rose-500/30 transition-all">
                                <div className="h-48 bg-gray-900 relative">
                                    {venue.images && venue.images[0] ? (
                                        <img src={venue.images[0]} loading="lazy" alt={venue.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-600">
                                            No Image
                                        </div>
                                    )}
                                    {/* Status badge — top-left */}
                                    <div className="absolute top-2 left-2">
                                        <StatusBadge status={venue.status as VenueStatus} />
                                    </div>
                                    {/* Action buttons — top-right */}
                                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button size="icon" variant="secondary" onClick={() => {
                                            navigate(`/venues/edit/${venue.id}`);
                                        }}>
                                            <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button size="icon" variant="destructive" onClick={() => handleDelete(venue.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-5 space-y-3">
                                    <div>
                                        <h3 className="text-lg font-bold mb-0.5">{venue.name}</h3>
                                        <div className="flex items-center text-sm text-gray-400">
                                            <MapPin className="w-3 h-3 mr-1 shrink-0" />
                                            {venue.city}, {venue.country}
                                        </div>
                                    </div>

                                    {/* Venue ID */}
                                    <VenueIdBadge venueId={venue.venue_id} />

                                    {/* Rejection reason */}
                                    {venue.status === 'rejected' && venue.rejection_reason && (
                                        <div className="flex items-start gap-2 p-2 rounded-lg bg-rose-950/40 border border-rose-500/20 text-xs text-rose-300">
                                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                            <span>{venue.rejection_reason}</span>
                                        </div>
                                    )}

                                    {/* Action buttons */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            className="flex-1 border-white/10 hover:bg-white/5"
                                            onClick={() => navigate(`/venues/${venue.slug}`)}
                                        >
                                            <Eye className="w-4 h-4 mr-2" /> View
                                        </Button>

                                        {(venue.status === 'draft' || venue.status === 'rejected') && (
                                            <Button
                                                className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white text-sm"
                                                disabled={submitting === venue.id}
                                                onClick={() => handleSubmitForReview(venue)}
                                            >
                                                {submitting === venue.id
                                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                                    : venue.status === 'rejected' ? 'Resubmit' : 'Submit for Review'
                                                }
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {editVenue && (
                <VenueEditModal
                    isOpen={isEditOpen}
                    onClose={() => {
                        setIsEditOpen(false);
                        setEditVenue(null);
                    }}
                    venue={editVenue}
                    onVenueUpdated={() => {
                        fetchMyVenues();
                        setIsEditOpen(false);
                        setEditVenue(null);
                    }}
                />
            )}

            <Footer />
        </div>
    );
};

export default ManageVenues;
