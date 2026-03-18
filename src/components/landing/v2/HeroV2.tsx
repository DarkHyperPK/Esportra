import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";

const HERO_VIDEO_URL = getWebsiteAssetUrl('hero-section-video/video3.mp4');

const HeroV2 = () => {
    const { user } = useAuth();
    const [isMuted, setIsMuted] = useState(true);
    const [volume] = useState(0.75);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const sectionRef = useRef<HTMLDivElement>(null);

    const { scrollY } = useScroll();
    const backgroundY = useTransform(scrollY, [0, 600], [0, 200]);
    const contentOpacity = useTransform(scrollY, [0, 400], [1, 0]);
    const contentY = useTransform(scrollY, [0, 400], [0, 80]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
            videoRef.current.volume = volume;
            videoRef.current.play().catch(() => {});
        }
    }, [isMuted, volume]);

    return (
        <section
            ref={sectionRef}
            className="relative flex flex-col items-center justify-center overflow-hidden"
            style={{ minHeight: '100vh', backgroundColor: '#050505' }}
        >
            {/* Video Background */}
            <motion.div className="absolute inset-0 w-full h-full z-0" style={{ y: backgroundY }}>
                <motion.video
                    ref={videoRef}
                    autoPlay loop muted playsInline preload="auto" crossOrigin="anonymous"
                    onCanPlayThrough={() => setIsVideoLoaded(true)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isVideoLoaded ? 1 : 0 }}
                    transition={{ duration: 1.5 }}
                    className="absolute inset-0 w-full h-full object-cover scale-[1.25] md:scale-110"
                >
                    <source src={HERO_VIDEO_URL} type="video/mp4" />
                </motion.video>
            </motion.div>

            {/* Overlays */}
            <div className="absolute inset-0 z-[1] bg-black/70" />
            <div className="absolute inset-0 z-[1] bg-gradient-to-b from-transparent via-transparent to-[#050505]" />
            {/* Rose accent glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-rose-500/8 blur-[150px] rounded-full z-[1]" />
            {/* Scan lines */}
            <div
                className="absolute inset-0 z-[2] pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
                }}
            />

            {/* Content */}
            <motion.div
                style={{ opacity: contentOpacity, y: contentY }}
                className="container mx-auto px-4 relative z-10 flex flex-col items-center justify-center min-h-[100vh] pt-20"
            >
                {/* Logo */}
                <motion.img
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
                    src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                    alt="Esportra"
                    className="h-16 md:h-20 w-auto mb-8 drop-shadow-[0_0_30px_rgba(244,63,94,0.15)]"
                />

                {/* Tagline */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                    className="text-center mb-6"
                >
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-white font-heading tracking-tight leading-[0.95]">
                        <span className="block">COMPETE.</span>
                        <span className="block text-rose-500">CONQUER.</span>
                        <span className="block">RISE.</span>
                    </h1>
                </motion.div>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6 }}
                    className="text-white/50 text-base md:text-lg font-light tracking-wide text-center max-w-xl mb-10 font-body"
                >
                    The esports platform for players, organizers, and venues.
                    Your path from local legend to global competitor starts here.
                </motion.p>

                {/* CTAs */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.9 }}
                    className="flex flex-col sm:flex-row gap-4 items-center"
                >
                    {!user ? (
                        <>
                            <Button
                                asChild
                                size="lg"
                                className="bg-rose-500 hover:bg-rose-600 text-white px-10 py-6 text-lg font-bold font-heading tracking-wider rounded-lg transition-all duration-300 shadow-[0_0_30px_rgba(244,63,94,0.3)] hover:shadow-[0_0_50px_rgba(244,63,94,0.5)] hover:scale-[1.02]"
                            >
                                <Link to="/auth/signin">JOIN THE ARENA</Link>
                            </Button>
                            <Button
                                asChild
                                size="lg"
                                variant="outline"
                                className="border-white/20 text-white hover:bg-white/5 hover:border-white/40 px-10 py-6 text-lg font-medium rounded-lg transition-all duration-300"
                            >
                                <Link to="/tournaments">BROWSE TOURNAMENTS</Link>
                            </Button>
                        </>
                    ) : (
                        <Button
                            asChild
                            size="lg"
                            className="bg-rose-500 hover:bg-rose-600 text-white px-10 py-6 text-lg font-bold font-heading tracking-wider rounded-lg transition-all duration-300 shadow-[0_0_30px_rgba(244,63,94,0.3)] hover:shadow-[0_0_50px_rgba(244,63,94,0.5)]"
                        >
                            <Link to="/tournaments">FIND A TOURNAMENT</Link>
                        </Button>
                    )}
                </motion.div>
            </motion.div>

            {/* Audio Control */}
            <div className="absolute bottom-8 right-8 z-30">
                <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/30 transition-all duration-300"
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? (
                        <VolumeX className="w-4 h-4 text-white/50" />
                    ) : (
                        <Volume2 className="w-4 h-4 text-white" />
                    )}
                </button>
            </div>

            {/* Video Credit */}
            <div className="absolute bottom-8 left-8 z-30 text-[10px] text-white/30 tracking-[0.3em] uppercase">
                Credits: ViderGG
            </div>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20"
            >
                <motion.div
                    animate={{ y: [0, 8, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                    <ChevronDown className="w-5 h-5 text-white/20" />
                </motion.div>
            </motion.div>
        </section>
    );
};

export default HeroV2;
