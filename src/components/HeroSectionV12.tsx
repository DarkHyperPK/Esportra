import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useScroll, useTransform } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";

const HERO_VIDEO_URL = getWebsiteAssetUrl('hero-section-video/video3.mp4');

const WORDS = ['TOURNAMENTS.', 'VENUES.', 'TEAMS.', 'RANKINGS.', 'LEGENDS.'];

/* Word cycling */
const CyclingWord = () => {
    const [index, setIndex] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setIndex(i => (i + 1) % WORDS.length), 2200);
        return () => clearInterval(id);
    }, []);
    return (
        <span className="relative inline-block overflow-hidden" style={{ minWidth: '10ch' }}>
            <motion.span
                key={index}
                initial={{ y: '110%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                exit={{ y: '-110%', opacity: 0 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="inline-block text-transparent bg-clip-text"
                style={{ backgroundImage: 'linear-gradient(135deg, #f43f5e, #fb7185 55%, #fecdd3)' }}
            >
                {WORDS[index]}
            </motion.span>
        </span>
    );
};

const HeroSectionV12 = () => {
    const { user } = useAuth();
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { scrollY } = useScroll();
    const heroOpacity = useTransform(scrollY, [0, 380], [1, 0]);
    const videoScale = useTransform(scrollY, [0, 600], [1, 1.1]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
            videoRef.current.volume = 0.75;
            videoRef.current.play().catch(() => {});
        }
    }, [isMuted]);

    return (
        <section className="relative min-h-screen overflow-hidden bg-black">

            {/* ── Video ── */}
            <motion.div className="absolute inset-0 z-0" style={{ scale: videoScale }}>
                <video
                    ref={videoRef}
                    autoPlay loop muted playsInline preload="auto" crossOrigin="anonymous"
                    onCanPlayThrough={() => setIsVideoLoaded(true)}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
                    style={{ objectPosition: 'center 30%' }}
                >
                    <source src={HERO_VIDEO_URL} type="video/mp4" />
                </video>
            </motion.div>

            {/* Overlays */}
            <div className="absolute inset-0 z-[1] bg-black/65" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 z-[2]" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95), transparent)' }} />
            {/* Vignette edges */}
            <div className="absolute inset-0 z-[2] pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)' }} />

            {/* ── Content ── */}
            <motion.div style={{ opacity: heroOpacity }} className="relative z-10 min-h-screen flex flex-col justify-between px-6 sm:px-12 py-7">

                {/* Top row */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.25, duration: 0.8 }}
                    className="flex items-center justify-between"
                >
                    <img
                        src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                        alt="Esportra"
                        className="h-8 w-auto opacity-80"
                    />
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)' }}>
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-[10px] font-bold tracking-[0.4em] text-rose-400 uppercase">Season 1 Open</span>
                        </div>
                        <button
                            onClick={() => setIsMuted(m => !m)}
                            className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 hover:border-white/20 transition-all"
                            style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}
                        >
                            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-white/30" /> : <Volume2 className="w-3.5 h-3.5 text-white/65" />}
                        </button>
                    </div>
                </motion.div>

                {/* Main center block */}
                <div className="flex flex-col items-center text-center gap-8 py-4">

                    {/* Eyebrow */}
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.6 }}
                        className="text-[11px] font-bold tracking-[0.55em] text-white/30 uppercase"
                    >
                        Middle East Esports Platform
                    </motion.p>

                    {/* Headline with cycling word */}
                    <div className="space-y-2">
                        <div className="overflow-hidden">
                            <motion.h1
                                initial={{ y: '110%' }}
                                animate={{ y: '0%' }}
                                transition={{ duration: 0.85, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                className="font-heading font-extrabold text-white leading-[0.9] tracking-tight"
                                style={{ fontSize: 'clamp(2.8rem, 8vw, 7.5rem)' }}
                            >
                                One Platform.
                            </motion.h1>
                        </div>
                        <div className="overflow-hidden">
                            <motion.h1
                                initial={{ y: '110%' }}
                                animate={{ y: '0%' }}
                                transition={{ duration: 0.85, delay: 0.72, ease: [0.16, 1, 0.3, 1] }}
                                className="font-heading font-extrabold leading-[0.9] tracking-tight"
                                style={{ fontSize: 'clamp(2.8rem, 8vw, 7.5rem)' }}
                            >
                                All Your{' '}<CyclingWord />
                            </motion.h1>
                        </div>
                    </div>

                    {/* Sub */}
                    <motion.p
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9, duration: 0.6 }}
                        className="text-white/40 text-sm md:text-base max-w-md leading-relaxed"
                    >
                        Compete in tournaments, book gaming venues, manage teams, and climb the rankings — all in one place.
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.0, duration: 0.6 }}
                        className="flex flex-wrap gap-4 justify-center"
                    >
                        <Link to="/tournaments">
                            <button
                                className="group flex items-center gap-2.5 px-8 py-4 rounded-2xl text-sm font-bold text-white transition-all duration-300 hover:scale-[1.03]"
                                style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', boxShadow: '0 0 50px rgba(244,63,94,0.3), inset 0 1px 0 rgba(255,255,255,0.1)' }}
                            >
                                Browse Tournaments
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </Link>
                        <Link to={user ? '/organizer/dashboard' : '/auth/sign-up'}>
                            <button className="px-8 py-4 rounded-2xl text-sm font-medium text-white/45 hover:text-white border border-white/10 hover:border-white/25 bg-white/[0.03] hover:bg-white/[0.08] transition-all duration-300 backdrop-blur-sm">
                                {user ? 'Go to Dashboard' : 'Get Started Free'}
                            </button>
                        </Link>
                    </motion.div>
                </div>

                {/* Bottom stats + credits */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2, duration: 0.7 }}
                    className="flex items-end justify-between"
                >
                    {/* Stats */}
                    <div className="flex items-center gap-6 flex-wrap">
                        {[['200+', 'Tournaments'], ['5K+', 'Players'], ['50+', 'Venues']].map(([v, l]) => (
                            <div key={l} className="flex items-baseline gap-1.5">
                                <span className="text-xl font-extrabold font-heading text-white">{v}</span>
                                <span className="text-[11px] text-white/25 uppercase tracking-wider">{l}</span>
                            </div>
                        ))}
                    </div>
                    <span className="text-[9px] text-white/12 tracking-[0.3em] uppercase hidden sm:block">Credits: ViderGG</span>
                </motion.div>
            </motion.div>
        </section>
    );
};

export default HeroSectionV12;
