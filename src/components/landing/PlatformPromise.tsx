import { motion } from "framer-motion";
import { ShieldCheck, Eye, TrendingUp } from "lucide-react";

const promises = [
    {
        title: "Absolute Transparency",
        desc: "Every prize pool is locked and verified. We ensure that what the winner is promised is what the winner gets.",
        icon: <Eye className="w-8 h-8 text-blue-400" />
    },
    {
        title: "Competitive Integrity",
        desc: "Zero tolerance for foul play. Our system monitors tournament standards to keep the arena level for everyone.",
        icon: <ShieldCheck className="w-8 h-8 text-emerald-400" />
    },
    {
        title: "A Verified Path",
        desc: "Your records are permanent. We turn your local wins into a global profile that sponsors and teams can trust.",
        icon: <TrendingUp className="w-8 h-8 text-purple-400" />
    },
];

const PlatformPromise = () => {
    return (
        <section className="py-32 bg-[#0a0a0a] relative overflow-hidden">
            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-24">
                    <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        className="text-white/40 text-sm tracking-[0.4em] uppercase font-medium mb-4 block"
                    >
                        Our Commitment
                    </motion.span>
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-light text-white font-heading"
                    >
                        We're not hosting just games. <br />
                        <span className="font-medium italic text-rose-500">We're building an ecosystem.</span>
                    </motion.h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl mx-auto">
                    {promises.map((p, index) => (
                        <motion.div
                            key={p.title}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="p-8 bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all duration-500"
                        >
                            <div className="mb-6">{p.icon}</div>
                            <h3 className="text-2xl text-white font-medium mb-4 font-heading">{p.title}</h3>
                            <p className="text-white/40 font-light leading-relaxed">
                                {p.desc}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default PlatformPromise;
