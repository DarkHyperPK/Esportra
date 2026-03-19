import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, ArrowRight, Crosshair } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useScroll, useTransform } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";

const HERO_VIDEO_URL = getWebsiteAssetUrl('hero-section-video/video3.mp4');

/* Thin scan-line that sweeps once on mount */
const ScanLine = () => (
    <motion.div
        className="absolute left-0 right-0 h-px z-[15] pointer-events-none"
        style={{ background: 'linear-gradient(to right, transparent, rgba(244,63,94,0.6), transparent)' }}
        initial={{ top: '-2px', opacity: 0 }}
        animate={{ top: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 2.2, delay: 0.6, ease: 'linear', times: [0, 0.05, 0.95, 1] }}
    />
);

/* Corner bracket decoration */
const Brackets = ({ size = 20, className = '' }: { size?: number; className?: string }) => (
    <svg width={size * 2} height={size * 2} viewBox="0 0 40 40" fill="none" className={className}>
        <path d="M0 14 L0 0 L14 0" stroke="rgba(244,63,94,0.6)" strokeWidth="1.5" />
        <path d="M26 0 L40 0 L40 14" stroke="rgba(244,63,94,0.6)" strokeWidth="1.5" />
        <path d="M0 26 L0 40 L14 40" stroke="rgba(244,63,94,0.6)" strokeWidth="1.5" />
        <path d="M26 40 L40 40 L40 26" stroke="rgba(244,63,94,0.6)" strokeWidth="1.5" />
    </svg>
);

