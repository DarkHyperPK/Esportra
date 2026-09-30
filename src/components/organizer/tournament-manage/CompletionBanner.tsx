/**
 * CompletionBanner.tsx
 *
 * Dismissable completion-state banner shown at the top of the dashboard.
 * Shows a count of required/recommended missing sections with quick-jump links.
 * Hidden once the tournament is published (status !== 'draft').
 */

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AlertCircle, AlertTriangle, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import type { CompletionSummary } from '@/hooks/useCompletionState';

interface CompletionBannerProps {
  completionSummary: CompletionSummary;
  tournamentStatus: string;
  tournamentId: string;
  userId: string | undefined;
}

const enterVariants = {
  initial: { opacity: 0, y: -12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0, 0, 0.2, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } },
};

const PANEL_LABELS: Record<string, string> = {
  'basic-info': 'Basic Info',
  'format-stages': 'Format & Stages',
  'registration': 'Registration',
  'prize-payouts': 'Prize Payouts',
  'branding': 'Branding',
  'settings': 'Settings',
  'advanced': 'Settings',
};

export function CompletionBanner({ completionSummary, tournamentStatus, tournamentId, userId }: CompletionBannerProps) {
  const storageKey = userId ? `banner-dismissed-${tournamentId}-${userId}` : null;
  const [dismissed, setDismissed] = useState(() =>
    storageKey ? localStorage.getItem(storageKey) === 'true' : false
  );
  const shouldReduceMotion = useReducedMotion();
  const [, setSearchParams] = useSearchParams();

  const isPublished = tournamentStatus !== 'draft';
  const { totalRequiredMissing, totalRecommendedMissing, blockingPanels } = completionSummary;
  const hasIssues = totalRequiredMissing > 0 || totalRecommendedMissing > 0;

  // Never render when already published or nothing to show
  if (isPublished || !hasIssues) return null;

  const isBlocking = totalRequiredMissing > 0;
  const tone = isBlocking
    ? {
        border: 'border-red-500/30',
        bg: 'bg-red-500/[0.06]',
        icon: <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />,
        label: (
          <span className="text-sm font-semibold text-red-300">
            {totalRequiredMissing} required {totalRequiredMissing === 1 ? 'section' : 'sections'} incomplete
          </span>
        ),
        sub: 'Complete these before publishing.',
      }
    : {
        border: 'border-amber-500/30',
        bg: 'bg-amber-500/[0.06]',
        icon: <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />,
        label: (
          <span className="text-sm font-semibold text-amber-300">
            {totalRecommendedMissing} recommended {totalRecommendedMissing === 1 ? 'section' : 'sections'} incomplete
          </span>
        ),
        sub: 'Optional but recommended for a better participant experience.',
      };

  const panelsToShow = blockingPanels.length > 0
    ? blockingPanels
    : Object.entries(completionSummary.panels)
        .filter(([, state]) => state.recommendedMissing.length > 0)
        .map(([id]) => id);

  // Gate the child on dismissed so AnimatePresence can run the exit animation
  return (
    <AnimatePresence mode="wait">
      {!dismissed && (
        <motion.div
          key="completion-banner"
          variants={shouldReduceMotion ? undefined : enterVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={`flex items-start gap-3 border px-4 py-3 ${tone.border} ${tone.bg}`}
        >
          {tone.icon}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {tone.label}
              <span className="text-xs text-zinc-500">{tone.sub}</span>
            </div>
            {panelsToShow.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {panelsToShow.map((panelId) => (
                  <button
                    key={panelId}
                    type="button"
                    onClick={() => setSearchParams({ tab: panelId }, { replace: true })}
                    className="rounded-sm border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
                  >
                    {PANEL_LABELS[panelId] ?? panelId}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (storageKey) localStorage.setItem(storageKey, 'true');
              setDismissed(true);
            }}
            aria-label="Dismiss"
            className="rounded p-1 text-zinc-500 transition-colors hover:bg-white/10 hover:text-zinc-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
