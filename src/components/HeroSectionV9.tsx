import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, ArrowUpRight, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useScroll, useTransform } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";

const HERO_VIDEO_URL = getWebsiteAssetUrl('hero-section-video/video3.mp4');

const HeroSectionV9 = () => {
    const { user } = useAuth();
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { scrollY } = useScroll();
    const heroOpacity = useTransform(scrollY, [0, 380], [1, 0]);
    const bgTextY = useTransform(scrollY, [0, 500], [0, -60]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
            videoRef.current.volume = 0.75;
            videoRef.current.play().catch(() => {});
        }
    }, [isMuted]);

    return (
        <section className="relative min-h-screen overflow-hidden bg-black">

            {/* ── Video — less darkened, more presence ── */}
            <div className="absolute inset-0 z-0">
                <video
                    ref={videoRef}
                    autoPlay loop muted playsInline preload="auto" crossOrigin="anonymous"
                    onCanPlayThrough={() => setIsVideoLoaded(true)}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
                    style={{ objectPosition: 'center 30%' }}
                >
                    <source src={HERO_VIDEO_URL} type="video/mp4" />
                </video>
            </div>

            {/* Overlays — lighter so video breathes */}
            <div className="absolute inset-0 z-[1] bg-black/55" />
            <div className="absolute inset-x-0 bottom-0 h-[55%] z-[2]" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.98) 0%, rgba(0,0,0,0.7) 40%, transparent 100%)' }} />
            <div className="absolute inset-x-0 top-0 h-48 z-[2]" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)' }} />

            {/* ── Giant ghost background word — parallax ── */}
            <motion.div
                style={{ y: bgTextY }}
                className="absolute inset-0 z-[2] flex items-center justify-center pointer-events-none select-none overflow-hidden"
            >
                <span
                    className="font-heading font-extrabold whitespace-nowrap"
                    style={{
                        fontSize: 'clamp(10rem, 30vw, 28rem)',
                        lineHeight: 1,
                        WebkitTextStroke: '1px rgba(255,255,255,0.04)',
                        color: 'transparent',
                        letterSpacing: '-0.05em',
                    }}
                >
                    ESPORTRA
                </span>
            </motion.div>

            {/* ── Top logo bar ── */}
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
                <div className="flex items-center gap-3">
                    <span className="hidden sm:block text-[10px] font-bold tracking-[0.4em] text-white/20 uppercase">Middle East Esports</span>
                    <button
                        onClick={() => setIsMuted(m => !m)}
                        className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10 hover:border-white/20 transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}
                    >
                        {isMuted ? <VolumeX className="w-3 h-3 text-white/30" /> : <Volume2 className="w-3 h-3 text-white/65" />}
                    </button>
                </div>
            </motion.div>

            {/* ── Bottom-anchored content ── */}
            <motion.div
                style={{ opacity: heroOpacity }}
                className="absolute inset-x-0 bottom-0 z-10 px-6 sm:px-10 pb-10 sm:pb-14"
            >
                <div className="container mx-auto max-w-[1300px]">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-end">

                        {/* LEFT — headline stack */}
                        <div className="space-y-5">

                            {/* Issue label */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.5, duration: 0.6 }}
                                className="flex items-center gap-3"
                            >
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full" style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.25)' }}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    <span className="text-[10px] font-bold tracking-[0.4em] text-rose-400 uppercase">Season 1 — Live</span>
                                </div>
                            </motion.div>

                            {/* Words slide in from below */}
                            <div className="space-y-0 overflow-hidden">
                                {[
                                    { text: 'Compete.', delay: 0.6 },
                                    { text: 'Win. Repeat.', delay: 0.72, accent: true },
                                ].map(({ text, delay, accent }) => (
                                    <div key={text} className="overflow-hidden leading-[0.92]">
                                        <motion.h1
                                            initial={{ y: '110%' }}
                                            animate={{ y: '0%' }}
                                            transition={{ duration: 0.85, delay, ease: [0.16, 1, 0.3, 1] }}
                                            className={`font-heading font-extrabold tracking-tight block ${accent ? 'text-transparent bg-clip-text' : 'text-white'}`}
                                            style={{
                                                fontSize: 'clamp(3rem, 8.5vw, 8rem)',
                                                ...(accent ? { backgroundImage: 'linear-gradient(135deg, #f43f5e, #fb7185 55%, #fecdd3)' } : {}),
                                            }}
                                        >
                                            {text}
                                        </motion.h1>
                                    </div>
                                ))}
                            </div>

                            {/* Sub + CTA row */}
                            <motion.div
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.95, duration: 0.65 }}
                                className="flex flex-wrap items-center gap-5"
                            >
                                <p className="text-white/40 text-sm max-w-xs leading-relaxed">
                                    Tournaments, teams, venues — the region's first complete esports platform.
                                </p>
                                <Link to="/tournaments">
                                    <button
                                        className="group flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all duration-300 hover:scale-[1.03]"
                                        style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', boxShadow: '0 0 40px rgba(244,63,94,0.28)' }}
                                    >
                                        Browse Tournaments
                                        <ArrowUpRight className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                                    </button>
                                </Link>
                                <Link to={user ? '/organizer/dashboard' : '/auth/sign-up'}>
                                    <button className="px-6 py-3 rounded-xl text-sm font-medium text-white/40 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.07] transition-all">
                                        {user ? 'Dashboard' : 'Get Started Free'}
                                    </button>
                                </Link>
                            </motion.div>
                        </div>

                        {/* RIGHT — floating glass stat card */}
                        <motion.div
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.0, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
                            className="hidden lg:block flex-shrink-0"
                        >
                            <div
                                className="rounded-3xl p-6 w-64 space-y-5"
                                style={{ background: 'rgba(10,10,12,0.75)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 32px 80px rgba(0,0,0,0.5)' }}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold tracking-[0.35em] text-white/30 uppercase">Platform Stats</span>
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.2)' }}>
                                        <Play className="w-3 h-3 text-rose-400" />
                                    </div>
                                </div>

                                {[
                                    { val: '200+', label: 'Tournaments Hosted', bar: 0.72 },
                                    { val: '5,000+', label: 'Registered Players', bar: 0.88 },
                                    { val: '50+', label: 'Partner Venues', bar: 0.45 },
                                ].map(({ val, label, bar }) => (
                                    <div key={label} className="space-y-1.5">
                                        <div className="flex justify-between items-baseline">
                                            <span className="text-xs text-white/40">{label}</span>
                                            <span className="text-sm font-bold text-white">{val}</span>
                                        </div>
                                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${bar * 100}%` }}
                                                transition={{ delay: 1.3, duration: 1.2, ease: 'easeOut' }}
                                                className="h-full rounded-full"
                                                style={{ background: 'linear-gradient(90deg, #f43f5e, #fb7185)' }}
                                            />
                                        </div>
                                    </div>
                                ))}

                                <div className="pt-1">
                                    <Link to={user ? '/organizer/dashboard' : '/auth/sign-up'}>
                                        <button className="w-full py-2.5 rounded-xl text-xs font-bold text-white/60 hover:text-white border border-white/8 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.07] transition-all">
                                            {user ? 'Go to Dashboard' : 'Join for Free →'}
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </motion.div>

            {/* Credits */}
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 text-[9px] text-white/10 tracking-[0.3em] uppercase pointer-events-none">
                Credits: ViderGG
            </span>
        </section>
    );
};

export default HeroSectionV9;
