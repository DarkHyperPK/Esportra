import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Handshake, BarChart3, Image, FileText, Trophy, Globe,
  ArrowRight, CheckCircle2, Info
} from 'lucide-react';
import Footer from '@/components/Footer';
import { useState } from 'react';
import { JackButton } from '@/components/ui/JackButton';

// Valorant rank icons from the public API
const RANK_ICONS = {
  partner: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/17/largeicon.png',    // Platinum 3
  ascendant: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/22/largeicon.png',  // Ascendant 2
  radiant: 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/27/largeicon.png',    // Radiant
};

// Info tip content for features that need explanation
const FEATURE_TIPS: Record<string, string> = {
  '1 tournament sponsorship': 'A tournament sponsorship lets your brand be featured on one tournament of your choice. Your logo and branding will be displayed in the Esportra placement zones on that tournament\'s page.',
  '1 placement slot': 'You receive 1 placement slot — meaning your brand will be actively displayed across the placement zones of your chosen tournament.',
  'Up to 3 tournament sponsorships': 'Ascendant partners can sponsor up to 3 separate tournaments simultaneously, with brand placements active on each.',
  '3 placement slots': 'You receive 3 placement slots, allowing your brand to appear across 3 different tournaments at the same time.',
  'Up to 5 tournament sponsorships': 'Radiant partners receive up to 5 tournament sponsorships, covering up to 5 tournaments simultaneously with maximum placement zone access.',
  'Logo on homepage partner ticker': 'Your brand logo is displayed in the scrolling partner ticker on the Esportra homepage, giving you continuous passive visibility to all site visitors.',
  'Ticker zone placement': 'Your logo appears in the dedicated ticker zone — a scrolling banner on the Esportra homepage that displays all active partner brands.',
  'Partner portal access': 'Gain access to the exclusive partner portal at partners.esportra.com where you can manage your profile, upload brand assets, track campaign placements, and monitor your sponsorship activity.',
  'Basic campaign info dashboard': 'View a summary of your active sponsorship placements and campaign status directly from your partner portal.',
  'Full analytics (daily + weekly)': 'Access detailed performance data for your sponsorship placements, including daily and weekly breakdowns of impressions, clicks, and click-through rates (CTR).',
  'Audience demographics data': 'Gain insight into the demographics of the audience viewing your sponsored content, including game preferences and regional data.',
  'Banner image uploads': 'Upload custom banner images for display in your allocated placement zones on tournament pages.',
  '5 gallery showcase images': 'Showcase up to 5 images in your brand gallery on your partner profile, helping communicate your products, services, or campaigns.',
  'Detail deck hosting (PDF/PPTX)': 'Upload a brand or product deck (PDF or PPTX format) that will be hosted and accessible via your partner profile page.',
  'Monthly analytics aggregation': 'Receive a comprehensive monthly report aggregating all your sponsorship placement performance data.',
  '8 gallery showcase images': 'Showcase up to 8 images in your brand gallery on your partner profile.',
  'Priority listing across platform': 'Your brand receives priority visibility positioning across the Esportra platform relative to lower-tier partners.',
  'Header & stream overlay access': 'Your brand assets can appear in the tournament page header banner and on live stream overlays during broadcasts of sponsored tournaments.',
  'Match bar branding': 'Your logo is displayed in the match bar that appears during active matches within your sponsored tournaments.',
  'All 6 placement zones': 'Radiant partners have access to all six advertising placement zones: Ticker, Sidebar, Card Badge, Header, Match Bar, and Stream Overlay.',
  'Ticker, sidebar & card badge zones': 'Your brand appears in three placement zones: the homepage ticker, the sidebar of tournament pages, and as a badge on tournament cards in listing views.',
};

type FeatureItem = {
  label: string;
  tip?: string;
  cancelled?: boolean;
};

