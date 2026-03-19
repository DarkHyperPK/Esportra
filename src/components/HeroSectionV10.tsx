import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, ArrowRight, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion, useScroll, useTransform } from "framer-motion";
import { getWebsiteAssetUrl } from "@/lib/storage";

const HERO_VIDEO_URL = getWebsiteAssetUrl('hero-section-video/video3.mp4');

/* Animated number ticker */
const Tick = ({ n, delay = 0 }: { n: string; delay?: number }) => (
    <motion.span
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
        {n}
    </motion.span>
);

const HeroSectionV10 = () => {
    const { user } = useAuth();
    const [isMuted, setIsMuted] = useState(true);
    const [isVideoLoaded, setIsVideoLoaded] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { scrollY } = useScroll();
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

            {/* ── Video fills right 60% only via clip-path ── */}
            <div className="absolute inset-0 z-0">
                <video
                    ref={videoRef}
                    autoPlay loop muted playsInline preload="auto" crossOrigin="anonymous"
                    onCanPlayThrough={() => setIsVideoLoaded(true)}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2000ms] ${isVideoLoaded ? 'opacity-100' : 'opacity-0'}`}
                    style={{ objectPosition: '65% center', clipPath: 'polygon(35% 0%, 100% 0%, 100% 100%, 22% 100%)' }}
                >
                    <source src={HERO_VIDEO_URL} type="video/mp4" />
                </video>
                {/* Gradient blending cut edge */}
                <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to right, #000 28%, rgba(0,0,0,0.6) 45%, rgba(0,0,0,0.15) 65%, rgba(0,0,0,0.4) 100%)' }}
                />
                <div className="absolute inset-x-0 bottom-0 h-48" style={{ background: 'linear-gradient(to top, #000, transparent)' }} />
            </div>

            {/* ── Rose accent diagonal slash ── */}
            <div
                className="absolute inset-0 z-[1] pointer-events-none"
                style={{
                    background: 'linear-gradient(103deg, transparent 32%, rgba(244,63,94,0.06) 34%, rgba(244,63,94,0.03) 36%, transparent 38%)',
                }}
            />

            {/* ── Content ── */}
            <motion.div
                style={{ opacity: heroOpacity }}
                className="relative z-10 min-h-screen flex flex-col"
            >
                {/* ── Top strip — issue bar ── */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2, duration: 0.7 }}
                    className="flex items-center justify-between px-6 sm:px-12 pt-6 border-b border-white/[0.06] pb-4"
                >
                    <div className="flex items-center gap-5">
                        <img
                            src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                            alt="Esportra"
                            className="h-7 w-auto opacity-80"
                        />
                        <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-white/10">
                            <span className="text-[9px] font-bold tracking-[0.45em] text-white/20 uppercase">Issue No. 01</span>
                            <span className="text-[9px] text-white/10">·</span>
                            <span className="text-[9px] font-bold tracking-[0.35em] text-white/20 uppercase">Season 2025</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="hidden md:flex items-center gap-4">
                            <Link to="/tournaments"><span className="text-[10px] font-semibold tracking-[0.3em] text-white/30 hover:text-white/60 uppercase transition-colors">Events</span></Link>
                            <Link to="/venues"><span className="text-[10px] font-semibold tracking-[0.3em] text-white/30 hover:text-white/60 uppercase transition-colors">Venues</span></Link>
                        </div>
                        <button
                            onClick={() => setIsMuted(m => !m)}
                            className="w-8 h-8 rounded-full flex items-center justify-center border border-white/8 hover:border-white/20 transition-all"
                            style={{ background: 'rgba(255,255,255,0.03)' }}
                        >
                            {isMuted ? <VolumeX className="w-3 h-3 text-white/25" /> : <Volume2 className="w-3 h-3 text-white/60" />}
                        </button>
                    </div>
                </motion.div>

                {/* ── Main grid ── */}
                <div className="flex flex-1 px-6 sm:px-12 py-10 gap-8">

                    {/* LEFT — thin column with vertical text */}
                    <div className="hidden xl:flex flex-col justify-between items-center w-8 flex-shrink-0 py-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.4 }}
                            className="w-px flex-1 max-h-28"
                            style={{ background: 'linear-gradient(to bottom, rgba(244,63,94,0.5), transparent)' }}
                        />
                        <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.5 }}
                            className="text-[9px] font-bold tracking-[0.5em] text-white/15 uppercase my-4"
                            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                        >
                            Middle East · Esports · Platform
                        </motion.span>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1.4 }}
                            className="w-px flex-1 max-h-28"
                            style={{ background: 'linear-gradient(to top, rgba(244,63,94,0.5), transparent)' }}
                        />
                    </div>

                    {/* CENTER — main content */}
                    <div className="flex flex-col justify-between flex-1 max-w-2xl">

                        {/* Kicker */}
                        <motion.div
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.45, duration: 0.6 }}
                            className="flex items-center gap-2 mb-6"
                        >
                            <Flame className="w-3.5 h-3.5 text-rose-500" />
                            <span className="text-[10px] font-bold tracking-[0.5em] text-rose-400/80 uppercase">
                                Now Live — Tournaments Open
                            </span>
                        </motion.div>

                        {/* Big editorial headline */}
                        <div className="flex-1 flex flex-col justify-center">
                            <div className="space-y-0">
                                {[
                                    { text: 'THE',      size: 'clamp(1.8rem,4.5vw,4.2rem)', solid: true,  delay: 0.5  },
                                    { text: 'FUTURE',   size: 'clamp(4rem,11vw,9.5rem)',    solid: true,  delay: 0.62 },
                                    { text: 'OF ESPORTS', size: 'clamp(1.6rem,4vw,3.6rem)', solid: false, delay: 0.74 },
                                    { text: 'IS HERE.', size: 'clamp(3rem,8vw,7rem)',       solid: true,  delay: 0.86, accent: true },
                                ].map(({ text, size, solid, delay, accent }) => (
                                    <div key={text} className="overflow-hidden">
                                        <motion.h1
                                            initial={{ y: '110%' }}
                                            animate={{ y: '0%' }}
                                            transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
                                            className="font-heading font-extrabold leading-[0.9] tracking-tight block"
                                            style={{
                                                fontSize: size,
                                                ...(accent
                                                    ? { backgroundImage: 'linear-gradient(135deg,#f43f5e,#fb7185 55%,#fecdd3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
                                                    : solid
                                                    ? { color: '#fff' }
                                                    : { WebkitTextStroke: '1px rgba(255,255,255,0.3)', color: 'transparent' }
                                                ),
                                            }}
                                        >
                                            {text}
                                        </motion.h1>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Bottom — sub + CTAs */}
                        <motion.div
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 1.05, duration: 0.65 }}
                            className="mt-8 space-y-5"
                        >
                            <p className="text-white/35 text-sm max-w-sm leading-relaxed">
                                Compete in tournaments, book gaming venues, and build your legacy — all in one platform.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Link to="/tournaments">
                                    <button
                                        className="group flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white transition-all duration-300 hover:scale-[1.02]"
                                        style={{ background: 'linear-gradient(135deg,#f43f5e,#e11d48)', boxShadow: '0 0 40px rgba(244,63,94,0.25)' }}
                                    >
                                        Browse Tournaments
                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </Link>
                                <Link to={user ? '/organizer/dashboard' : '/auth/sign-up'}>
                                    <button className="px-7 py-3.5 rounded-xl text-sm font-medium text-white/40 hover:text-white border border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.07] transition-all">
                                        {user ? 'Dashboard' : 'Get Started Free'}
                                    </button>
                                </Link>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* ── Bottom stats strip ── */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2, duration: 0.65 }}
                    className="border-t border-white/[0.06] px-6 sm:px-12 py-4 flex items-center justify-between"
                >
                    <div className="flex items-center gap-0 divide-x divide-white/8">
                        {[
                            { v: '200+', l: 'Tournaments' },
                            { v: '5,000+', l: 'Players' },
                            { v: '50+', l: 'Venues' },
                            { v: 'Free', l: 'To Join' },
                        ].map(({ v, l }) => (
                            <div key={l} className="flex items-center gap-2 px-5 first:pl-0">
                                <span className="text-sm font-bold font-heading text-white">{v}</span>
                                <span className="text-[10px] text-white/25 uppercase tracking-wider">{l}</span>
                            </div>
                        ))}
                    </div>
                    <span className="text-[9px] text-white/15 tracking-[0.3em] uppercase hidden sm:block">Credits: ViderGG</span>
                </motion.div>
            </motion.div>
        </section>
    );
};

export default HeroSectionV10;
