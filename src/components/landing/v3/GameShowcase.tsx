import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

const games = [
    {
        name: "Valorant",
        tag: "Tactical FPS",
        image: "https://media.valorant-api.com/sprays/290565e7-4540-5764-31da-758846dc2a5a/fulltransparenticon.png",
        bg: "from-red-500/20 to-red-900/10",
        accent: "text-red-400",
        border: "border-red-500/20",
        players: "3.2K+",
        tournaments: "48",
    },
    {
        name: "CS2",
        tag: "Tactical FPS",
        image: "https://cdn.cloudflare.steamstatic.com/apps/csgo/images/csgo_react/social/cs2.jpg",
        bg: "from-amber-500/20 to-amber-900/10",
        accent: "text-amber-400",
        border: "border-amber-500/20",
        players: "2.8K+",
        tournaments: "35",
    },
    {
        name: "League of Legends",
        tag: "MOBA",
        image: "https://brand.riotgames.com/static/a91000434ed683571e88f4e2d7029e64/8a20a/lol-logo.png",
        bg: "from-blue-500/20 to-blue-900/10",
        accent: "text-blue-400",
        border: "border-blue-500/20",
        players: "1.5K+",
        tournaments: "22",
    },
    {
        name: "Dota 2",
        tag: "MOBA",
        image: "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota2_social.jpg",
        bg: "from-rose-500/20 to-rose-900/10",
        accent: "text-rose-400",
        border: "border-rose-500/20",
        players: "900+",
        tournaments: "14",
    },
];

const GameShowcase = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });

    return (
        <section className="py-28 bg-[#050505] relative overflow-hidden" ref={ref}>
            {/* Subtle grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:80px_80px] pointer-events-none" />

            <div className="container mx-auto px-5 sm:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7 }}
                    className="text-center mb-16"
                >
                    <span className="text-[10px] font-bold tracking-[0.5em] text-rose-500/60 uppercase block mb-4">
                        Supported Titles
                    </span>
                    <h2 className="font-heading text-3xl md:text-5xl font-bold text-white tracking-tight">
                        Pick Your <span className="text-rose-400">Arena</span>
                    </h2>
                    <p className="mt-4 text-white/30 text-sm font-body max-w-md mx-auto">
                        Create or join tournaments across the biggest competitive titles. More games coming soon.
                    </p>
                </motion.div>

                {/* Horizontal scroll on mobile, grid on desktop */}
                <div className="flex gap-5 overflow-x-auto pb-4 scrollbar-hide lg:grid lg:grid-cols-4 lg:overflow-visible lg:pb-0">
                    {games.map((game, i) => (
                        <motion.div
                            key={game.name}
                            initial={{ opacity: 0, y: 30 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: 0.1 * i }}
                            className="flex-shrink-0 w-[260px] lg:w-auto group"
                        >
                            <div className={`relative rounded-2xl border ${game.border} bg-gradient-to-b ${game.bg} backdrop-blur-sm p-5 h-full hover:scale-[1.02] transition-transform duration-300`}>
                                {/* Game image */}
                                <div className="w-full aspect-video rounded-xl overflow-hidden bg-black/40 mb-5">
                                    <img
                                        src={game.image}
                                        alt={game.name}
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                                        loading="lazy"
                                    />
                                </div>

                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="font-heading font-bold text-white text-sm">{game.name}</h3>
                                    <span className={`text-[9px] font-bold tracking-[0.2em] uppercase ${game.accent} opacity-60`}>{game.tag}</span>
                                </div>

                                <div className="flex gap-4 text-[11px] text-white/30 font-medium">
                                    <span>{game.players} players</span>
                                    <span>•</span>
                                    <span>{game.tournaments} tournaments</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="flex justify-center mt-12"
                >
                    <Button asChild variant="ghost" className="text-white/40 hover:text-white text-xs font-medium tracking-wider group">
                        <Link to="/tournaments">
                            Browse All Tournaments
                            <ArrowRight className="w-3.5 h-3.5 ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </Button>
                </motion.div>
            </div>
        </section>
    );
};

export default GameShowcase;
