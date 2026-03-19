import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useScroll, useTransform, animate, useMotionValue, useInView } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";
import { useRef as useReactRef } from "react";

const HERO_VIDEO_URL = getWebsiteAssetUrl('hero-section-video/video3.mp4');

/* Animated counter */
const Counter = ({ to, suffix = '' }: { to: number; suffix?: string }) => {
    const ref = useReactRef<HTMLSpanElement>(null);
    const isInView = useInView(ref, { once: true });
    const count = useMotionValue(0);

    useEffect(() => {
        if (!isInView) return;
        const controls = animate(count, to, { duration: 1.8, ease: [0.16, 1, 0.3, 1] });
        return controls.stop;
    }, [isInView]);

    useEffect(() => {
        return count.on('change', v => {
            if (ref.current) ref.current.textContent = Math.round(v) + suffix;
        });
    }, []);

    return <span ref={ref}>0{suffix}</span>;
};

const HeroSectionV6 = () => {
    const { user } = useAuth();
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { scrollY } = useScroll();
    const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
            videoRef.current.volume = 0.75;
            videoRef.current.play().catch(() => {});
        }
    }, [isMuted]);

    return (
        <section className="relative min-h-screen overflow-hidden bg-black flex">

            {/* ── LEFT PANEL — pure black ── */}
            <div className="relative z-10 flex flex-col justify-between w-full lg:w-[52%] bg-black min-h-screen px-8 sm:px-12 py-8 flex-shrink-0">

                {/* Top */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="flex items-center justify-between"
                >
                    <img
                        src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                        alt="Esportra"
                        className="h-7 w-auto opacity-80"
                    />
                    <span className="text-[9px] font-bold tracking-[0.4em] text-white/20 uppercase hidden sm:block">
                        Est. 2025 · UAE
                    </span>
                </motion.div>

                {/* Middle */}
                <div className="flex flex-col gap-10 py-12">

                    {/* Big stat block */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="grid grid-cols-3 gap-0 border border-white/6 divide-x divide-white/6 rounded-2xl overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.02)' }}
                    >
                        {[
                            { val: 200, suffix: '+', label: 'Tournaments' },
                            { val: 5000, suffix: '+', label: 'Players' },
                            { val: 50, suffix: '+', label: 'Venues' },
                        ].map(({ val, suffix, label }) => (
                            <div key={label} className="flex flex-col items-center py-5 px-3">
                                <span className="text-2xl md:text-3xl font-extrabold font-heading text-white tabular-nums">
                                    <Counter to={val} suffix={suffix} />
                                </span>
                                <span className="text-[10px] text-white/25 uppercase tracking-widest mt-1">{label}</span>
                            </div>
                        ))}
                    </motion.div>

                    {/* Headline */}
                    <div className="overflow-hidden">
                        {['Where', 'Champions', 'Are Made.'].map((line, i) => (
                            <div key={line} className="overflow-hidden">
                                <motion.h1
                                    initial={{ y: '105%' }}
                                    animate={{ y: '0%' }}
                                    transition={{ duration: 0.85, delay: 0.45 + i * 0.13, ease: [0.16, 1, 0.3, 1] }}
                                    className={`font-heading font-extrabold leading-[0.9] tracking-tight block ${
                                        i === 2
                                            ? 'text-transparent bg-clip-text'
                                            : 'text-white'
                                    }`}
                                    style={i === 2
                                        ? { fontSize: 'clamp(2.8rem,7vw,6.5rem)', backgroundImage: 'linear-gradient(135deg,#f43f5e,#fb7185 55%,#fecdd3)' }
                                        : { fontSize: 'clamp(2.8rem,7vw,6.5rem)' }
                                    }
                                >
                                    {line}
                                </motion.h1>
                            </div>
                        ))}
                    </div>

                    {/* Sub + CTAs */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.9 }}
                        className="space-y-5"
                    >
                        <p className="text-white/35 text-sm md:text-base max-w-xs leading-relaxed">
                            The Middle East's first complete esports platform — tournaments, teams, venues & rankings.
                        </p>

                        <div className="flex flex-wrap gap-3">
                            <Link to="/tournaments">
                                <button
                                    className="group flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02]"
                                    style={{ background: 'linear-gradient(135deg,#f43f5e,#e11d48)', boxShadow: '0 0 35px rgba(244,63,94,0.25)' }}
                                >
                                    Browse Tournaments
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </Link>
                            <Link to={user ? '/organizer/dashboard' : '/auth/sign-up'}>
                                <button className="px-6 py-3.5 rounded-xl text-sm font-medium text-white/45 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300">
                                    {user ? 'Dashboard' : 'Get Started Free'}
                                </button>
                            </Link>
                        </div>
                    </motion.div>
                </div>

                {/* Bottom */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.2 }}
                    className="flex items-center justify-between"
                >
                    <span className="text-[9px] text-white/15 tracking-[0.3em] uppercase">Credits: ViderGG</span>
                    <button
                        onClick={() => setIsMuted(m => !m)}
                        className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 hover:border-white/20 transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)' }}
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? <VolumeX className="w-3.5 h-3.5 text-white/30" /> : <Volume2 className="w-3.5 h-3.5 text-white/70" />}
                    </button>
                </motion.div>
            </div>

            {/* ── DIVIDER LINE ── */}
            <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 1.1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="hidden lg:block w-px flex-shrink-0 self-stretch z-20 origin-top"
                style={{ background: 'linear-gradient(to bottom, transparent, rgba(244,63,94,0.5) 30%, rgba(244,63,94,0.5) 70%, transparent)' }}
            />

            {/* ── RIGHT PANEL — pure video, no overlay ── */}
            <div className="hidden lg:block relative flex-1 min-h-screen overflow-hidden">
                <video
                    ref={videoRef}
                    autoPlay loop muted playsInline preload="auto" crossOrigin="anonymous"
                    onCanPlayThrough={() => setIsVideoLoaded(true)}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
                    style={{ objectPosition: '60% center' }}
                >
                    <source src={HERO_VIDEO_URL} type="video/mp4" />
                </video>
                {/* Subtle right edge fade to nothing */}
                <div className="absolute inset-y-0 right-0 w-16" style={{ background: 'linear-gradient(to right, transparent, black)' }} />
                {/* Bottom fade */}
                <div className="absolute inset-x-0 bottom-0 h-32" style={{ background: 'linear-gradient(to top, black, transparent)' }} />

                {/* Floating badge on video panel */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.4, duration: 0.7 }}
                    className="absolute bottom-10 left-8 flex items-center gap-3 px-4 py-3 rounded-2xl"
                    style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                    </span>
                    <div>
                        <p className="text-xs font-bold text-white">Platform Now Live</p>
                        <p className="text-[10px] text-white/40">Tournaments open for registration</p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default HeroSectionV6;
