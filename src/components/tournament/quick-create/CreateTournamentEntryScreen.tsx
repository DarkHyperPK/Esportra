/**
 * CreateTournamentEntryScreen
 *
 * Two-card split: Quick Template (fast path) + Advanced (full wizard).
 * Motion personality: "entry-gate" — hover translateY(-3px) + spring press scale.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Settings } from 'lucide-react';

interface Props {
  onQuickTemplate: () => void;
  onAdvanced: () => void;
}

export const CreateTournamentEntryScreen: React.FC<Props> = ({ onQuickTemplate, onAdvanced }) => {
  const [quickExiting, setQuickExiting] = useState(false);

  const handleQuickTemplate = () => {
    setQuickExiting(true);
    // Allow exit animation (150ms) to complete before unmounting
    setTimeout(onQuickTemplate, 160);
  };

  return (
    <div className="w-full px-6 md:px-10 lg:px-14 py-10 md:py-14">
      {/* Eyebrow + heading */}
      <div className="mb-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.45em] text-rose-400 mb-3">
          Create Tournament
        </div>
        <h1 className="font-heading text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
          How do you want to start?
        </h1>
      </div>

      {/* Card row */}
      <div className="flex flex-col md:flex-row gap-5">
        {/* Quick Template card */}
        <AnimatePresence>
          {!quickExiting && (
            <motion.button
              type="button"
              key="quick-card"
              onClick={handleQuickTemplate}
              initial={{ opacity: 1, scale: 1, y: 0 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15, ease: 'easeIn' }}
              whileHover={{
                y: -3,
                transition: { duration: 0.12, ease: 'easeOut' },
              }}
              whileTap={{
                scale: 0.97,
                transition: { type: 'spring', stiffness: 450, damping: 28 },
              }}
              className={[
                'flex-1 min-h-[160px] md:min-h-[240px] p-8 md:p-10',
                'border border-white/10 bg-white/[0.02] text-left rounded-none',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
                'hover:border-rose-500/35 hover:bg-white/[0.04]',
              ].join(' ')}
              style={{ transition: 'border-color 120ms ease-out, background-color 120ms ease-out' }}
            >
              <Zap className="w-12 h-12 text-gray-400 mb-6" />
              <div className="text-xl font-bold font-mono uppercase tracking-tight text-white mb-2">
                Quick Template
              </div>
              <div className="text-sm text-gray-400 leading-relaxed">
                6 fields. Under 60s.
                <br />
                Game defaults applied.
              </div>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Advanced card — fades to 50% opacity while Quick Template is exiting */}
        <motion.button
          type="button"
          key="advanced-card"
          onClick={onAdvanced}
          animate={quickExiting ? { opacity: 0.5 } : { opacity: 1 }}
          transition={{ duration: 0.15 }}
          whileHover={{
            y: -3,
            transition: { duration: 0.12, ease: 'easeOut' },
          }}
          whileTap={{
            scale: 0.97,
            transition: { type: 'spring', stiffness: 450, damping: 28 },
          }}
          className={[
            'flex-1 min-h-[160px] md:min-h-[240px] p-8 md:p-10',
            'border border-white/10 bg-white/[0.02] text-left rounded-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
            'hover:border-white/30 hover:bg-white/[0.04]',
          ].join(' ')}
          style={{ transition: 'border-color 120ms ease-out, background-color 120ms ease-out' }}
        >
          <Settings className="w-12 h-12 text-gray-400 mb-6" />
          <div className="text-xl font-bold font-mono uppercase tracking-tight text-white mb-2">
            Advanced
          </div>
          <div className="text-sm text-gray-400 leading-relaxed">
            Full wizard.
            <br />
            Complete control.
          </div>
        </motion.button>
      </div>
    </div>
  );
};
