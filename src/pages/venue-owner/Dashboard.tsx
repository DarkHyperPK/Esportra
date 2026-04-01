import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link } from 'react-router-dom';
import { apiClient } from "@/lib/apiClient";
import { useVenueImpressionTotals } from "@/hooks/useVenueImpressions";
import { MapPin, BarChart3, Plus, Eye, MousePointer, Phone, Monitor, Edit, ExternalLink, Loader2, LayoutDashboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import VenueAnalytics from "@/components/venue-owner/VenueAnalytics";
import Footer from "@/components/Footer";

interface OwnedVenue {
  id: string;
  name: string;
  slug?: string;
  city: string;
  country?: string;
  stations: number;
  price_per_hour: number;
  currency?: string;
  card_image?: string | null;
  images?: string[] | null;
  status: string;
}

const STATUS_STYLE: Record<string, string> = {
  draft:          'bg-zinc-700 text-zinc-200',
  pending_review: 'bg-amber-700/80 text-amber-100',
  published:      'bg-emerald-700/80 text-emerald-100',
  rejected:       'bg-rose-700/80 text-rose-100',
  suspended:      'bg-orange-700/80 text-orange-100',
  archived:       'bg-zinc-800 text-zinc-400',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SAR: '﷼', INR: '₹', PKR: '₨',
  TRY: '₺', EGP: 'E£', QAR: 'QR', KWD: 'KD', BHD: 'BD', JPY: '¥',
};

function VenueStatCard({ venueId }: { venueId: string }) {
  const { data: totals, isLoading } = useVenueImpressionTotals(venueId);
  if (isLoading) return <div className="flex gap-3 text-xs text-zinc-600"><Loader2 className="w-3 h-3 animate-spin" /></div>;
  if (!totals) return null;
  return (
    <div className="flex gap-3 text-xs text-zinc-500 mt-2">
      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {totals.views ?? 0} views</span>
      <span className="flex items-center gap-1"><MousePointer className="w-3 h-3" /> {totals.card_views ?? 0} impressions</span>
      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {totals.contact_clicks ?? 0} contacts</span>
    </div>
  );
}

const VenueOwnerDashboard = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [venues, setVenues] = useState<OwnedVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<'venues' | 'analytics'>('venues');

  useEffect(() => {
    if (!user) return;
    apiClient.get<OwnedVenue[]>('/api/venues?owned=true')
      .then(data => setVenues(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-zinc-200">My Venues</h2>
              <Button size="sm" onClick={() => navigate('/venues/create')} className="bg-rose-600 hover:bg-rose-700">
                <Plus className="w-4 h-4 mr-1" /> Add Venue
              </Button>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse rounded-xl border border-white/5 bg-[#0a0a0c] p-5 h-24" />
                ))}
              </div>
            ) : venues.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-700 bg-[#0a0a0c] p-12 text-center">
                <MapPin className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
                <p className="text-zinc-400 font-medium">No venues yet</p>
                <p className="text-sm text-zinc-600 mt-1">List your first gaming venue to start receiving bookings.</p>
                <Button size="sm" onClick={() => navigate('/venues/create')} className="bg-rose-600 hover:bg-rose-700 mt-4">
                  <Plus className="w-4 h-4 mr-1" /> Create Venue
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {venues.map(venue => {
                  const cs = venue.currency ? (CURRENCY_SYMBOLS[venue.currency] || venue.currency) : '$';
                  const img = venue.card_image || (venue.images && venue.images[0]);
                  return (
                    <div
                      key={venue.id}
                      className="rounded-xl border border-white/5 bg-[#0a0a0c] p-4 hover:border-white/15 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Thumbnail */}
                        <div className="w-20 h-14 rounded-lg overflow-hidden bg-zinc-900 flex-shrink-0">
                          {img ? (
                            <img src={img} alt={venue.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <MapPin className="w-5 h-5 text-zinc-700" />
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <h3 className="text-sm font-semibold text-white truncate">{venue.name}</h3>
                            <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_STYLE[venue.status] || STATUS_STYLE.draft}`}>
                              {venue.status?.replace('_', ' ') || 'draft'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-zinc-500">
                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {venue.city}{venue.country ? `, ${venue.country}` : ''}</span>
                            <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> {venue.stations} stations</span>
                            {venue.price_per_hour > 0 && (
                              <span>{cs}{venue.price_per_hour}/hr</span>
                            )}
                          </div>
                          <VenueStatCard venueId={venue.id} />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1.5 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); navigate(`/venues/edit/${venue.id}`); }}
                            className="text-zinc-400 hover:text-white h-8 w-8 p-0"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); navigate(`/venues/${venue.slug || venue.id}`); }}
                            className="text-zinc-400 hover:text-white h-8 w-8 p-0"
                            title="View"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
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
