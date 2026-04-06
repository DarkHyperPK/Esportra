import { useState, useEffect } from 'react';
import { Monitor, User, Clock, Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SeatStatus } from '@/types/venue';

interface VenueSeatGridProps {
  seats: SeatStatus[];
  isOnline: boolean;
  isLoading: boolean;
  freeCount: number;
  occupiedCount: number;
  reservedCount: number;
}

const STATUS_STYLES = {
  free: {
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    label: 'Free',
  },
  occupied: {
    border: 'border-rose-500/30',
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    label: 'Occupied',
  },
  reserved: {
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    label: 'Reserved',
  },
} as const;

/** Format remaining time from an ISO expiry timestamp. */
function formatTimeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expiring';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m left`;
}

function SeatCard({ seat }: { seat: SeatStatus }) {
  const style = STATUS_STYLES[seat.status];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={`bg-[#0a0a0c] border ${style.border} rounded-xl p-3.5 flex flex-col gap-2`}
      aria-label={`Station ${seat.stationId}: ${style.label}`}
    >
      <div className="flex items-center justify-between">
        <Monitor className={`w-4 h-4 ${style.text}`} aria-hidden="true" />
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
          {style.label}
        </span>
      </div>
      <p className="text-xs font-medium text-white truncate" title={seat.stationId}>
        {seat.stationId}
      </p>
      {seat.displayName && seat.status === 'occupied' && (
        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400 truncate">
          <User className="w-3 h-3 shrink-0" aria-hidden="true" /> {seat.displayName}
        </span>
      )}
      {seat.expiresAt && (
        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500">
          <Clock className="w-3 h-3 shrink-0" aria-hidden="true" /> {formatTimeRemaining(seat.expiresAt)}
        </span>
      )}
    </motion.div>
  );
}

function SkeletonCards() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-[#0a0a0c] border border-white/5 rounded-xl p-3.5 animate-pulse">
          <div className="flex items-center justify-between mb-2">
            <div className="w-4 h-4 bg-zinc-800 rounded" />
            <div className="w-12 h-4 bg-zinc-800 rounded" />
          </div>
          <div className="w-20 h-3 bg-zinc-800 rounded mb-2" />
          <div className="w-16 h-3 bg-zinc-800 rounded" />
        </div>
      ))}
    </>
  );
}

export function VenueSeatGrid({
  seats,
  isOnline,
  isLoading,
  freeCount,
  occupiedCount,
  reservedCount,
}: VenueSeatGridProps) {
  // Refresh time-remaining display every 30s
  const [, setTick] = useState(0);
  useEffect(() => {
    if (seats.some(s => s.expiresAt)) {
      const timer = setInterval(() => setTick(t => t + 1), 30_000);
      return () => clearInterval(timer);
    }
  }, [seats]);

  return (
    <section aria-label="Live station availability">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Monitor className="w-5 h-5 text-rose-500" aria-hidden="true" /> Live Stations
        </h2>

        {/* Online / Offline badge */}
        {isOnline ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
            <Wifi className="w-3 h-3" aria-hidden="true" /> Online
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-500">
            <WifiOff className="w-3 h-3" aria-hidden="true" /> Offline
          </span>
        )}

        {/* Count badges (only when we have data) */}
        {seats.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{freeCount} free</span>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-rose-500/10 text-rose-400">{occupiedCount} in use</span>
            {reservedCount > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400">{reservedCount} reserved</span>
            )}
          </div>
        )}
      </div>

      {/* Grid / Empty / Loading */}
      {isLoading ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          <SkeletonCards />
        </div>
      ) : !isOnline && seats.length === 0 ? (
        <div className="bg-[#0a0a0c] border border-white/5 rounded-xl p-8 text-center">
          <WifiOff className="w-8 h-8 text-zinc-600 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-zinc-500">Venue is currently offline</p>
          <p className="text-xs text-zinc-600 mt-1">Station data will appear when the venue connects.</p>
        </div>
      ) : isOnline && seats.length === 0 ? (
        <div className="bg-[#0a0a0c] border border-white/5 rounded-xl p-8 text-center">
          <Monitor className="w-8 h-8 text-zinc-600 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-zinc-500">No stations connected</p>
          <p className="text-xs text-zinc-600 mt-1">Stations will appear here once they come online.</p>
        </div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          <AnimatePresence>
            {seats.map(seat => (
              <SeatCard key={seat.stationId} seat={seat} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
