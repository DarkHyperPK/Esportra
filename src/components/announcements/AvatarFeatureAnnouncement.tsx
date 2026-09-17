import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const STORAGE_KEY = 'esportra_seen_feature_avatars_v1';

// Spotlight avatar — the "face" of the feature
const SPOTLIGHT = { style: 'bottts', seed: 'SteelOrbit' };

// Ghost grid — 30 avatars that tile behind the spotlight at very low opacity.
// Variety of styles creates the "pool" depth effect.
const GRID_AVATARS = [
    { style: 'critters',   seed: 'ArcLight'  },
    { style: 'adventurer', seed: 'Frostbyte' },
    { style: 'pixel-art',  seed: 'Hex7'      },
    { style: 'shapes',     seed: 'Warp'      },
    { style: 'micah',      seed: 'Vale'      },
    { style: 'open-peeps', seed: 'Echo'      },
    { style: 'lorelei',    seed: 'Nova'      },
    { style: 'thumbs',     seed: 'Rift'      },
    { style: 'bottts',     seed: 'Pulse'     },
    { style: 'fun-emoji',  seed: 'Zap'       },
    { style: 'critters',   seed: 'Storm'     },
    { style: 'adventurer', seed: 'Ash'       },
    { style: 'pixel-art',  seed: 'Omen'      },
    { style: 'shapes',     seed: 'Forge'     },
    { style: 'micah',      seed: 'Wire'      },
    { style: 'open-peeps', seed: 'Dusk'      },
    { style: 'lorelei',    seed: 'Cinder'    },
    { style: 'bottts',     seed: 'Shard'     },
    { style: 'fun-emoji',  seed: 'Blade'     },
    { style: 'critters',   seed: 'Phase'     },
    { style: 'adventurer', seed: 'Vex'       },
    { style: 'pixel-art',  seed: 'Onyx'      },
    { style: 'shapes',     seed: 'Raze'      },
    { style: 'micah',      seed: 'Umbra'     },
    { style: 'lorelei',    seed: 'Lace'      },
    { style: 'thumbs',     seed: 'Grit'      },
    { style: 'bottts',     seed: 'Nexus'     },
    { style: 'fun-emoji',  seed: 'Krypt'     },
    { style: 'critters',   seed: 'Bane'      },
    { style: 'adventurer', seed: 'Wraith'    },
];

function dicebearUrl(style: string, seed: string) {
    return `https://api.dicebear.com/10.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

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
                        key="afa-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-[6px]"
                        onClick={dismiss}
                    />

                    {/* Card */}
                    <motion.div
                        key="afa-card"
                        initial={{ opacity: 0, y: 28, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0,  scale: 1    }}
                        exit  ={{ opacity: 0, y: 14,  scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 28, delay: 0.06 }}
                        className="fixed inset-0 z-[201] flex items-center justify-center px-4 pointer-events-none"
                    >
                        <div className="pointer-events-auto w-full max-w-[400px] rounded-xl bg-[#08080b] border border-zinc-900 overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.9)]">

                            {/* ── Hero: ghost grid + spotlight ─────────────── */}
                            <div className="relative h-[220px] overflow-hidden">

                                {/* Ghost avatar grid — visual depth, implies the pool */}
                                <div className="absolute inset-0 grid grid-cols-6 opacity-[0.07] grayscale pointer-events-none select-none">
                                    {GRID_AVATARS.map((av, i) => (
                                        <div key={i} className="aspect-square overflow-hidden">
                                            <img
                                                src={dicebearUrl(av.style, av.seed)}
                                                alt=""
                                                aria-hidden
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Vignette — fades grid into modal bg at bottom and edges */}
                                <div className="absolute inset-0 bg-gradient-to-b from-[#08080b]/20 via-transparent to-[#08080b] pointer-events-none" />
                                <div className="absolute inset-0 bg-gradient-to-r from-[#08080b]/70 via-transparent to-[#08080b]/70 pointer-events-none" />

                                {/* Spotlight avatar — springs in, centered in upper portion */}
                                <div className="absolute inset-0 flex items-center justify-center" style={{ paddingBottom: 52 }}>
                                    <motion.div
                                        initial={{ scale: 0.55, opacity: 0 }}
                                        animate={{ scale: 1,    opacity: 1 }}
                                        transition={{ type: 'spring', stiffness: 320, damping: 20, delay: 0.18 }}
                                        className="relative"
                                    >
                                        {/* Glow halo */}
                                        <div className="absolute -inset-4 rounded-full bg-rose-600/20 blur-2xl" />
                                        {/* Avatar */}
                                        <div className="relative w-[84px] h-[84px] rounded-full overflow-hidden ring-[2px] ring-rose-500 shadow-[0_0_48px_rgba(225,29,72,0.55)]">
                                            <img
                                                src={dicebearUrl(SPOTLIGHT.style, SPOTLIGHT.seed)}
                                                alt="Avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Title — overlaid at bottom-left of hero, reads as part of the visual */}
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.36, duration: 0.3, ease: 'easeOut' }}
                                    className="absolute bottom-4 left-5"
                                >
                                    <h2 className="text-[30px] font-black text-white tracking-tight leading-none">
                                        Avatar Pool
                                    </h2>
                                </motion.div>

                                {/* Close button */}
                                <button
                                    onClick={dismiss}
                                    aria-label="Dismiss"
                                    className="absolute top-3.5 right-3.5 z-10 w-7 h-7 rounded-full bg-zinc-900/70 hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* ── Body ─────────────────────────────────────── */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.42, duration: 0.34, ease: 'easeOut' }}
                                className="px-5 pt-3 pb-5 space-y-4"
                            >
                                <p className="text-[13.5px] text-zinc-400 leading-relaxed">
                                    Each avatar can only be claimed by one person — first to take it keeps it.
                                    You have 2 releases total to swap for a different one if you change your mind.
                                </p>

                                <div className="flex gap-2.5">
                                    <button
                                        onClick={dismiss}
                                        className="flex-1 h-10 rounded-lg text-[13px] font-medium text-zinc-500 hover:text-zinc-200 border border-zinc-900 hover:border-zinc-800 transition-colors"
                                    >
                                        Not now
                                    </button>
                                    <button
                                        onClick={dismiss}
                                        className="flex-1 h-10 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[13px] font-semibold transition-colors shadow-[0_0_28px_rgba(225,29,72,0.32)] hover:shadow-[0_0_36px_rgba(225,29,72,0.44)]"
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
