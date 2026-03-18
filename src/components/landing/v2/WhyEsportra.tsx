import { motion } from "framer-motion";
import { ShieldCheck, Eye, TrendingUp, Crosshair, Swords, Award } from "lucide-react";

const features = [
    {
        icon: <Crosshair className="w-6 h-6" />,
        title: "Automated Brackets",
        desc: "Single elimination, double elimination, round robin — generated in seconds. No spreadsheets, no manual seeding headaches.",
        accent: "group-hover:text-rose-400",
    },
    {
        icon: <ShieldCheck className="w-6 h-6" />,
        title: "Anti-Cheat Integrity",
        desc: "Score verification, dispute resolution, and match monitoring keep every competition fair and legitimate.",
        accent: "group-hover:text-rose-400",
    },
    {
        icon: <Eye className="w-6 h-6" />,
        title: "Transparent Prize Pools",
        desc: "Every prize pool is locked and visible. What's promised is what's paid. No hidden fees, no broken promises.",
        accent: "group-hover:text-rose-400",
    },
    {
        icon: <Swords className="w-6 h-6" />,
        title: "Map Veto System",
        desc: "Professional-grade map veto with ban/pick phases. The same system used in tier-1 esports, now for everyone.",
        accent: "group-hover:text-rose-400",
    },
    {
        icon: <TrendingUp className="w-6 h-6" />,
        title: "Verified Match History",
        desc: "Every match is recorded permanently. Build a competitive profile that sponsors and teams can trust.",
        accent: "group-hover:text-rose-400",
    },
    {
        icon: <Award className="w-6 h-6" />,
        title: "Venue Integration",
        desc: "Connect with gaming venues for LAN events. Book stations, host watch parties, and build local scenes.",
        accent: "group-hover:text-rose-400",
    },
];

const WhyEsportra = () => {
    return (
        <section className="py-24 md:py-32 bg-[#050505] relative overflow-hidden">
            {/* Background texture */}
            <div className="absolute inset-0 opacity-[0.015]" style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
                backgroundSize: '40px 40px',
            }} />

            {/* Accent glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-rose-500/5 blur-[200px] rounded-full pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                {/* Header */}
                <div className="text-center mb-16 md:mb-24">
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-rose-500/70 text-xs tracking-[0.4em] uppercase font-bold mb-4 block"
                    >
                        Built for Competition
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white font-heading tracking-tight"
                    >
                        Everything You Need
                        <br />
                        <span className="text-white/30">To Dominate.</span>
                    </motion.h2>
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.08 }}
                            className="group relative p-6 md:p-8 bg-white/[0.02] border border-white/5 rounded-xl hover:border-rose-500/20 hover:bg-rose-500/[0.03] transition-all duration-500"
                        >
                            {/* Corner accent on hover */}
                            <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-transparent group-hover:border-rose-500/30 rounded-tl-xl transition-all duration-500" />

                            <div className={`text-white/40 mb-4 transition-colors duration-300 ${feature.accent}`}>
                                {feature.icon}
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2 font-heading tracking-wide">
                                {feature.title}
                            </h3>
                            <p className="text-sm text-white/40 leading-relaxed font-body group-hover:text-white/60 transition-colors duration-300">
                                {feature.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default WhyEsportra;
