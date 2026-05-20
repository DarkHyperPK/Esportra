import React, { useEffect, useRef, useState, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useTrackImpression } from '@/hooks/useVenueImpressions';
import { useVenueLiveStatus } from '@/hooks/useVenueLiveStatus';
import { useVenueSeats } from '@/hooks/useVenueSeats';
import { VenueSeatGrid } from '@/components/venues/VenueSeatGrid';
import {
  MapPin, Clock, Phone, Mail, Cpu, Monitor, Wifi, Coffee, Car,
  Wind, Zap, Maximize2, Share2, ChevronLeft, ChevronRight,
  Gamepad2, CheckCircle, X, Copy, Check,
  AlertTriangle, Globe, Armchair, Image as ImageIcon, ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';

import { lazyWithRetry } from '@/utils/lazyWithRetry';

const MapPicker = lazyWithRetry(() => import('@/components/venues/MapPicker'));

// ── Amenity icons + labels ──────────────────────────────────────────
const AMENITIES: Record<string, { icon: React.ElementType; label: string }> = {
  wifi:    { icon: Wifi,      label: 'High-Speed WiFi' },
  ac:      { icon: Wind,      label: 'Air Conditioning' },
  food:    { icon: Coffee,    label: 'Food & Drinks' },
  parking: { icon: Car,       label: 'Free Parking' },
  private: { icon: Maximize2, label: 'Private Rooms' },
  power:   { icon: Zap,       label: 'Backup Power' },
};

// ── Types ───────────────────────────────────────────────────────────
interface Venue {
  id: string;
  slug: string;
  name: string;
  description: string;
  city: string;
  state: string;
  country: string;
  address: string;
  postal_code: string;
  stations: number;
  hours: string;
  games: string;
  contact_email: string;
  contact_phone: string;
  images: string[];
  amenities: string[];
  price_per_hour?: number;
  currency?: string;
  pc_specs: Record<string, string> | string | null;
  owner_id: string;
  venue_id?: string;
  status?: string;
  rejection_reason?: string;
  latitude?: number | null;
  longitude?: number | null;
}


// ── Currency symbol lookup ────────────────────────────────────────────
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SAR: '﷼', INR: '₹', PKR: '₨',
  TRY: '₺', EGP: 'E£', QAR: 'QR', KWD: 'KD', BHD: 'BD', OMR: 'OMR',
  JOD: 'JD', MAD: 'MAD', MYR: 'RM', SGD: 'S$', IDR: 'Rp', PHP: '₱', BRL: 'R$', JPY: '¥'
};
function currencySymbol(code?: string): string {
  return code ? (CURRENCY_SYMBOLS[code] || code) : '$';
}

// ── Helper: safely parse pc_specs (Dapper returns jsonb as string) ──
function parsePcSpecs(raw: Record<string, string> | string | null | undefined): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return raw;
}

