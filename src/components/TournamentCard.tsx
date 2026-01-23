import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Trophy, CheckCircle } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { motion } from 'framer-motion';
import { useRawgGame } from '@/hooks/useRawgGame';

interface TournamentCardProps {
  id: string;
  name: string;
  game: string;
  date: string;
  time: string;
  venue: string;
  max_participants: number;
  current_participants: number;
  status: 'upcoming' | 'ongoing' | 'completed';
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
}

export const TournamentCard: React.FC<TournamentCardProps> = ({
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
}) => {
  const navigate = useNavigate();
  const { currentRole } = useRole();
  const ownerId = organizer_id || user_id;
  const isOrganizer = currentRole === 'organizer' && currentUserId && ownerId && currentUserId === ownerId;

  // Use the custom hook for game images and carousel
  const { gameLogo, gameBanner, screenshots, carouselIndex } = useRawgGame(game);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="card-esports hover-lift rounded-lg flex flex-col relative overflow-hidden min-h-[280px] w-full"
    >
      {/* Carousel background images with smooth fade using framer-motion */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-gray-900">
        {screenshots.length > 0 ? (
          screenshots.map((img, idx) => {
            const isActive = carouselIndex === idx;
            return (
              <motion.div
                key={`carousel-bg-${idx}`}
                className="absolute inset-0 w-full h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: isActive ? 0.25 : 0 }}
                transition={{
                  duration: 1.5,
                  ease: [0.4, 0, 0.2, 1],
                  type: 'tween'
                }}
                style={{
                  pointerEvents: 'none',
                  zIndex: isActive ? 1 : 0,
                  willChange: 'opacity'
                }}
              >
                <img
                  src={img}
                  alt={game + ' screenshot ' + (idx + 1)}
                  className="w-full h-full object-cover select-none"
                  style={{
                    filter: 'blur(3px)',
                    display: 'block'
                  }}
                  onLoad={() => {
                    console.log(`[TournamentCard] Carousel image ${idx + 1} loaded:`, img);
                  }}
                  onError={(e) => {
                    console.error(`[TournamentCard] Failed to load carousel image ${idx + 1}:`, img, e);
                  }}
                  loading="lazy"
                />
              </motion.div>
            );
          })
        ) : gameBanner ? (
          // Fallback: Show single banner if no screenshots
          <div
            className="absolute inset-0 w-full h-full opacity-25"
            style={{
              backgroundImage: `url(${gameBanner})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(3px)'
            }}
          />
        ) : null}
      </div>
      {/* Card content */}
      <div className="flex items-center gap-4 p-4 pb-2 relative z-10">
        <div className="h-12 w-12 rounded-md bg-esports-dark flex items-center justify-center overflow-hidden border border-gaming-gray/40">
          {gameLogo ? (
            <img
              src={gameLogo}
              alt={game + ' logo'}
              className="h-full w-full object-cover"
              onError={(e) => {
                console.error(`[TournamentCard] Failed to load game logo:`, gameLogo);
                // Fallback to tournament image
                const target = e.target as HTMLImageElement;
                if (image_url) {
                  target.src = image_url;
                }
              }}
            />
          ) : image_url ? (
            <img
              src={image_url}
              alt={name}
              className="h-full w-full object-cover"
              onError={(e) => {
                console.error(`[TournamentCard] Failed to load tournament image:`, image_url);
              }}
            />
          ) : (
            <div className="h-full w-full bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400 text-xs">{game?.charAt(0) || '?'}</span>
            </div>
          )}
        </div>
        <div>
          <div className="font-bold text-lg leading-tight mb-0.5 text-white drop-shadow-md">{name}</div>
          <div className="text-sm text-gray-300 flex items-center gap-2">
            <span>{game}</span>
          </div>
        </div>
      </div>
      <div className="px-4 pt-2 pb-1 flex flex-col gap-1 relative z-10">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Calendar className="h-4 w-4" />
          <span>{date}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Users className="h-4 w-4" />
          <span>Registered Participants: {current_participants}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Trophy className="h-4 w-4 text-green-400" />
          <span className="text-green-400 font-medium">Prize: {prize_pool}</span>
        </div>
      </div>
      <div className="flex items-center justify-between px-4 pt-2 pb-1 relative z-10">
        <Badge className={is_online ? 'bg-blue-600' : 'bg-purple-700'}>
          {is_online ? 'Online' : 'LAN'}
        </Badge>
        <span className="text-sm text-gray-300">
          Entry: <span className={entry_fee === 'Free' ? 'text-green-400' : ''}>{entry_fee || 'Free'}</span>
        </span>
      </div>
      <div className="px-4 pb-4 pt-2 mt-auto relative z-10">
        {isOrganizer ? (
          <>
            <div className="w-full mb-2 flex items-center justify-center gap-2 rounded-lg font-bold text-base py-2 bg-gaming-purple/80 text-white border-0 shadow-md cursor-default select-none">
              <svg className="w-5 h-5 text-white opacity-90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 11c0-1.104-.896-2-2-2s-2 .896-2 2 .896 2 2 2 2-.896 2-2zm0 0c0-1.104.896-2 2-2s2 .896 2 2-.896 2-2 2-2-.896-2-2zm0 0v2m0 4h.01" /></svg>
              You are the organizer
            </div>
            <div className="flex gap-2 mb-2">
              <Button
                className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white font-semibold text-base py-2"
                onClick={() => navigate(`/organizer/tournament/${slug || id}`)}
              >
                Manage
              </Button>
              {onDelete && (
                <Button
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold text-base py-2 px-4"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  Delete
                </Button>
              )}
            </div>
          </>
        ) : registrationData ? (
          <button
            type="button"
            onClick={() => navigate(`/tournaments/${slug || id}`)}
            className="w-full mb-2 flex items-center justify-center gap-2 rounded-lg font-bold text-base py-2 bg-green-500 hover:bg-green-400 text-white border-0 shadow-md"
          >
            <CheckCircle className="w-5 h-5 text-white" />
            <span>Registered</span>
          </button>
        ) : status === 'ongoing' ? (
          <Button
            className="w-full bg-red-600 animate-pulse text-white font-semibold text-base py-2 mb-2"
            onClick={() => navigate(`/tournaments/${slug || id}`)}
          >
            LIVE NOW
          </Button>
        ) : status === 'upcoming' ? (
          <Button
            className="w-full btn-esports-blue font-semibold text-base py-2 mb-2"
            onClick={() => navigate(`/tournaments/${slug || id}`)}
          >
            View Details
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full border-gray-600 text-esports-secondary hover:bg-gray-800 hover:text-white font-semibold text-base py-2"
            onClick={() => navigate(`/tournaments/${slug || id}`)}
          >
            View Details
          </Button>
        )}
      </div>
    </motion.div>
  );
};
