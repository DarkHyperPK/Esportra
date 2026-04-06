import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import esportsData from "@/data/esportsGames.json";

interface Game {
  name: string;
  slug: string;
  category: string;
  logo: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.05, ease: "easeOut" },
  }),
};

const GameCard = ({ game, index }: { game: Game; index: number }) => (
  <motion.div custom={index} variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }}>
    <Link
      to={`/tournaments?game=${game.slug}`}
      className="group flex flex-col items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-6 md:p-8 transition-all duration-300 hover:border-white/10 hover:-translate-y-0.5"
    >
      <img
        src={game.logo}
        alt={`${game.name} logo`}
        loading="lazy"
        className="h-12 md:h-16 w-auto object-contain opacity-70 transition-all duration-300 group-hover:opacity-100 group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]"
      />
      <div className="text-center">
        <p className="text-sm md:text-base font-medium text-white tracking-wide">
          {game.name}
        </p>
        <p className="mt-1 text-xs text-white/40">{game.category}</p>
      </div>
    </Link>
  </motion.div>
);

const SupportedGames = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const games = esportsData.games as Game[];

  return (
    <section ref={sectionRef} className="py-32 bg-[#0a0a0a] relative overflow-hidden">
      {/* Background ambience */}
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
            From tactical shooters to battle royales — compete in the titles you
            love.
          </p>
        </motion.div>

        {/* Game Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-5 max-w-6xl mx-auto">
          {games.map((game, i) => (
            <GameCard key={game.slug} game={game} index={i} />
          ))}
        </div>

        {/* Footer note */}
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
