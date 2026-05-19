import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Zap } from "lucide-react";
import { JackButton } from "@/components/ui/JackButton";

const Roadmap = () => {
    const { user } = useAuth();

    return (
        <section className="py-32 md:py-60 bg-[#0a0a0a] border-t border-white/5 overflow-hidden flex items-center justify-center">
            <div className="container mx-auto px-4 relative z-10 text-center flex flex-col items-center">
                <motion.h2
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    className="text-4xl md:text-7xl lg:text-8xl font-light text-white font-heading tracking-tight mb-12"
                >
                    The journey <br />
                    <span className="font-medium italic text-rose-500">has just begun.</span>
                </motion.h2>

                {!user && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                    >
                        <JackButton as={Link} to="/auth/signin" size="lg" className="px-8 py-6 text-lg md:px-12 md:py-8 md:text-xl">
                            Get Started <Zap className="w-6 h-6 fill-current" />
                        </JackButton>
                    </motion.div>
                )}

                {/* Subtle decorative glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-rose-500/5 blur-[120px] rounded-full -z-10" />
            </div>
        </section>
    );
};

export default Roadmap;
