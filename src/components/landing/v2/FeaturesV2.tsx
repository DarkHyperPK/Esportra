import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Trophy, Wallet, Calendar, ShieldCheck, MapPin, BarChart3, Globe2, Crown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getWebsiteAssetUrl } from '@/lib/storage';

type FeatureRole = 'players' | 'organizers' | 'venues';

const FeaturesV2 = () => {
    const [activeTab, setActiveTab] = useState<FeatureRole>('players');

    const tabs: { id: FeatureRole; label: string; tag: string }[] = [
        { id: 'players', label: 'Compete', tag: 'PLAYERS' },
        { id: 'organizers', label: 'Organize', tag: 'ORGANIZERS' },
        { id: 'venues', label: 'Host', tag: 'VENUES' },
    ];

    const intros = {
        players: "Find verified tournaments. Build your team. Prove your skill on the ladder.",
        organizers: "Launch tournaments in seconds. Automated brackets, check-ins, and payouts.",
        venues: "List your gaming space. Fill seats. Become the local esports hub."
    };

    return (
        <section className="py-24 md:py-32 relative bg-[#050505]">
            {/* Subtle grid background */}
            <div className="absolute inset-0 opacity-[0.02]" style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`,
                backgroundSize: '60px 60px',
            }} />

            <div className="container mx-auto px-4 relative z-10">
                {/* Header */}
                <div className="flex flex-col items-center mb-16">
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-rose-500/70 text-xs tracking-[0.4em] uppercase font-bold mb-4 block"
                    >
                        Choose Your Role
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-3xl md:text-5xl font-extrabold text-white font-heading tracking-tight text-center mb-12"
                    >
                        Three Paths. <span className="text-white/30">One Platform.</span>
                    </motion.h2>

                    {/* Tab Switcher */}
                    <div className="flex gap-2 p-1 bg-white/[0.03] border border-white/5 rounded-lg">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "relative px-6 md:px-8 py-3 text-sm font-bold tracking-wider uppercase transition-all duration-300 rounded-md",
                                    activeTab === tab.id
                                        ? "text-white"
                                        : "text-white/30 hover:text-white/60"
                                )}
                            >
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activeTabBg"
                                        className="absolute inset-0 bg-rose-500/10 border border-rose-500/20 rounded-md"
                                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
                                    />
                                )}
                                <span className="relative z-10">{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Intro text */}
                <AnimatePresence mode="wait">
                    <motion.p
                        key={activeTab + '-intro'}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="text-white/40 text-base md:text-lg text-center max-w-2xl mx-auto mb-12 font-body"
                    >
                        {intros[activeTab]}
                    </motion.p>
                </AnimatePresence>

                {/* Cards */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto"
                    >
                        {activeTab === 'players' && (
                            <>
                                <FeatureCard
                                    step="01"
                                    icon={<Trophy className="w-5 h-5" />}
                                    title="Enter the Arena"
                                    description="Browse verified tournaments with guaranteed prize pools. Filter by game, format, and region."
                                    image={getWebsiteAssetUrl('landing-page-assets/enter-arena.jpg')}
                                />
                                <FeatureCard
                                    step="02"
                                    icon={<Users className="w-5 h-5" />}
                                    title="Assemble Your Squad"
                                    description="Create teams, invite players, assign roles. Manage your roster from a single dashboard."
                                    image={getWebsiteAssetUrl('landing-page-assets/form-team.jpg')}
                                />
                                <FeatureCard
                                    step="03"
                                    icon={<BarChart3 className="w-5 h-5" />}
                                    title="Climb the Ladder"
                                    description="Every win is recorded. Build a match history that speaks for itself. Rise through the rankings."
                                    image={getWebsiteAssetUrl('landing-page-assets/Prove-skill.jpg')}
                                />
                            </>
                        )}

                        {activeTab === 'organizers' && (
                            <>
                                <FeatureCard
                                    step="01"
                                    icon={<Zap className="w-5 h-5" />}
                                    title="Launch in Seconds"
                                    description="No spreadsheets. Generate professional brackets for any format instantly."
                                    image="/organizer-assets/launch.png"
                                />
                                <FeatureCard
                                    step="02"
                                    icon={<ShieldCheck className="w-5 h-5" />}
                                    title="Autopilot Mode"
                                    description="Scores update, brackets advance, winners move on — all automated."
                                    image="/organizer-assets/autopilot.png"
                                />
                                <FeatureCard
                                    step="03"
                                    icon={<Wallet className="w-5 h-5" />}
                                    title="Total Control"
                                    description="Manage check-ins, seeding, disputes, and payouts from one command center."
                                    image="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop"
                                />
                            </>
                        )}

                        {activeTab === 'venues' && (
                            <>
                                <FeatureCard
                                    step="01"
                                    icon={<MapPin className="w-5 h-5" />}
                                    title="Get Listed"
                                    description="Showcase your gaming space. Gear specs, photos, location — all on your venue profile."
                                    image="https://images.unsplash.com/photo-1598550487031-0898b4852123?q=80&w=2070&auto=format&fit=crop"
                                />
                                <FeatureCard
                                    step="02"
                                    icon={<Globe2 className="w-5 h-5" />}
                                    title="Fill the Seats"
                                    description="Connect with organizers looking for venues. Bookings flow directly through the platform."
                                    image="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-1.2.1&auto=format&fit=crop&w=2850&q=80"
                                />
                                <FeatureCard
                                    step="03"
                                    icon={<Crown className="w-5 h-5" />}
                                    title="Host the Hype"
                                    description="Host tournaments, watch parties, and finals. Become the heart of your local scene."
                                    image="https://images.unsplash.com/photo-1511512578047-dfb367046420?ixlib=rb-1.2.1&auto=format&fit=crop&w=2850&q=80"
                                />
                            </>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </section>
    );
};

const FeatureCard = ({ step, icon, title, description, image }: {
    step: string;
    icon: React.ReactNode;
    title: string;
    description: string;
    image?: string;
}) => {
    return (
        <div className="group relative h-[340px] bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden hover:border-rose-500/20 transition-all duration-500">
            {/* Background Image */}
            {image && (
                <div className="absolute inset-0">
                    <img
                        src={image}
                        className="absolute inset-0 w-full h-full object-cover grayscale opacity-30 group-hover:grayscale-0 group-hover:opacity-40 transition-all duration-700 transform group-hover:scale-105"
                        alt=""
                        loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent" />
                </div>
            )}

            {/* Step number */}
            <div className="absolute top-4 right-4 z-10">
                <span className="text-white/10 text-6xl font-extrabold font-heading group-hover:text-rose-500/10 transition-colors duration-500">
                    {step}
                </span>
            </div>

            {/* Content */}
            <div className="relative h-full p-6 md:p-8 flex flex-col justify-end z-10">
                <div className="text-white/40 mb-3 group-hover:text-rose-400 transition-colors duration-300">
                    {icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-2 font-heading tracking-wide">
                    {title}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed font-body group-hover:text-white/60 transition-colors duration-300">
                    {description}
                </p>
            </div>
        </div>
    );
};

export default FeaturesV2;
