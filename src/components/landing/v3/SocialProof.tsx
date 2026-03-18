import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Star, Quote, Shield, Gamepad2, MapPin } from "lucide-react";

const testimonials = [
    {
        quote: "Finally a platform that treats tournament organizing seriously. Check-ins, brackets, disputes — it's all built in.",
        name: "Sarah K.",
        role: "Tournament Organizer",
        icon: <Shield className="w-4 h-4" />,
        rating: 5,
    },
    {
        quote: "We ran our first 64-team Valorant tournament without a single spreadsheet. Game changer.",
        name: "Marcus L.",
        role: "Team Captain",
        icon: <Gamepad2 className="w-4 h-4" />,
        rating: 5,
    },
    {
        quote: "The venue booking system is exactly what our gaming café needed. Real-time station management is incredible.",
        name: "David R.",
        role: "Venue Owner",
        icon: <MapPin className="w-4 h-4" />,
        rating: 5,
    },
];

const SocialProof = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <section className="py-28 bg-[#0a0a0c] relative overflow-hidden" ref={ref}>
            <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-transparent to-[#050505] pointer-events-none" />

            <div className="container mx-auto px-5 sm:px-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.7 }}
                    className="text-center mb-16"
                >
                    <span className="text-[10px] font-bold tracking-[0.5em] text-rose-500/60 uppercase block mb-4">
                        Community
                    </span>
                    <h2 className="font-heading text-3xl md:text-5xl font-bold text-white tracking-tight">
                        Built for <span className="text-rose-400">Competitors</span>
                    </h2>
                    <p className="mt-4 text-white/30 text-sm font-body max-w-md mx-auto">
                        Players, organizers, and venue owners trust Esportra to power their competitive experience.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {testimonials.map((t, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 25 }}
                            animate={isInView ? { opacity: 1, y: 0 } : {}}
                            transition={{ duration: 0.6, delay: 0.15 * i }}
                            className="group relative"
                        >
                            <div className="relative rounded-2xl border border-white/5 bg-[#0a0a0c]/80 backdrop-blur-sm p-6 h-full hover:border-rose-500/10 transition-colors duration-300">
                                <Quote className="w-6 h-6 text-rose-500/15 mb-4" />

                                <p className="text-white/50 text-sm font-body leading-relaxed mb-6">
                                    "{t.quote}"
                                </p>

                                <div className="flex items-center gap-1 mb-4">
                                    {Array.from({ length: t.rating }).map((_, j) => (
                                        <Star key={j} className="w-3 h-3 text-rose-400 fill-rose-400" />
                                    ))}
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-rose-400">
                                        {t.icon}
                                    </div>
                                    <div>
                                        <span className="text-white/80 text-sm font-medium block">{t.name}</span>
                                        <span className="text-white/25 text-[11px]">{t.role}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Trust numbers */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="mt-16 flex flex-wrap justify-center gap-12 text-center"
                >
                    {[
                        { value: "10K+", label: "Active Players" },
                        { value: "500+", label: "Tournaments Hosted" },
                        { value: "$50K+", label: "Prize Pools" },
                        { value: "99.9%", label: "Uptime" },
                    ].map((stat, i) => (
                        <div key={i}>
                            <div className="text-2xl md:text-3xl font-heading font-bold text-white tracking-tight">{stat.value}</div>
                            <div className="text-[11px] text-white/25 font-medium tracking-wider uppercase mt-1">{stat.label}</div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};

export default SocialProof;
