import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Users, Trash2, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  resolveOrganizerBannerSrc,
  useOrganizerCardGameAssets,
} from '@/hooks/useOrganizerGameAssets';

export type OrganizerTournamentCardProps = {
  id: string;
  name: string;
  game: string;
  slug: string;
  status: string;
  max_participants: number;
  current_participants: number;
  prize_pool?: string;
  entry_fee?: string;
  is_online?: boolean;
  image_url?: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  lite?: boolean;
  selected?: boolean;
  selectable?: boolean;
  onToggleSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
};

function formatCardDate(start_date?: string) {
  if (!start_date) return 'Date TBD';
  return new Date(start_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function statusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge className="bg-emerald-600/90 text-white border-none">COMPLETED</Badge>;
    case 'ongoing':
      return <Badge className="bg-red-600 text-white border-none">LIVE</Badge>;
    case 'draft':
      return <Badge className="bg-zinc-700 text-zinc-200 border-none">DRAFT</Badge>;
    case 'cancelled':
      return <Badge className="bg-red-500/20 text-red-300 border-red-500/40">CANCELLED</Badge>;
    default:
      return <Badge className="bg-blue-600/90 text-white border-none">UPCOMING</Badge>;
  }
}

export const OrganizerTournamentCard = React.memo(function OrganizerTournamentCard({
  id,
  name,
  game,
  slug,
  status,
  max_participants,
  current_participants,
  prize_pool,
  entry_fee,
  is_online,
  image_url,
  start_date,
  lite = false,
  selected = false,
  selectable = false,
  onToggleSelect,
  onDelete,
}: OrganizerTournamentCardProps) {
  const navigate = useNavigate();
  const [bannerFailed, setBannerFailed] = useState(false);
  const gameAssets = useOrganizerCardGameAssets(game, !lite);

  const banner = useMemo(() => {
    if (bannerFailed) {
      return resolveOrganizerBannerSrc(undefined, gameAssets);
    }
    return resolveOrganizerBannerSrc(image_url, gameAssets);
  }, [bannerFailed, gameAssets, image_url]);

  const gameLogo = gameAssets.gameLogo;
  const managePath = `/organizer/tournament/${slug || id}`;
  const hasCustomImage = Boolean(image_url && !bannerFailed);
  const hasCarousel = !lite && !hasCustomImage && gameAssets.rawgScreenshots.length > 0;

  const handleManage = useCallback(() => {
    navigate(managePath);
  }, [managePath, navigate]);

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(id);
    },
    [id, onDelete],
  );

  const handleToggleSelect = useCallback(() => {
    onToggleSelect?.(id);
  }, [id, onToggleSelect]);

  return (
    <article
      className={cn(
        'group relative flex h-[380px] flex-col overflow-hidden border bg-[#0a0a0c] transition-transform duration-300 hover:-translate-y-1',
        selected ? 'border-rose-500/70 ring-1 ring-rose-500/40' : 'border-white/10 hover:border-white/20',
      )}
    >
      <div className="relative min-h-[180px] flex-1 overflow-hidden bg-black">
        {hasCarousel ? (
          <AnimatePresence mode="wait">
            <motion.img
              key={banner.carouselKey ?? banner.src}
              src={banner.src}
              alt=""
              loading="lazy"
              decoding="async"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
              onError={() => setBannerFailed(true)}
              className="absolute inset-0 h-full w-full object-cover object-center opacity-50 group-hover:opacity-60"
            />
          </AnimatePresence>
        ) : (
          <img
            src={banner.src}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setBannerFailed(true)}
            className="absolute inset-0 h-full w-full object-cover object-center opacity-50 transition-opacity duration-700 group-hover:opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/50 to-transparent" />

        <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
          {selectable && (
            <label
              className="flex shrink-0 items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={selected}
                onCheckedChange={handleToggleSelect}
                aria-label={`Select ${name}`}
                className="h-3.5 w-3.5 rounded-[2px] border-white/15 bg-black/35 shadow-none data-[state=checked]:border-rose-400/50 data-[state=checked]:bg-rose-500/70 [&_svg]:h-2.5 [&_svg]:w-2.5"
              />
            </label>
          )}
          {gameLogo && !lite ? (
            <div className="h-9 w-9 overflow-hidden border border-white/20 bg-black/70 p-0.5">
              <img src={gameLogo} alt={game} className="h-full w-full object-cover" loading="lazy" />
            </div>
          ) : null}
          {statusBadge(status)}
        </div>

        {!is_online && (
          <div className="absolute right-3 top-3 z-10">
            <Badge variant="outline" className="border-white/10 bg-black/70 text-purple-400">
              LAN
            </Badge>
          </div>
        )}
      </div>

      <div className="relative z-10 flex flex-col gap-3 p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400">{game}</p>
          <h3 className="mt-1 line-clamp-2 text-lg font-semibold text-white">{name}</h3>
        </div>

        <div className="space-y-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{formatCardDate(start_date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>{current_participants}/{max_participants} teams</span>
          </div>
          {(prize_pool && prize_pool !== '0') || (entry_fee && entry_fee !== 'Free' && entry_fee !== '0') ? (
            <p className="text-zinc-500">
              {prize_pool && prize_pool !== '0' ? `Prize ${prize_pool}` : null}
              {entry_fee && entry_fee !== 'Free' && entry_fee !== '0' ? ` · Entry ${entry_fee}` : null}
            </p>
          ) : null}
        </div>

        <div className="mt-auto flex gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            className="h-9 flex-1 rounded-none text-[11px]"
            onClick={handleManage}
          >
            <Settings2 className="mr-1.5 h-3.5 w-3.5" />
            Manage
          </Button>
          {onDelete && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-none"
              onClick={handleDelete}
              aria-label={`Delete ${name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
});
