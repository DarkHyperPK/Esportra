import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { listCatalogGames } from '@/utils/gameFeatures';
import { getManifestGameAssets } from '@/hooks/useRawgGame';
import { apiClient } from "@/lib/apiClient";
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
}

interface GameAssets {
  banner: string | null;
  cover: string | null;
}

interface IgdbBatchItem {
  banners?: string[];
  cover?: string | null;
}

const PLACEHOLDER_IMAGE = '/placeholder.svg';

// Use a different IGDB artwork index for games where the default looks bad
const BANNER_INDEX_OVERRIDES: Record<string, number> = {
  cs2: 3,
  tekken8: 1,
};

function resolveSeedAssets(game: Game): GameAssets {
  return getManifestGameAssets(game.name);
}

function buildSeedAssetsMap(games: Game[]): Record<string, GameAssets> {
  return Object.fromEntries(
    games.map((game) => [game.slug, resolveSeedAssets(game)]),
  );
}

function pickBanner(banners: string[] | undefined, slug: string, fallback: string | null): string | null {
  if (!banners?.length) return fallback;
  const idx = BANNER_INDEX_OVERRIDES[slug] ?? 0;
  return banners[idx] ?? banners[0] ?? fallback;
}

const GameCard = ({
  game,
  assets,
  seedAssets,
}: {
  game: Game;
  assets: GameAssets | undefined;
  seedAssets: GameAssets;
}) => {
  const banner = assets?.banner ?? seedAssets.banner;
  const cover = assets?.cover ?? seedAssets.cover;

  const [bannerSrc, setBannerSrc] = useState(banner);
  const [coverSrc, setCoverSrc] = useState(cover);

  useEffect(() => {
    setBannerSrc(banner);
    setCoverSrc(cover);
  }, [banner, cover]);

  const handleBannerError = useCallback(() => {
    setBannerSrc((current) => {
      if (current !== cover && cover) return cover;
      if (current !== seedAssets.banner && seedAssets.banner) return seedAssets.banner;
      return PLACEHOLDER_IMAGE;
    });
  }, [cover, seedAssets.banner]);

  const handleCoverError = useCallback(() => {
    setCoverSrc((current) => {
      if (current !== banner && banner) return banner;
      if (current !== seedAssets.cover && seedAssets.cover) return seedAssets.cover;
      return PLACEHOLDER_IMAGE;
    });
  }, [banner, seedAssets.cover]);

  return (
    <Link
      to={`/tournaments?game=${game.slug}`}
      className="group relative block h-[340px] md:h-[400px] overflow-hidden"
      aria-label={`Browse ${game.name} tournaments`}
    >
      {bannerSrc ? (
        <img
          src={bannerSrc}
          alt=""
          aria-hidden
          loading="lazy"
          onError={handleBannerError}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[8s] ease-out group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-black/20" />

      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 flex items-end gap-3">
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={`${game.name} cover`}
            onError={handleCoverError}
            className="h-20 md:h-24 w-auto object-cover flex-shrink-0 border border-white/10"
          />
        ) : (
          <div className="h-20 md:h-24 w-14 md:w-16 bg-white/5 animate-pulse flex-shrink-0" />
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
  const isInView = useInView(sectionRef, { once: true, margin: "200px" });
  const { data: catalogData } = useGameCatalog();
  const games = useMemo(
    () => (catalogData?.games ?? listCatalogGames()).map((game) => ({
      name: game.name,
      slug: game.slug,
      category: game.category,
    })) as Game[],
    [catalogData],
  );

  const seedAssetsMap = useMemo(() => buildSeedAssetsMap(games), [games]);

  const [gameAssets, setGameAssets] = useState<Record<string, GameAssets>>({});
  const [assetsRequested, setAssetsRequested] = useState(false);

  // Instant seed from manifest — no API call, cards are never blank while waiting
  useEffect(() => {
    if (games.length === 0) return;
    setGameAssets((prev) => {
      const next = { ...prev };
      for (const game of games) {
        if (next[game.slug]?.banner) continue;
        next[game.slug] = seedAssetsMap[game.slug] ?? { banner: null, cover: null };
      }
      return next;
    });
  }, [games, seedAssetsMap]);

  // Deferred upgrade via batch IGDB API — only when section nears viewport
  useEffect(() => {
    if (!isInView || assetsRequested || games.length === 0) return;

    let cancelled = false;
    setAssetsRequested(true);

    apiClient
      .post<Record<string, IgdbBatchItem>>("/api/games/igdb-assets/batch", {
        games: games.map((game) => game.name),
      })
      .then((response) => {
        if (cancelled) return;

        setGameAssets((prev) => {
          const next = { ...prev };
          games.forEach((game) => {
            const data = response?.[game.name];
            const seed = seedAssetsMap[game.slug] ?? { banner: null, cover: null };
            next[game.slug] = {
              banner: pickBanner(data?.banners, game.slug, seed.banner),
              cover: data?.cover ?? seed.cover,
            };
          });
          return next;
        });
      })
      .catch(() => {
        // Keep manifest-seeded assets — do not overwrite with missing catalog logos
      });

    return () => { cancelled = true; };
  }, [assetsRequested, games, isInView, seedAssetsMap]);

  const navClass = "bg-white/5 border-white/10 hover:bg-white/10 text-white disabled:opacity-30";

  return (
    <section ref={sectionRef} className="py-32 bg-[#0a0a0a] relative overflow-hidden">
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

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.2 }}
        >
          <Carousel
            opts={{ align: "start", loop: true, duration: 35 }}
            className="mx-auto max-w-[1400px]"
          >
            <CarouselContent className="-ml-4">
              {games.map((game) => (
                <CarouselItem
                  key={game.slug}
                  className="pl-4 basis-full sm:basis-1/2 md:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                >
                  <GameCard
                    game={game}
                    assets={gameAssets[game.slug]}
                    seedAssets={seedAssetsMap[game.slug] ?? { banner: null, cover: null }}
                  />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className={navClass} />
            <CarouselNext className={navClass} />
          </Carousel>
        </motion.div>

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
