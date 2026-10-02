import type { ReactNode } from "react";
import { MotionConfig } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * Points framer-motion at Esportra's own Reduce motion setting instead of the OS:
 * animations run unless the person opted out in Account Settings.
 */
export const MotionPreferenceProvider = ({ children }: { children: ReactNode }) => {
  const reduceMotion = useReducedMotion();
  return <MotionConfig reducedMotion={reduceMotion ? "always" : "never"}>{children}</MotionConfig>;
};
