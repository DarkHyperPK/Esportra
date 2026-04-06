import { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import esportsData from "@/data/esportsGames.json";
import { fetchGameData } from "@/hooks/useRawgGame";
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

const GameCard = ({ game, bg }: { game: Game; bg: string | null | undefined }) => {
  const loaded = typeof bg === "string";

  return (
    <Link
      to={`/tournaments?game=${game.slug}`}
      className="group relative block h-[340px] md:h-[400px] rounded-2xl overflow-hidden"
      aria-label={`Browse ${game.name} tournaments`}
    >
      {/* Background image with Ken Burns zoom */}
      {loaded ? (
        <img
          src={bg}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[8s] ease-out group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 bg-zinc-900 animate-pulse" />
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* Card content */}
      <div className="absolute inset-x-0 bottom-0 p-5 md:p-6 flex flex-col items-start gap-2">
        <img
          src={game.logo}
          alt={`${game.name} logo`}
          className="h-10 md:h-12 w-auto object-contain drop-shadow-lg"
        />
        <div>
          <p className="text-base md:text-lg font-medium text-white leading-tight">
            {game.name}
          </p>
          <p className="text-xs text-white/50">{game.category}</p>
        </div>
      </div>
    </Link>
  );
};

const SupportedGames = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });
  const games = esportsData.games as Game[];

  const [backgrounds, setBackgrounds] = useState<Record<string, string | null>>({});

  useEffect(() => {
    let cancelled = false;
    games.forEach((game) => {
      fetchGameData(game.name).then((data) => {
        if (!cancelled) {
          setBackgrounds((prev) => ({ ...prev, [game.slug]: data.gameBanner }));
        }
      });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navClass = "bg-white/5 border-white/10 hover:bg-white/10 text-white disabled:opacity-30";

  return (
    <section ref={sectionRef} className="py-32 bg-[#0a0a0a] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.015)_0%,transparent_70%)] pointer-events-none" />

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
                  <GameCard game={game} bg={backgrounds[game.slug]} />
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
