import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Trash2, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { getGameByName } from '@/utils/gameFeatures';

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
  selected?: boolean;
  selectable?: boolean;
  onToggleSelect?: (id: string) => void;
  onDelete?: () => void;
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
  selected = false,
  selectable = false,
  onToggleSelect,
  onDelete,
}: OrganizerTournamentCardProps) {
  const navigate = useNavigate();

  const bannerSrc = useMemo(() => {
    if (image_url) return image_url;
    return getGameByName(game)?.logo || '/placeholder.svg';
  }, [game, image_url]);

  const managePath = `/organizer/tournament/${slug || id}`;

  return (
    <article
      className={cn(
        'group relative flex h-[320px] flex-col overflow-hidden border bg-[#0a0a0c] transition-colors',
        selected ? 'border-rose-500/70 ring-1 ring-rose-500/40' : 'border-white/10 hover:border-white/20',
      )}
    >
      <div className="relative h-[140px] shrink-0 overflow-hidden bg-black">
        <img
          src={bannerSrc}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/40 to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          {selectable && (
            <label
              className="flex h-8 w-8 items-center justify-center rounded-none border border-white/20 bg-black/70"
              onClick={(e) => e.stopPropagation()}
            >
              <Checkbox
                checked={selected}
                onCheckedChange={() => onToggleSelect?.(id)}
                aria-label={`Select ${name}`}
              />
            </label>
          )}
          {statusBadge(status)}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400">{game}</p>
          <h3 className="mt-1 line-clamp-2 text-base font-semibold text-white">{name}</h3>
        </div>

        <div className="mt-auto space-y-2 text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Calendar className="h-3.5 w-3.5 shrink-0" />
            <span>{formatCardDate(start_date)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>{current_participants}/{max_participants} teams</span>
            {!is_online && <span className="text-purple-300">· LAN</span>}
          </div>
          {(prize_pool && prize_pool !== '0') || (entry_fee && entry_fee !== 'Free' && entry_fee !== '0') ? (
            <p className="text-zinc-500">
              {prize_pool && prize_pool !== '0' ? `Prize ${prize_pool}` : null}
              {entry_fee && entry_fee !== 'Free' && entry_fee !== '0' ? ` · Entry ${entry_fee}` : null}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            className="h-9 flex-1 rounded-none text-[11px]"
            onClick={() => navigate(managePath)}
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
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
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
