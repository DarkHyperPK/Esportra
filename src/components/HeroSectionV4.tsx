import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, ArrowUpRight, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useScroll, useTransform } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";

const HERO_VIDEO_URL = getWebsiteAssetUrl('hero-section-video/video3.mp4');

const TAGS = ['Valorant', 'CS2', 'FIFA', 'Rocket League', 'Tekken 8', 'EA FC 25', 'PUBG', 'Free Fire'];

const HeroSectionV4 = () => {
    const { user } = useAuth();
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { scrollY } = useScroll();
    const videoScale = useTransform(scrollY, [0, 700], [1, 1.18]);
    const heroOpacity = useTransform(scrollY, [0, 380], [1, 0]);

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
                    style={{ objectPosition: 'center 25%' }}
                >
                    <source src={HERO_VIDEO_URL} type="video/mp4" />
                </video>
            </motion.div>

            {/* ── Overlays ── */}
            <div className="absolute inset-0 z-[1] bg-black/65" />
            {/* Noise texture for grit */}
            <div className="absolute inset-0 z-[2] opacity-[0.025] pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")', backgroundSize: '200px' }} />
            {/* Bottom bleed */}
            <div className="absolute inset-x-0 bottom-0 h-56 z-[3]" style={{ background: 'linear-gradient(to top, #050505 0%, transparent 100%)' }} />
            {/* Rose accent streak top-right */}
            <div className="absolute top-0 right-0 w-[600px] h-[500px] z-[1] pointer-events-none" style={{ background: 'radial-gradient(ellipse at top right, rgba(244,63,94,0.09) 0%, transparent 60%)' }} />

            {/* ── Vertical side label ── */}
            <div className="absolute left-5 top-1/2 -translate-y-1/2 z-20 hidden xl:flex flex-col items-center gap-3">
                <div className="w-px h-16 bg-gradient-to-b from-transparent to-white/20" />
                <span className="text-[9px] font-bold tracking-[0.5em] text-white/20 uppercase" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                    Esportra — Middle East Esports
                </span>
                <div className="w-px h-16 bg-gradient-to-t from-transparent to-white/20" />
            </div>

            {/* ── Main layout ── */}
            <motion.div
                style={{ opacity: heroOpacity }}
                className="relative z-10 flex flex-col min-h-screen"
            >
                {/* Logo */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    className="absolute top-7 left-1/2 -translate-x-1/2 z-20"
                >
                    <img
                        src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                        alt="Esportra"
                        className="h-8 w-auto opacity-80"
                    />
                </motion.div>

                {/* Center content */}
                <div className="flex flex-col items-center justify-center flex-1 px-4 text-center pt-20 pb-40">

                    {/* Live tag */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.3 }}
                        className="flex items-center gap-2 mb-8"
                    >
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
                        </span>
                        <span className="text-[10px] font-bold tracking-[0.5em] text-rose-400/80 uppercase">
                            Now Live in the Middle East
                        </span>
                    </motion.div>

                    {/* Giant outlined headline */}
                    <div className="relative mb-8 select-none">
                        <motion.h1
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                            className="font-heading font-extrabold leading-[0.88] tracking-[-0.03em]"
                            style={{ fontSize: 'clamp(4rem, 14vw, 12rem)' }}
                        >
                            {/* Outlined ghost text behind */}
                            <span
                                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                                style={{
                                    WebkitTextStroke: '1px rgba(244,63,94,0.12)',
                                    color: 'transparent',
                                    fontSize: 'inherit',
                                    fontFamily: 'inherit',
                                    fontWeight: 'inherit',
                                    letterSpacing: 'inherit',
                                    lineHeight: 'inherit',
                                    transform: 'translate(3px, 3px)',
                                }}
                                aria-hidden
                            >
                                COMPETE
                            </span>
                            {/* Solid text */}
                            <span className="relative text-white">COMPETE</span>
                        </motion.h1>

                        <motion.h1
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.9, delay: 0.52, ease: [0.16, 1, 0.3, 1] }}
                            className="font-heading font-extrabold leading-[0.88] tracking-[-0.03em]"
                            style={{ fontSize: 'clamp(4rem, 14vw, 12rem)' }}
                        >
                            {/* Outlined only, rose — video bleeds through */}
                            <span
                                style={{
                                    WebkitTextStroke: '2px rgba(244,63,94,0.7)',
                                    color: 'transparent',
                                    display: 'block',
                                }}
                            >
                                ASCEND
                            </span>
                        </motion.h1>

                        <motion.h1
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.9, delay: 0.64, ease: [0.16, 1, 0.3, 1] }}
                            className="font-heading font-extrabold leading-[0.88] tracking-[-0.03em]"
                            style={{ fontSize: 'clamp(4rem, 14vw, 12rem)' }}
                        >
                            <span className="relative">
                                <span
                                    className="text-transparent bg-clip-text"
                                    style={{ backgroundImage: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 60%, #fecdd3 100%)' }}
                                >
                                    DOMINATE.
                                </span>
                            </span>
                        </motion.h1>
                    </div>

                    {/* Sub */}
                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.8 }}
                        className="text-white/40 text-sm md:text-base max-w-md leading-relaxed mb-8"
                    >
                        Tournaments, teams, venues, and rankings — the first all-in-one esports platform built for the region.
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.92 }}
                        className="flex flex-wrap items-center justify-center gap-4 mb-12"
                    >
                        <Link to="/tournaments">
                            <button
                                className="group flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-sm text-white tracking-wide transition-all duration-300 hover:scale-[1.03]"
                                style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', boxShadow: '0 0 50px rgba(244,63,94,0.3), inset 0 1px 0 rgba(255,255,255,0.1)' }}
                            >
                                Enter the Arena
                                <ArrowUpRight className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                            </button>
                        </Link>
                        <Link to={user ? '/organizer/dashboard' : '/auth/sign-up'}>
                            <button className="px-8 py-4 rounded-2xl font-semibold text-sm text-white/60 hover:text-white border border-white/10 hover:border-white/25 bg-white/[0.03] hover:bg-white/[0.07] transition-all duration-300 tracking-wide">
                                {user ? 'Go to Dashboard' : 'Host a Tournament'}
                            </button>
                        </Link>
                    </motion.div>

                    {/* Stats bar */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.1, duration: 0.8 }}
                        className="flex items-center gap-0 divide-x divide-white/10 rounded-2xl overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)' }}
                    >
                        {[
                            { value: '200+', label: 'Tournaments' },
                            { value: '5,000+', label: 'Players' },
                            { value: '50+', label: 'Venues' },
                            { value: 'Free', label: 'To Join' },
                        ].map(({ value, label }) => (
                            <div key={label} className="flex flex-col items-center px-6 py-3">
                                <span className="text-base md:text-lg font-bold font-heading text-white">{value}</span>
                                <span className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">{label}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* ── Bottom game tags marquee ── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.3, duration: 0.8 }}
                    className="absolute bottom-14 inset-x-0 z-10 overflow-hidden"
                >
                    <div className="flex gap-3 animate-[marquee_20s_linear_infinite] whitespace-nowrap w-max">
                        {[...TAGS, ...TAGS].map((tag, i) => (
                            <span key={i} className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold text-white/40 border border-white/8"
                                style={{ background: 'rgba(255,255,255,0.03)' }}>
                                {tag}
                            </span>
                        ))}
                    </div>
                </motion.div>
            </motion.div>

            {/* ── Audio ── */}
            <div className="absolute bottom-7 right-6 z-20">
                <button
                    onClick={() => setIsMuted(m => !m)}
                    className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 hover:border-white/25 transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-white/35" /> : <Volume2 className="w-3.5 h-3.5 text-white/70" />}
                </button>
            </div>

            <span className="absolute bottom-8 left-6 z-20 text-[9px] text-white/15 tracking-[0.3em] uppercase">Credits: ViderGG</span>

            {/* Scroll cue */}
            <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}
                className="absolute bottom-7 left-1/2 -translate-x-1/2 z-20"
            >
                <motion.div animate={{ y: [0, 6, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
                    <ChevronDown className="w-4 h-4 text-white/20" />
                </motion.div>
            </motion.div>
        </section>
    );
};

export default HeroSectionV4;
