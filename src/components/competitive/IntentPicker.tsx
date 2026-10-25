/**
 * IntentPicker — grouped radio-style intent selector for CreateListingSheet.
 * Two groups: player intents ("I'm looking for...") and team intents ("My team is looking for...").
 * Motion: Confirm 150ms rose tint on row select.
 */
import { motion, useReducedMotion } from 'framer-motion';
import { LFG_INTENT_GROUPS } from '@/lib/lfgIntentOptions';
import type { LfgIntent } from '@/types/competitive';

interface IntentPickerProps {
  value: LfgIntent | null;
  onChange: (intent: LfgIntent) => void;
}

export function IntentPicker({ value, onChange }: IntentPickerProps) {
  const reduced = useReducedMotion() ?? false;

  return (
    <div role="radiogroup" aria-label="Listing intent">
      {LFG_INTENT_GROUPS.map((group, gi) => (
        <div key={group.label}>
          {gi > 0 && <div className="border-t border-white/[0.06] my-4" aria-hidden />}
          <p className="text-[11px] font-mono uppercase tracking-wider text-white/40 mb-2">
            {group.label.toUpperCase()}
          </p>
          {group.intents.map((option) => {
            const isSelected = value === option.value;
            return (
              <motion.button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onChange(option.value)}
                animate={reduced ? undefined : {
                  backgroundColor: isSelected ? 'rgba(244,63,94,0.08)' : 'rgba(255,255,255,0)',
                }}
                transition={{ duration: 0.15, ease: [0.3, 0, 0, 1] }}
                className="relative w-full flex flex-col gap-0.5 px-4 py-3 text-left cursor-pointer transition-colors duration-150 hover:bg-white/[0.03]"
                style={isSelected ? {
                  borderLeft: '2px solid #f43f5e',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  borderRight: '1px solid rgba(255,255,255,0.06)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                } : {
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold text-white">{option.label}</span>
                  {isSelected && (
                    <motion.span
                      initial={reduced ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.15 }}
                      className="text-rose-400 text-[14px]"
                      aria-hidden
                    >
                      ✓
                    </motion.span>
                  )}
                </div>
                <span className="text-[12px] text-white/40">{option.description}</span>
              </motion.button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
