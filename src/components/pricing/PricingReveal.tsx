import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { usePricingMotion } from '@/hooks/usePricingMotion';

export default function PricingReveal({ children, className }: { children: ReactNode; className?: string }) {
  const animate = usePricingMotion();
  return <motion.div className={className} initial={animate ? { opacity: 0, transform: 'translateY(24px)' } : false} whileInView={{ opacity: 1, transform: 'translateY(0px)' }} viewport={{ once: true, amount: 0.04 }} transition={{ duration: animate ? 0.45 : 0, ease: [0.2, 0, 0, 1] }}>{children}</motion.div>;
}
