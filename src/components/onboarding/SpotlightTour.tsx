import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, ArrowRight, CheckCircle2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { markTourSeen } from '@/lib/onboardingFlags';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Placement = 'top' | 'bottom' | 'left' | 'right' | 'auto';

export interface SpotlightStep {
  id: string;
  /** `data-tour-id` of the anchor element. `null` => centered modal (no anchor). */
  anchorId: string | null;
  /** Preferred placement of the callout relative to the anchor. */
  placement?: Placement;
  /** Optional side-effect to run before showing this step (e.g., select a node). */
  onEnter?: () => void;
  /** Short label shown in the area pill. */
  area: string;
  /** Tailwind text-color class for the area pill label. */
  areaColor?: string;
  icon: LucideIcon;
  title: string;
  body: string | string[];
}

type Accent = 'rose' | 'cyan' | 'violet';

export interface SpotlightTourProps {
  open: boolean;
  steps: SpotlightStep[];
  /** Name used with markTourSeen on completion (e.g. 'season_builder'). Pass null to skip persistence. */
  flagName: string | null;
  onClose: () => void;
  accent?: Accent;
  /** Label for the final-step primary button. Defaults to "Done". */
  finalCta?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────────────────────────

const ACCENTS: Record<Accent, { progress: string; cta: string; ring: string; halo: string; dot: string }> = {
  rose: {
    progress: 'bg-rose-500',
    cta: 'bg-rose-500 hover:bg-rose-600',
    ring: 'rgba(244,63,94,0.55)',
    halo: 'rgba(244,63,94,0.22)',
    dot: 'bg-rose-500',
  },
  cyan: {
    progress: 'bg-cyan-500',
    cta: 'bg-cyan-500 hover:bg-cyan-600',
    ring: 'rgba(6,182,212,0.55)',
    halo: 'rgba(6,182,212,0.22)',
    dot: 'bg-cyan-500',
  },
  violet: {
    progress: 'bg-violet-500',
    cta: 'bg-violet-500 hover:bg-violet-600',
    ring: 'rgba(139,92,246,0.55)',
    halo: 'rgba(139,92,246,0.22)',
    dot: 'bg-violet-500',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Geometry helpers
// ─────────────────────────────────────────────────────────────────────────────

interface Rect { top: number; left: number; width: number; height: number }

const findAnchor = (anchorId: string | null): HTMLElement | null => {
  if (!anchorId || typeof document === 'undefined') return null;
  return document.querySelector<HTMLElement>(`[data-tour-id="${anchorId}"]`);
};

const measure = (el: HTMLElement): Rect => {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

const PAD = 6;          // outset padding around the highlighted element
const CALLOUT_W = 360;  // target callout width
const CALLOUT_H = 280;  // approximate callout height for placement math
const GAP = 14;         // gap between anchor and callout

const computeCalloutPosition = (
  rect: Rect,
  preferred: Placement,
  viewport: { w: number; h: number },
): { top: number; left: number; placement: Exclude<Placement, 'auto'> } => {
  const order: Exclude<Placement, 'auto'>[] =
    preferred === 'auto' || !preferred
      ? ['bottom', 'top', 'right', 'left']
      : [preferred, ...(['bottom', 'top', 'right', 'left'] as const).filter((p) => p !== preferred)];

  for (const p of order) {
    let top = 0, left = 0;
    if (p === 'bottom') { top = rect.top + rect.height + GAP; left = rect.left + rect.width / 2 - CALLOUT_W / 2; }
    else if (p === 'top') { top = rect.top - CALLOUT_H - GAP; left = rect.left + rect.width / 2 - CALLOUT_W / 2; }
    else if (p === 'right') { top = rect.top + rect.height / 2 - CALLOUT_H / 2; left = rect.left + rect.width + GAP; }
    else if (p === 'left') { top = rect.top + rect.height / 2 - CALLOUT_H / 2; left = rect.left - CALLOUT_W - GAP; }

    // Clamp horizontally so it stays within viewport
    left = Math.max(12, Math.min(left, viewport.w - CALLOUT_W - 12));
    const fitsVertically = top >= 12 && top + CALLOUT_H <= viewport.h - 12;
    if (fitsVertically) return { top, left, placement: p };
  }

  // Fallback: centered
  return {
    top: Math.max(12, viewport.h / 2 - CALLOUT_H / 2),
    left: Math.max(12, viewport.w / 2 - CALLOUT_W / 2),
    placement: 'bottom',
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

const SpotlightTour = ({
  open,
  steps,
  flagName,
  onClose,
  accent = 'rose',
  finalCta = 'Done',
}: SpotlightTourProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({
    w: typeof window === 'undefined' ? 1024 : window.innerWidth,
    h: typeof window === 'undefined' ? 768 : window.innerHeight,
  });
  const [centeredFallback, setCenteredFallback] = useState(false);
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);
  const calloutRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const current = steps[stepIndex];
  const palette = ACCENTS[accent];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // Lazy-mount portal to body
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setPortalNode(document.body);
  }, []);

  // Reset step + capture previously-focused element on open
  useEffect(() => {
    if (open) {
      setStepIndex(0);
      previousFocusRef.current = document.activeElement as HTMLElement | null;
    } else {
      // Restore focus when closed
      previousFocusRef.current?.focus?.();
      previousFocusRef.current = null;
    }
  }, [open]);

  // Close handler persists the seen flag
  const handleClose = useCallback(() => {
    if (flagName) markTourSeen(flagName);
    onClose();
  }, [flagName, onClose]);

  const goNext = useCallback(() => {
    if (isLast) { handleClose(); return; }
    setStepIndex((i) => Math.min(steps.length - 1, i + 1));
  }, [isLast, handleClose, steps.length]);

  const goBack = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  // Fire onEnter hook and auto-scroll + measure anchor on every step change
  useLayoutEffect(() => {
    if (!open || !current) return;
    current.onEnter?.();

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 4;

    const attempt = () => {
      if (cancelled) return;
      const anchor = findAnchor(current.anchorId);
      if (current.anchorId === null) {
        setCenteredFallback(true);
        setRect(null);
        return;
      }
      if (anchor) {
        anchor.scrollIntoView({ block: 'center', inline: 'center', behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        // Wait one frame after scroll, then measure
        requestAnimationFrame(() => {
          if (cancelled) return;
          const r = measure(anchor);
          setRect(r);
          setCenteredFallback(false);
        });
        return;
      }
      attempts += 1;
      if (attempts >= maxAttempts) {
        setCenteredFallback(true);
        setRect(null);
        return;
      }
      requestAnimationFrame(attempt);
    };

    requestAnimationFrame(attempt);
    return () => { cancelled = true; };
  }, [open, stepIndex, current, prefersReducedMotion]);

  // Re-measure on resize / scroll
  useEffect(() => {
    if (!open) return;
    const remeasure = () => {
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      if (!current) return;
      const anchor = findAnchor(current.anchorId);
      if (anchor) setRect(measure(anchor));
    };
    let tid: number | null = null;
    const debounced = () => {
      if (tid !== null) window.clearTimeout(tid);
      tid = window.setTimeout(remeasure, 50);
    };
    window.addEventListener('resize', debounced);
    window.addEventListener('scroll', debounced, true);
    const ro = new ResizeObserver(debounced);
    ro.observe(document.documentElement);
    return () => {
      window.removeEventListener('resize', debounced);
      window.removeEventListener('scroll', debounced, true);
      ro.disconnect();
      if (tid !== null) window.clearTimeout(tid);
    };
  }, [open, current]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); handleClose(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goBack(); }
      else if (e.key === 'Enter') {
        // Let native Enter on form inputs pass; only hijack on our callout
        if (calloutRef.current && calloutRef.current.contains(document.activeElement)) {
          e.preventDefault();
          goNext();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, goNext, goBack, handleClose]);

  if (!open || !current || !portalNode) return null;

  const showSpotlight = !centeredFallback && rect !== null && current.anchorId !== null;
  const pos = showSpotlight
    ? computeCalloutPosition(rect!, current.placement ?? 'auto', viewport)
    : { top: viewport.h / 2 - CALLOUT_H / 2, left: viewport.w / 2 - CALLOUT_W / 2, placement: 'bottom' as const };

  const body = Array.isArray(current.body) ? current.body : [current.body];

  // Build the four dim rectangles around the cut-out (pointer-events: none; user can still interact)
  const dimLayers = showSpotlight && rect ? (
    <>
      {/* Top */}
      <div
        style={{ top: 0, left: 0, width: viewport.w, height: Math.max(0, rect.top - PAD) }}
        className="fixed bg-black/60 pointer-events-none"
      />
      {/* Bottom */}
      <div
        style={{
          top: rect.top + rect.height + PAD,
          left: 0,
          width: viewport.w,
          height: Math.max(0, viewport.h - (rect.top + rect.height + PAD)),
        }}
        className="fixed bg-black/60 pointer-events-none"
      />
      {/* Left */}
      <div
        style={{
          top: Math.max(0, rect.top - PAD),
          left: 0,
          width: Math.max(0, rect.left - PAD),
          height: rect.height + PAD * 2,
        }}
        className="fixed bg-black/60 pointer-events-none"
      />
      {/* Right */}
      <div
        style={{
          top: Math.max(0, rect.top - PAD),
          left: rect.left + rect.width + PAD,
          width: Math.max(0, viewport.w - (rect.left + rect.width + PAD)),
          height: rect.height + PAD * 2,
        }}
        className="fixed bg-black/60 pointer-events-none"
      />

      {/* Highlight ring */}
      <div
        style={{
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
          borderColor: palette.ring,
          boxShadow: `0 0 0 6px ${palette.halo}`,
        }}
        className="fixed rounded-2xl border pointer-events-none"
      />
    </>
  ) : (
    // Centered fallback — full-screen scrim
    <div className="fixed inset-0 bg-black/70 pointer-events-none" />
  );

  const Icon = current.icon;

  const callout = (
    <div
      ref={calloutRef}
      key={`step-${stepIndex}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`spotlight-title-${current.id}`}
      className="fixed rounded-[24px] border border-white/[0.09] bg-[#0d0d0f] shadow-[0_24px_80px_rgba(0,0,0,0.7)] pointer-events-auto"
      style={{ width: CALLOUT_W, top: pos.top, left: pos.left }}
    >
      {/* Progress bar */}
      <div className="relative h-[3px] w-full overflow-hidden rounded-t-[24px] bg-white/[0.04]">
        <div
          className={cn('h-full rounded-full', palette.progress)}
          style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
        />
      </div>

      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1">
            <span className={cn('text-[10px] font-semibold uppercase tracking-[0.18em]', current.areaColor ?? 'text-zinc-300')}>
              {current.area}
            </span>
          </div>
          <span className="font-body text-[11px] text-zinc-600">{stepIndex + 1} of {steps.length}</span>
        </div>

        <div className="mb-3 flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03]">
            <Icon className="h-4 w-4 text-zinc-300" />
          </div>
          <h3
            id={`spotlight-title-${current.id}`}
            className="font-heading text-[17px] font-bold tracking-tight text-white"
          >
            {current.title}
          </h3>
        </div>

        <div className="space-y-1.5 pl-11">
          {body.map((line, i) => {
            const isBullet = line.startsWith('•');
            return (
              <p
                key={i}
                className={cn(
                  'font-body text-[12.5px] leading-relaxed',
                  isBullet ? 'pl-2 text-zinc-400' : i === 0 ? 'text-zinc-300' : 'text-zinc-500',
                )}
              >
                {line}
              </p>
            );
          })}
          {centeredFallback && current.anchorId && (
            <p className="font-body text-[11px] italic text-zinc-600 pt-1">
              This step doesn't pin to a UI element on this screen.
            </p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between pl-11">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to step ${i + 1}`}
                onClick={() => setStepIndex(i)}
                className={cn(
                  'rounded-full transition-all duration-200',
                  i === stepIndex
                    ? cn('h-2 w-4', palette.dot)
                    : i < stepIndex
                      ? 'h-1.5 w-1.5 bg-zinc-600 hover:bg-zinc-400'
                      : 'h-1.5 w-1.5 bg-zinc-800 hover:bg-zinc-600',
                )}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="font-body text-[12px] text-zinc-600 underline-offset-2 transition hover:text-zinc-400 hover:underline"
            >
              End tour
            </button>
            {!isFirst && (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] font-medium text-zinc-300 transition hover:bg-white/[0.06]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            )}
            {isLast ? (
              <button
                type="button"
                onClick={handleClose}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12px] font-semibold text-white transition',
                  palette.cta,
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                {finalCta}
              </button>
            ) : (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.07] px-3 py-2 text-[12px] font-medium text-zinc-200 transition hover:bg-white/[0.10]"
              >
                Next
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Skip close button so clicks on the dimmed area don't swallow UI clicks — pointer-events are none on dim
  const tree = (
    <div className="fixed inset-0 z-[80] pointer-events-none">
      {dimLayers}
      {/* Top-right floating close button — pointer-events-auto */}
      <button
        type="button"
        onClick={handleClose}
        aria-label="Close tour"
        className="fixed top-4 right-4 z-[81] flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/60 text-zinc-400 backdrop-blur pointer-events-auto transition hover:bg-black/80 hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
      {callout}
    </div>
  );

  return createPortal(tree, portalNode);
};

// Re-export a default icon fallback for consumers
SpotlightTour.DefaultIcon = Sparkles;

export default SpotlightTour;
