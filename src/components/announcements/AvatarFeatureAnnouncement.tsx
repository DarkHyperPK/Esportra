import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_KEY = 'esportra_seen_feature_avatars_v1';

// Spotlight — the face of the feature
const SPOTLIGHT = { style: 'bottts', seed: 'SteelOrbit' };

// Scattered background avatars — organic depth field, not a grid.
// x/y are % of hero container. size in px. opacity per-avatar for depth layering.
const SCATTERED = [
    { style: 'critters',   seed: 'ArcLight',  x: 6,  y: 12, size: 54, opacity: 0.13, blur: 0 },
    { style: 'adventurer', seed: 'Frostbyte', x: 20, y: 62, size: 42, opacity: 0.10, blur: 1 },
    { style: 'pixel-art',  seed: 'Hex7',      x: 80, y: 8,  size: 50, opacity: 0.14, blur: 0 },
    { style: 'shapes',     seed: 'Warp',      x: 90, y: 58, size: 46, opacity: 0.11, blur: 1 },
    { style: 'micah',      seed: 'Vale',      x: 58, y: 74, size: 38, opacity: 0.09, blur: 2 },
    { style: 'open-peeps', seed: 'Echo',      x: 30, y: 78, size: 58, opacity: 0.12, blur: 0 },
    { style: 'lorelei',    seed: 'Nova',      x: 5,  y: 72, size: 40, opacity: 0.10, blur: 1 },
    { style: 'thumbs',     seed: 'Rift',      x: 91, y: 76, size: 44, opacity: 0.08, blur: 2 },
    { style: 'fun-emoji',  seed: 'Zap',       x: 46, y: 4,  size: 36, opacity: 0.08, blur: 1 },
    { style: 'critters',   seed: 'Storm',     x: 72, y: 38, size: 48, opacity: 0.11, blur: 0 },
    { style: 'bottts',     seed: 'Pulse',     x: 14, y: 36, size: 44, opacity: 0.09, blur: 1 },
    { style: 'adventurer', seed: 'Ash',       x: 66, y: 16, size: 40, opacity: 0.10, blur: 0 },
];

function dicebearUrl(style: string, seed: string) {
    return `https://api.dicebear.com/10.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

export function AvatarFeatureAnnouncement() {
    const { user, loading } = useAuth();
    const [open, setOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (loading || !user) return;
        if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    }, [user, loading]);

    const dismiss = () => {
        localStorage.setItem(STORAGE_KEY, '1');
        setOpen(false);
    };

    const openPool = () => {
        localStorage.setItem(STORAGE_KEY, '1');
        setOpen(false);
        navigate('/user/profile');
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="afa-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                        className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md"
                        onClick={dismiss}
                    />

                    {/* Card */}
                    <motion.div
                        key="afa-card"
                        initial={{ opacity: 0, y: 32, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0,  scale: 1    }}
                        exit  ={{ opacity: 0, y: 16,  scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 0.08 }}
                        className="fixed inset-0 z-[201] flex items-center justify-center px-4 pointer-events-none"
                    >
                        <div className="pointer-events-auto w-full max-w-[480px] rounded-2xl bg-[#070709] overflow-hidden ring-1 ring-white/[0.07] shadow-[0_40px_100px_rgba(0,0,0,0.95)]">

                            {/* ── Hero ─────────────────────────────────────── */}
                            <div className="relative h-[320px] overflow-hidden bg-[#070709]">

                                {/* Scattered avatars — depth field */}
                                {SCATTERED.map((av, i) => (
                                    <motion.div
                                        key={av.seed}
                                        initial={{ scale: 0.5, opacity: 0 }}
                                        animate={{ scale: 1, opacity: av.opacity }}
                                        transition={{ delay: 0.18 + i * 0.045, duration: 0.4, ease: 'easeOut' }}
                                        className="absolute pointer-events-none select-none grayscale"
                                        style={{
                                            left: `${av.x}%`,
                                            top:  `${av.y}%`,
                                            width:  av.size,
                                            height: av.size,
                                            transform: `translate(-50%, -50%)`,
                                            filter: `grayscale(1) blur(${av.blur}px)`,
                                        }}
                                    >
                                        <img
                                            src={dicebearUrl(av.style, av.seed)}
                                            alt=""
                                            aria-hidden
                                            className="w-full h-full object-cover rounded-full"
                                        />
                                    </motion.div>
                                ))}

                                {/* Vignette — pulls depth field into bg at edges + bottom */}
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_50%,transparent_30%,#070709_100%)]" />
                                    <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-[#070709] to-transparent" />
                                </div>

                                {/* Rose core glow behind spotlight */}
                                <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full bg-rose-600/25 blur-3xl pointer-events-none" />

                                {/* Spotlight avatar */}
                                <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: 64 }}>
                                    <motion.div
                                        initial={{ scale: 0.45, opacity: 0 }}
                                        animate={{ scale: 1,    opacity: 1 }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.22 }}
                                        className="relative"
                                    >
                                        {/* Outer halo */}
                                        <div className="absolute -inset-5 rounded-full bg-rose-500/15 blur-2xl" />
                                        {/* Ring pulse */}
                                        <motion.div
                                            className="absolute -inset-2 rounded-full border border-rose-500/25"
                                            animate={{ scale: [1, 1.22, 1], opacity: [0.6, 0, 0.6] }}
                                            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
                                        />
                                        {/* Avatar */}
                                        <div className="relative w-[124px] h-[124px] rounded-full overflow-hidden ring-2 ring-rose-500 shadow-[0_0_56px_rgba(225,29,72,0.6)]">
                                            <img
                                                src={dicebearUrl(SPOTLIGHT.style, SPOTLIGHT.seed)}
                                                alt="Featured avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Title — overlaid at bottom-left, part of the visual */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0  }}
                                    transition={{ delay: 0.44, duration: 0.32, ease: 'easeOut' }}
                                    className="absolute bottom-5 left-6 right-16"
                                >
                                    <h2 className="text-[42px] font-black text-white tracking-tight leading-none">
                                        Avatar Pool
                                    </h2>
                                </motion.div>

                                {/* Close button */}
                                <button
                                    onClick={dismiss}
                                    aria-label="Dismiss"
                                    className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* ── Body ─────────────────────────────────────── */}
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5, duration: 0.32, ease: 'easeOut' }}
                                className="px-6 pt-4 pb-6 space-y-5 border-t border-white/[0.06]"
                            >
                                <p className="text-[14px] text-zinc-400 leading-relaxed">
                                    Each avatar can only be claimed by one person — first to take it keeps it forever.
                                    You get 2 releases total to swap for a different one if you change your mind.
                                </p>

                                <div className="flex gap-3">
                                    <button
                                        onClick={dismiss}
                                        className="flex-1 h-11 rounded-xl text-[13px] font-medium text-zinc-500 hover:text-zinc-200 border border-white/[0.08] hover:border-white/[0.14] transition-colors"
                                    >
                                        Not now
                                    </button>
                                    <button
                                        onClick={openPool}
                                        className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-semibold transition-colors shadow-[0_0_32px_rgba(225,29,72,0.35)] hover:shadow-[0_0_44px_rgba(225,29,72,0.5)]"
                                    >
                                        Open the pool
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
