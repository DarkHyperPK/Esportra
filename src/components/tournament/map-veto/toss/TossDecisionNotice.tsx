import { motion } from "framer-motion";

/**
 * What the toss winner decided, at the top of the veto until the first move is
 * made, so the team that lost the toss knows why it's (or isn't) their turn.
 */
export const TossDecisionNotice = ({ text }: { text: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
    className="flex items-center gap-3 border-l-2 border-white bg-white/[0.04] px-4 py-3"
  >
    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-400">Toss</span>
    <p className="text-sm font-semibold text-white sm:text-[15px]">{text}</p>
  </motion.div>
);

export default TossDecisionNotice;
