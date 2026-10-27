import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Plus, Trash2, ChevronDown, Pencil, Pause, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMyLfgListings, useDeleteLfgListing, usePublishLfgListing, usePauseLfgListing } from '@/hooks/competitive/useLfg';
import { CompetitivePageShell } from '@/components/competitive/CompetitivePageShell';
import { PlayerLfgCard } from '@/components/competitive/PlayerLfgCard';
import { TeamLfgCard } from '@/components/competitive/TeamLfgCard';
import type { LfgListing, LfgStatus } from '@/types/competitive';

function StatusPip({ status }: { status: LfgStatus }) {
  const map: Record<LfgStatus, { dot: string; label: string; text: string }> = {
    draft:     { dot: 'bg-white/30',        label: 'Draft',   text: 'text-white/50' },
    published: { dot: 'bg-emerald-400',      label: 'Live',    text: 'text-emerald-400' },
    paused:    { dot: 'bg-amber-400',        label: 'Paused',  text: 'text-amber-400' },
    expired:   { dot: 'bg-white/20',         label: 'Expired', text: 'text-white/35' },
    closed:    { dot: 'bg-white/20',         label: 'Closed',  text: 'text-white/35' },
    removed:   { dot: 'bg-red-500',          label: 'Removed', text: 'text-red-400' },
  };
  const { dot, label, text } = map[status] ?? map.draft;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function isTeam(listing: LfgListing) {
  return ['looking_for_player', 'competitive_roster'].includes(listing.intent ?? '');
}

function ListingRow({ listing }: { listing: LfgListing }) {
  const [open, setOpen] = useState(false);
  const deleteMutation = useDeleteLfgListing(listing.id);
  const publishMutation = usePublishLfgListing(listing.id);
  const pauseMutation = usePauseLfgListing(listing.id);
  const isReadonly = ['expired', 'closed', 'removed'].includes(listing.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="overflow-hidden rounded-sm border border-white/[0.07] bg-white/[0.02] shadow-[0_2px_12px_rgba(0,0,0,0.35)]"
      style={{ willChange: 'transform' }}
    >
      {/* Card preview */}
      <div className="pointer-events-none select-none opacity-90 transition-opacity duration-200 hover:opacity-100">
        {isTeam(listing)
          ? <TeamLfgCard listing={listing} gameRoles={[]} />
          : <PlayerLfgCard listing={listing} />}
      </div>

      {/* Status bar / expand toggle */}
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileTap={{ scale: 0.98 }}
        className="flex w-full items-center justify-between border-t border-white/[0.06] px-4 py-2.5 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/20"
      >
        <StatusPip status={listing.status} />
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        >
          <ChevronDown className="h-3.5 w-3.5 text-white/30" />
        </motion.span>
      </motion.button>

      {/* Expanded action tray */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="tray"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.06] bg-black/20 px-4 py-3">
              {/* Edit */}
              {!isReadonly && (
                <Link
                  to={`/competitive/lfg/${listing.id}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-white/[0.1] px-3 py-1.5 text-[12px] text-white/60 transition-all hover:-translate-y-px hover:border-white/25 hover:text-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Link>
              )}

              {/* Pause / Resume */}
              {listing.status === 'published' && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  disabled={pauseMutation.isPending}
                  onClick={() => pauseMutation.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-white/[0.1] px-3 py-1.5 text-[12px] text-white/60 transition-all hover:-translate-y-px hover:border-white/25 hover:text-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] disabled:opacity-50"
                >
                  {pauseMutation.isPending
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Pause className="h-3 w-3" />}
                  Pause
                </motion.button>
              )}
              {listing.status === 'paused' && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  disabled={publishMutation.isPending}
                  onClick={() => publishMutation.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[12px] text-emerald-400 transition-all hover:-translate-y-px hover:bg-emerald-500/20 hover:shadow-[0_4px_12px_rgba(52,211,153,0.15)] disabled:opacity-50"
                >
                  {publishMutation.isPending
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Play className="h-3 w-3" />}
                  Resume
                </motion.button>
              )}
              {listing.status === 'draft' && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  disabled={publishMutation.isPending}
                  onClick={() => publishMutation.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-sm bg-rose-500 px-3 py-1.5 text-[12px] text-white transition-all hover:-translate-y-px hover:bg-rose-600 hover:shadow-[0_4px_12px_rgba(244,63,94,0.4)] disabled:opacity-50"
                >
                  {publishMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                  Publish
                </motion.button>
              )}

              {/* Delete — always available */}
              <motion.button
                type="button"
                whileTap={{ scale: 0.93 }}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
                className="ml-auto inline-flex items-center gap-1.5 rounded-sm border border-red-500/20 px-3 py-1.5 text-[12px] text-red-400/70 transition-all hover:-translate-y-px hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400 hover:shadow-[0_4px_12px_rgba(239,68,68,0.2)] disabled:opacity-50"
              >
                {deleteMutation.isPending
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Trash2 className="h-3 w-3" />}
                Delete
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function LfgMyListingsPage() {
  const { data: listings, isLoading, isError, refetch } = useMyLfgListings();

  return (
    <CompetitivePageShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-white/40 mb-1">VALORANT</p>
            <h1 className="[font-family:var(--font-heading)] font-black text-[28px] text-white leading-tight">
              My Listings
            </h1>
          </div>
          <div className="flex gap-2">
            <Link
              to="/competitive/looking-for-team/create"
              className="inline-flex items-center gap-1.5 border border-white/[0.08] px-3 py-2 text-[13px] text-white/60 transition-all hover:-translate-y-px hover:border-white/20 hover:text-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            >
              <Plus className="h-3.5 w-3.5" />
              LFT
            </Link>
            <Link
              to="/competitive/looking-for-player/create"
              className="inline-flex items-center gap-1.5 border border-white/[0.08] px-3 py-2 text-[13px] text-white/60 transition-all hover:-translate-y-px hover:border-white/20 hover:text-white hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            >
              <Plus className="h-3.5 w-3.5" />
              LFP
            </Link>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-5 w-5 animate-spin text-white/30" />
          </div>
        )}

        {isError && (
          <div className="space-y-3">
            <p className="text-[14px] text-white/50">Couldn't load your listings.</p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="text-[13px] text-rose-400 hover:text-rose-300 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {listings && listings.length > 0 ? (
              <motion.div
                className="space-y-4"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.06 } },
                }}
              >
                <AnimatePresence mode="popLayout">
                  {listings.map((listing) => (
                    <ListingRow key={listing.id} listing={listing} />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                className="border border-white/[0.08] bg-white/[0.02] p-10 flex flex-col items-center gap-4 text-center"
              >
                <p className="text-[16px] font-semibold text-white">No listings yet</p>
                <p className="text-[14px] text-white/50">Create a listing to find a team or recruit players.</p>
                <Link
                  to="/competitive/looking-for-team/create"
                  className="mt-2 bg-rose-500 hover:bg-rose-600 text-white text-[13px] px-6 py-2.5 transition-all hover:-translate-y-px hover:shadow-[0_4px_16px_rgba(244,63,94,0.4)]"
                >
                  Create LFT listing
                </Link>
              </motion.div>
            )}
          </>
        )}
      </div>
    </CompetitivePageShell>
  );
}