// ── Venue ID badge (owner-only) ─────────────────────────────────────
function VenueIdBadge({ venueId }: { venueId: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(venueId);
        setCopied(true);
        toast({ title: 'Copied', description: `${venueId} copied` });
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-400 font-mono transition-colors border border-white/10"
    >
      {venueId}
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}


// =====================================================================
const VenueDetailsV2 = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIdx, setLightboxIdx] = useState(-1);

  // Tracking
  const { mutate: trackImpression } = useTrackImpression();
  const liveStatus = useVenueLiveStatus(venue?.id);
  const seatData = useVenueSeats(venue?.id);
  const tracked = useRef(false);

  useEffect(() => { fetchVenue(); }, [slug]);

  const fetchVenue = async () => {
    try {
      if (!slug) return;
      const data = await apiClient.get<any>(`/api/venues/${slug}`);
      if (data.status && data.status !== 'published' && user?.id !== data.owner_id) {
        toast({ title: 'Venue not found', description: 'Not currently available.', variant: 'destructive' });
        navigate('/venues/search');
        return;
      }
      setVenue(data);
      if (!tracked.current) {
        tracked.current = true;
        trackImpression({ venueId: data.id, eventType: 'view', userId: user?.id });
      }
    } catch {
      toast({ title: 'Error', description: 'Could not load venue.', variant: 'destructive' });
      navigate('/venues/search');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-transparent flex items-center justify-center">
      <div className="w-12 h-12 border-3 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
    </div>
  );

  if (!venue) return (
    <div className="min-h-screen bg-transparent flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Venue not found</h2>
        <p className="text-zinc-400 mb-4">This venue may have been removed.</p>
        <a href="/venues/search" className="text-rose-500 hover:text-rose-400 underline">Browse venues</a>
      </div>
    </div>
  );

  const specs = parsePcSpecs(venue.pc_specs);
  const images = venue.images?.length ? venue.images : [];
  const mainImage = images[0] ?? null;
  const gameList = venue.games ? venue.games.split(',').map(g => g.trim()).filter(Boolean) : [];
  const isOwner = user?.id === venue.owner_id;

  return (
    <div className="min-h-screen bg-transparent text-white">
      <SEO
        title={venue.name}
        description={venue.description || `${venue.name} — Gaming venue on Esportra`}
        image={venue.images?.[0]}
        url={`/venues/${slug}`}
        type="article"
      />
      {/* ── Owner status banner ──────────────────────────────────── */}
      {venue.status && venue.status !== 'published' && isOwner && (
        <div className={`px-4 py-3 text-sm text-center font-medium flex items-center justify-center gap-2 ${
          venue.status === 'draft'          ? 'bg-zinc-800 text-zinc-300' :
          venue.status === 'pending_review' ? 'bg-amber-900/60 text-amber-300' :
          venue.status === 'rejected'       ? 'bg-rose-900/60 text-rose-300' :
          venue.status === 'suspended'      ? 'bg-orange-900/60 text-orange-300' :
          'bg-zinc-800 text-zinc-400'
        }`}>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            {venue.status === 'draft'          && 'Draft — not visible to the public.'}
            {venue.status === 'pending_review' && 'Pending review — not yet visible.'}
            {venue.status === 'rejected'       && `Rejected: ${venue.rejection_reason || 'Edit and resubmit.'}`}
            {venue.status === 'suspended'      && 'Suspended — contact support.'}
            {venue.status === 'archived'       && 'Archived.'}
          </span>
        </div>
      )}

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="relative h-[50vh] md:h-[60vh] w-full overflow-hidden">
        {mainImage ? (
          <img src={mainImage} alt={venue.name}
               className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-[#050505]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/70 to-transparent" />

        <div className="absolute inset-0 flex flex-col justify-end pb-10 md:pb-14">
          <div className="container mx-auto px-4 md:px-6 max-w-6xl">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <button onClick={() => navigate('/venues/search')}
                className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white mb-5 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back to venues
              </button>

              <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">
                {venue.name}
                {seatData.isOnline ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium ml-3 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 align-middle">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium ml-3 px-2.5 py-1 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-500 align-middle">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                    Offline
                  </span>
                )}
              </h1>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-zinc-400">
                <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4 text-rose-500" />{venue.city}, {venue.country}</span>
                <span className="inline-flex items-center gap-1.5"><Clock className="w-4 h-4 text-zinc-500" />{venue.hours || 'Open 24/7'}</span>
                {venue.price_per_hour != null && venue.price_per_hour > 0 && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">{currencySymbol(venue.currency)}{venue.price_per_hour}/hr</span>
                )}
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2 mt-5">
                {liveStatus && (
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${
                    liveStatus.is_open
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border-zinc-700 bg-zinc-800 text-zinc-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${liveStatus.is_open ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                    {liveStatus.is_open ? 'Open Now' : 'Closed'}
                    {liveStatus.is_open && liveStatus.seats_total > 0 && ` · ${liveStatus.seats_total - liveStatus.seats_occupied} seats free`}
                  </span>
                )}
                <Button variant="ghost" size="sm"
                  className="text-zinc-400 hover:text-white hover:bg-white/10 rounded-full"
                  onClick={() => { navigator.clipboard.writeText(window.location.href); toast({ description: 'Link copied!' }); }}>
                  <Share2 className="w-4 h-4 mr-1.5" /> Share
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <main className="container mx-auto px-4 md:px-6 max-w-6xl py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-14">

          {/* Left column */}
          <div className="lg:col-span-2 space-y-12">

            {/* Live Seat Grid */}
            <VenueSeatGrid
              seats={seatData.seats}
              isOnline={seatData.isOnline}
              isLoading={seatData.isLoading}
              freeCount={seatData.freeCount}
              occupiedCount={seatData.occupiedCount}
              reservedCount={seatData.reservedCount}
            />

            {/* About */}
            <section>
              <h2 className="text-lg font-semibold text-white mb-3">About</h2>
              <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap">{venue.description}</p>
            </section>

            {/* Games */}
            {gameList.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5 text-rose-500" /> Supported Games
                </h2>
                <div className="flex flex-wrap gap-2">
                  {gameList.map((g, i) => (
                    <span key={i} className="px-3 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-zinc-300">{g}</span>
                  ))}
                </div>
              </section>
            )}

            {/* Hardware Specs */}
            {(specs.gpu || specs.cpu || specs.ram || specs.monitors) && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-rose-500" /> Hardware Specs
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'GPU',     value: specs.gpu,      icon: Monitor },
                    { label: 'CPU',     value: specs.cpu,      icon: Cpu },
                    { label: 'RAM',     value: specs.ram,      icon: Zap },
                    { label: 'Display', value: specs.monitors, icon: Monitor },
                  ].filter(s => s.value).map(s => (
                    <div key={s.label} className="bg-[#0a0a0c] border border-white/5 rounded-xl p-4">
                      <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-1">{s.label}</div>
                      <div className="text-sm font-medium text-white">{s.value}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-sm text-zinc-500">
                  <Armchair className="w-4 h-4" />
                  <span>{venue.stations} stations available</span>
                </div>
              </section>
            )}

            {/* Gallery */}
            {images.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-rose-500" /> Gallery
                </h2>
                <div className={`grid gap-2 ${
                  images.length === 1 ? 'grid-cols-1' :
                  images.length === 2 ? 'grid-cols-2' :
                  'grid-cols-2 md:grid-cols-3'
                }`}>
                  {images.map((img, idx) => (
                    <div key={idx}
                      className="relative aspect-[4/3] rounded-xl overflow-hidden cursor-pointer group bg-zinc-900"
                      onClick={() => setLightboxIdx(idx)}>
                      <img src={img} alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* ── Right sidebar ────────────────────────────────────── */}
          <aside className="space-y-6">
            {/* Contact card */}
            <div className="bg-[#0a0a0c] border border-white/5 rounded-2xl p-5 sticky top-24">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold">Contact & Location</h3>
                {venue.venue_id && isOwner && <VenueIdBadge venueId={venue.venue_id} />}
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-zinc-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-zinc-300">{venue.address}</div>
                    <div className="text-zinc-500">{venue.city}, {venue.state} {venue.postal_code}</div>
                    <div className="text-zinc-500">{venue.country}</div>
                  </div>
                </div>

                {venue.contact_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
                    <a href={`tel:${venue.contact_phone}`} className="text-zinc-300 hover:text-white transition-colors">{venue.contact_phone}</a>
                  </div>
                )}

                {venue.contact_email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                    <a href={`mailto:${venue.contact_email}`} className="text-zinc-300 hover:text-white transition-colors truncate">{venue.contact_email}</a>
                  </div>
                )}
              </div>

              {/* Amenities */}
              {venue.amenities && venue.amenities.length > 0 && (
                <div className="mt-5 pt-5 border-t border-white/5">
                  <h4 className="text-sm font-medium text-zinc-400 mb-3">Amenities</h4>
                  <div className="grid grid-cols-2 gap-2.5">
                    {venue.amenities.map(key => {
                      const a = AMENITIES[key];
                      const Icon = a?.icon || CheckCircle;
                      return (
                        <div key={key} className="flex items-center gap-2 text-xs text-zinc-300">
                          <Icon className="w-3.5 h-3.5 text-rose-500" />
                          <span>{a?.label || key}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Map */}
              {venue.latitude != null && venue.longitude != null && (
                <div className="mt-5 pt-5 border-t border-white/5">
                  <h4 className="text-sm font-medium text-zinc-400 mb-3">Map</h4>
                  <Suspense fallback={<div className="h-[200px] bg-zinc-900 rounded-xl animate-pulse" />}>
                    <MapPicker latitude={venue.latitude} longitude={venue.longitude} onChange={() => {}} height="200px" readonly />
                  </Suspense>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${venue.latitude},${venue.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> Open in Google Maps
                  </a>
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>

      <Footer />


      {/* ── Lightbox ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {lightboxIdx !== -1 && images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightboxIdx(-1)}>

            <button className="absolute top-4 right-4 p-2 text-white/60 hover:text-white bg-white/10 rounded-full hover:bg-white/20 transition-all"
              onClick={e => { e.stopPropagation(); setLightboxIdx(-1); }}>
              <X className="w-5 h-5" /><span className="sr-only">Close</span>
            </button>

            <div className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
              {images.length > 1 && (
                <button className="absolute left-2 md:-left-12 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all"
                  onClick={e => { e.stopPropagation(); setLightboxIdx(p => (p > 0 ? p - 1 : images.length - 1)); }}>
                  <ChevronLeft className="w-7 h-7" />
                </button>
              )}
              <img src={images[lightboxIdx]} alt={`Photo ${lightboxIdx + 1}`}
                className="max-h-[85vh] max-w-full rounded-lg" />
              {images.length > 1 && (
                <button className="absolute right-2 md:-right-12 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all"
                  onClick={e => { e.stopPropagation(); setLightboxIdx(p => (p < images.length - 1 ? p + 1 : 0)); }}>
                  <ChevronRight className="w-7 h-7" />
                </button>
              )}
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, i) => (
                <button key={i} onClick={e => { e.stopPropagation(); setLightboxIdx(i); }}
                  className={`w-2 h-2 rounded-full transition-all ${i === lightboxIdx ? 'bg-white scale-125' : 'bg-white/30 hover:bg-white/50'}`} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VenueDetailsV2;
