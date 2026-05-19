import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from 'react-router-dom';
import { apiClient } from "@/lib/apiClient";
import { useVenueImpressionTotals } from "@/hooks/useVenueImpressions";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, BarChart3, Plus, Eye, MousePointer, Phone, Monitor, Edit,
  Trash2, Loader2, LayoutDashboard, Copy, Check, AlertCircle, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { JackButton } from "@/components/ui/JackButton";
import VenueAnalytics from "@/components/venue-owner/VenueAnalytics";
import Footer from "@/components/Footer";
import { Venue, VenueStatus } from "@/types/venue";

const STATUS_CONFIG: Record<VenueStatus, { label: string; classes: string }> = {
  draft:          { label: 'Draft',          classes: 'bg-zinc-700 text-zinc-200' },
  pending_review: { label: 'Pending Review', classes: 'bg-yellow-600/30 text-yellow-300 border border-yellow-500/40' },
  published:      { label: 'Published',      classes: 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' },
  rejected:       { label: 'Rejected',       classes: 'bg-rose-600/30 text-rose-300 border border-rose-500/40' },
  suspended:      { label: 'Suspended',      classes: 'bg-orange-600/30 text-orange-300 border border-orange-500/40' },
  archived:       { label: 'Archived',       classes: 'bg-zinc-800 text-zinc-500' },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SAR: '﷼', INR: '₹', PKR: '₨',
  TRY: '₺', EGP: 'E£', QAR: 'QR', KWD: 'KD', BHD: 'BD', JPY: '¥',
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
    } catch { toast({ title: 'Copy failed', variant: 'destructive' }); }
  };
  return (
    <button onClick={handleCopy} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-xs text-gray-400 font-mono transition-colors">
      {venueId}
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function VenueStatCard({ venueId }: { venueId: string }) {
  const { data: totals, isLoading } = useVenueImpressionTotals(venueId);
  if (isLoading) return <div className="flex gap-3 text-xs text-zinc-600"><Loader2 className="w-3 h-3 animate-spin" /></div>;
  if (!totals) return null;
  return (
    <div className="flex flex-wrap gap-3 text-xs text-zinc-500 mt-1.5">
      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {totals.views ?? 0} views</span>
      <span className="flex items-center gap-1"><MousePointer className="w-3 h-3" /> {totals.card_views ?? 0} impressions</span>
      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {totals.contact_clicks ?? 0} contacts</span>
    </div>
  );
}

const VenueOwnerDashboard = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'venues' | 'analytics'>('venues');
  const [submitting, setSubmitting] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchMyVenues();
  }, [user]);

  const fetchMyVenues = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<Venue[]>(`/api/venues?owner_id=${user?.id}`);
      setVenues(data || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load your venues.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this venue? This cannot be undone.')) return;
    try {
      await apiClient.delete(`/api/venues/${id}`);
      toast({ title: 'Venue Deleted', description: 'The venue has been removed.' });
      setVenues(prev => prev.filter(v => v.id !== id));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleSubmitForReview = async (venue: Venue) => {
    setSubmitting(venue.id);
    try {
      await apiClient.put(`/api/venues/${venue.id}`, { status: 'pending_review' });
      toast({ title: 'Submitted for Review', description: `${venue.name} is now pending review.` });
      setVenues(prev => prev.map(v => v.id === venue.id ? { ...v, status: 'pending_review' as VenueStatus } : v));
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(null);
    }
  };

  const publishedCount = venues.filter(v => v.status === 'published').length;
  const pendingCount = venues.filter(v => v.status === 'pending_review').length;
  const totalStations = venues.reduce((sum, v) => sum + (v.stations || 0), 0);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <div className="flex-grow container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <LayoutDashboard className="w-6 h-6 text-rose-400" />
              Venue Dashboard
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Welcome, {profile?.full_name || profile?.username}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={activeView === 'venues' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('venues')}
              className={activeView === 'venues' ? 'bg-rose-600 hover:bg-rose-700' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'}
            >
              <MapPin className="w-4 h-4 mr-1" /> My Venues
            </Button>
            <Button
              variant={activeView === 'analytics' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveView('analytics')}
              className={activeView === 'analytics' ? 'bg-rose-600 hover:bg-rose-700' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-800'}
            >
              <BarChart3 className="w-4 h-4 mr-1" /> Analytics
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="rounded-xl border border-white/5 bg-[#0a0a0c] p-4">
            <p className="text-xs text-zinc-500 mb-1">Total Venues</p>
            <p className="text-2xl font-bold">{venues.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-500/10 bg-[#0a0a0c] p-4">
            <p className="text-xs text-zinc-500 mb-1">Published</p>
            <p className="text-2xl font-bold text-emerald-400">{publishedCount}</p>
          </div>
          <div className="rounded-xl border border-amber-500/10 bg-[#0a0a0c] p-4">
            <p className="text-xs text-zinc-500 mb-1">Pending Review</p>
            <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-[#0a0a0c] p-4">
            <p className="text-xs text-zinc-500 mb-1">Total Stations</p>
            <p className="text-2xl font-bold">{totalStations}</p>
          </div>
        </div>

        {/* My Venues View */}
        {activeView === 'venues' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-zinc-200">My Venues</h2>
              <JackButton size="sm" onClick={() => navigate('/venues/list-venue')}>
                <Plus className="w-4 h-4 mr-1" /> List New Venue
              </JackButton>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse rounded-xl border border-white/5 bg-[#0a0a0c] h-72" />
                ))}
              </div>
            ) : venues.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-700 bg-[#0a0a0c] p-12 text-center">
                <MapPin className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
                <p className="text-zinc-400 font-medium">No venues yet</p>
                <p className="text-sm text-zinc-600 mt-1">List your first gaming venue to start receiving bookings.</p>
                <JackButton size="sm" onClick={() => navigate('/venues/list-venue')} className="mt-4">
                  <Plus className="w-4 h-4 mr-1" /> List Your First Venue
                </JackButton>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {venues.map(venue => {
                  const cs = venue.currency ? (CURRENCY_SYMBOLS[venue.currency] || venue.currency) : '$';
                  const img = venue.card_image || (venue.images && venue.images[0]);
                  const venueStatus = (venue.status || 'draft') as VenueStatus;
                  return (
                    <div key={venue.id} className="bg-[#0a0a0c] border border-white/5 rounded-xl overflow-hidden group hover:border-rose-500/30 transition-all">
                      {/* Image */}
                      <div className="h-44 bg-zinc-900 relative">
                        {img ? (
                          <img src={img} loading="lazy" alt={venue.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-600">
                            No Image
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <StatusBadge status={venueStatus} />
                        </div>
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => navigate(`/venues/edit/${venue.id}`)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="destructive" className="h-8 w-8" onClick={() => handleDelete(venue.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2.5">
                        <div>
                          <h3 className="text-base font-bold mb-0.5">{venue.name}</h3>
                          <div className="flex items-center text-sm text-zinc-400">
                            <MapPin className="w-3 h-3 mr-1 shrink-0" />
                            {venue.city}{venue.country ? `, ${venue.country}` : ''}
                          </div>
                        </div>

                        {/* Meta row */}
                        <div className="flex items-center gap-3 text-xs text-zinc-500">
                          <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> {venue.stations} stations</span>
                          {venue.price_per_hour > 0 && <span>{cs}{venue.price_per_hour}/hr</span>}
                        </div>

                        <VenueIdBadge venueId={venue.venue_id} />

                        {/* Impression stats */}
                        <VenueStatCard venueId={venue.id} />

                        {/* Rejection reason */}
                        {venueStatus === 'rejected' && venue.rejection_reason && (
                          <div className="flex items-start gap-2 p-2 rounded-lg bg-rose-950/40 border border-rose-500/20 text-xs text-rose-300">
                            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span>{venue.rejection_reason}</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-white/10 hover:bg-white/5 text-xs"
                            onClick={() => navigate(`/venues/${venue.slug || venue.id}`)}
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View
                          </Button>

                          {(venueStatus === 'draft' || venueStatus === 'rejected') && (
                            <Button
                              size="sm"
                              className="flex-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs"
                              disabled={submitting === venue.id}
                              onClick={() => handleSubmitForReview(venue)}
                            >
                              {submitting === venue.id
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : venueStatus === 'rejected' ? 'Resubmit' : 'Submit for Review'
                              }
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Analytics View */}
        {activeView === 'analytics' && <VenueAnalytics />}
      </div>
      <Footer />
    </div>
  );
};

export default VenueOwnerDashboard;
