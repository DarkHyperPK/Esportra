import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function OfflineBanner({ isOnline }: { isOnline: boolean }) {
  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2
                     bg-amber-500 text-black text-sm font-semibold py-2 px-4"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 8px)' }}
        >
          <WifiOff size={15} />
          No internet connection
        </motion.div>
      )}
    </AnimatePresence>
  );
}
