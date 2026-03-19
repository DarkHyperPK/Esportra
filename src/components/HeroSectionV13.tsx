import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";

const HERO_VIDEO_URL = getWebsiteAssetUrl('hero-section-video/video3.mp4');

/* Particles — small glowing orbs that drift upward */
const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
    id: i,
    left: `${5 + Math.random() * 90}%`,
    delay: Math.random() * 6,
    duration: 6 + Math.random() * 8,
    size: 1.5 + Math.random() * 3,
    opacity: 0.15 + Math.random() * 0.25,
}));

const HeroSectionV13 = () => {
    const { user } = useAuth();
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const [entered, setEntered] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { scrollY } = useScroll();
    const heroOpacity = useTransform(scrollY, [0, 380], [1, 0]);

    useEffect(() => {
        // Reveal content after a beat
        const t = setTimeout(() => setEntered(true), 400);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
            videoRef.current.volume = 0.75;
            videoRef.current.play().catch(() => {});
        }
    }, [isMuted]);

    return (
        <section className="relative min-h-screen overflow-hidden bg-black flex items-center justify-center">

            {/* ── Video ── */}
            <div className="absolute inset-0 z-0">
                <video
                    ref={videoRef}
                    autoPlay loop muted playsInline preload="auto" crossOrigin="anonymous"
                    onCanPlayThrough={() => setIsVideoLoaded(true)}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2500ms] ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
                    style={{ objectPosition: 'center 25%', filter: 'brightness(0.28) saturate(0.9)' }}
                >
                    <source src={HERO_VIDEO_URL} type="video/mp4" />
                </video>
                {/* Radial spotlight — center glow */}
                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 70% 80% at 50% 55%, rgba(244,63,94,0.07) 0%, transparent 65%)' }} />
                <div className="absolute inset-x-0 bottom-0 h-48" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }} />
            </div>

            {/* ── Drifting particles ── */}
            <div className="absolute inset-0 z-[2] pointer-events-none overflow-hidden">
                {PARTICLES.map(p => (
                    <motion.div
                        key={p.id}
                        className="absolute rounded-full"
                        style={{
                            left: p.left,
                            bottom: '-10px',
                            width: `${p.size}px`,
                            height: `${p.size}px`,
                            background: '#f43f5e',
                            opacity: p.opacity,
                            filter: 'blur(1px)',
                        }}
                        animate={{ y: [0, -(window.innerHeight + 20)], opacity: [0, p.opacity, p.opacity, 0] }}
                        transition={{
                            duration: p.duration,
                            delay: p.delay,
                            repeat: Infinity,
                            ease: 'linear',
                            times: [0, 0.1, 0.9, 1],
                        }}
                    />
                ))}
            </div>

            {/* ── Top nav ── */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="absolute top-0 inset-x-0 z-20 flex items-center justify-between px-6 sm:px-10 pt-7"
            >
                <img
                    src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                    alt="Esportra"
                    className="h-8 w-auto opacity-80"
                />
                <button
                    onClick={() => setIsMuted(m => !m)}
                    className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 hover:border-white/20 transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-white/30" /> : <Volume2 className="w-3.5 h-3.5 text-white/65" />}
                </button>
            </motion.div>

            {/* ── Center stage ── */}
            <motion.div
                style={{ opacity: heroOpacity }}
                className="relative z-10 flex flex-col items-center text-center px-4 gap-10"
            >
                <AnimatePresence>
                    {entered && (
                        <>
                            {/* Eyebrow */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                                className="flex items-center gap-3"
                            >
                                <div className="h-px w-10" style={{ background: 'linear-gradient(to right, transparent, rgba(244,63,94,0.6))' }} />
                                <span className="text-[10px] font-bold tracking-[0.55em] text-rose-400/70 uppercase">
                                    The Arena Awaits
                                </span>
                                <div className="h-px w-10" style={{ background: 'linear-gradient(to left, transparent, rgba(244,63,94,0.6))' }} />
                            </motion.div>

                            {/* Hero headline — staggered per letter group */}
                            <div className="space-y-3">
                                {/* Line 1 — ghost outlined */}
                                <div className="overflow-hidden">
                                    <motion.h1
                                        initial={{ y: '110%' }}
                                        animate={{ y: '0%' }}
                                        transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                                        className="font-heading font-extrabold leading-[0.88] tracking-[-0.04em]"
                                        style={{
                                            fontSize: 'clamp(3.2rem, 10vw, 9rem)',
                                            WebkitTextStroke: '1.5px rgba(255,255,255,0.18)',
                                            color: 'transparent',
                                        }}
                                    >
                                        STEP INTO
                                    </motion.h1>
                                </div>

                                {/* Line 2 — solid white */}
                                <div className="overflow-hidden">
                                    <motion.h1
                                        initial={{ y: '110%' }}
                                        animate={{ y: '0%' }}
                                        transition={{ duration: 0.9, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
                                        className="font-heading font-extrabold leading-[0.88] tracking-[-0.04em] text-white"
                                        style={{ fontSize: 'clamp(3.2rem, 10vw, 9rem)' }}
                                    >
                                        THE ARENA
                                    </motion.h1>
                                </div>

                                {/* Line 3 — rose gradient, larger */}
                                <div className="overflow-hidden">
                                    <motion.h1
                                        initial={{ y: '110%' }}
                                        animate={{ y: '0%' }}
                                        transition={{ duration: 0.9, delay: 0.44, ease: [0.16, 1, 0.3, 1] }}
                                        className="font-heading font-extrabold leading-[0.88] tracking-[-0.04em] text-transparent bg-clip-text"
                                        style={{
                                            fontSize: 'clamp(3.2rem, 10vw, 9rem)',
                                            backgroundImage: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 45%, #fecdd3 100%)',
                                        }}
                                    >
                                        OR LEAVE.
                                    </motion.h1>
                                </div>
                            </div>

                            {/* Divider glow */}
                            <motion.div
                                initial={{ scaleX: 0, opacity: 0 }}
                                animate={{ scaleX: 1, opacity: 1 }}
                                transition={{ duration: 0.9, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                className="w-32 h-px origin-center"
                                style={{ background: 'linear-gradient(to right, transparent, #f43f5e, transparent)' }}
                            />

                            {/* Sub */}
                            <motion.p
                                initial={{ opacity: 0, y: 14 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                                className="text-white/35 text-sm md:text-base max-w-sm leading-relaxed"
                            >
                                Tournaments. Venues. Teams. Rankings. Everything a competitive player needs, finally in one place.
                            </motion.p>

                            {/* CTAs */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.7, delay: 0.82, ease: [0.16, 1, 0.3, 1] }}
                                className="flex flex-wrap gap-4 justify-center"
                            >
                                <Link to="/tournaments">
                                    <button
                                        className="group flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-bold text-white transition-all duration-300 hover:scale-[1.03]"
                                        style={{
                                            background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                                            boxShadow: '0 0 50px rgba(244,63,94,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                                        }}
                                    >
                                        Enter the Arena
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </Link>
                                <Link to={user ? '/organizer/dashboard' : '/auth/sign-up'}>
                                    <button
                                        className="px-8 py-4 rounded-2xl text-sm font-medium text-white/45 hover:text-white border border-white/10 hover:border-white/25 bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-sm transition-all duration-300"
                                    >
                                        {user ? 'Go to Dashboard' : 'Join for Free'}
                                    </button>
                                </Link>
                            </motion.div>

                            {/* Feature tags */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 1.0, duration: 0.7 }}
                                className="flex flex-wrap items-center justify-center gap-2"
                            >
                                {['Tournaments', 'Venues', 'Teams', 'Rankings', 'Leaderboards'].map((tag, i) => (
                                    <motion.span
                                        key={tag}
                                        initial={{ opacity: 0, scale: 0.85 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 1.0 + i * 0.08 }}
                                        className="px-4 py-1.5 rounded-full text-xs font-medium text-white/35 hover:text-white/60 transition-colors cursor-default"
                                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                                    >
                                        {tag}
                                    </motion.span>
                                ))}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </motion.div>

            <span className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 text-[9px] text-white/10 tracking-[0.3em] uppercase pointer-events-none">
                Credits: ViderGG
            </span>
        </section>
    );
};

export default HeroSectionV13;
