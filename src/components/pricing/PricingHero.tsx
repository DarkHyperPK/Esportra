import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePricingMotion } from '@/hooks/usePricingMotion';

export default function PricingHero({ startHref, startLabel }: { startHref: string; startLabel: string }) {
  const section = useRef<HTMLElement>(null);
  const animate = usePricingMotion();
  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end start'] });
  const imageTransform = useTransform(scrollYProgress, [0, 1], ['translateY(0px) scale(1.02)', 'translateY(50px) scale(1.02)']);
  return (
    <section ref={section} className="pricing-hero" aria-labelledby="pricing-title">
      <motion.img className="pricing-hero-art" src="/pricing/championship-v7.png" alt="" fetchPriority="high" width={1672} height={941} style={{ transform: animate ? imageTransform : 'none' }} initial={animate ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={{ duration: animate ? 0.8 : 0 }} onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />
      <div className="pricing-hero-shade" aria-hidden="true" />
      <div className="pricing-hero-content">
        <p className="pricing-eyebrow"><span /> ESPORTRA / ORGANIZER PRICING</p>
        <h1 id="pricing-title">{['MAKE', 'HISTORY.'].map((line, index) => <span className="pricing-line-mask" key={line}><motion.span initial={animate ? { transform: 'translateY(110%)' } : false} animate={{ transform: 'translateY(0%)' }} transition={{ duration: animate ? 0.65 : 0, delay: animate ? 0.08 + index * 0.12 : 0, ease: [0.2, 0, 0, 1] }}>{line}{index === 0 && ' '}</motion.span></span>)}</h1>
        <motion.div initial={animate ? { opacity: 0, transform: 'translateY(18px)' } : false} animate={{ opacity: 1, transform: 'translateY(0px)' }} transition={{ duration: animate ? 0.5 : 0, delay: animate ? 0.35 : 0, ease: [0.2, 0, 0, 1] }}>
          <p className="pricing-hero-punchline">Less admin.<br className="pricing-mobile-break" /> More match day.</p>
          <p className="pricing-hero-copy">A clear plan for your teams. Fewer loose ends for you.<br /> More room to enjoy the event you built.</p>
          <div className="pricing-hero-actions"><Link className="pricing-button pricing-button-primary" to={startHref}>{startLabel}<ArrowUpRight size={18} aria-hidden="true" /></Link><a className="pricing-jump" href="#plans">Find your plan <ArrowDown size={16} aria-hidden="true" /></a></div>
        </motion.div>
      </div>
      <div className="pricing-hero-edition" aria-hidden="true"><span>EVERY MATCH, OFFICIAL.</span><span>YOUR SCENE. YOUR LEGACY.</span></div>
    </section>
  );
}
