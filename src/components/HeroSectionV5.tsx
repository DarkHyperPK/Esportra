import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useScroll, useTransform } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";

const HERO_VIDEO_URL = getWebsiteAssetUrl('hero-section-video/video3.mp4');
const TICKER = ['Valorant', '·', 'CS2', '·', 'FIFA 25', '·', 'Rocket League', '·', 'Tekken 8', '·', 'PUBG Mobile', '·', 'Free Fire', '·', 'EA FC 25', '·'];

const HeroSectionV5 = () => {
    const { user } = useAuth();
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { scrollY } = useScroll();
    const heroOpacity = useTransform(scrollY, [0, 420], [1, 0]);
    const videoX = useTransform(scrollY, [0, 600], ['0%', '4%']);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
            videoRef.current.volume = 0.75;
            videoRef.current.play().catch(() => {});
        }
    }, [isMuted]);

    return (
        <section className="relative min-h-screen overflow-hidden bg-[#060607]">

            {/* ── Full-screen video — clipped to right side via diagonal mask ── */}
            <motion.div
                className="absolute inset-0 z-0"
                style={{ x: videoX }}
            >
                <video
                    ref={videoRef}
                    autoPlay loop muted playsInline preload="auto" crossOrigin="anonymous"
                    onCanPlayThrough={() => setIsVideoLoaded(true)}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
                    style={{ objectPosition: '70% center' }}
                >
                    <source src={HERO_VIDEO_URL} type="video/mp4" />
                </video>
                {/* Diagonal cut overlay — left half dark, diagonal fade to clear */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(105deg, #060607 0%, #060607 38%, rgba(6,6,7,0.88) 48%, rgba(6,6,7,0.3) 62%, rgba(6,6,7,0.05) 80%)',
                    }}
                />
                {/* Bottom bleed */}
                <div className="absolute inset-x-0 bottom-0 h-40" style={{ background: 'linear-gradient(to top, #060607, transparent)' }} />
                {/* Subtle rose glow along the diagonal edge */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: 'linear-gradient(105deg, transparent 44%, rgba(244,63,94,0.06) 48%, transparent 54%)',
                    }}
                />
            </motion.div>

            {/* ── Content ── */}
            <motion.div
                style={{ opacity: heroOpacity }}
                className="relative z-10 container mx-auto px-6 sm:px-10 min-h-screen flex flex-col justify-between py-8"
            >
                {/* Top bar */}
                <div className="flex items-center justify-between">
                    <motion.div
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.7, delay: 0.2 }}
                    >
                        <img
                            src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                            alt="Esportra"
                            className="h-8 w-auto opacity-85"
                        />
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="hidden md:flex items-center gap-6 text-xs text-white/30 font-medium tracking-wide"
                    >
                        <Link to="/tournaments" className="hover:text-white/70 transition-colors">Tournaments</Link>
                        <Link to="/venues" className="hover:text-white/70 transition-colors">Venues</Link>
                        <Link to="/auth/sign-up" className="hover:text-white/70 transition-colors">Sign Up</Link>
                    </motion.div>
                </div>

                {/* Middle — main hero content */}
                <div className="flex flex-col max-w-2xl mt-auto mb-auto pt-16 space-y-8">

                    {/* Category label */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.35 }}
                        className="flex items-center gap-3"
                    >
                        <div className="w-8 h-px bg-rose-500/70" />
                        <span className="text-[10px] font-bold tracking-[0.5em] text-rose-400/80 uppercase">
                            Middle East Esports Platform
                        </span>
                    </motion.div>

                    {/* Headline — editorial stacked */}
                    <div className="space-y-0 overflow-hidden">
                        {['THE', 'ARENA', 'IS OPEN.'].map((word, i) => (
                            <div key={word} className="overflow-hidden">
                                <motion.h1
                                    initial={{ y: '110%' }}
                                    animate={{ y: '0%' }}
                                    transition={{ duration: 0.8, delay: 0.5 + i * 0.14, ease: [0.16, 1, 0.3, 1] }}
                                    className="font-heading font-extrabold leading-[0.9] tracking-[-0.03em] block"
                                    style={{ fontSize: 'clamp(3.5rem, 10vw, 9rem)' }}
                                >
                                    {i === 2 ? (
                                        <span
                                            className="text-transparent bg-clip-text"
                                            style={{ backgroundImage: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 55%, #fecdd3 100%)' }}
                                        >
                                            {word}
                                        </span>
                                    ) : (
                                        <span className="text-white">{word}</span>
                                    )}
                                </motion.h1>
                            </div>
                        ))}
                    </div>

                    {/* Sub + CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.95 }}
                        className="space-y-6"
                    >
                        <p className="text-white/40 text-sm md:text-base max-w-sm leading-relaxed">
                            Compete in tournaments, book gaming venues, build your team — all in one platform.
                        </p>

                        <div className="flex flex-wrap gap-3">
                            <Link to="/tournaments">
                                <button
                                    className="group flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white tracking-wide transition-all duration-300 hover:scale-[1.02]"
                                    style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', boxShadow: '0 0 40px rgba(244,63,94,0.28), inset 0 1px 0 rgba(255,255,255,0.12)' }}
                                >
                                    Enter the Arena
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </Link>
                            <Link to={user ? '/organizer/dashboard' : '/auth/sign-up'}>
                                <button className="px-7 py-3.5 rounded-xl text-sm font-medium text-white/50 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300">
                                    {user ? 'Dashboard' : 'Create Account'}
                                </button>
                            </Link>
                        </div>

                        {/* Inline stats */}
                        <div className="flex items-center gap-6 pt-1">
                            {[['200+', 'Tournaments'], ['5K+', 'Players'], ['50+', 'Venues']].map(([v, l]) => (
                                <div key={l} className="flex items-baseline gap-1.5">
                                    <span className="text-lg font-bold font-heading text-white">{v}</span>
                                    <span className="text-[11px] text-white/30">{l}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Bottom ticker + audio */}
                <div className="flex items-center justify-between">
                    {/* Game ticker */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.4 }}
                        className="overflow-hidden flex-1 mr-6 max-w-[70%]"
                    >
                        <div className="flex gap-4 animate-[marquee_25s_linear_infinite] whitespace-nowrap w-max">
                            {[...TICKER, ...TICKER].map((tag, i) => (
                                <span key={i} className={`flex-shrink-0 text-[10px] font-semibold tracking-widest uppercase ${tag === '·' ? 'text-rose-500/50' : 'text-white/20'}`}>
                                    {tag}
                                </span>
                            ))}
                        </div>
                    </motion.div>

                    {/* Audio */}
                    <button
                        onClick={() => setIsMuted(m => !m)}
                        className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 hover:border-white/20 transition-all flex-shrink-0"
                        style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 text-white/30" /> : <Volume2 className="w-3.5 h-3.5 text-white/70" />}
                    </button>
                </div>
            </motion.div>

            {/* Credits */}
            <span className="absolute bottom-9 left-1/2 -translate-x-1/2 z-20 text-[9px] text-white/10 tracking-[0.3em] uppercase pointer-events-none">
                Credits: ViderGG
            </span>

            {/* Right-side overlay label — visible on the video side */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 }}
                className="absolute right-6 top-1/2 -translate-y-1/2 z-10 hidden xl:flex flex-col items-center gap-3 pointer-events-none"
            >
                <div className="w-px h-20 bg-gradient-to-b from-transparent to-white/15" />
                <span className="text-[9px] font-bold tracking-[0.5em] text-white/15 uppercase" style={{ writingMode: 'vertical-rl' }}>
                    Esportra
                </span>
                <div className="w-px h-20 bg-gradient-to-t from-transparent to-white/15" />
            </motion.div>
        </section>
    );
};

export default HeroSectionV5;
