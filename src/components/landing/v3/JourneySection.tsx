import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Crosshair, Users, Trophy, Crown, Swords, Medal } from "lucide-react";

const steps = [
    {
        icon: <Crosshair className="w-5 h-5" />,
        title: "Create Your Profile",
        desc: "Sign up, link your game accounts, and build your competitive identity.",
        accent: "from-rose-500 to-rose-600",
    },
    {
        icon: <Users className="w-5 h-5" />,
        title: "Build Your Team",
        desc: "Recruit players, set roles, and manage your roster from one dashboard.",
        accent: "from-rose-400 to-rose-500",
    },
    {
        icon: <Swords className="w-5 h-5" />,
        title: "Enter Tournaments",
        desc: "Browse open events, register solo or as a team, and lock in your spot.",
        accent: "from-rose-500 to-rose-600",
    },
    {
        icon: <Trophy className="w-5 h-5" />,
        title: "Compete & Climb",
        desc: "Check in, veto maps, play your matches, and submit results — all in-platform.",
        accent: "from-rose-400 to-rose-500",
    },
    {
        icon: <Medal className="w-5 h-5" />,
        title: "Track Your Legacy",
        desc: "Win history, tournament placements, and stats — your esports resume, automated.",
        accent: "from-rose-500 to-rose-600",
    },
    {
        icon: <Crown className="w-5 h-5" />,
        title: "Rise to the Top",
        desc: "Climb leaderboards, get featured, and attract sponsorship opportunities.",
        accent: "from-rose-400 to-rose-500",
    },
];

const JourneySection = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <section className="py-28 bg-[#050505] relative overflow-hidden" ref={ref}>
            {/* Rose gradient bleed */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/[0.03] rounded-full blur-[120px] pointer-events-none" />

            <div className="container mx-auto px-5 sm:px-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7 }}
                    className="text-center mb-20"
                >
                    <span className="text-[10px] font-bold tracking-[0.5em] text-rose-500/60 uppercase block mb-4">
                        Your Path
                    </span>
                    <h2 className="font-heading text-3xl md:text-5xl font-bold text-white tracking-tight">
                        From Sign-Up to <span className="text-rose-400">Champion</span>
                    </h2>
                    <p className="mt-4 text-white/30 text-sm font-body max-w-md mx-auto">
                        Everything you need to go from casual to competitive, in six steps.
                    </p>
                </motion.div>

                {/* Timeline */}
                <div className="relative max-w-3xl mx-auto">
                    {/* Vertical line */}
                    <motion.div
                        initial={{ scaleY: 0 }}
                        animate={isInView ? { scaleY: 1 } : {}}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-rose-500/30 via-rose-500/10 to-transparent origin-top"
                    />

                    {steps.map((step, i) => {
                        const isLeft = i % 2 === 0;
                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                                animate={isInView ? { opacity: 1, x: 0 } : {}}
                                transition={{ duration: 0.6, delay: 0.15 * i }}
                                className={`relative flex items-start gap-6 mb-12 last:mb-0 md:gap-0 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                            >
                                {/* Dot on the line */}
                                <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-rose-500/40 border-2 border-rose-500/60 z-10 mt-1.5 md:mt-0 md:top-5" />

                                {/* Content */}
                                <div className={`ml-12 md:ml-0 md:w-1/2 ${isLeft ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left'}`}>
                                    <div className={`inline-flex items-center gap-2 mb-2 ${isLeft ? 'md:flex-row-reverse' : ''}`}>
                                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${step.accent} flex items-center justify-center text-white shadow-lg shadow-rose-500/10`}>
                                            {step.icon}
                                        </div>
                                        <span className="text-[10px] font-bold tracking-[0.3em] text-white/20 uppercase">
                                            Step {i + 1}
                                        </span>
                                    </div>
                                    <h3 className="font-heading font-bold text-white text-lg mb-1">{step.title}</h3>
                                    <p className="text-white/35 text-sm font-body leading-relaxed">{step.desc}</p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default JourneySection;
