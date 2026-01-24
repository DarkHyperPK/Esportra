import { motion } from "framer-motion";
import { Zap, Shield, MapPin, Users, Trophy, Globe } from "lucide-react";

const nodes = [
    { id: 1, label: "Auto-Brackets", icon: <Zap className="w-5 h-5" />, x: "15%", y: "20%", delay: 0.1 },
    { id: 2, label: "Verified Payouts", icon: <Shield className="w-5 h-5" />, x: "80%", y: "15%", delay: 0.3 },
    { id: 3, label: "Venue Hub", icon: <MapPin className="w-5 h-5" />, x: "20%", y: "75%", delay: 0.5 },
    { id: 4, label: "Pro Profiles", icon: <Users className="w-5 h-5" />, x: "85%", y: "70%", delay: 0.2 },
    { id: 5, label: "Leaderboards", icon: <Trophy className="w-5 h-5" />, x: "50%", y: "85%", delay: 0.4 },
    { id: 6, label: "Global Stages", icon: <Globe className="w-5 h-5" />, x: "50%", y: "10%", delay: 0.6 },
];

const PlatformEcosystem = () => {
    return (
        <section className="py-40 bg-[#0a0a0a] relative overflow-hidden flex flex-col items-center">
            {/* Background Grid Accent */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-32">
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="text-white/30 text-xs tracking-[0.5em] uppercase font-medium mb-4 block"
                    >
                        The Protocol
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-light text-white font-heading"
                    >
                        A Unified <span className="font-medium italic text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Ecosystem</span>
                    </motion.h2>
                </div>

                <div className="relative h-[600px] md:h-[700px] max-w-5xl mx-auto flex items-center justify-center">
                    {/* Orbit Rings with Data Particles */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                            className="w-[300px] h-[300px] md:w-[500px] md:h-[500px] border border-white/5 rounded-full relative"
                        >
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_10px_#60a5fa]" />
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_10px_#34d399]" />
                        </motion.div>

                        <motion.div
                            animate={{ rotate: -360 }}
                            transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                            className="absolute w-[450px] h-[450px] md:w-[700px] md:h-[700px] border border-white/[0.03] rounded-full relative"
                        >
                            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-2 h-2 bg-purple-400 rounded-full shadow-[0_0_10px_#a78bfa]" />
                        </motion.div>
                    </div>

                    {/* Central Core */}
                    <div className="relative z-20">
                        <motion.div
                            animate={{
                                boxShadow: ["0 0 40px rgba(59,130,246,0.1)", "0 0 80px rgba(59,130,246,0.3)", "0 0 40px rgba(59,130,246,0.1)"]
                            }}
                            transition={{ duration: 4, repeat: Infinity }}
                            className="relative w-32 h-32 md:w-56 md:h-56 flex items-center justify-center"
                        >
                            <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full" />
                            <div className="relative z-10 w-full h-full border border-white/10 rounded-full flex items-center justify-center bg-black/60 backdrop-blur-2xl">
                                <img src="https://abbjywqlxnxoutllbgke.supabase.co/storage/v1/object/public/system.assets.website/eSportra%20Logo/eSPORTRA%20white%20transparent.png"
                                    className="h-8 md:h-14 opacity-90 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                                    alt="Core" />
                            </div>
                        </motion.div>
                    </div>

                    {/* Feature Nodes */}
                    {nodes.map((node) => (
                        <motion.div
                            key={node.id}
                            initial={{ opacity: 0, scale: 0 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: node.delay, type: "spring", stiffness: 100 }}
                            style={{ left: node.x, top: node.y }}
                            className="absolute z-30 group"
                        >
                            <div className="flex flex-col items-center gap-3 translate-x-[-50%] translate-y-[-50%]">
                                <div className="w-12 h-12 md:w-20 md:h-20 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex items-center justify-center text-white/60 group-hover:text-blue-400 group-hover:border-blue-400/50 transition-all duration-500 hover:scale-110 shadow-xl">
                                    {node.icon}
                                </div>
                                <span className="text-[10px] md:text-xs tracking-[0.2em] uppercase text-white/40 group-hover:text-white transition-colors font-medium">
                                    {node.label}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default PlatformEcosystem;
