import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, ArrowRight, Trophy, Users, MapPin, ChevronDown, Zap, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useScroll, useTransform } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";

const HERO_VIDEO_URL = getWebsiteAssetUrl('hero-section-video/video3.mp4');

const STATS = [
    { icon: Trophy,  value: '200+',  label: 'Tournaments Hosted' },
    { icon: Users,   value: '5K+',   label: 'Active Players'     },
    { icon: MapPin,  value: '50+',   label: 'Venues Nationwide'  },
];

const stagger = (i: number) => ({ delay: 0.1 + i * 0.12, duration: 0.7, ease: [0.16, 1, 0.3, 1] as const });

const HeroSectionV3 = () => {
    const { user } = useAuth();
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { scrollY } = useScroll();
    const videoY = useTransform(scrollY, [0, 600], [0, 160]);
    const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
            videoRef.current.volume = 0.75;
            videoRef.current.play().catch(() => {});
        }
    }, [isMuted]);

    return (
        <section
            className="relative min-h-screen overflow-hidden"
            style={{ backgroundColor: '#080809' }}
        >
            {/* ── Video background ── */}
            <motion.div className="absolute inset-0 z-0" style={{ y: videoY }}>
                <video
                    ref={videoRef}
                    autoPlay loop muted playsInline preload="auto" crossOrigin="anonymous"
                    onCanPlayThrough={() => setIsVideoLoaded(true)}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
                    style={{ transform: 'scale(1.08)', objectPosition: 'center 30%' }}
                >
                    <source src={HERO_VIDEO_URL} type="video/mp4" />
                </video>
            </motion.div>

            {/* ── Overlays ── */}
            {/* Strong right-to-left dark wash so left text is readable */}
            <div className="absolute inset-0 z-[1]" style={{ background: 'linear-gradient(100deg, rgba(8,8,9,0.97) 0%, rgba(8,8,9,0.82) 42%, rgba(8,8,9,0.35) 72%, rgba(8,8,9,0.15) 100%)' }} />
            {/* Bottom fade into page */}
            <div className="absolute inset-x-0 bottom-0 h-52 z-[2]" style={{ background: 'linear-gradient(to top, #080809, transparent)' }} />
            {/* Subtle rose glow top-left */}
            <div className="absolute -top-40 -left-40 w-[700px] h-[700px] rounded-full z-[1] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(244,63,94,0.07) 0%, transparent 65%)' }} />

            {/* ── Main content ── */}
            <motion.div
                style={{ opacity: heroOpacity }}
                className="relative z-10 container mx-auto px-5 sm:px-8 min-h-screen flex flex-col justify-center pt-24 pb-20"
            >
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-12 xl:gap-20 items-center w-full max-w-[1300px]">

                    {/* ── LEFT: Text ── */}
                    <div className="space-y-7">

                        {/* Live pill */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={stagger(0)}
                            className="inline-flex items-center gap-2"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                            </span>
                            <span className="text-[11px] font-bold tracking-[0.45em] text-rose-400/90 uppercase">
                                Platform Now Live
                            </span>
                        </motion.div>

                        {/* Headline */}
                        <div className="space-y-1">
                            <motion.h1
                                initial={{ opacity: 0, x: -30 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={stagger(1)}
                                className="font-heading font-extrabold text-white leading-[0.92] tracking-tight"
                            >
                                <span className="block text-[clamp(3rem,8vw,6rem)]">Where Champions</span>
                                <span className="block text-[clamp(3rem,8vw,6rem)] mt-1">
                                    Are{' '}
                                    <span
                                        className="text-transparent bg-clip-text"
                                        style={{ backgroundImage: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 50%, #fda4af 100%)' }}
                                    >
                                        Forged.
                                    </span>
                                </span>
                            </motion.h1>
                        </div>

                        {/* Sub */}
                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={stagger(2)}
                            className="text-white/45 text-base md:text-lg max-w-lg leading-relaxed font-body"
                        >
                            The Middle East's first complete esports platform — tournaments, teams,
                            venues, and rankings in one place.
                        </motion.p>

                        {/* CTAs */}
                        <motion.div
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={stagger(3)}
                            className="flex flex-wrap gap-3"
                        >
                            <Link to="/tournaments">
                                <button className="group flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-300 hover:scale-[1.03]"
                                    style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', boxShadow: '0 0 40px rgba(244,63,94,0.28)' }}
                                >
                                    Browse Tournaments
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </Link>
                            <Link to={user ? '/organizer/dashboard' : '/auth/sign-up'}>
                                <button className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold text-sm text-white/70 hover:text-white border border-white/10 hover:border-white/25 bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-sm transition-all duration-300">
                                    {user ? 'Go to Dashboard' : 'Create Organization'}
                                </button>
                            </Link>
                        </motion.div>

                        {/* Stats row */}
                        <motion.div
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={stagger(4)}
                            className="flex flex-wrap gap-6 pt-2"
                        >
                            {STATS.map(({ icon: Icon, value, label }, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/5 border border-white/8">
                                        <Icon className="w-4 h-4 text-rose-400" />
                                    </div>
                                    <div>
                                        <p className="text-base font-bold font-heading leading-none">{value}</p>
                                        <p className="text-[11px] text-white/35 mt-0.5">{label}</p>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* ── RIGHT: Featured card ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 30, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.55, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                        className="hidden lg:block"
                    >
                        <div className="relative rounded-3xl overflow-hidden border border-white/8"
                            style={{ background: 'rgba(12,12,14,0.75)', backdropFilter: 'blur(24px)', boxShadow: '0 40px 100px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)' }}
                        >
                            {/* Card header banner */}
                            <div className="relative h-44 overflow-hidden">
                                <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1a0a10, #0d0d12)' }} />
                                <div className="absolute inset-0 flex items-center justify-center opacity-10">
                                    <Trophy className="w-32 h-32 text-rose-500" />
                                </div>
                                <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 30% 50%, rgba(244,63,94,0.18) 0%, transparent 70%)' }} />
                                {/* Live badge */}
                                <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: 'rgba(244,63,94,0.15)', border: '1px solid rgba(244,63,94,0.3)', color: '#fb7185' }}>
                                    <Zap className="w-3 h-3" /> Open for Registration
                                </div>
                                {/* Game tag */}
                                <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-semibold text-white/60" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                    Valorant
                                </div>
                            </div>

                            {/* Card body */}
                            <div className="p-5 space-y-4">
                                <div>
                                    <h3 className="text-lg font-heading font-bold text-white leading-snug">Esportra Championship Series</h3>
                                    <p className="text-sm text-white/40 mt-0.5">Season 1 — 5v5 Team Tournament</p>
                                </div>

                                {/* Meta grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: 'Prize Pool', value: '$2,000', accent: true },
                                        { label: 'Entry Fee',  value: 'Free' },
                                        { label: 'Teams',      value: '16 Max' },
                                        { label: 'Starts',     value: 'Apr 1' },
                                    ].map(({ label, value, accent }) => (
                                        <div key={label} className="p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                            <p className="text-[10px] text-white/35 uppercase tracking-wider">{label}</p>
                                            <p className={`text-sm font-bold mt-0.5 ${accent ? 'text-rose-400' : 'text-white'}`}>{value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Slots bar */}
                                <div>
                                    <div className="flex justify-between text-xs text-white/35 mb-1.5">
                                        <span>Registration</span>
                                        <span>9 / 16 teams</span>
                                    </div>
                                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: '56%' }}
                                            transition={{ delay: 1.2, duration: 1, ease: 'easeOut' }}
                                            className="h-full rounded-full"
                                            style={{ background: 'linear-gradient(90deg, #f43f5e, #fb7185)' }}
                                        />
                                    </div>
                                </div>

                                <Link to="/tournaments">
                                    <button className="w-full py-3 rounded-2xl text-sm font-bold text-white transition-all duration-300 hover:opacity-90 hover:scale-[1.02]"
                                        style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}
                                    >
                                        Register Now
                                    </button>
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* ── Logo top-left ── */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="absolute top-6 left-5 sm:left-8 z-20"
            >
                <img
                    src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                    alt="Esportra"
                    className="h-9 w-auto opacity-90"
                />
            </motion.div>

            {/* ── Audio button ── */}
            <div className="absolute bottom-8 right-6 z-20">
                <button
                    onClick={() => setIsMuted(m => !m)}
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all border border-white/10 hover:border-white/25"
                    style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(12px)' }}
                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <VolumeX className="w-4 h-4 text-white/40" /> : <Volume2 className="w-4 h-4 text-white/80" />}
                </button>
            </div>

            {/* Credits */}
            <span className="absolute bottom-8 left-6 z-20 text-[9px] text-white/20 tracking-[0.3em] uppercase">Credits: ViderGG</span>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2.5 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1"
            >
                <motion.div
                    animate={{ y: [0, 6, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                    <ChevronDown className="w-5 h-5 text-white/20" />
                </motion.div>
            </motion.div>
        </section>
    );
};

export default HeroSectionV3;
