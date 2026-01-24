import { motion } from "framer-motion";

const stats = [
    { label: "Community Won", value: "$2.4M+", color: "from-blue-400 to-cyan-400" },
    { label: "Tournaments Hosted", value: "15,000+", color: "from-purple-400 to-pink-400" },
    { label: "Active Players", value: "850K+", color: "from-emerald-400 to-teal-400" },
    { label: "Countries Reached", value: "42", color: "from-orange-400 to-amber-400" },
];

const GlobalStage = () => {
    return (
        <section className="py-32 bg-[#0a0a0a] relative overflow-hidden">
            {/* Background radial effects */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(67,56,202,0.05)_0%,transparent_70%)] pointer-events-none" />

            <div className="container mx-auto px-4 relative z-10">
                <div className="text-center mb-24">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-white/40 text-sm md:text-base tracking-[0.4em] uppercase font-medium mb-4"
                    >
                        The Momentum
                    </motion.h2>
                    <motion.h3
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl md:text-6xl font-light text-white font-heading"
                    >
                        It's not just a game. <br />
                        <span className="font-medium italic">It's a movement.</span>
                    </motion.h3>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 + 0.3 }}
                            className="text-center"
                        >
                            <h4 className={`text-4xl md:text-5xl lg:text-6xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-br ${stat.color} font-heading tracking-tighter`}>
                                {stat.value}
                            </h4>
                            <p className="text-white/40 text-xs md:text-sm tracking-[0.2em] uppercase font-medium">
                                {stat.label}
                            </p>
                        </motion.div>
                    ))}
                </div>

                {/* Bottom Decorative Line */}
                <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "100%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mt-32 max-w-4xl mx-auto"
                />
            </div>
        </section>
    );
};

export default GlobalStage;
