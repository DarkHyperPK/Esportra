import { useEffect, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, useMotionValue, useSpring } from 'framer-motion';
import { ArrowRight, Trophy, Workflow } from 'lucide-react';
import { fetchGameData, type CachedGame } from '@/hooks/useRawgGame';

type CreationMode = 'event' | 'season';

interface CreationModeHubProps {
  onSelect: (mode: CreationMode) => void;
}

// ---------------------------------------------------------------------------
// Media hook
// ---------------------------------------------------------------------------

const useHubMedia = (): Partial<Record<CreationMode, string>> => {
  const [media, setMedia] = useState<Partial<Record<CreationMode, string>>>({});

  useEffect(() => {
    let alive = true;

    const pick = (d: CachedGame) =>
      d.screenshots[0] ?? d.gameBanner ?? d.cover ?? undefined;

    void (async () => {
      try {
        const [eventData, seasonData] = await Promise.all([
          fetchGameData('Valorant', { skipRawg: true }),
          fetchGameData('Dota 2', { skipRawg: true }),
        ]);
        if (alive) setMedia({ event: pick(eventData), season: pick(seasonData) });
      } catch {
        // media is decorative — fail silently
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return media;
};

// ---------------------------------------------------------------------------
// Panel config — all Tailwind classes are static strings
// ---------------------------------------------------------------------------

interface PanelColors {
  iconText: string;
  glowColor: string;
  accentBorder: string;
  dot: string;
  btnBase: string;
}

const EVENT_COLORS: PanelColors = {
  iconText: 'text-rose-400',
  glowColor: 'bg-rose-500',
  accentBorder: 'border-rose-500/25',
  dot: 'bg-rose-400',
  btnBase: 'bg-rose-500 hover:bg-rose-400 active:bg-rose-600',
};

const SEASON_COLORS: PanelColors = {
  iconText: 'text-cyan-400',
  glowColor: 'bg-cyan-500',
  accentBorder: 'border-cyan-500/25',
  dot: 'bg-cyan-400',
  btnBase: 'bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600',
};

interface PanelDef {
  mode: CreationMode;
  title: string;
  tagline: string;
  points: string[];
  colors: PanelColors;
}

const PANELS: PanelDef[] = [
  {
    mode: 'event',
    title: 'Tournament',
    tagline: 'A single, self-contained competition from setup to results.',
    points: [
      'Groups, brackets, or custom stage formats',
      'Registration, check-in, and participant management',
      'Match operations, veto, and live results',
    ],
    colors: EVENT_COLORS,
  },
  {
    mode: 'season',
    title: 'Season',
    tagline: 'A connected series of competitions under one program.',
    points: [
      'Drag-and-drop structure builder',
      'Linked events with qualification paths',
      'Season-wide standings and points systems',
    ],
    colors: SEASON_COLORS,
  },
];

// ---------------------------------------------------------------------------
// Panel component
// ---------------------------------------------------------------------------

interface PanelProps extends PanelDef {
  image?: string;
  isActive: boolean;
  anyActive: boolean;
  reducedMotion: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onSelect: () => void;
}

const Panel = ({
  mode,
  title,
  tagline,
  points,
  colors,
  image,
  isActive,
  anyActive,
  reducedMotion,
  onEnter,
  onLeave,
  onSelect,
}: PanelProps) => {
  const Icon = mode === 'event' ? Trophy : Workflow;

  // Spring-driven y — guarantees identical physics hover-in AND hover-out
  const yRaw = useMotionValue(0);
  const y = useSpring(yRaw, { stiffness: 220, damping: 26 });
  useEffect(() => {
    yRaw.set(isActive && !reducedMotion ? -28 : 0);
  }, [isActive, reducedMotion, yRaw]);

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label={`Create ${title}`}
      className="relative flex cursor-pointer flex-col items-center justify-center overflow-hidden border-r border-white/[0.04] last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
      style={{ minHeight: 'calc(100dvh - 52px)', flexGrow: 1 }}
      animate={
        reducedMotion
          ? undefined
          : {
              flexGrow: isActive ? 1.18 : anyActive ? 0.84 : 1,
              opacity: anyActive && !isActive ? 0.52 : 1,
            }
      }
      transition={{ type: 'spring', stiffness: 200, damping: 30 }}
      onHoverStart={onEnter}
      onHoverEnd={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* IGDB background image */}
      {image && (
        <motion.img
          src={image}
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover"
          animate={
            reducedMotion
              ? undefined
              : { opacity: isActive ? 0.22 : 0.06, scale: isActive ? 1.05 : 1 }
          }
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      )}

      {/* Base dark overlay — keeps text always readable */}
      <div className="absolute inset-0 bg-[#050505]/90" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/40 via-transparent to-[#050505]/60" />

      {/* Accent border highlight on hover */}
      <motion.div
        aria-hidden
        className={`pointer-events-none absolute inset-0 border ${colors.accentBorder}`}
        animate={{ opacity: isActive ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      />

      {/* Ambient center glow */}
      <motion.div
        aria-hidden
        className={`absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[80px] ${colors.glowColor}`}
        animate={{ opacity: isActive ? 0.14 : 0 }}
        transition={{ duration: 0.7 }}
      />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center px-8 py-16 text-center">
        {/* Bare icon — scales on hover, stays in place */}
        <motion.div
          className="mb-7"
          animate={reducedMotion ? undefined : { scale: isActive ? 1.1 : 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 20 }}
        >
          <Icon className={`h-7 w-7 ${colors.iconText}`} />
        </motion.div>

        {/* Group: title + tagline + reveal all slide together via spring */}
        <motion.div
          className="flex flex-col items-center"
          style={{ y }}
        >
          <h2 className="font-heading text-[clamp(48px,6.5vw,84px)] font-bold leading-none tracking-[-0.045em] text-white">
            {title}
          </h2>

          <p className="font-body mt-5 max-w-[240px] text-[13px] leading-[1.7] text-zinc-400">
            {tagline}
          </p>

          {/* Reveal: fades in below tagline, exits cleanly */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                key="reveal"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className="mt-10 flex w-full max-w-[220px] flex-col items-center"
              >
                <ul className="w-full space-y-3 text-left">
                  {points.map((pt, i) => (
                    <motion.li
                      key={pt}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07, duration: 0.22 }}
                      className="flex items-start gap-2.5"
                    >
                      <span
                        className={`mt-[6px] h-[5px] w-[5px] shrink-0 rounded-full ${colors.dot}`}
                      />
                      <span className="font-body text-[12px] leading-[1.65] text-zinc-300">
                        {pt}
                      </span>
                    </motion.li>
                  ))}
                </ul>

                <button
                  className={`mt-7 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[12px] font-semibold text-white transition-all duration-200 ${colors.btnBase}`}
                >
                  Begin setup
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Hub
// ---------------------------------------------------------------------------

const CreationModeHub = ({ onSelect }: CreationModeHubProps) => {
  const [active, setActive] = useState<CreationMode | null>(null);
  const media = useHubMedia();
  const reducedMotion = !!useReducedMotion();

  return (
    <div className="flex min-h-screen flex-col bg-[#050505]">
      {/* Top strip */}
      <div className="flex items-center justify-center border-b border-white/[0.05] px-8 py-4">
        <p className="font-body text-[11px] font-medium uppercase tracking-[0.3em] text-zinc-400">
          Choose format
        </p>
      </div>

      {/* Split panels */}
      <div className="flex flex-1 flex-col sm:flex-row">
        {PANELS.map((panel) => (
          <Panel
            key={panel.mode}
            {...panel}
            image={media[panel.mode]}
            isActive={active === panel.mode}
            anyActive={active !== null}
            reducedMotion={reducedMotion}
            onEnter={() => setActive(panel.mode)}
            onLeave={() => setActive(null)}
            onSelect={() => onSelect(panel.mode)}
          />
        ))}
      </div>

      {/* Bottom strip */}
      <div className="border-t border-white/[0.05] px-8 py-3.5">
        <p className="font-body text-[11px] text-zinc-700">
          All game titles and participant formats supported.
        </p>
      </div>
    </div>
  );
};

export default CreationModeHub;
