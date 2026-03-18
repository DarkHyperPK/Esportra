import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useScroll, useTransform } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";

const HERO_VIDEO_URL = getWebsiteAssetUrl('hero-section-video/video3.mp4');

const HeroV3 = () => {
    const { user } = useAuth();
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { scrollY } = useScroll();
    const videoScale = useTransform(scrollY, [0, 800], [1, 1.2]);
    const contentOpacity = useTransform(scrollY, [0, 400], [1, 0]);
    const contentY = useTransform(scrollY, [0, 400], [0, 80]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
            videoRef.current.volume = 0.75;
            videoRef.current.play().catch(() => {});
        }
    }, [isMuted]);

    return (
        <section className="relative min-h-screen overflow-hidden bg-black">
            {/* Video */}
            <motion.div className="absolute inset-0" style={{ scale: videoScale }}>
                <video
                    ref={videoRef}
                    autoPlay loop muted playsInline preload="auto" crossOrigin="anonymous"
                    onCanPlayThrough={() => setIsVideoLoaded(true)}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2s] ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
                >
                    <source src={HERO_VIDEO_URL} type="video/mp4" />
                </video>
            </motion.div>

            {/* Overlays */}
            <div className="absolute inset-0 z-[1] bg-black/60" />
            <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/40 via-transparent to-[#050505]" />

            {/* Asymmetric layout: content LEFT, 3D embed RIGHT */}
            <motion.div
                style={{ opacity: contentOpacity, y: contentY }}
                className="relative z-10 container mx-auto px-5 sm:px-8 min-h-screen flex items-center"
            >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full py-28">
                    {/* Left: Text */}
                    <div>
                        <motion.div
                            initial={{ opacity: 0, x: -40 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                <span className="text-[11px] font-bold tracking-[0.4em] text-rose-400/80 uppercase">
                                    Now Live
                                </span>
                            </div>

                            <h1 className="font-heading font-extrabold text-white leading-[0.92] tracking-tight mb-6">
                                <span className="block text-5xl md:text-6xl lg:text-7xl">The Future of</span>
                                <span className="block text-5xl md:text-6xl lg:text-7xl mt-2">
                                    Competitive
                                </span>
                                <span className="block text-5xl md:text-6xl lg:text-7xl mt-2 text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-rose-600">
                                    Gaming.
                                </span>
                            </h1>

                            <p className="text-white/40 text-base md:text-lg font-body leading-relaxed max-w-md mb-10">
                                Tournaments, teams, venues, and match history — all in one
                                platform built for the next generation of esports.
                            </p>

                            <div className="flex flex-wrap gap-4">
                                {!user ? (
                                    <>
                                        <Button asChild size="lg" className="bg-rose-500 hover:bg-rose-400 text-white px-8 py-6 text-sm font-bold tracking-wider rounded-md shadow-[0_0_40px_rgba(244,63,94,0.25)] hover:shadow-[0_0_60px_rgba(244,63,94,0.4)] hover:scale-[1.02] transition-all duration-300">
                                            <Link to="/auth/signup">GET STARTED FREE</Link>
                                        </Button>
                                        <Button asChild size="lg" variant="outline" className="border-white/15 text-white/70 hover:text-white hover:bg-white/5 hover:border-white/30 px-8 py-6 text-sm font-medium tracking-wider rounded-md transition-all duration-300">
                                            <Link to="/tournaments">VIEW TOURNAMENTS</Link>
                                        </Button>
                                    </>
                                ) : (
                                    <Button asChild size="lg" className="bg-rose-500 hover:bg-rose-400 text-white px-8 py-6 text-sm font-bold tracking-wider rounded-md shadow-[0_0_40px_rgba(244,63,94,0.25)] transition-all duration-300">
                                        <Link to="/tournaments">FIND TOURNAMENTS</Link>
                                    </Button>
                                )}
                            </div>
                        </motion.div>
                    </div>

                    {/* Right: 3D Spline Scene */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="hidden lg:flex items-center justify-center relative"
                    >
                        <div className="relative w-full aspect-square max-w-[500px]">
                            {/* 3D Spline embed — interactive gaming controller */}
                            <iframe
                                src="https://my.spline.design/interactivegamingsetup-7dae03a3f4d0b8f97f0b09e29da8fcc3/"
                                frameBorder="0"
                                width="100%"
                                height="100%"
                                className="rounded-2xl"
                                style={{ border: 'none', pointerEvents: 'auto' }}
                                title="3D Scene"
                                loading="lazy"
                            />
                            {/* Glow behind */}
                            <div className="absolute -inset-8 bg-rose-500/10 blur-[80px] rounded-full -z-10 pointer-events-none" />
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* Audio */}
            <div className="absolute bottom-6 right-6 z-30">
                <button onClick={() => setIsMuted(!isMuted)} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 hover:border-white/25 flex items-center justify-center transition-all" aria-label={isMuted ? "Unmute" : "Mute"}>
                    {isMuted ? <VolumeX className="w-4 h-4 text-white/40" /> : <Volume2 className="w-4 h-4 text-white/80" />}
                </button>
            </div>
            <span className="absolute bottom-6 left-6 z-30 text-[9px] text-white/20 tracking-[0.3em] uppercase">Credits: ViderGG</span>

            {/* Scroll line */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 0.3 }} transition={{ delay: 3 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
            >
                <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="w-[1px] h-10 bg-gradient-to-b from-transparent via-white/40 to-transparent" />
            </motion.div>
        </section>
    );
};

export default HeroV3;
