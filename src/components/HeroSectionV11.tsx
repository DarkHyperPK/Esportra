import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, ArrowRight, Radio, Users, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useScroll, useTransform } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";

const HERO_VIDEO_URL = getWebsiteAssetUrl('hero-section-video/video3.mp4');

/* Live clock */
const LiveClock = () => {
    const [time, setTime] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return (
        <span className="font-mono tabular-nums">
            {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </span>
    );
};

/* Blinking cursor */
const Cursor = () => (
    <motion.span
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 1, repeat: Infinity }}
        className="inline-block w-0.5 h-5 bg-rose-500 ml-1 align-middle"
    />
);

const HeroSectionV11 = () => {
    const { user } = useAuth();
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const [typed, setTyped] = useState('');
    const videoRef = useRef<HTMLVideoElement>(null);
    const FULL_TEXT = 'REGISTER NOW. COMPETE. DOMINATE.';

    const { scrollY } = useScroll();
    const heroOpacity = useTransform(scrollY, [0, 380], [1, 0]);

    // Typewriter effect
    useEffect(() => {
        let i = 0;
        const timer = setInterval(() => {
            if (i < FULL_TEXT.length) {
                setTyped(FULL_TEXT.slice(0, ++i));
            } else {
                clearInterval(timer);
            }
        }, 55);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
            videoRef.current.volume = 0.75;
            videoRef.current.play().catch(() => {});
        }
    }, [isMuted]);

    return (
        <section className="relative min-h-screen overflow-hidden bg-black">

            {/* ── Video — almost full brightness, this is the hero ── */}
            <div className="absolute inset-0 z-0">
                <video
                    ref={videoRef}
                    autoPlay loop muted playsInline preload="auto" crossOrigin="anonymous"
                    onCanPlayThrough={() => setIsVideoLoaded(true)}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
                    style={{ objectPosition: 'center 25%' }}
                >
                    <source src={HERO_VIDEO_URL} type="video/mp4" />
                </video>
                <div className="absolute inset-0 bg-black/50" />
                <div className="absolute inset-x-0 bottom-0 h-64" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95), transparent)' }} />
            </div>

            <motion.div style={{ opacity: heroOpacity }} className="relative z-10 min-h-screen flex flex-col">

                {/* ── TOP BAR — broadcast HUD ── */}
                <motion.div
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.7 }}
                    className="flex items-stretch justify-between px-4 sm:px-8"
                    style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                    {/* Left: logo + live */}
                    <div className="flex items-center gap-4 py-3">
                        <img
                            src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                            alt="Esportra"
                            className="h-6 w-auto opacity-85"
                        />
                        <div className="w-px h-5 bg-white/10" />
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded" style={{ background: 'rgba(244,63,94,0.2)', border: '1px solid rgba(244,63,94,0.4)' }}>
                            <Radio className="w-2.5 h-2.5 text-rose-400" />
                            <span className="text-[9px] font-bold tracking-[0.4em] text-rose-400 uppercase">Live</span>
                        </div>
                        <span className="hidden sm:flex items-center gap-1 text-[10px] text-white/25">
                            <Users className="w-3 h-3" />
                            <span className="font-mono">5,284</span>
                        </span>
                    </div>

                    {/* Center: event name */}
                    <div className="hidden md:flex items-center px-6 border-x border-white/6">
                        <span className="text-[10px] font-bold tracking-[0.4em] text-white/40 uppercase">Esportra Championship Series · S01</span>
                    </div>

                    {/* Right: clock + audio */}
                    <div className="flex items-center gap-4 py-3">
                        <span className="hidden sm:flex items-center gap-1.5 text-[10px] text-white/30">
                            <Clock className="w-3 h-3" />
                            <LiveClock />
                        </span>
                        <div className="w-px h-5 bg-white/10" />
                        <button
                            onClick={() => setIsMuted(m => !m)}
                            className="flex items-center justify-center w-7 h-7 rounded border border-white/10 hover:border-white/20 transition-all"
                            style={{ background: 'rgba(255,255,255,0.04)' }}
                        >
                            {isMuted ? <VolumeX className="w-3 h-3 text-white/30" /> : <Volume2 className="w-3 h-3 text-white/65" />}
                        </button>
                    </div>
                </motion.div>

                {/* ── SPACER ── */}
                <div className="flex-1" />

                {/* ── BOTTOM — lower third + scorebug style ── */}
                <div className="px-4 sm:px-8 pb-8 space-y-0">

                    {/* Typewriter ticker tape */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className="flex items-center gap-3 mb-4 overflow-hidden"
                    >
                        <div className="px-2.5 py-1 flex-shrink-0" style={{ background: '#f43f5e' }}>
                            <span className="text-[9px] font-black tracking-[0.4em] text-white uppercase">Breaking</span>
                        </div>
                        <span className="text-[11px] font-mono text-white/60 truncate">
                            {typed}<Cursor />
                        </span>
                    </motion.div>

                    {/* Lower third panel */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="rounded-2xl overflow-hidden"
                        style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                        {/* Rose top accent line */}
                        <div className="h-0.5 w-full" style={{ background: 'linear-gradient(to right, #f43f5e, #fb7185, transparent)' }} />

                        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end">

                            {/* Left: headline */}
                            <div className="space-y-4">
                                <div className="overflow-hidden">
                                    <motion.p
                                        initial={{ y: '100%' }}
                                        animate={{ y: '0%' }}
                                        transition={{ delay: 0.65, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                                        className="text-[10px] font-bold tracking-[0.5em] text-rose-400/80 uppercase"
                                    >
                                        Middle East's First Complete Esports Platform
                                    </motion.p>
                                </div>

                                <div className="space-y-0">
                                    {[
                                        { t: 'The Future of', sm: true,  delay: 0.75 },
                                        { t: 'Competitive',   sm: false, delay: 0.85 },
                                        { t: 'Gaming.',       sm: false, delay: 0.95, accent: true },
                                    ].map(({ t, sm, delay, accent }) => (
                                        <div key={t} className="overflow-hidden">
                                            <motion.h1
                                                initial={{ y: '110%' }}
                                                animate={{ y: '0%' }}
                                                transition={{ duration: 0.75, delay, ease: [0.16, 1, 0.3, 1] }}
                                                className={`font-heading font-extrabold leading-[0.92] tracking-tight block`}
                                                style={{
                                                    fontSize: sm ? 'clamp(1.4rem,3.5vw,3rem)' : 'clamp(3rem,8vw,7rem)',
                                                    ...(accent
                                                        ? { backgroundImage: 'linear-gradient(135deg,#f43f5e,#fb7185 55%,#fecdd3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
                                                        : { color: '#fff' }
                                                    ),
                                                }}
                                            >
                                                {t}
                                            </motion.h1>
                                        </div>
                                    ))}
                                </div>

                                <motion.div
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.1, duration: 0.6 }}
                                    className="flex flex-wrap gap-3 pt-1"
                                >
                                    <Link to="/tournaments">
                                        <button
                                            className="group flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02]"
                                            style={{ background: 'linear-gradient(135deg,#f43f5e,#e11d48)', boxShadow: '0 0 35px rgba(244,63,94,0.25)' }}
                                        >
                                            Browse Tournaments
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </Link>
                                    <Link to={user ? '/organizer/dashboard' : '/auth/sign-up'}>
                                        <button className="px-6 py-3 rounded-xl text-sm font-medium text-white/40 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.07] transition-all">
                                            {user ? 'Dashboard' : 'Get Started Free'}
                                        </button>
                                    </Link>
                                </motion.div>
                            </div>

                            {/* Right: score-bug style stats */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 1.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                                className="hidden lg:grid grid-cols-2 gap-2 flex-shrink-0 w-64"
                            >
                                {[
                                    { v: '200+',   l: 'Tournaments', hot: true  },
                                    { v: '5,000+', l: 'Players',     hot: false },
                                    { v: '50+',    l: 'Venues',      hot: false },
                                    { v: 'Free',   l: 'Entry',       hot: true  },
                                ].map(({ v, l, hot }) => (
                                    <div
                                        key={l}
                                        className="flex flex-col items-center py-3 rounded-xl"
                                        style={{
                                            background: hot ? 'rgba(244,63,94,0.08)' : 'rgba(255,255,255,0.03)',
                                            border: `1px solid ${hot ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.07)'}`,
                                        }}
                                    >
                                        <span className={`text-lg font-extrabold font-heading ${hot ? 'text-rose-400' : 'text-white'}`}>{v}</span>
                                        <span className="text-[9px] uppercase tracking-widest text-white/25 mt-0.5">{l}</span>
                                    </div>
                                ))}
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 text-[8px] text-white/10 tracking-[0.3em] uppercase pointer-events-none">Credits: ViderGG</span>
        </section>
    );
};

export default HeroSectionV11;
