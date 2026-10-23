import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Footer from '@/components/Footer';
import PricingPlans from '@/components/pricing/PricingPlans';
import PricingComparison from '@/components/pricing/PricingComparison';
import PricingFaq from '@/components/pricing/PricingFaq';
import PricingHero from '@/components/pricing/PricingHero';
import PricingExperience from '@/components/pricing/PricingExperience';
import PricingStory from '@/components/pricing/PricingStory';
import PricingReveal from '@/components/pricing/PricingReveal';
import type { PricingSelection } from '@/components/pricing/pricingContent';
import '@/components/pricing/pricing.css';
import '@/components/pricing/pricing-scenes.css';

export default function Pricing() {
  const { user } = useAuth();
  const [selection, setSelection] = useState<PricingSelection>({ teams: '64', viaPointer: false });
  const selectTeams = (teams: string, viaPointer: boolean) => setSelection({ teams, viaPointer });
  const startHref = user ? '/dashboard' : '/auth/signup';
  const startLabel = user ? 'Go to dashboard' : 'Host an event free';
  return (
    <div className="pricing-page" data-input="pointer" onKeyDownCapture={event => { event.currentTarget.dataset.input = 'keyboard'; }} onPointerDownCapture={event => { event.currentTarget.dataset.input = 'pointer'; }}>
      <main id="pricing-main">
        <PricingHero startHref={startHref} startLabel={startLabel} />
        <div className="pricing-content">
          <PricingReveal><PricingPlans startHref={startHref} startLabel={startLabel} selection={selection} onSelectTeams={selectTeams} /></PricingReveal>
          <PricingReveal><PricingStory /></PricingReveal>
          <PricingReveal><PricingExperience /></PricingReveal>
          <PricingReveal><PricingComparison selection={selection} onSelectTeams={selectTeams} /></PricingReveal>
          <PricingReveal><PricingFaq /></PricingReveal>
        </div>
        <section className="pricing-closing" aria-labelledby="closing-title"><img className="pricing-closing-photo" src="/pricing/hands-pexels-7862610.jpg" alt="" width={1600} height={2400} loading="lazy" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} /><p className="pricing-caption">YOUR SCENE IS WAITING.</p><div><h2 id="closing-title">HOST IT.<br />ENJOY IT.</h2><div className="pricing-closing-action"><p>You put the day together.<br />Make room to enjoy it, too.</p><Link className="pricing-button pricing-button-primary" to={startHref}>{startLabel}<ArrowUpRight size={20} aria-hidden="true" /></Link><span>32 teams. 2 free cups a month. No card.</span></div></div><span className="pricing-closing-wordmark" aria-hidden="true">ESPORTRA / EVERY MATCH, OFFICIAL.</span><a className="pricing-closing-credit" href="https://www.pexels.com/photo/a-person-s-hand-while-gaming-7862610/" target="_blank" rel="noreferrer">Photo: Alena Darmel / Pexels</a></section>
      </main>
      <Footer />
    </div>
  );
}
