import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import esportsData from "@/data/esportsGames.json";
import { fetchGameData, type CachedGame } from "@/hooks/useRawgGame";
import { getWebsiteAssetUrl } from "@/lib/storage";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from "@/components/ui/carousel";

interface Game {
  name: string;
  slug: string;
  category: string;
  logo: string;
}

interface GameAssets {
  banner: string | null;
  cover: string | null;
}

// Use a different IGDB artwork index for games where the default looks bad
const BANNER_INDEX_OVERRIDES: Record<string, number> = {
  cs2: 3,
  tekken8: 1,
};

const GameCard = ({ game, assets }: { game: Game; assets: GameAssets | undefined }) => {
  const banner = assets?.banner;
  const cover = assets?.cover;

  return (
    <Link
      to={`/tournaments?game=${game.slug}`}
      className="group relative block h-[340px] md:h-[400px] rounded-2xl overflow-hidden"
      aria-label={`Browse ${game.name} tournaments`}
    >
      {/* IGDB banner with Ken Burns zoom on hover */}
      {banner ? (
        <img
          src={banner}
          alt=""
          aria-hidden
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[8s] ease-out group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/20" />

      {/* Card content — IGDB cover art as logo */}
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 flex items-end gap-3">
        {cover ? (
          <img
            src={cover}
            alt={`${game.name} cover`}
            className="h-20 md:h-24 w-auto rounded-lg shadow-2xl object-cover flex-shrink-0 border border-white/10"
          />
        ) : (
          <div className="h-20 md:h-24 w-14 md:w-16 rounded-lg bg-white/5 animate-pulse flex-shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-base md:text-lg font-semibold text-white leading-tight truncate">
            {game.name}
          </p>
          <p className="text-xs text-white/50 mt-0.5">{game.category}</p>
        </div>
      </div>
    </Link>
  );
};

const SupportedGames = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const games = esportsData.games as Game[];

  const [gameAssets, setGameAssets] = useState<Record<string, GameAssets>>({});

  useEffect(() => {
    let cancelled = false;
    games.forEach((game) => {
      fetchGameData(game.name, { skipRawg: true }).then((data: CachedGame) => {
        if (!cancelled) {
          const idx = BANNER_INDEX_OVERRIDES[game.slug] ?? 0;
          const banner = data.screenshots?.[idx] || data.gameBanner;
          setGameAssets((prev) => ({
            ...prev,
            [game.slug]: {
              banner,
              cover: data.cover,
            },
          }));
        }
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navClass = "bg-white/5 border-white/10 hover:bg-white/10 text-white disabled:opacity-30";

  return (
    <section ref={sectionRef} className="py-32 bg-[#0a0a0a] relative overflow-hidden">
      {/* Arena background image — blurred and darkened */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <img
          src={getWebsiteAssetUrl('landing-page-assets/enter-arena.jpg')}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-50 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/30 to-[#0a0a0a]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/50 via-transparent to-[#0a0a0a]/50" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16 md:mb-20"
        >
          <span className="text-white/30 text-xs md:text-sm tracking-[0.4em] uppercase font-medium block mb-4">
            Our Arena
          </span>
          <h2 className="text-3xl md:text-4xl font-light tracking-[0.2em] text-white uppercase font-heading mb-6">
            10 Games. One Platform.
          </h2>
          <p className="text-white/40 text-sm md:text-base font-light font-heading max-w-lg mx-auto">
            From tactical shooters to battle royales — compete in the titles you love.
          </p>
        </motion.div>

        {/* Carousel */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <Carousel opts={{ align: "start", loop: true }} className="mx-auto max-w-[1400px]">
            <CarouselContent className="-ml-4">
              {games.map((game) => (
                <CarouselItem
                  key={game.slug}
                  className="pl-4 basis-full sm:basis-1/2 md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <GameCard game={game} assets={gameAssets[game.slug]} />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className={navClass} />
            <CarouselNext className={navClass} />
          </Carousel>
        </motion.div>

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center text-white/20 text-xs tracking-widest uppercase mt-12"
        >
          & more coming soon
        </motion.p>
      </div>
    </section>
  );
};

export default SupportedGames;
