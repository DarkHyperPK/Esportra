import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Sparkles, Lock, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'esportra_seen_feature_avatars_v1';

const SAMPLE_AVATARS = [
    { style: 'critters',   seed: 'NightFalcon'  },
    { style: 'adventurer', seed: 'IronGhost'    },
    { style: 'pixel-art',  seed: 'VoidWalker'   },
    { style: 'bottts',     seed: 'SteelOrbit'   },
    { style: 'open-peeps', seed: 'CrimsonEcho'  },
    { style: 'shapes',     seed: 'StormRise'    },
    { style: 'micah',      seed: 'SilverPhase'  },
];

const ARC_Y    = [6, -4, -12, -16, -12, -4, 6];
const ARC_SIZE = [28, 34, 40, 48, 40, 34, 28];

const BULLETS = [
    { icon: Lock,      label: 'One per account — exclusively yours'         },
    { icon: Sparkles,  label: 'Limited drops — first come, first served'    },
    { icon: RefreshCw, label: 'Only 2 releases per lifetime — choose wisely' },
];

function dicebearUrl(style: string, seed: string) {
    return `https://api.dicebear.com/10.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

const avatarContainerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07, delayChildren: 0.44 } },
};

const avatarItemVariants = {
    hidden:  { scale: 0, opacity: 0, rotate: -15 },
    visible: { scale: 1, opacity: 1, rotate: 0,
        transition: { type: 'spring' as const, stiffness: 440, damping: 18 } },
};

const bulletContainerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.09, delayChildren: 0.96 } },
};

const bulletItemVariants = {
    hidden:  { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.34, ease: 'easeOut' } },
};

export function AvatarFeatureAnnouncement() {
    const { user, loading } = useAuth();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (loading || !user) return;
        if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    }, [user, loading]);

    const dismiss = () => {
        localStorage.setItem(STORAGE_KEY, '1');
        setOpen(false);
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="avatar-ann-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.28 }}
                        className="fixed inset-0 z-[200] bg-black/78 backdrop-blur-sm"
                        onClick={dismiss}
                    />

                    {/* Modal */}
                    <motion.div
                        key="avatar-ann-modal"
                        initial={{ opacity: 0, y: 36, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0,  scale: 1    }}
                        exit  ={{ opacity: 0, y: 18,  scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 290, damping: 26, delay: 0.07 }}
                        className="fixed inset-0 z-[201] flex items-center justify-center px-4 pointer-events-none"
                    >
                        <div className="pointer-events-auto w-full max-w-[420px] rounded-2xl bg-[#0d0d10] border border-zinc-800/80 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9)]">

                            {/* ── Hero ────────────────────────────────────── */}
                            <div className="relative px-6 pt-8 pb-7 overflow-hidden">
                                {/* Ambient glow blobs */}
                                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-rose-600/[0.12] blur-3xl pointer-events-none" />
                                <div className="absolute -top-6 -left-10 w-52 h-52 rounded-full bg-violet-700/[0.08] blur-3xl pointer-events-none" />
                                <div className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full bg-rose-800/[0.07] blur-3xl pointer-events-none" />

                                {/* "New Feature" badge */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.72 }}
                                    animate={{ opacity: 1, scale: 1    }}
                                    transition={{ delay: 0.18, type: 'spring', stiffness: 460, damping: 22 }}
                                    className="flex justify-center mb-4"
                                >
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold tracking-[0.12em] text-rose-400 uppercase">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inset-0 rounded-full bg-rose-400 opacity-70" />
                                            <span className="relative rounded-full h-full w-full bg-rose-500" />
                                        </span>
                                        New Feature
                                    </span>
                                </motion.div>

                                {/* Title */}
                                <motion.h2
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0  }}
                                    transition={{ delay: 0.26, duration: 0.4, ease: 'easeOut' }}
                                    className="text-center text-[26px] font-extrabold text-white tracking-tight leading-none mb-2"
                                >
                                    Avatar Pool
                                </motion.h2>

                                <motion.p
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.33, duration: 0.38, ease: 'easeOut' }}
                                    className="text-center text-sm text-zinc-400 mb-8"
                                >
                                    Claim a unique identity that's yours and yours alone
                                </motion.p>

                                {/* Avatar arc */}
                                <motion.div
                                    variants={avatarContainerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="flex items-center justify-center gap-2"
                                >
                                    {SAMPLE_AVATARS.map((av, i) => {
                                        const isCenter = i === 3;
                                        return (
                                            <div
                                                key={av.seed}
                                                className="shrink-0"
                                                style={{ transform: `translateY(${ARC_Y[i]}px)` }}
                                            >
                                                <motion.div
                                                    variants={avatarItemVariants}
                                                    className={cn(
                                                        'rounded-full overflow-hidden ring-[1.5px]',
                                                        isCenter
                                                            ? 'ring-rose-500 shadow-[0_0_22px_rgba(225,29,72,0.48)]'
                                                            : 'ring-zinc-700/50'
                                                    )}
                                                    style={{ width: ARC_SIZE[i], height: ARC_SIZE[i] }}
                                                >
                                                    <img
                                                        src={dicebearUrl(av.style, av.seed)}
                                                        alt={av.seed}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </motion.div>

                                                {/* Floating pulse ring on center */}
                                                {isCenter && (
                                                    <motion.div
                                                        className="absolute inset-0 rounded-full border border-rose-500/30"
                                                        animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                                                        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
                                                        style={{ width: ARC_SIZE[i], height: ARC_SIZE[i], position: 'absolute', top: 0, left: 0 }}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </motion.div>
                            </div>

                            {/* Divider */}
                            <div className="h-px mx-6 bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

                            {/* ── Body ────────────────────────────────────── */}
                            <div className="px-6 py-5 space-y-4">
                                <motion.ul
                                    variants={bulletContainerVariants}
                                    initial="hidden"
                                    animate="visible"
                                    className="space-y-2.5"
                                >
                                    {BULLETS.map(({ icon: Icon, label }) => (
                                        <motion.li
                                            key={label}
                                            variants={bulletItemVariants}
                                            className="flex items-center gap-3"
                                        >
                                            <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800/80 flex items-center justify-center shrink-0">
                                                <Icon className="w-3.5 h-3.5 text-rose-400" />
                                            </div>
                                            <p className="text-[13px] text-zinc-300 leading-snug">{label}</p>
                                        </motion.li>
                                    ))}
                                </motion.ul>

                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 1.32, duration: 0.38, ease: 'easeOut' }}
                                    className="flex gap-2.5 pt-1"
                                >
                                    <Button
                                        onClick={dismiss}
                                        variant="ghost"
                                        className="flex-1 h-10 text-sm text-zinc-400 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/60 hover:text-white"
                                    >
                                        Maybe later
                                    </Button>
                                    <Button
                                        onClick={dismiss}
                                        className="flex-1 h-10 text-sm bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-[0_0_24px_rgba(225,29,72,0.28)] hover:shadow-[0_0_32px_rgba(225,29,72,0.42)] transition-shadow"
                                    >
                                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                                        Claim yours
                                    </Button>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
