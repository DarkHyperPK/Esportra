import React, { useState, useEffect, useRef } from 'react';
import { Button, SuccessButton } from '@/components/ui/button';
import { JackButton } from '@/components/ui/JackButton';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Trophy, CheckCircle, MapPin, Eye } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { useAdmin } from '@/hooks/useAdmin';
import { motion, AnimatePresence } from 'framer-motion';
import { useRawgGame } from '@/hooks/useRawgGame';
import { GameLogoImage } from '@/components/games/GameLogoImage';
import { trackImpression, trackClick } from '@/hooks/useSponsors';
import type { TournamentCardBadge } from '@/types/tournament';

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
  card_badge?: TournamentCardBadge | null;
  region?: string;
  currency?: string;
}

const TournamentCardInner: React.FC<TournamentCardProps> = ({
  id,
  name,
  game,
  date,
  time: _time,
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
  start_date: _start_date,
  end_date: _end_date,
  winner_name,
  card_badge,
  region,
  currency,
}) => {
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!card_badge || !cardRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        trackImpression(card_badge.sponsorId, 'card_badge', id);
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [card_badge, id]);
  const { currentRole } = useRole();
  const admin = useAdmin();
  const ownerId = organizer_id || user_id;
  const isOrganizer = (currentRole === 'organizer' && currentUserId && ownerId && currentUserId === ownerId) || admin.hasPermission('tournaments:edit');
  const [bannerFailed, setBannerFailed] = useState(false);

  // Use the custom hook for game images and carousel
  const { gameBanner, rawgScreenshots, carouselIndex } = useRawgGame(game);

  const isCustomVideo = image_url?.includes('youtube.com/embed/');
  const hasCustomImage = image_url && !isCustomVideo && !bannerFailed;

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
      ref={cardRef}
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
              className="w-full h-full object-cover object-center opacity-45 group-hover:opacity-55 transition-opacity"
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
                className="absolute inset-0 w-full h-full object-cover object-center opacity-45"
                alt={`${game} screenshot`}
              />
            </AnimatePresence>
          ) : gameBanner ? (
            <img
              src={gameBanner}
              className="w-full h-full object-cover object-center opacity-45"
              alt={game}
            />
          ) : (
            <img
              src="/placeholder.svg"
              className="w-full h-full object-cover object-center opacity-45"
              alt={name}
            />
          )}
        </div>

        {/* Darken banner so title and metadata stay readable */}
        <div className="absolute inset-0 bg-black/15" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/55 to-transparent" />
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
            <GameLogoImage
              gameName={game}
              className="h-9 w-auto max-w-[140px] object-contain object-left"
              alt={`${game} logo`}
            />
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

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-gray-300 mb-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span>{date}</span>
            </div>
            {venue && !is_online && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gray-400" />
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

          {card_badge && (
            card_badge.ctaUrl ? (
              <a
                href={card_badge.ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => { e.stopPropagation(); trackClick(card_badge.sponsorId, 'card_badge', id); }}
                className="flex items-center px-2.5 py-1 bg-white/5 border border-white/10 rounded-full w-fit hover:bg-white/10 transition-colors"
              >
                <img src={card_badge.logoUrl} alt="" className="h-4 w-auto object-contain" />
              </a>
            ) : (
              <div className="flex items-center px-2.5 py-1 bg-white/5 border border-white/10 rounded-full w-fit">
                <img src={card_badge.logoUrl} alt="" className="h-4 w-auto object-contain" />
              </div>
            )
          )}
        </div>

        {/* Action Button Area - Slide Up on Hover */}
        <div className="h-0 opacity-0 group-hover:h-auto group-hover:opacity-100 transition-all duration-300 overflow-hidden">
          {isOrganizer ? (
            <div className="flex gap-2 w-full pt-2">
              <JackButton
                onClick={(e) => { e.stopPropagation(); navigate(`/organizer/tournament/${slug || id}`); }}
                className="flex-1"
              >
                Manage
              </JackButton>
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
            <SuccessButton
              className="w-full font-bold tracking-wide"
              onClick={() => navigate(`/tournaments/${slug || id}`)}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Registered
            </SuccessButton>
          ) : isLive ? (
            <Button
              className="w-full font-bold tracking-wide bg-red-600 hover:bg-red-500 animate-pulse text-white font-heading"
              onClick={() => navigate(`/tournaments/${slug || id}`)}
            >
              LIVE NOW
            </Button>
          ) : isUpcoming ? (
            <Button
              className="w-full font-bold tracking-wide bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-900/20 font-heading"
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
