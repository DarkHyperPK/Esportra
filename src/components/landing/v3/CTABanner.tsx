import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const CTABanner = () => {
    const { user } = useAuth();
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-80px" });

    return (
        <section className="py-32 relative overflow-hidden" ref={ref}>
            {/* Full-bleed background */}
            <div className="absolute inset-0 bg-[#050505]" />
            <div className="absolute inset-0 bg-gradient-to-b from-rose-500/[0.04] to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-500/20 to-transparent" />

            {/* Centered glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-rose-500/[0.04] rounded-full blur-[150px] pointer-events-none" />

            <div className="container mx-auto px-5 sm:px-8 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8 }}
                    className="max-w-2xl mx-auto text-center"
                >
                    <span className="text-[10px] font-bold tracking-[0.5em] text-rose-500/60 uppercase block mb-6">
                        Join the Movement
                    </span>

                    <h2 className="font-heading text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-[0.95]">
                        Your Next<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-rose-600">
                            Victory
                        </span>{" "}
                        Awaits.
                    </h2>

                    <p className="mt-6 text-white/30 text-sm md:text-base font-body max-w-md mx-auto leading-relaxed">
                        Whether you're a solo grinder, a team captain, or a tournament organizer — 
                        Esportra is where competitive gaming lives.
                    </p>

                    <div className="flex flex-wrap justify-center gap-4 mt-10">
                        {!user ? (
                            <>
                                <Button asChild size="lg" className="bg-rose-500 hover:bg-rose-400 text-white px-10 py-6 text-sm font-bold tracking-wider rounded-md shadow-[0_0_50px_rgba(244,63,94,0.3)] hover:shadow-[0_0_70px_rgba(244,63,94,0.45)] hover:scale-[1.02] transition-all duration-300 group">
                                    <Link to="/auth/signup">
                                        CREATE FREE ACCOUNT
                                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </Button>
                                <Button asChild size="lg" variant="outline" className="border-white/10 text-white/50 hover:text-white hover:border-white/25 hover:bg-white/5 px-8 py-6 text-sm font-medium tracking-wider rounded-md transition-all duration-300">
                                    <Link to="/tournaments">EXPLORE TOURNAMENTS</Link>
                                </Button>
                            </>
                        ) : (
                            <Button asChild size="lg" className="bg-rose-500 hover:bg-rose-400 text-white px-10 py-6 text-sm font-bold tracking-wider rounded-md shadow-[0_0_50px_rgba(244,63,94,0.3)] transition-all duration-300 group">
                                <Link to="/tournaments">
                                    FIND YOUR NEXT TOURNAMENT
                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </Link>
                            </Button>
                        )}
                    </div>

                    {/* Subtle trust */}
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={isInView ? { opacity: 1 } : {}}
                        transition={{ duration: 0.6, delay: 0.6 }}
                        className="mt-8 text-[11px] text-white/15 tracking-wider"
                    >
                        Free forever for players · No credit card required
                    </motion.p>
                </motion.div>
            </div>
        </section>
    );
};

export default CTABanner;
