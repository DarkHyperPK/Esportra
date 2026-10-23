import { useState } from 'react';
import * as Accordion from '@radix-ui/react-accordion';
import { motion } from 'framer-motion';
import { ArrowUpRight, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { usePricingMotion } from '@/hooks/usePricingMotion';
import { FAQ_ITEMS } from './pricingContent';

export default function PricingFaq() {
  const [active, setActive] = useState('');
  const [pointer, setPointer] = useState(false);
  const animate = usePricingMotion() && pointer;
  return (
    <section className="pricing-faq" aria-labelledby="faq-title">
      <div><p className="pricing-caption">05 / Before the first match</p><h2 id="faq-title">Good questions.<br />Straight answers.</h2><p>Planning something different?</p><Link to="/contact">Talk to our team<ArrowUpRight size={15} aria-hidden="true" /></Link></div>
      <Accordion.Root type="single" collapsible value={active} onValueChange={setActive} className="pricing-faq-list">
        {FAQ_ITEMS.map((item, index) => {
          const value = String(index);
          const open = active === value;
          return <Accordion.Item value={value} key={item.q} className="pricing-faq-item">
            <Accordion.Header><Accordion.Trigger className="pricing-faq-trigger" onClick={event => setPointer(event.detail > 0)}><span className="pricing-faq-question"><span className="pricing-faq-index" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>{item.q}</span><motion.span animate={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }} transition={{ duration: animate ? 0.18 : 0, ease: [0.2, 0, 0, 1] }}><Plus size={17} aria-hidden="true" /></motion.span></Accordion.Trigger></Accordion.Header>
            <Accordion.Content forceMount asChild><motion.div className="pricing-faq-answer" aria-hidden={!open} initial={false} animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }} transition={{ duration: animate ? 0.2 : 0, ease: [0.2, 0, 0, 1] }}><p>{item.a}</p></motion.div></Accordion.Content>
          </Accordion.Item>;
        })}
      </Accordion.Root>
    </section>
  );
}
