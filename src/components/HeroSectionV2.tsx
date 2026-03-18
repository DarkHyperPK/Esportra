import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, ArrowRight, Trophy, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";

const HERO_VIDEO_URL = getWebsiteAssetUrl('hero-section-video/video3.mp4');

const STATS = [
    { icon: Trophy,  value: '200+',  label: 'Tournaments' },
    { icon: Users,   value: '5,000+', label: 'Players'      },
    { icon: Zap,     value: '50+',   label: 'Venues'        },
];

const HeroSectionV2 = () => {
    const { user } = useAuth();
    const [isMuted, setIsMuted] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [isLogoMoved, setIsLogoMoved] = useState(false);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const [contentVisible, setContentVisible] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { scrollY } = useScroll();
    const backgroundY = useTransform(scrollY, [0, 500], [0, 200]);
    const contentOpacity = useTransform(scrollY, [0, 300], [1, 0]);

    // Logo moves up after 3s, content reveals 1.2s later
    useEffect(() => {
        const logoTimer = setTimeout(() => setIsLogoMoved(true), 3000);
        const contentTimer = setTimeout(() => setContentVisible(true), 4200);
        return () => { clearTimeout(logoTimer); clearTimeout(contentTimer); };
    }, []);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
            videoRef.current.volume = 0.75;
            videoRef.current.play().catch(() => {});
        }
    }, [isMuted]);

    return (
        <div
            className="relative flex items-center overflow-hidden"
            style={{ minHeight: '100vh', backgroundColor: '#0f1115' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Parallax video */}
            <motion.div className="absolute inset-0 w-full h-full z-0" style={{ y: backgroundY }}>
                <motion.video
                    ref={videoRef}
                    autoPlay loop muted playsInline preload="auto" crossOrigin="anonymous"
                    onCanPlayThrough={() => setIsVideoLoaded(true)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isVideoLoaded ? 1 : 0 }}
                    transition={{ duration: 1.5 }}
                    className="absolute inset-0 w-full h-full object-cover scale-[1.25] md:scale-110"
                    style={{ objectPosition: 'center' }}
                >
                    <source src={HERO_VIDEO_URL} type="video/mp4" />
                </motion.video>
            </motion.div>

            {/* Overlays */}
            <div className="absolute inset-0 z-10 bg-black/70" />
            <div className="absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(244,63,94,0.08),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(124,58,237,0.06),transparent_55%)]" />
            <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0f1115] to-transparent z-10" />

            {/* Credits */}
            <div className="absolute bottom-12 left-8 z-30 opacity-30 hover:opacity-70 transition-opacity text-[10px] uppercase tracking-[0.3em] text-white/60">
                Credits: ViderGG
            </div>

            {/* Audio control */}
            <div className="absolute bottom-12 right-8 z-30 flex items-center gap-3">
                <AnimatePresence>
                    {isHovered && (
                        <motion.div
                            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
                            className="px-3 py-1.5 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40"
                        >
                            {isMuted ? 'Audio Off' : 'Audio On'}
                        </motion.div>
                    )}
                </AnimatePresence>
                <button
                    onClick={() => setIsMuted(m => !m)}
                    className="flex items-center justify-center w-12 h-12 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/30 transition-all duration-500"
                >
                    {isMuted
                        ? <VolumeX className="w-5 h-5 text-white/50" />
                        : <Volume2 className="w-5 h-5 text-white" />}
                </button>
            </div>

            {/* Main content */}
            <motion.div
                className="container mx-auto px-4 relative z-20 flex flex-col items-center justify-center min-h-screen gap-0"
                style={{ opacity: contentOpacity }}
            >
                {/* Logo — moves up to make room */}
                <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                        opacity: 1,
                        scale: isLogoMoved ? 0.65 : 1,
                        y: isLogoMoved ? -20 : 0,
                    }}
                    transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                    className="flex flex-col items-center"
                >
                    <img
                        src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                        alt="Esportra"
                        className="h-24 md:h-32 w-auto opacity-90 drop-shadow-[0_0_30px_rgba(255,255,255,0.08)]"
                    />
                    <motion.p
                        animate={{ opacity: isLogoMoved ? 0 : 0.7 }}
                        transition={{ duration: 0.6 }}
                        className="text-white text-xl md:text-2xl font-light tracking-[0.25em] mt-4 uppercase font-heading"
                    >
                        Esports. Elevated.
                    </motion.p>
                </motion.div>

                {/* V2 — Revealed content after logo settles */}
                <AnimatePresence>
                    {contentVisible && (
                        <motion.div
                            initial={{ opacity: 0, y: 32 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                            className="flex flex-col items-center text-center mt-4 max-w-3xl mx-auto space-y-6"
                        >
                            {/* Tagline pill */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.1 }}
                                className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-esports-accent/30 bg-esports-accent/10 text-esports-accent text-xs font-semibold uppercase tracking-widest"
                            >
                                <Zap className="w-3 h-3" />
                                The #1 Esports Platform in the Middle East
                            </motion.div>

                            {/* Headline */}
                            <motion.h1
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-4xl md:text-6xl lg:text-7xl font-heading font-bold leading-[1.05] tracking-tight"
                            >
                                Compete.{' '}
                                <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #f43f5e, #fb923c)' }}>
                                    Win.
                                </span>
                                {' '}Dominate.
                            </motion.h1>

                            {/* Sub */}
                            <motion.p
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-white/55 text-base md:text-lg max-w-xl leading-relaxed"
                            >
                                Register for tournaments, book venues, and track your rise — all in one platform built for serious players and organizers.
                            </motion.p>

                            {/* CTAs */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="flex flex-wrap items-center justify-center gap-4"
                            >
                                <Link to="/tournaments">
                                    <Button
                                        size="lg"
                                        className="h-12 px-8 rounded-2xl font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-[0_0_30px_rgba(244,63,94,0.4)]"
                                        style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}
                                    >
                                        Browse Tournaments <ArrowRight className="ml-2 w-4 h-4" />
                                    </Button>
                                </Link>
                                <Link to={user ? '/organizer/dashboard' : '/auth/sign-up'}>
                                    <Button
                                        size="lg"
                                        variant="outline"
                                        className="h-12 px-8 rounded-2xl font-semibold border-white/15 bg-white/5 backdrop-blur-sm hover:bg-white/10 hover:border-white/30 transition-all duration-300"
                                    >
                                        {user ? 'Go to Dashboard' : 'Create Organization'}
                                    </Button>
                                </Link>
                            </motion.div>

                            {/* Stats */}
                            <motion.div
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.55 }}
                                className="flex items-center gap-6 md:gap-10 pt-2"
                            >
                                {STATS.map(({ icon: Icon, value, label }) => (
                                    <div key={label} className="flex flex-col items-center gap-1">
                                        <div className="flex items-center gap-1.5">
                                            <Icon className="w-4 h-4 text-esports-accent" />
                                            <span className="text-xl md:text-2xl font-bold font-heading">{value}</span>
                                        </div>
                                        <span className="text-[11px] uppercase tracking-widest text-white/35">{label}</span>
                                    </div>
                                ))}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};

export default HeroSectionV2;
