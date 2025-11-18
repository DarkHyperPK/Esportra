import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Trophy, CheckCircle } from 'lucide-react';
import { useRole } from '@/contexts/RoleContext';
import { motion } from 'framer-motion';

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
}

const RAWG_API_KEY = '55e8210bf73448108b7f3c6707739206';
const RAWG_API_URL = 'https://api.rawg.io/api/games';

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
}) => {
  const navigate = useNavigate();
  const { currentRole } = useRole();
  const ownerId = organizer_id || user_id;
  const isOrganizer = currentRole === 'organizer' && currentUserId && ownerId && currentUserId === ownerId;

  // RAWG game image state
  const [gameLogo, setGameLogo] = useState<string | null>(null);
  const [gameBanner, setGameBanner] = useState<string | null>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const carouselTimeout = useRef<NodeJS.Timeout | null>(null);

  // Normalize game name for RAWG search
  const getRawgGameName = (game: string) => {
    const normalized = game.trim().toLowerCase();
    if (normalized === 'cs2' || normalized === 'counter strike 2' || normalized === 'counter-strike 2') {
      return 'Counter-Strike 2';
    }
    return game;
  };

  useEffect(() => {
    let isMounted = true;
    const fetchGameImages = async () => {
      try {
        const searchName = getRawgGameName(game);
        const response = await fetch(`${RAWG_API_URL}?key=${RAWG_API_KEY}&search=${encodeURIComponent(searchName)}`);
        const data = await response.json();
        if (data && data.results && data.results.length > 0) {
          const gameData = data.results[0];
          setGameLogo(gameData.background_image || null);
          // Fetch screenshots for the game
          const screenshotsRes = await fetch(`${RAWG_API_URL}/${gameData.id}/screenshots?key=${RAWG_API_KEY}`);
          const screenshotsData = await screenshotsRes.json();
          if (screenshotsData && screenshotsData.results && screenshotsData.results.length > 0) {
            if (isMounted) {
              type RawgShot = { image: string };
              setScreenshots((screenshotsData.results as RawgShot[]).map((s) => s.image));
              setGameBanner(screenshotsData.results[0].image);
            }
          } else if (isMounted) {
            setScreenshots([gameData.background_image_additional, gameData.background_image].filter(Boolean));
            setGameBanner(gameData.background_image_additional || gameData.background_image || null);
          }
        } else {
          if (isMounted) {
            setGameLogo(null);
            setScreenshots([]);
            setGameBanner(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          setGameLogo(null);
          setScreenshots([]);
          setGameBanner(null);
        }
      }
    };
    fetchGameImages();
    return () => { isMounted = false; };
  }, [game]);

  // Carousel logic
  useEffect(() => {
    if (screenshots.length <= 1) return;
    if (carouselTimeout.current) clearTimeout(carouselTimeout.current);
    carouselTimeout.current = setTimeout(() => {
      setCarouselIndex((prev) => (prev + 1) % screenshots.length);
    }, 2000); // 2 seconds per image
    return () => {
      if (carouselTimeout.current) clearTimeout(carouselTimeout.current);
    };
  }, [carouselIndex, screenshots]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="card-esports hover-lift rounded-lg flex flex-col relative overflow-hidden min-h-[280px] w-full"
    >
      {/* Carousel background images */}
      {screenshots.map((img, idx) => (
        <img
          key={img}
          src={img}
          alt={game + ' screenshot'}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none select-none z-0 transition-opacity duration-1000 ${carouselIndex === idx ? 'opacity-25' : 'opacity-0'}`}
          style={{ filter: 'blur(3px)' }}
        />
      ))}
      {/* Card content */}
      <div className="flex items-center gap-4 p-4 pb-2 relative z-10">
        <div className="h-12 w-12 rounded-md bg-esports-dark flex items-center justify-center overflow-hidden border border-gaming-gray/40">
          {gameLogo ? (
            <img
              src={gameLogo}
              alt={game + ' logo'}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <img
              src={image_url || '/default-tournament.jpg'}
              alt={name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
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
          <span>{current_participants}/{max_participants} Participants</span>
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
            <Button
              className="w-full bg-yellow-600 hover:bg-yellow-500 text-white font-semibold text-base py-2 mb-2"
              onClick={() => navigate(`/organizer/tournament/${slug || id}`)}
            >
              Manage
            </Button>
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
