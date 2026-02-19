import React, { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSponsors, trackImpression, trackClick, Sponsor } from '@/hooks/useSponsors';

const SponsorsBanner = () => {
  const { data: sponsors = [], isLoading } = useSponsors('hero');
  const trackedIds = useRef<Set<string>>(new Set());
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const setCardRef = useCallback((id: string) => (el: HTMLDivElement | null) => {
    if (el) cardRefs.current.set(id, el);
    else cardRefs.current.delete(id);
  }, []);

  // Track impressions only when 50% of a sponsor card is visible
  useEffect(() => {
    if (sponsors.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sponsorId = entry.target.getAttribute('data-sponsor-id');
          if (entry.isIntersecting && sponsorId && !trackedIds.current.has(sponsorId)) {
            trackImpression(sponsorId);
            trackedIds.current.add(sponsorId);
          }
        });
      },
      { threshold: 0.5 }
    );

    cardRefs.current.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [sponsors]);

  if (isLoading || sponsors.length === 0) return null;

  const handleClick = (sponsor: Sponsor) => {
    trackClick(sponsor.id);
  };

  return (
    <section className="py-16 bg-gaming-dark">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Our <span className="text-gradient">Partners</span>
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Supported by the best gaming hardware companies in the world
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          {sponsors.slice(0, 2).map((sponsor) => (
            <div key={sponsor.id} ref={setCardRef(sponsor.id)} data-sponsor-id={sponsor.id} className="group relative rounded-lg overflow-hidden h-[250px]">
              <div className="absolute inset-0 bg-gradient-to-r from-gaming-darker/90 via-gaming-darker/70 to-transparent z-10"></div>
              {sponsor.banner_image_url && (
                <img
                  src={sponsor.banner_image_url}
                  alt={sponsor.name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              )}
              <div className="absolute top-0 left-0 w-full h-full flex flex-col justify-center p-8 z-20">
                <h3 className="text-2xl font-bold text-white mb-2">{sponsor.tagline || sponsor.name}</h3>
                <p className="text-gray-200 mb-6 max-w-sm">{sponsor.description}</p>
                <a
                  href={sponsor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 text-white inline-block rounded-md transition-colors w-fit"
                  style={{ backgroundColor: sponsor.accent_color }}
                  onClick={() => handleClick(sponsor)}
                >
                  {sponsor.cta_text}
                </a>
                <div
                  className={`absolute top-4 right-4 text-white text-[10px] px-2 py-0.5 rounded border uppercase font-bold tracking-widest backdrop-blur-md ${sponsor.tier === 'radiant' ? 'bg-amber-500/20 border-amber-500/40 text-amber-500' :
                    sponsor.tier === 'ascendant' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-500' :
                      'bg-pink-500/20 border-pink-500/40 text-pink-500'
                    }`}
                >
                  {sponsor.tier === 'radiant' ? 'Radiant Partner' : sponsor.tier === 'ascendant' ? 'Ascendant Partner' : 'Diamond Partner'}
                </div>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Promo bar — only if any sponsors have discounts */}
        {sponsors.some(s => s.discount_text) && (
          <motion.div
            className="mt-12 bg-esports-dark/80 backdrop-blur-sm p-6 rounded-lg border border-gaming-gray/30"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="mb-4 md:mb-0">
                <h3 className="text-xl font-bold mb-2">Exclusive Gaming Gear Discounts</h3>
                <p className="text-gray-300">Get special offers on premium gaming equipment for Esportra members</p>
              </div>
              <div className="flex space-x-4">
                {sponsors.filter(s => s.discount_text).map((sponsor) => (
                  <a
                    key={sponsor.id}
                    href={sponsor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-white rounded transition-colors whitespace-nowrap"
                    style={{ backgroundColor: sponsor.accent_color }}
                    onClick={() => handleClick(sponsor)}
                  >
                    {sponsor.name} {sponsor.discount_text}
                  </a>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default SponsorsBanner;