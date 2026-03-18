import { motion } from "framer-motion";
import { Zap, Users, Trophy, Radio } from "lucide-react";
import { useEffect, useState } from "react";

const events = [
    { icon: <Trophy className="w-3.5 h-3.5" />, text: "Valorant Champions League — Grand Finals starting", time: "LIVE", color: "text-red-400" },
    { icon: <Users className="w-3.5 h-3.5" />, text: "Team Phoenix Rising qualified for Semi-Finals", time: "2m ago", color: "text-emerald-400" },
    { icon: <Zap className="w-3.5 h-3.5" />, text: "New tournament: CS2 Weekend Showdown — 128 slots", time: "5m ago", color: "text-amber-400" },
    { icon: <Radio className="w-3.5 h-3.5" />, text: "Frost Titans vs Dark Wolves — Match in progress", time: "LIVE", color: "text-red-400" },
    { icon: <Users className="w-3.5 h-3.5" />, text: "32 new players registered in the last hour", time: "12m ago", color: "text-blue-400" },
    { icon: <Trophy className="w-3.5 h-3.5" />, text: "Weekly Valorant Ranked — Check-in open", time: "NOW", color: "text-rose-400" },
];

const LiveTicker = () => {
    const [activeIndex, setActiveIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % events.length);
        }, 3500);
        return () => clearInterval(interval);
    }, []);

    return (
        <section className="py-4 bg-[#050505] border-y border-white/5 overflow-hidden relative">
            {/* Ambient rose line */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />

            <div className="container mx-auto px-4">
                <div className="flex items-center gap-4 h-8 overflow-hidden">
                    {/* Live badge */}
                    <div className="flex-shrink-0 flex items-center gap-2 pr-4 border-r border-white/10">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-[10px] font-bold tracking-[0.3em] text-white/50 uppercase">Live Feed</span>
                    </div>

                    {/* Scrolling events */}
                    <div className="flex-1 relative h-6 overflow-hidden">
                        {events.map((event, i) => (
                            <motion.div
                                key={i}
                                initial={false}
                                animate={{
                                    y: i === activeIndex ? 0 : i < activeIndex ? -30 : 30,
                                    opacity: i === activeIndex ? 1 : 0,
                                }}
                                transition={{ duration: 0.4, ease: "easeInOut" }}
                                className="absolute inset-0 flex items-center gap-3"
                            >
                                <span className={event.color}>{event.icon}</span>
                                <span className="text-white/60 text-xs font-medium truncate">{event.text}</span>
                                <span className={`text-[10px] font-bold tracking-wider uppercase flex-shrink-0 ${event.time === 'LIVE' || event.time === 'NOW' ? 'text-red-400' : 'text-white/25'}`}>
                                    {event.time}
                                </span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default LiveTicker;
