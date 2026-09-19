import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { JackButton } from '@/components/ui/JackButton';
import { cn } from '@/lib/utils';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface JourneySlide {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  bullets: ReactNode[];
  /** Optional radial gradient background for the slide. */
  gradient?: string;
}

type Accent = 'rose' | 'cyan' | 'violet';

export interface JourneyTourProps {
  slides: JourneySlide[];
  /** Colour used for the step-dot, icon halo, and CTA button. Defaults to `rose`. */
  accent?: Accent;
  /** Label for the Next button on the final slide. Defaults to "Done". */
  finalCta?: ReactNode;
  /** Called when the user finishes or skips the tour. */
  onComplete: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Accent palette
// ─────────────────────────────────────────────────────────────────────────────

const ACCENTS: Record<Accent, {
  icon: string; iconBorder: string; iconBg: string;
  dotActive: string; dotDone: string;
  cta?: string; ctaShadow?: string;
}> = {
  rose: {
    icon: 'text-rose-400',
    iconBorder: 'border-rose-500/20',
    iconBg: 'bg-rose-500/10',
    dotActive: 'bg-rose-500',
    dotDone: 'bg-rose-500/40',
  },
  cyan: {
    icon: 'text-cyan-400',
    iconBorder: 'border-cyan-500/20',
    iconBg: 'bg-cyan-500/10',
    dotActive: 'bg-cyan-500',
    dotDone: 'bg-cyan-500/40',
  },
  violet: {
    icon: 'text-rose-400',
    iconBorder: 'border-rose-500/20',
    iconBg: 'bg-rose-500/10',
    dotActive: 'bg-rose-500',
    dotDone: 'bg-rose-500/40',
  },
};

const slideVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction > 0 ? 20 : -20 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction > 0 ? -20 : 20 }),
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const JourneyTour = ({ slides, accent = 'rose', finalCta = 'Done', onComplete }: JourneyTourProps) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  const isFirst = current === 0;
  const isLast = current === slides.length - 1;
  const palette = ACCENTS[accent];

  const goNext = useCallback(() => {
    if (isLast) { onComplete(); return; }
    setDirection(1);
    setCurrent((prev) => prev + 1);
  }, [isLast, onComplete]);

  const goBack = useCallback(() => {
    if (isFirst) return;
    setDirection(-1);
    setCurrent((prev) => prev - 1);
  }, [isFirst]);

  // Keyboard: Esc = skip, Left/Right = nav, Enter = next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onComplete(); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goBack, onComplete]);

  const slide = slides[current];
  const Icon = slide.icon;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="journey-tour-title"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg bg-[#0a0a0c] border border-white/[0.06] rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Skip button */}
        <button
          type="button"
          onClick={onComplete}
          className="absolute top-4 right-4 z-10 p-2 rounded-full text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
          aria-label="Skip tour"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step counter */}
        <div className="absolute top-5 left-6 text-[11px] font-medium tracking-widest uppercase text-white/30">
          {current + 1} of {slides.length}
        </div>

        {/* Slide */}
        <div className="relative min-h-[420px] flex flex-col items-center" style={{ background: slide.gradient }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="flex flex-col items-center text-center px-8 pt-16 pb-6 w-full"
            >
              {/* Icon */}
              <motion.div
                initial={{ scale: 0.5, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.3, delay: 0.1, type: 'spring', stiffness: 200 }}
                className={cn('mb-6 p-5 rounded-2xl border', palette.iconBg, palette.iconBorder)}
              >
                <Icon className={cn('w-10 h-10', palette.icon)} strokeWidth={1.5} />
              </motion.div>

              <h2
                id="journey-tour-title"
                className="text-2xl font-heading font-bold text-white mb-1.5 tracking-wide"
              >
                {slide.title}
              </h2>

              {slide.subtitle && (
                <p className="text-white/40 text-sm font-medium mb-6 italic">{slide.subtitle}</p>
              )}

              <ul className="space-y-3 text-left max-w-sm w-full">
                {slide.bullets.map((bullet, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + i * 0.08 }}
                    className="flex items-start gap-3 text-[13px] leading-relaxed text-white/60"
                  >
                    <span className={cn('mt-1.5 w-1 h-1 rounded-full shrink-0', palette.dotActive)} />
                    <span className="[&>b]:text-white/90 [&>b]:font-medium [&_b]:text-white/90 [&_b]:font-medium">
                      {bullet}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex flex-col items-center gap-5">
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i); }}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === current ? cn('w-6', palette.dotActive)
                    : i < current ? cn('w-1.5', palette.dotDone, 'hover:opacity-80')
                      : 'w-1.5 bg-white/15 hover:bg-white/25',
                )}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between w-full gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={goBack}
              disabled={isFirst}
              className="text-white/40 hover:text-white/70 disabled:opacity-0 disabled:pointer-events-none h-10 px-4"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>

            <JackButton
              size="sm"
              onClick={goNext}
              className="h-10 px-6 rounded-full"
            >
              {isLast ? finalCta : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </JackButton>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default JourneyTour;
