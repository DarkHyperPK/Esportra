import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Trophy, CheckCircle, Clock, MapPin, Eye } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { useAdmin } from '@/contexts/AdminContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useRawgGame } from '@/hooks/useRawgGame';
import { cn } from '@/lib/utils';

const REGION_LABELS: Record<string, string> = {
  'na-east': 'NA East', 'na-west': 'NA West', 'latam': 'LATAM',
  'eu': 'EU', 'me': 'ME', 'sea': 'SEA', 'oce': 'OCE',
};

interface TournamentCardProps {
  id: string;
  name: string;
  game: string;
  date: string;
  time: string;
  venue: string;
  max_participants: number;
  current_participants: number;
  status: 'draft' | 'published' | 'open' | 'closed' | 'ongoing' | 'completed' | 'cancelled';
  team_size: number;
  prize_pool: string;
  user_id?: string;
  organizer_id?: string;
  entry_fee?: string;
  is_online?: boolean;
  image_url?: string;
  registrationData?: { id: string } | null;
  currentUserId?: string;
  slug: string;
  onDelete?: () => void;
  organizer_name?: string;
  start_date?: string;
  end_date?: string;
  winner_name?: string;
  title_sponsor_name?: string;
  region?: string;
  currency?: string;
}

const TournamentCardInner: React.FC<TournamentCardProps> = ({
  id,
  name,
  game,
  date,
  time,
  venue,
  max_participants,
  current_participants,
  prize_pool,
  entry_fee,
  is_online,
  image_url,
  registrationData,
  user_id,
  organizer_id,
  currentUserId,
  slug,
  status,
  onDelete,
  organizer_name,
  start_date,
  end_date,
  winner_name,
  title_sponsor_name,
  region,
  currency,
}) => {
  const navigate = useNavigate();
  const { currentRole } = useRole();
  const admin = useAdmin();
  const ownerId = organizer_id || user_id;
  const isOrganizer = (currentRole === 'organizer' && currentUserId && ownerId && currentUserId === ownerId) || admin.hasPermission('tournaments:edit');
  const [isHovered, setIsHovered] = useState(false);
  const [bannerFailed, setBannerFailed] = useState(false);

  // Use the custom hook for game images and carousel
  const { gameLogo, gameBanner, rawgScreenshots, carouselIndex } = useRawgGame(game);

  const isCustomVideo = image_url?.includes('youtube.com/embed/');
  const hasCustomImage = image_url && !isCustomVideo && !bannerFailed;

  // Date-Driven Status Logic
  const now = new Date();
  const startDate = start_date ? new Date(start_date) : new Date(`${date}T${time}`);
  const endDate = end_date ? new Date(end_date) : (startDate ? new Date(startDate.getTime() + 4 * 60 * 60 * 1000) : null);

  const isUpcoming = status === 'open' || status === 'published' || status === 'check_in';
  const isLive = status === 'ongoing';
  const isCompleted = status === 'completed';

  // Status Badge Logic — trust DB status as source of truth
  const getStatusBadge = () => {
    if (status === 'cancelled') {
      return (
        <Badge className="bg-red-500/20 text-red-400 border-red-500/50">
          CANCELLED
        </Badge>
      );
    }

    if (status === 'completed') {
      return (
        <Badge className="bg-emerald-600 text-white border-none shadow-[0_0_10px_rgba(16,185,129,0.4)]">
          COMPLETED
        </Badge>
      );
    }

    if (status === 'ongoing') {
      return (
        <Badge className="bg-red-600 text-white animate-pulse border-none shadow-[0_0_10px_rgba(220,38,38,0.5)]">
          <span className="w-2 h-2 rounded-full bg-white mr-2 animate-ping" />
          LIVE NOW
        </Badge>
      );
    }

    // Default to Upcoming / Registration Status
    if (status === 'published') {
      return (
        <Badge className="bg-blue-600 text-white border-none shadow-[0_0_10px_rgba(37,99,235,0.4)]">
          UPCOMING
        </Badge>
      );
    }

    return (
      <Badge className="bg-blue-600 text-white border-none shadow-[0_0_10px_rgba(37,99,235,0.4)]">
        UPCOMING
      </Badge>
    );
  };


  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative h-[380px] w-full overflow-hidden bg-[#0a0a0c] border border-white/5 cursor-pointer transition-transform duration-300 hover:-translate-y-1"
      onClick={() => navigate(`/tournaments/${slug || id}`)}
    >
      {/* 1. Background Image Layer */}
      <div className="absolute inset-0 z-0 bg-black">
        <div
          className="w-full h-full relative"
        >
          {/* Banner priority: custom image → RAWG screenshots → gameBanner → placeholder */}
          {hasCustomImage ? (
            <img
              src={image_url}
              className="w-full h-full object-cover object-center opacity-50 group-hover:opacity-60 transition-opacity"
              alt={name}
              onError={() => setBannerFailed(true)}
            />
          ) : (rawgScreenshots?.length || 0) > 0 ? (
            <AnimatePresence mode="wait">
              <motion.img
                key={rawgScreenshots[carouselIndex % rawgScreenshots.length]}
                src={rawgScreenshots[carouselIndex % rawgScreenshots.length]}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="absolute inset-0 w-full h-full object-cover object-center opacity-50"
                alt={`${game} screenshot`}
              />
            </AnimatePresence>
          ) : gameBanner ? (
            <img
              src={gameBanner}
              className="w-full h-full object-cover object-center opacity-50"
              alt={game}
            />
          ) : (
            <img
              src="/placeholder.svg"
              className="w-full h-full object-cover object-center opacity-50"
              alt={name}
            />
          )}
        </div>

        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/50 to-transparent" />
      </div>

      {/* 2. Top Bar (Floating) */}
      <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-start z-10 transition-transform duration-300 group-hover:translate-y-0">
        <div className="flex gap-2">
          {getStatusBadge()}
          {!is_online && (
            <Badge variant="outline" className="bg-black/70 border-white/10 text-purple-400">
              LAN
            </Badge>
          )}
          {entry_fee && entry_fee !== 'Free' && entry_fee !== '0' && entry_fee !== '$0' && (
            <Badge variant="outline" className="bg-rose-500/10 border-rose-500/30 text-rose-300">
              💳 Paid
            </Badge>
          )}
        </div>

        <div className="flex text-xs font-medium text-gray-300 gap-2">
          {organizer_name && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 border border-white/10">
              <span className="text-gray-400">by</span>
              <span className="text-white truncate max-w-[100px]">{organizer_name}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 border border-white/10">
            <Users className="w-3.5 h-3.5" />
            <span>{current_participants}/{max_participants}</span>
          </div>
        </div>
      </div>

      {/* 3. Bottom Glass Pane content */}
      <div className="absolute bottom-0 inset-x-0 p-5 z-20 flex flex-col gap-4">

        {/* Main Info */}
        <div className="transform transition-transform duration-300 group-hover:-translate-y-2">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold tracking-widest text-rose-400 uppercase font-heading">
              {game}
            </span>
            {region && REGION_LABELS[region] && (
              <span className="text-[10px] font-bold tracking-wider text-white/60 uppercase px-1.5 py-0.5 bg-white/5 border border-white/10">
                {REGION_LABELS[region]}
              </span>
            )}
            <div className="h-[1px] flex-grow bg-gradient-to-r from-rose-500/50 to-transparent" />
          </div>

          <h3 className="text-2xl font-bold text-white font-heading leading-tight mb-3 line-clamp-2 transition-all">
            {name}
          </h3>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-400 mb-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span>{date}</span>
            </div>
            {venue && !is_online && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span className="line-clamp-1 max-w-[120px]">{venue.replace('Venue ', '')}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-esports-green font-medium">
              <Trophy className="w-4 h-4" />
              <span>{prize_pool} {currency || 'USD'}</span>
            </div>
          </div>

          {/* Winner Display */}
          {isCompleted && winner_name && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 border border-rose-500/20">
              <Trophy className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wider truncate">
                Winner: {winner_name}
              </span>
            </div>
          )}

          {/* Title Sponsor Badge */}
          {title_sponsor_name && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-full w-fit">
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Powered by</span>
              <span className="text-[10px] font-bold text-zinc-300">{title_sponsor_name}</span>
            </div>
          )}
        </div>

        {/* Action Button Area - Slide Up on Hover */}
        <div className="h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 transition-all duration-300 overflow-hidden">
          {isOrganizer ? (
            <div className="flex gap-2 w-full pt-2">
              <Button
                onClick={(e) => { e.stopPropagation(); navigate(`/organizer/tournament/${slug || id}`); }}
                className="flex-1 bg-white text-black hover:bg-gray-200 font-bold"
              >
                Manage
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="bg-white/5 border-white/10 hover:bg-white/10 text-white"
                onClick={(e) => { e.stopPropagation(); navigate(`/tournaments/${slug || id}`); }}
                title="View Public Page"
              >
                <Eye className="w-4 h-4" />
              </Button>
              {onDelete && (
                <Button variant="destructive" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                  <span className="sr-only">Delete</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </Button>
              )}
            </div>
          ) : registrationData ? (
            <Button
              className="w-full font-bold tracking-wide bg-green-500 hover:bg-green-400 text-white shadow-lg shadow-green-900/20"
              onClick={() => navigate(`/tournaments/${slug || id}`)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Registered
            </Button>
          ) : isLive ? (
            <Button
              className="w-full font-bold tracking-wide bg-red-600 hover:bg-red-500 animate-pulse text-white font-heading"
              onClick={() => navigate(`/tournaments/${slug || id}`)}
            >
              LIVE NOW
            </Button>
          ) : isUpcoming ? (
            <Button
              className="w-full font-bold tracking-wide bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20 font-heading"
              onClick={() => navigate(`/tournaments/${slug || id}`)}
            >
              Join Event
            </Button>
          ) : (
            <Button
              className="w-full font-bold tracking-wide bg-gray-700 hover:bg-gray-600 text-white font-heading"
              onClick={() => navigate(`/tournaments/${slug || id}`)}
            >
              View Info
            </Button>
          )}
        </div>
      </div>

      {/* Decorative Glow Border */}
      <div className="absolute inset-0 border border-white/5 group-hover:border-white/20 transition-colors duration-300 pointer-events-none" />

    </div>
  );
};

export const TournamentCard = React.memo(TournamentCardInner);