const tiers: Array<{
  name: string;
  color: string;
  rankIcon: string;
  price: string;
  popular?: boolean;
  features: FeatureItem[];
  notIncluded: string[];
}> = [
  {
    name: 'Partner',
    color: 'blue',
    rankIcon: RANK_ICONS.partner,
    price: 'Entry',
    features: [
      { label: 'Logo on homepage partner ticker', tip: FEATURE_TIPS['Logo on homepage partner ticker'] },
      { label: '1 tournament sponsorship', tip: FEATURE_TIPS['1 tournament sponsorship'] },
      { label: '1 placement slot', tip: FEATURE_TIPS['1 placement slot'] },
      { label: 'Ticker zone placement', tip: FEATURE_TIPS['Ticker zone placement'] },
      { label: 'Partner portal access', tip: FEATURE_TIPS['Partner portal access'] },
      { label: 'Basic campaign info dashboard', tip: FEATURE_TIPS['Basic campaign info dashboard'] },
      { label: 'Company profile on Partners page', cancelled: true },
    ],
    notIncluded: [
      'Analytics dashboard',
      'Banner uploads',
      'Gallery images',
      'Detail deck hosting',
    ],
  },
  {
    name: 'Ascendant',
    color: 'emerald',
    rankIcon: RANK_ICONS.ascendant,
    price: 'Growth',
    popular: false,
    features: [
      { label: 'Everything in Partner, plus:' },
      { label: 'Up to 3 tournament sponsorships', tip: FEATURE_TIPS['Up to 3 tournament sponsorships'] },
      { label: '3 placement slots', tip: FEATURE_TIPS['3 placement slots'] },
      { label: 'Ticker, sidebar & card badge zones', tip: FEATURE_TIPS['Ticker, sidebar & card badge zones'] },
      { label: 'Full analytics (daily + weekly)', tip: FEATURE_TIPS['Full analytics (daily + weekly)'] },
      { label: 'Audience demographics data', tip: FEATURE_TIPS['Audience demographics data'] },
      { label: 'Banner image uploads', tip: FEATURE_TIPS['Banner image uploads'] },
      { label: '5 gallery showcase images', tip: FEATURE_TIPS['5 gallery showcase images'] },
      { label: 'Detail deck hosting (PDF/PPTX)', tip: FEATURE_TIPS['Detail deck hosting (PDF/PPTX)'] },
    ],
    notIncluded: [
      'Monthly analytics',
      'Header & stream overlay zones',
      'Unlimited sponsorships',
    ],
  },
  {
    name: 'Radiant',
    color: 'amber',
    rankIcon: RANK_ICONS.radiant,
    price: 'Premium',
    features: [
      { label: 'Everything in Ascendant, plus:' },
      { label: 'Up to 5 tournament sponsorships', tip: FEATURE_TIPS['Up to 5 tournament sponsorships'] },
      { label: '3 placement slots', tip: FEATURE_TIPS['3 placement slots'] },
      { label: 'All 6 placement zones', tip: FEATURE_TIPS['All 6 placement zones'] },
      { label: 'Monthly analytics aggregation', tip: FEATURE_TIPS['Monthly analytics aggregation'] },
      { label: '8 gallery showcase images', tip: FEATURE_TIPS['8 gallery showcase images'] },
      { label: 'Priority listing across platform', tip: FEATURE_TIPS['Priority listing across platform'] },
      { label: 'Header & stream overlay access', tip: FEATURE_TIPS['Header & stream overlay access'] },
      { label: 'Match bar branding', tip: FEATURE_TIPS['Match bar branding'] },
    ],
    notIncluded: [],
  },
];

