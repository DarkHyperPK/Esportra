import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, ArrowRight, Shield, Swords, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useScroll, useTransform } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";

const HERO_VIDEO_URL = getWebsiteAssetUrl('hero-section-video/video3.mp4');

const HeroSectionV7 = () => {
    const { user } = useAuth();
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { scrollY } = useScroll();
    const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
    const videoScale = useTransform(scrollY, [0, 600], [1, 1.12]);

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
                    style={{ objectPosition: 'center 20%' }}
                >
                    <source src={HERO_VIDEO_URL} type="video/mp4" />
                </video>
            </motion.div>

            {/* Overlays */}
            <div className="absolute inset-0 z-[1] bg-black/75" />
            <div className="absolute inset-x-0 bottom-0 h-60 z-[2]" style={{ background: 'linear-gradient(to top, #000, transparent)' }} />
            {/* Rose glow center */}
            <div className="absolute inset-0 z-[1] pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 60%, rgba(244,63,94,0.08) 0%, transparent 70%)' }} />

            {/* ── Content ── */}
            <motion.div
                style={{ opacity: heroOpacity }}
                className="relative z-10 container mx-auto px-5 sm:px-10 min-h-screen flex flex-col"
            >
                {/* Nav bar */}
                <motion.div
                    initial={{ opacity: 0, y: -16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="flex items-center justify-between pt-7"
                >
                    <img
                        src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                        alt="Esportra"
                        className="h-8 w-auto opacity-85"
                    />
                    <div className="hidden md:flex items-center gap-2">
                        <Link to="/tournaments">
                            <span className="text-xs text-white/40 hover:text-white/70 transition-colors px-4 py-2 rounded-lg hover:bg-white/5 cursor-pointer">Tournaments</span>
                        </Link>
                        <Link to="/venues">
                            <span className="text-xs text-white/40 hover:text-white/70 transition-colors px-4 py-2 rounded-lg hover:bg-white/5 cursor-pointer">Venues</span>
                        </Link>
                        <Link to={user ? '/organizer/dashboard' : '/auth/sign-up'}>
                            <button className="ml-2 px-5 py-2 rounded-xl text-xs font-semibold text-white border border-white/15 hover:border-white/30 bg-white/[0.05] hover:bg-white/[0.1] transition-all">
                                {user ? 'Dashboard' : 'Sign Up'}
                            </button>
                        </Link>
                    </div>
                </motion.div>

                {/* Center hero */}
                <div className="flex flex-col items-center justify-center flex-1 text-center gap-8 pb-24 pt-8">

                    {/* Icon trio */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.6, delay: 0.35 }}
                        className="flex items-center gap-4"
                    >
                        {[Shield, Swords, Trophy].map((Icon, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + i * 0.1 }}
                                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                                style={{
                                    background: i === 1 ? 'linear-gradient(135deg,#f43f5e,#e11d48)' : 'rgba(255,255,255,0.05)',
                                    border: i === 1 ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                    boxShadow: i === 1 ? '0 0 30px rgba(244,63,94,0.35)' : 'none',
                                }}
                            >
                                <Icon className={`w-5 h-5 ${i === 1 ? 'text-white' : 'text-white/40'}`} />
                            </motion.div>
                        ))}
                    </motion.div>

                    {/* Main headline */}
                    <div className="space-y-2">
                        <div className="overflow-hidden">
                            <motion.p
                                initial={{ y: '100%' }}
                                animate={{ y: '0%' }}
                                transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                className="text-xs md:text-sm font-bold tracking-[0.5em] text-white/30 uppercase"
                            >
                                Middle East Esports Platform
                            </motion.p>
                        </div>

                        <div className="overflow-hidden">
                            <motion.h1
                                initial={{ y: '100%' }}
                                animate={{ y: '0%' }}
                                transition={{ duration: 0.9, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                className="font-heading font-extrabold text-white leading-[0.88] tracking-[-0.04em]"
                                style={{ fontSize: 'clamp(3.5rem, 11vw, 10rem)' }}
                            >
                                ESPORTRA
                            </motion.h1>
                        </div>

                        <div className="overflow-hidden">
                            <motion.h2
                                initial={{ y: '100%' }}
                                animate={{ y: '0%' }}
                                transition={{ duration: 0.9, delay: 0.72, ease: [0.16, 1, 0.3, 1] }}
                                className="font-heading font-extrabold leading-[0.88] tracking-[-0.02em]"
                                style={{
                                    fontSize: 'clamp(1.8rem, 5vw, 4.5rem)',
                                    WebkitTextStroke: '1px rgba(255,255,255,0.25)',
                                    color: 'transparent',
                                }}
                            >
                                COMPETE · ASCEND · DOMINATE
                            </motion.h2>
                        </div>
                    </div>

                    {/* Horizontal rule with glow */}
                    <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.8, delay: 0.85, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full max-w-md h-px origin-center"
                        style={{ background: 'linear-gradient(to right, transparent, rgba(244,63,94,0.6), transparent)' }}
                    />

                    {/* Sub */}
                    <motion.p
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.95 }}
                        className="text-white/35 text-sm md:text-base max-w-md leading-relaxed"
                    >
                        Tournaments, teams, venues, and rankings — the first complete esports platform built for the region.
                    </motion.p>

                    {/* CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 1.05 }}
                        className="flex flex-wrap items-center justify-center gap-4"
                    >
                        <Link to="/tournaments">
                            <button
                                className="group flex items-center gap-2.5 px-8 py-4 rounded-2xl text-sm font-bold text-white transition-all duration-300 hover:scale-[1.03]"
                                style={{
                                    background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                                    boxShadow: '0 0 50px rgba(244,63,94,0.3), inset 0 1px 0 rgba(255,255,255,0.12)',
                                }}
                            >
                                Browse Tournaments
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </Link>
                        <Link to={user ? '/organizer/dashboard' : '/auth/sign-up'}>
                            <button className="px-8 py-4 rounded-2xl text-sm font-medium text-white/50 hover:text-white border border-white/10 hover:border-white/25 bg-white/[0.03] hover:bg-white/[0.08] backdrop-blur-sm transition-all duration-300">
                                {user ? 'Go to Dashboard' : 'Host a Tournament'}
                            </button>
                        </Link>
                    </motion.div>

                    {/* Stats pills */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1.2, duration: 0.7 }}
                        className="flex items-center gap-2 flex-wrap justify-center"
                    >
                        {[
                            { v: '200+', l: 'Tournaments' },
                            { v: '5,000+', l: 'Players' },
                            { v: '50+', l: 'Venues' },
                            { v: 'Free', l: 'To Join' },
                        ].map(({ v, l }) => (
                            <div
                                key={l}
                                className="flex items-center gap-2 px-4 py-2 rounded-full"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                            >
                                <span className="text-sm font-bold text-white">{v}</span>
                                <span className="text-[10px] text-white/30 uppercase tracking-wider">{l}</span>
                            </div>
                        ))}
                    </motion.div>
                </div>

                {/* Bottom bar */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.4 }}
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

export default HeroSectionV7;
