/**
 * MobileDrawer.tsx
 *
 * Mobile navigation drawer that slides in from the left.
 * Spring-animated with backdrop overlay.
 */

import { X } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function MobileDrawer({ open, onClose, children }: MobileDrawerProps) {
  const shouldReduceMotion = useReducedMotion();

  const backdropVariants = shouldReduceMotion
    ? undefined
    : {
        initial: { opacity: 0 },
        animate: { opacity: 0.5 },
        exit: { opacity: 0 },
      };

  const drawerVariants = shouldReduceMotion
    ? undefined
    : {
        initial: { x: '-100%' },
        animate: { x: 0 },
        exit: { x: '-100%' },
      };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={shouldReduceMotion ? {} : { duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-40 bg-black"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <motion.div
            variants={drawerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={
              shouldReduceMotion
                ? {}
                : { type: 'spring', stiffness: 400, damping: 35 }
            }
            className={cn(
              'fixed inset-y-0 left-0 z-50 w-[280px] border-r border-white/10 bg-[#08080a] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.6)]',
              'overflow-y-auto'
            )}
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center border border-white/10 bg-black text-white transition-colors hover:border-white/25 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/70"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Nav Content */}
            <div className="mt-12">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
