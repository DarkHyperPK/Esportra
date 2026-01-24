import { useState, useRef, MouseEvent } from 'react';
import { motion, AnimatePresence, useMotionTemplate, useMotionValue } from 'framer-motion';
import { Users, Trophy, Wallet, Calendar, ShieldCheck, MapPin, BarChart3, Globe2, Crown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from "@/components/ui/card";

type FeatureRole = 'players' | 'organizers' | 'venues';

const FeaturesSection = () => {
    const [activeTab, setActiveTab] = useState<FeatureRole>('players');

    const tabs: { id: FeatureRole; label: string }[] = [
        { id: 'players', label: 'I want to Compete' },
        { id: 'organizers', label: 'I want to Organize' },
        { id: 'venues', label: 'I have a Venue' },
    ];

    const intros = {
        players: "For those who dream of the main stage. We provide the ladder.",
        organizers: "Build the stage. We'll handle the logistics.",
        venues: "Turn your space into a battleground. The community is waiting."
    };

    return (
        <section className="py-32 relative bg-[#0a0a0a]">
            <div className="container mx-auto px-4 relative z-10">
                <div className="flex flex-col items-center mb-20">
                    <h2 className="text-3xl md:text-4xl font-light tracking-[0.2em] text-white uppercase font-heading text-center mb-8">
                        Choose Your Path
                    </h2>

                    {/* Narrative Tab Switcher */}
                    <div className="flex flex-wrap justify-center gap-6 md:gap-12 mb-12">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "text-lg md:text-xl font-light transition-all duration-500 relative px-4 py-2",
                                    activeTab === tab.id ? "text-white" : "text-white/30 hover:text-white/60"
                                )}
                            >
                                {tab.label}
                                {activeTab === tab.id && (
                                    <motion.div
                                        layoutId="activePath"
                                        className="absolute bottom-0 left-0 right-0 h-[1px] bg-white shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Dynamic Dialogue Header */}
                    <motion.p
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="text-white/60 text-lg md:text-xl font-light text-center max-w-2xl font-heading leading-relaxed"
                    >
                        "{intros[activeTab]}"
                    </motion.p>
                </div>

                {/* Content Area */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 20, filter: 'blur(10px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto"
                    >
                        {activeTab === 'players' && (
                            <>
                                <MinimalCard
                                    icon={<Trophy className="w-6 h-6" />}
                                    title="1. Enter the Arena"
                                    description="Find verified tournaments with guaranteed prize pools. Your journey starts with a single match."
                                    image="https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/landing%20page%20assets/enter%20arena.jpg"
                                />
                                <MinimalCard
                                    icon={<Users className="w-6 h-6" />}
                                    title="2. Assemble the Squad"
                                    description="Invite your teammates, assign roles, and build a roster ready for the championship."
                                    image="https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/landing%20page%20assets/form%20team.jpg"
                                />
                                <MinimalCard
                                    icon={<BarChart3 className="w-6 h-6" />}
                                    title="3. Prove Your Skill"
                                    description="Every win is recorded. Build a match history that speaks for itself."
                                    image="https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/landing%20page%20assets/Prove%20skill.jpg"

                                />
                            </>
                        )}

                        {activeTab === 'organizers' && (
                            <>
                                <MinimalCard
                                    icon={<Zap className="w-6 h-6" />}
                                    title="1. Launch in Seconds"
                                    description="Don't fight the spreadsheet. Generate professional brackets for any format instantly."
                                    image="/organizer-assets/launch.png"
                                />
                                <MinimalCard
                                    icon={<ShieldCheck className="w-6 h-6" />}
                                    title="2. Autopilot Mode"
                                    description="Scores update, brackets advance, and winners move on—automatically."
                                    image="/organizer-assets/autopilot.png"
                                />
                                <MinimalCard
                                    icon={<Wallet className="w-6 h-6" />}
                                    title="3. Total Control"
                                    description="Manage check-ins, seeding, and payouts from a single command center."
                                    image="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop"
                                />
                            </>
                        )}

                        {activeTab === 'venues' && (
                            <>
                                <MinimalCard
                                    icon={<MapPin className="w-6 h-6" />}
                                    title="1. Become a Landmark"
                                    description="List your gaming space. Show off your gear, your vibe, and your location."
                                    image="https://images.unsplash.com/photo-1598550487031-0898b4852123?q=80&w=2070&auto=format&fit=crop"
                                />
                                <MinimalCard
                                    icon={<Globe2 className="w-6 h-6" />}
                                    title="2. Fill the Seats"
                                    description="Local organizers are looking for value. Connect with them directly through the platform."
                                    image="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-1.2.1&auto=format&fit=crop&w=2850&q=80"
                                />
                                <MinimalCard
                                    icon={<Crown className="w-6 h-6" />}
                                    title="3. Host the Hype"
                                    description="Turn your venue into the heart of the local esports scene. Host watch parties and finals."
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

const MinimalCard = ({ icon, title, description, image, imageClassName }: { icon: React.ReactNode, title: string, description: string, image?: string, imageClassName?: string }) => {
    return (
        <div className="group relative h-[320px] bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all duration-500 overflow-hidden">
            {/* Optional Background Image */}
            {image && (
                <div className="absolute inset-0 opacity-70 group-hover:opacity-50 transition-opacity duration-700">
                    <img
                        src={image}
                        className={cn(
                            "absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 transform group-hover:scale-105",
                            imageClassName
                        )}
                        alt=""
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent" />
                </div>
            )}

            {/* Hover Glow */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_70%)] pointer-events-none" />

            <div className="relative h-full p-8 flex flex-col justify-end z-10">
                <div className="mb-4 text-white/60 group-hover:text-white transition-colors duration-300 transform group-hover:-translate-y-2">
                    {icon}
                </div>
                <h3 className="text-xl text-white font-medium mb-3 tracking-wide transform group-hover:-translate-y-2 transition-transform duration-300">
                    {title}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed group-hover:text-white/70 transition-colors duration-300 border-t border-white/10 pt-4 mt-auto">
                    {description}
                </p>
            </div>
        </div>
    );
};

export default FeaturesSection;
