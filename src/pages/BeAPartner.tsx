import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Handshake, BarChart3, Image, FileText, Trophy, Globe,
  ArrowRight, CheckCircle2, Zap, Shield, Star
} from 'lucide-react';
import Footer from '@/components/Footer';

const tiers = [
  {
    name: 'Partner',
    color: 'blue',
    icon: Star,
    price: 'Entry',
    features: [
      'Logo on homepage partner ticker',
      '1 tournament sponsorship',
      'Ticker zone placement',
      'Company profile on Partners page',
      'Partner portal access',
      'Basic campaign info dashboard',
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
    icon: Zap,
    price: 'Growth',
    popular: true,
    features: [
      'Everything in Partner, plus:',
      'Up to 3 tournament sponsorships',
      'Ticker, sidebar & card badge zones',
      'Full analytics (daily + weekly)',
      'Audience demographics data',
      'Banner image uploads',
      '5 gallery showcase images',
      'Detail deck hosting (PDF/PPTX)',
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
    icon: Shield,
    price: 'Premium',
    features: [
      'Everything in Ascendant, plus:',
      'Unlimited tournament sponsorships',
      'All 6 placement zones',
      'Monthly analytics aggregation',
      '8 gallery showcase images',
      'Priority listing across platform',
      'Header & stream overlay access',
      'Match bar branding',
    ],
    notIncluded: [],
  },
];

const zones = [
  { name: 'Ticker', desc: 'Homepage logo scroll', tiers: ['Partner', 'Ascendant', 'Radiant'] },
  { name: 'Sidebar', desc: 'Tournament page vertical ad', tiers: ['Ascendant', 'Radiant'] },
  { name: 'Card Badge', desc: 'Logo on tournament cards', tiers: ['Ascendant', 'Radiant'] },
  { name: 'Header', desc: 'Tournament page top banner', tiers: ['Radiant'] },
  { name: 'Match Bar', desc: 'Branding on match pages', tiers: ['Radiant'] },
  { name: 'Stream Overlay', desc: 'Assets for live streams', tiers: ['Radiant'] },
];

const colorMap: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  blue: { border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400', badge: 'bg-blue-500' },
  emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400', badge: 'bg-emerald-500' },
  amber: { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400', badge: 'bg-amber-500' },
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
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent mb-6">
              Grow your brand with Esportra
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-8">
              Reach thousands of competitive gamers and esports enthusiasts. Our partnership tiers
              give you the visibility, analytics, and placement zones to maximize your brand's impact.
            </p>
            <Link
              to="/partners#apply"
              className="inline-flex items-center gap-2 px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-colors"
            >
              Apply Now <ArrowRight className="w-4 h-4" />
            </Link>
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
                    className={`relative p-8 rounded-2xl bg-[#0a0a0c] border ${tier.popular ? c.border : 'border-white/5'} flex flex-col`}
                  >
                    {tier.popular && (
                      <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 ${c.badge} text-black text-xs font-bold rounded-full`}>
                        Most Popular
                      </div>
                    )}
                    <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center mb-6`}>
                      <tier.icon className={`w-6 h-6 ${c.text}`} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                    <p className={`text-sm ${c.text} font-medium mb-6`}>{tier.price} Tier</p>

                    <div className="space-y-3 flex-1">
                      {tier.features.map((f) => (
                        <div key={f} className="flex items-start gap-2">
                          <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${c.text}`} />
                          <span className="text-sm text-zinc-300">{f}</span>
                        </div>
                      ))}
                      {tier.notIncluded.map((f) => (
                        <div key={f} className="flex items-start gap-2 opacity-30">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <span className="text-sm line-through">{f}</span>
                        </div>
                      ))}
                    </div>

                    <Link
                      to="/partners#apply"
                      className={`mt-8 w-full py-3 rounded-xl text-center text-sm font-bold transition-colors border ${
                        tier.popular
                          ? `${c.bg} ${c.border} ${c.text} hover:opacity-80`
                          : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                      }`}
                    >
                      Get Started
                    </Link>
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
                <div key={zone.name} className="p-6 rounded-xl bg-[#0a0a0c] border border-white/5">
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
                  className="p-6 rounded-xl bg-[#0a0a0c] border border-white/5"
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
            <div className="p-12 rounded-2xl bg-gradient-to-br from-rose-500/10 to-transparent border border-rose-500/20 text-center">
              <FileText className="w-10 h-10 text-rose-500 mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-4">Dedicated Partner Portal</h2>
              <p className="text-zinc-400 max-w-xl mx-auto mb-8">
                Every partner gets access to a private dashboard at{' '}
                <span className="text-rose-400 font-medium">partners.esportra.com</span>{' '}
                to manage their profile, upload assets, track analytics, and view campaign placements.
              </p>
              <Link
                to="/partners#apply"
                className="inline-flex items-center gap-2 px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl transition-colors"
              >
                Become a Partner <ArrowRight className="w-4 h-4" />
              </Link>
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
                <div key={faq.q} className="p-6 rounded-xl bg-[#0a0a0c] border border-white/5">
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
