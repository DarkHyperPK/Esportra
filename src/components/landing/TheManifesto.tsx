import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useRef } from "react";
import { Crosshair, Users, Trophy, Crown, Swords, Medal } from "lucide-react";

const steps = [
    {
        icon: <Crosshair className="w-5 h-5" />,
        title: "Create Your Profile",
        desc: "Sign up, link your game accounts, and build your competitive identity.",
    },
    {
        icon: <Users className="w-5 h-5" />,
        title: "Build Your Team",
        desc: "Recruit players, set roles, and manage your roster from one dashboard.",
    },
    {
        icon: <Swords className="w-5 h-5" />,
        title: "Enter Tournaments",
        desc: "Browse open events, register solo or as a team, and lock in your spot.",
    },
    {
        icon: <Trophy className="w-5 h-5" />,
        title: "Compete & Climb",
        desc: "Check in, veto maps, play your matches, and submit results — all in-platform.",
    },
    {
        icon: <Medal className="w-5 h-5" />,
        title: "Track Your Legacy",
        desc: "Win history, tournament placements, and stats — your esports resume, automated.",
    },
    {
        icon: <Crown className="w-5 h-5" />,
        title: "Rise to the Top",
        desc: "Climb leaderboards, get featured, and attract sponsorship opportunities.",
    },
];

const TheManifesto = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const journeyRef = useRef<HTMLDivElement>(null);
    const isJourneyInView = useInView(journeyRef, { once: true, margin: "-80px" });

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start 0.9", "end 0.5"]
    });

    const opacityHeading = useTransform(scrollYProgress, [0, 0.15, 0.2], [0, 1, 1]);
    const yHeading = useTransform(scrollYProgress, [0, 0.15], [50, 0]);

    const opacityBody = useTransform(scrollYProgress, [0.15, 0.3, 0.4], [0, 1, 1]);
    const yBody = useTransform(scrollYProgress, [0.15, 0.3], [30, 0]);

    const opacityClimax = useTransform(scrollYProgress, [0.35, 0.5, 0.6], [0, 1, 1]);
    const scaleClimax = useTransform(scrollYProgress, [0.35, 0.5], [0.95, 1]);

    return (
        <section ref={containerRef} className="py-24 md:py-40 bg-[#0a0a0a] relative overflow-hidden">
            {/* Background Ambience */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.015)_0%,transparent_70%)] pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="max-w-5xl mx-auto space-y-16 md:space-y-24">

                    {/* Section 1: The Problem */}
                    <motion.div style={{ opacity: opacityHeading, y: yHeading }} className="text-center">
                        <span className="inline-block text-blue-400/80 mb-6 text-sm md:text-base tracking-[0.3em] uppercase font-medium">For The Unseen Legends</span>
                        <h2 className="text-4xl md:text-6xl lg:text-7xl font-light text-white leading-[1.1] tracking-wide font-heading">
                            Talent is universal. <br />
                            <span className="text-white/30">Opportunity is not.</span>
                        </h2>
                    </motion.div>

                    {/* Section 2: The Elaboration */}
                    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16 justify-center">
                        <motion.div
                            style={{ opacity: opacityBody, y: yBody }}
                            className="w-px h-24 md:h-32 bg-gradient-to-b from-white/0 via-white/20 to-white/0 hidden md:block flex-shrink-0"
                        />

                        <motion.div style={{ opacity: opacityBody, y: yBody }} className="max-w-xl text-center md:text-left">
                            <p className="text-lg md:text-2xl text-gray-400 leading-relaxed font-light font-heading">
                                For years, gamers have dominated in the dark. Grinding thousands of hours. Mastering every mechanic.
                                Waiting for a lucky break that never comes.
                            </p>
                            <p className="text-lg md:text-2xl text-gray-400 leading-relaxed font-light font-heading mt-6">
                                The path from casual to professional has been broken—obscured by noise, gatekeepers, and uncertainty.
                            </p>
                        </motion.div>
                    </div>

                    {/* Section 3: The Climax */}
                    <motion.div
                        style={{ opacity: opacityClimax, scale: scaleClimax }}
                        className="text-center pt-8 border-t border-white/5"
                    >
                        <p className="text-white/50 text-base md:text-lg tracking-widest uppercase mb-6">We exist to clear the fog.</p>
                        <h2 className="text-4xl md:text-6xl lg:text-7xl font-medium text-white leading-tight tracking-wide font-heading">
                            We are the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 animate-gradient-x">Ladder.</span>
                        </h2>
                    </motion.div>

                    {/* Section 4: Your Path — The Journey Timeline */}
                    <div ref={journeyRef} className="pt-12 md:pt-20">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={isJourneyInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.7 }}
                            className="text-center mb-16 md:mb-20"
                        >
                            <span className="text-white/30 text-xs md:text-sm tracking-[0.4em] uppercase font-medium block mb-4">Your Path</span>
                            <h3 className="text-3xl md:text-5xl font-light text-white tracking-wide font-heading">
                                From Sign-Up to <span className="font-medium italic text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-rose-500">Champion</span>
                            </h3>
                            <p className="mt-4 text-white/30 text-sm md:text-base font-light font-heading max-w-md mx-auto">
                                Everything you need to go from casual to competitive, in six steps.
                            </p>
                        </motion.div>

                        {/* Timeline */}
                        <div className="relative max-w-3xl mx-auto">
                            {/* Vertical line */}
                            <motion.div
                                initial={{ scaleY: 0 }}
                                animate={isJourneyInView ? { scaleY: 1 } : {}}
                                transition={{ duration: 1.5, ease: "easeOut" }}
                                className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-rose-500/30 via-rose-500/10 to-transparent origin-top"
                            />

                            {steps.map((step, i) => {
                                const isLeft = i % 2 === 0;
                                return (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, x: isLeft ? -30 : 30 }}
                                        animate={isJourneyInView ? { opacity: 1, x: 0 } : {}}
                                        transition={{ duration: 0.6, delay: 0.15 * i }}
                                        className={`relative flex items-start gap-6 mb-12 last:mb-0 md:gap-0 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}
                                    >
                                        {/* Dot on the line */}
                                        <div className="absolute left-6 md:left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-rose-500/40 border-2 border-rose-500/60 z-10 mt-1.5 md:mt-0 md:top-5" />

                                        {/* Content */}
                                        <div className={`ml-12 md:ml-0 md:w-1/2 ${isLeft ? 'md:pr-12 md:text-right' : 'md:pl-12 md:text-left'}`}>
                                            <div className={`inline-flex items-center gap-2 mb-2 ${isLeft ? 'md:flex-row-reverse' : ''}`}>
                                                <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                                                    {step.icon}
                                                </div>
                                                <span className="text-[10px] font-bold tracking-[0.3em] text-white/20 uppercase">
                                                    Step {i + 1}
                                                </span>
                                            </div>
                                            <h4 className="font-heading font-medium text-white text-lg mb-1">{step.title}</h4>
                                            <p className="text-white/35 text-sm font-heading leading-relaxed">{step.desc}</p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default TheManifesto;