const HeroSectionV8 = () => {
    const { user } = useAuth();
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { scrollY } = useScroll();
    const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
    const videoY = useTransform(scrollY, [0, 600], [0, 80]);

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
            <motion.div className="absolute inset-0 z-0" style={{ y: videoY }}>
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
            <div className="absolute inset-0 z-[1] bg-black/78" />
            {/* Subtle grid */}
            <div
                className="absolute inset-0 z-[2] pointer-events-none opacity-[0.03]"
                style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
                    backgroundSize: '80px 80px',
                }}
            />
            <div className="absolute inset-x-0 bottom-0 h-52 z-[3]" style={{ background: 'linear-gradient(to top, #000, transparent)' }} />
            <div className="absolute inset-x-0 top-0 h-32 z-[3]" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6), transparent)' }} />

            {/* Scan line effect on load */}
            <ScanLine />

            {/* ── Main ── */}
            <motion.div
                style={{ opacity: heroOpacity }}
                className="relative z-10 container mx-auto px-5 sm:px-10 min-h-screen flex flex-col"
            >
                {/* Top bar */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center justify-between pt-7"
                >
                    <div className="flex items-center gap-3">
                        <Crosshair className="w-4 h-4 text-rose-500/70" />
                        <img
                            src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                            alt="Esportra"
                            className="h-7 w-auto opacity-80"
                        />
                    </div>
                    <div className="hidden md:flex items-center gap-6">
                        <Link to="/tournaments"><span className="text-[11px] font-semibold tracking-widest text-white/30 hover:text-white/70 uppercase transition-colors">Tournaments</span></Link>
                        <Link to="/venues"><span className="text-[11px] font-semibold tracking-widest text-white/30 hover:text-white/70 uppercase transition-colors">Venues</span></Link>
                        <Link to={user ? '/organizer/dashboard' : '/auth/sign-up'}>
                            <button className="px-5 py-2 rounded-lg text-[11px] font-bold tracking-widest text-rose-400 uppercase border border-rose-500/30 hover:border-rose-500/60 hover:bg-rose-500/10 transition-all">
                                {user ? 'Dashboard' : 'Join Now'}
                            </button>
                        </Link>
                    </div>
                </motion.div>

                {/* Center block */}
                <div className="flex flex-col items-center justify-center flex-1 text-center pb-28 pt-10 gap-10">

                    {/* Objective tag */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.9 }}
                        className="flex items-center gap-2"
                    >
                        <div className="h-px w-8 bg-rose-500/50" />
                        <span className="text-[10px] font-bold tracking-[0.6em] text-rose-400/70 uppercase">Objective: Compete & Dominate</span>
                        <div className="h-px w-8 bg-rose-500/50" />
                    </motion.div>

                    {/* Headline with bracket corners */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
                        className="relative inline-flex flex-col items-center px-10 py-8"
                    >
                        {/* Corner brackets */}
                        <Brackets className="absolute top-0 left-0" />
                        <Brackets className="absolute top-0 right-0 rotate-90" />
                        <Brackets className="absolute bottom-0 left-0 -rotate-90" />
                        <Brackets className="absolute bottom-0 right-0 rotate-180" />

                        <h1
                            className="font-heading font-extrabold text-white leading-[0.9] tracking-[-0.04em]"
                            style={{ fontSize: 'clamp(3.5rem, 12vw, 10.5rem)' }}
                        >
                            THE ARENA
                        </h1>
                        <h1
                            className="font-heading font-extrabold leading-[0.9] tracking-[-0.04em] text-transparent bg-clip-text"
                            style={{
                                fontSize: 'clamp(3.5rem, 12vw, 10.5rem)',
                                backgroundImage: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 50%, #fecdd3 100%)',
                            }}
                        >
                            IS OPEN.
                        </h1>
                    </motion.div>

                    {/* Sub */}
                    <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.2, duration: 0.6 }}
                        className="text-white/35 text-sm md:text-base max-w-md leading-relaxed"
                    >
                        The Middle East's first complete esports platform — tournaments, venues, teams, and rankings in one place.
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.35, duration: 0.6 }}
                        className="flex flex-wrap gap-4 justify-center"
                    >
                        <Link to="/tournaments">
                            <button
                                className="group flex items-center gap-2 px-8 py-4 text-sm font-bold text-white tracking-wide transition-all duration-300 hover:scale-[1.03] rounded-xl"
                                style={{
                                    background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                                    boxShadow: '0 0 50px rgba(244,63,94,0.28), inset 0 1px 0 rgba(255,255,255,0.1)',
                                }}
                            >
                                Enter the Arena
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </Link>
                        <Link to={user ? '/organizer/dashboard' : '/auth/sign-up'}>
                            <button className="px-8 py-4 rounded-xl text-sm font-medium text-white/45 hover:text-white border border-white/10 hover:border-white/25 bg-white/[0.03] hover:bg-white/[0.07] transition-all duration-300">
                                {user ? 'Go to Dashboard' : 'Host a Tournament'}
                            </button>
                        </Link>
                    </motion.div>

                    {/* Stats row */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.5, duration: 0.7 }}
                        className="flex items-center divide-x divide-white/8 rounded-2xl overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(16px)' }}
                    >
                        {[
                            { v: '200+', l: 'Tournaments' },
                            { v: '5K+', l: 'Players' },
                            { v: '50+', l: 'Venues' },
                            { v: 'Free', l: 'Entry' },
                        ].map(({ v, l }) => (
                            <div key={l} className="px-6 py-3 flex flex-col items-center">
                                <span className="text-base font-bold font-heading text-white">{v}</span>
                                <span className="text-[10px] uppercase tracking-widest text-white/25 mt-0.5">{l}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* Bottom bar */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.6 }}
                    className="flex items-center justify-between pb-7"
                >
                    <span className="text-[9px] text-white/15 tracking-[0.35em] uppercase">Credits: ViderGG</span>
                    <button
                        onClick={() => setIsMuted(m => !m)}
                        className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 hover:border-white/20 transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 text-white/30" /> : <Volume2 className="w-3.5 h-3.5 text-white/70" />}
                    </button>
                </motion.div>
            </motion.div>
        </section>
    );
};

export default HeroSectionV8;
