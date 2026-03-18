import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight } from "lucide-react";

const CTASection = () => {
    const { user } = useAuth();

    return (
        <section className="py-32 md:py-48 bg-[#050505] relative overflow-hidden flex items-center justify-center">
            {/* Background energy */}
            <div className="absolute inset-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-500/8 blur-[150px] rounded-full" />
                <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] bg-rose-600/5 blur-[120px] rounded-full" />
            </div>

            {/* Top border accent */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="container mx-auto px-4 relative z-10 text-center flex flex-col items-center">
                <motion.span
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-rose-500/60 text-xs tracking-[0.5em] uppercase font-bold mb-6 block"
                >
                    Your Move
                </motion.span>

                <motion.h2
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                    className="text-4xl md:text-6xl lg:text-8xl font-extrabold text-white font-heading tracking-tight mb-6 leading-[0.95]"
                >
                    Stop Watching.
                    <br />
                    <span className="text-rose-500">Start Competing.</span>
                </motion.h2>

                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="text-white/40 text-lg md:text-xl font-light max-w-lg mb-12 font-body"
                >
                    Join thousands of players already climbing the ladder. Your next tournament is waiting.
                </motion.p>

                {!user && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5, duration: 0.6 }}
                    >
                        <Button
                            asChild
                            size="lg"
                            className="bg-rose-500 hover:bg-rose-600 text-white px-12 py-7 text-xl font-bold font-heading tracking-wider rounded-lg transition-all duration-300 shadow-[0_0_40px_rgba(244,63,94,0.3)] hover:shadow-[0_0_60px_rgba(244,63,94,0.5)] hover:scale-[1.03] group"
                        >
                            <Link to="/auth/signin" className="flex items-center gap-3">
                                GET STARTED
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </Button>
                    </motion.div>
                )}
            </div>
        </section>
    );
};

export default CTASection;
