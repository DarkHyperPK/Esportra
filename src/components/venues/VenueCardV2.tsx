import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Monitor, Gamepad2, Wifi, Wind, Coffee, Car, Maximize2, Zap } from 'lucide-react';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { Venue, VenueStatus } from '@/types/venue';
import { useTrackImpression } from '@/hooks/useVenueImpressions';

const STATUS_BADGE: Record<VenueStatus, { label: string; cls: string }> = {
  draft:          { label: 'Draft',          cls: 'bg-zinc-700 text-zinc-200' },
  pending_review: { label: 'Pending',        cls: 'bg-amber-700/80 text-amber-100' },
  published:      { label: 'Published',      cls: 'bg-emerald-700/80 text-emerald-100' },
  rejected:       { label: 'Rejected',       cls: 'bg-rose-700/80 text-rose-100' },
  suspended:      { label: 'Suspended',      cls: 'bg-orange-700/80 text-orange-100' },
  archived:       { label: 'Archived',       cls: 'bg-zinc-800 text-zinc-400' },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SAR: '﷼', INR: '₹', PKR: '₨',
  TRY: '₺', EGP: 'E£', QAR: 'QR', KWD: 'KD', BHD: 'BD', OMR: 'OMR',
  JOD: 'JD', MAD: 'MAD', MYR: 'RM', SGD: 'S$', IDR: 'Rp', PHP: '₱', BRL: 'R$', JPY: '¥'
};
function cs(code?: string): string { return code ? (CURRENCY_SYMBOLS[code] || code) : '$'; }

const AMENITY_ICONS: Record<string, { icon: React.ElementType; label: string }> = {
  wifi:    { icon: Wifi,      label: 'WiFi' },
  ac:      { icon: Wind,      label: 'A/C' },
  food:    { icon: Coffee,    label: 'Food' },
  parking: { icon: Car,       label: 'Parking' },
  private: { icon: Maximize2, label: 'Private' },
  power:   { icon: Zap,       label: 'Power' },
};

interface Props {
  venue: Venue;
  showStatus?: boolean;
}

const VenueCardV2Inner: React.FC<Props> = ({ venue, showStatus = false }) => {
  const navigate = useNavigate();
  const { mutate: trackImpression } = useTrackImpression();
  const tracked = useRef(false);
  const gameList = venue.games ? venue.games.split(',').map(g => g.trim()).filter(Boolean).slice(0, 3) : [];

  useEffect(() => {
    if (!tracked.current && venue.id) {
      tracked.current = true;
      trackImpression({ venueId: venue.id, eventType: 'card_view' });
    }
  }, [venue.id]);

  return (
    <div
      onClick={() => navigate(`/venues/${venue.slug || venue.id}`)}
      className="group relative bg-[#0a0a0c] border border-white/5 rounded-2xl overflow-hidden cursor-pointer hover:border-white/15 transition-all duration-300 hover:-translate-y-1"
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-zinc-900">
        <OptimizedImage
          src={venue.card_image || (venue.images && venue.images[0]) || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80'}
          alt={venue.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          width={600}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent opacity-60" />

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {showStatus && venue.status && STATUS_BADGE[venue.status as VenueStatus] && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[venue.status as VenueStatus].cls}`}>
              {STATUS_BADGE[venue.status as VenueStatus].label}
            </span>
          )}
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 text-zinc-300">
            <Monitor className="w-3 h-3 inline mr-1 -mt-px" />{venue.stations} stations
          </span>
        </div>

        {/* Price */}
        {venue.price_per_hour != null && venue.price_per_hour > 0 && (
          <div className="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 backdrop-blur-sm">
            {cs(venue.currency)}{venue.price_per_hour}/hr
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Location */}
        <div className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-rose-500 font-medium mb-1.5">
          <MapPin className="w-3 h-3" />
          {venue.city}{venue.country ? `, ${venue.country}` : ''}
          {venue.distance_km != null && (
            <span className="ml-auto text-zinc-500 normal-case tracking-normal">{venue.distance_km} km</span>
          )}
        </div>

        {/* Name */}
        <h3 className="text-base font-semibold text-white mb-2 line-clamp-1 group-hover:text-rose-400 transition-colors">
          {venue.name}
        </h3>

        {/* Games */}
        {gameList.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {gameList.map((game, i) => (
              <span key={i} className="inline-flex items-center gap-1 text-[11px] text-zinc-400 bg-white/5 border border-white/5 rounded-md px-2 py-0.5">
                <Gamepad2 className="w-2.5 h-2.5 text-zinc-500" />{game}
              </span>
            ))}
          </div>
        )}

        {/* Amenities */}
        {venue.amenities && venue.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {venue.amenities.slice(0, 4).map(key => {
              const a = AMENITY_ICONS[key];
              if (!a) return null;
              const Icon = a.icon;
              return (
                <span key={key} className="inline-flex items-center gap-1 text-[10px] text-zinc-500 bg-white/[0.03] rounded px-1.5 py-0.5">
                  <Icon className="w-2.5 h-2.5" />{a.label}
                </span>
              );
            })}
            {venue.amenities.length > 4 && (
              <span className="text-[10px] text-zinc-600">+{venue.amenities.length - 4}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-2.5 border-t border-white/5">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{venue.hours || 'Open 24/7'}</span>
        </div>
      </div>
    </div>
  );
};

export const VenueCardV2 = React.memo(VenueCardV2Inner);
