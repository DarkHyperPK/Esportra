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
  const [imagesLoaded, setImagesLoaded] = useState<Set<string>>(new Set());
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
        console.log(`[TournamentCard] Fetching RAWG images for game: ${searchName}`);
        const response = await fetch(`${RAWG_API_URL}?key=${RAWG_API_KEY}&search=${encodeURIComponent(searchName)}`);
        
        if (!response.ok) {
          console.error(`[TournamentCard] RAWG API error: ${response.status} ${response.statusText}`);
          throw new Error(`RAWG API error: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`[TournamentCard] RAWG search results for ${searchName}:`, data?.results?.length || 0, 'results');
        
        if (data && data.results && data.results.length > 0) {
          const gameData = data.results[0];
          console.log(`[TournamentCard] Found game: ${gameData.name}, ID: ${gameData.id}`);
          setGameLogo(gameData.background_image || null);
          
          // Fetch screenshots for the game
          try {
            const screenshotsRes = await fetch(`${RAWG_API_URL}/${gameData.id}/screenshots?key=${RAWG_API_KEY}`);
            if (!screenshotsRes.ok) {
              console.warn(`[TournamentCard] Failed to fetch screenshots: ${screenshotsRes.status}`);
              throw new Error(`Screenshots API error: ${screenshotsRes.status}`);
            }
            const screenshotsData = await screenshotsRes.json();
            console.log(`[TournamentCard] Screenshots for ${gameData.name}:`, screenshotsData?.results?.length || 0);
            
            if (screenshotsData && screenshotsData.results && screenshotsData.results.length > 0) {
              if (isMounted) {
                type RawgShot = { image: string };
                const screenshotUrls = (screenshotsData.results as RawgShot[]).map((s) => s.image);
                setScreenshots(screenshotUrls);
                setGameBanner(screenshotUrls[0]);
                console.log(`[TournamentCard] Set banner and ${screenshotUrls.length} screenshots`);
              }
            } else if (isMounted) {
              const fallbackImages = [gameData.background_image_additional, gameData.background_image].filter(Boolean);
              setScreenshots(fallbackImages);
              setGameBanner(gameData.background_image_additional || gameData.background_image || null);
              console.log(`[TournamentCard] Using fallback images: ${fallbackImages.length}`);
            }
          } catch (screenshotErr) {
            console.error(`[TournamentCard] Error fetching screenshots:`, screenshotErr);
            // Fallback to background images
            if (isMounted) {
              const fallbackImages = [gameData.background_image_additional, gameData.background_image].filter(Boolean);
              setScreenshots(fallbackImages);
              setGameBanner(gameData.background_image_additional || gameData.background_image || null);
            }
          }
        } else {
          console.warn(`[TournamentCard] No RAWG results found for: ${searchName}`);
          if (isMounted) {
            setGameLogo(null);
            setScreenshots([]);
            setGameBanner(null);
          }
        }
      } catch (err) {
        console.error(`[TournamentCard] Error fetching RAWG images for ${game}:`, err);
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

  // Preload images for smooth transitions
  useEffect(() => {
    if (screenshots.length === 0) return;
    
    const preloadImages = async () => {
      const loaded = new Set<string>();
      const loadPromises = screenshots.map((imgSrc) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            loaded.add(imgSrc);
            resolve();
          };
          img.onerror = () => resolve();
          img.src = imgSrc;
          // Timeout after 5 seconds to prevent hanging
          setTimeout(() => resolve(), 5000);
        });
      });
      
      await Promise.all(loadPromises);
      setImagesLoaded(loaded);
    };
    
    preloadImages();
  }, [screenshots]);

  // Carousel logic - start immediately, don't wait for images
  useEffect(() => {
    if (screenshots.length <= 1) return;
    
    if (carouselTimeout.current) clearTimeout(carouselTimeout.current);
    
    // Start carousel immediately, even if images aren't loaded yet
    // This ensures the carousel is visible
    carouselTimeout.current = setTimeout(() => {
      setCarouselIndex((prev) => (prev + 1) % screenshots.length);
    }, 4000); // 4 seconds per image
    
    return () => {
      if (carouselTimeout.current) clearTimeout(carouselTimeout.current);
    };
  }, [carouselIndex, screenshots.length]);

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
                    if (!imagesLoaded.has(img)) {
                      setImagesLoaded(prev => new Set([...prev, img]));
                    }
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