// Tooltip component — shows on hover
const InfoTip = ({ tip }: { tip: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-default">
        <Info className="w-3.5 h-3.5" />
      </span>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 bg-[#0a0a0c] border border-white/10 p-3 shadow-2xl shadow-black/60 pointer-events-none"
          >
            <p className="text-xs text-zinc-300 leading-relaxed">{tip}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const zones = [
  { name: 'Ticker', desc: 'Homepage logo scroll', tiers: ['Partner', 'Ascendant', 'Radiant'] },
  { name: 'Sidebar', desc: 'Tournament page vertical ad', tiers: ['Ascendant', 'Radiant'] },
  { name: 'Card Badge', desc: 'Logo on tournament cards', tiers: ['Ascendant', 'Radiant'] },
  { name: 'Header', desc: 'Tournament page top banner', tiers: ['Radiant'] },
  { name: 'Match Bar', desc: 'Branding on match pages', tiers: ['Radiant'] },
  { name: 'Stream Overlay', desc: 'Assets for live streams', tiers: ['Radiant'] },
];

const colorMap: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  blue: { border: 'border-rose-500/30', bg: 'bg-rose-500/10', text: 'text-rose-400', badge: 'bg-rose-500' },
  emerald: { border: 'border-white/20', bg: 'bg-white/[0.05]', text: 'text-white', badge: 'bg-white' },
  amber: { border: 'border-white/10', bg: 'bg-white/[0.03]', text: 'text-zinc-300', badge: 'bg-zinc-400' },
};

const BeAPartner = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col font-sans selection:bg-rose-500/30">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[800px] h-[800px] bg-rose-900/10 blur-[150px] rounded-full mix-blend-screen" />
      </div>

      <main className="relative z-10 flex-grow pt-32 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-medium mb-6">
              <Handshake className="w-4 h-4" />
              Partnership Program
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight text-white mb-6">
              Grow your brand with Esportra
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
              Reach thousands of competitive gamers and esports enthusiasts. Our partnership tiers
              give you the visibility, analytics, and placement zones to maximize your brand's impact.
            </p>
            <JackButton as={Link} to="/partners#apply" size="md">
              Apply Now <ArrowRight className="w-4 h-4" />
            </JackButton>
          </motion.div>

          {/* Tier Cards */}
          <section className="mb-24">
            <h2 className="text-2xl font-bold text-center mb-12">Partnership Tiers</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {tiers.map((tier, i) => {
                const c = colorMap[tier.color];
                return (
                  <motion.div
                    key={tier.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className={`relative p-8 bg-[#0a0a0c] border border-white/5 flex flex-col`}
                  >
                    <div className="w-16 h-16 mb-6">
                      <img src={tier.rankIcon} alt={tier.name} className="w-full h-full object-contain drop-shadow-lg" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                    <p className={`text-sm ${c.text} font-medium mb-6`}>{tier.price} Tier</p>

                    <div className="space-y-3 flex-1">
                      {tier.features.map((f) => (
                        <div
                          key={f.label}
                          className={`flex items-start gap-2 ${f.cancelled ? 'opacity-30' : ''}`}
                        >
                          <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${f.cancelled ? 'text-zinc-500' : c.text}`} />
                          <span className={`text-sm flex-1 ${f.cancelled ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>
                            {f.label}
                          </span>
                          {f.tip && !f.cancelled && <InfoTip tip={f.tip} />}
                        </div>
                      ))}
                      {tier.notIncluded.map((f) => (
                        <div key={f} className="flex items-start gap-2 opacity-30">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="text-sm line-through">{f}</span>
                        </div>
                      ))}
                    </div>

                    <JackButton as={Link} to="/partners#apply" variant="invert" size="md" className="mt-8 w-full">
                      Get Started
                    </JackButton>
                  </motion.div>
                );
              })}
            </div>
          </section>

          {/* Placement Zones */}
          <section className="mb-24">
            <h2 className="text-2xl font-bold text-center mb-4">Placement Zones</h2>
            <p className="text-zinc-400 text-center mb-12 max-w-xl mx-auto">
              Your brand appears across the platform in zones matched to your tier.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {zones.map((zone) => (
                <div key={zone.name} className="p-6 bg-[#0a0a0c] border border-white/5">
                  <h4 className="text-white font-bold mb-1">{zone.name}</h4>
                  <p className="text-zinc-500 text-sm mb-4">{zone.desc}</p>
                  <div className="flex gap-2">
                    {zone.tiers.map((t) => {
                      const tierColor = t === 'Radiant' ? 'amber' : t === 'Ascendant' ? 'emerald' : 'blue';
                      const c = colorMap[tierColor];
                      return (
                        <span key={t} className={`text-[10px] font-bold px-2 py-0.5 rounded ${c.bg} ${c.text}`}>
                          {t}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* What You Get */}
          <section className="mb-24">
            <h2 className="text-2xl font-bold text-center mb-12">What Partners Get</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: Globe, title: 'Brand Visibility', desc: 'Your logo and brand across tournaments, homepage, and match pages.' },
                { icon: BarChart3, title: 'Performance Analytics', desc: 'Track impressions, clicks, CTR, and audience demographics in real-time.' },
                { icon: Image, title: 'Media Management', desc: 'Upload banners, gallery images, and campaign assets through your portal.' },
                { icon: Trophy, title: 'Tournament Sponsorship', desc: 'Get linked to tournaments with dedicated branding zones and overlays.' },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-6 bg-[#0a0a0c] border border-white/5"
                >
                  <item.icon className="w-8 h-8 text-rose-500 mb-4" />
                  <h4 className="text-white font-bold mb-2">{item.title}</h4>
                  <p className="text-zinc-500 text-sm">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Partner Portal */}
          <section className="mb-24">
            <div className="p-12 bg-rose-500/5 border border-rose-500/20 text-center">
              <FileText className="w-10 h-10 text-rose-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-4">Dedicated Partner Portal</h2>
              <p className="text-zinc-400 max-w-xl mx-auto mb-8">
                Every partner gets access to a private dashboard at{' '}
                <span className="text-rose-400 font-medium">partners.esportra.com</span>{' '}
                to manage their profile, upload assets, track analytics, and view campaign placements.
              </p>
              <JackButton as={Link} to="/partners#apply" size="md">
                Become a Partner <ArrowRight className="w-4 h-4" />
              </JackButton>
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-2xl font-bold text-center mb-12">Frequently Asked</h2>
            <div className="max-w-2xl mx-auto space-y-6">
              {[
                { q: 'How do I apply?', a: 'Head to our Partners page and fill out the application form. Our team reviews applications within 48 hours.' },
                { q: 'Can I upgrade my tier later?', a: 'Yes. Contact our partnerships team to discuss upgrading your tier at any time.' },
                { q: 'How is my brand placed on tournaments?', a: 'Our admin team links your brand to tournaments based on your tier and campaign goals. You\'ll see all active placements in your portal.' },
                { q: 'Do I get analytics on my placements?', a: 'Ascendant and Radiant partners get full analytics including impressions, clicks, CTR, and audience demographics.' },
                { q: 'What file formats are supported for assets?', a: 'PNG, SVG, and JPEG for images. PDF and PPTX for detail decks. Max 3MB for images, 10MB for documents.' },
              ].map((faq) => (
                <div key={faq.q} className="p-6 bg-[#0a0a0c] border border-white/5">
                  <h4 className="text-white font-bold mb-2">{faq.q}</h4>
                  <p className="text-zinc-400 text-sm">{faq.a}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BeAPartner;
