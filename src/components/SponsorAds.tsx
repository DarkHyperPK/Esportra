import React, { useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSponsors, trackImpression, trackClick, Sponsor } from '@/hooks/useSponsors';

interface SponsorAdProps {
  variant?: 'sidebar' | 'banner' | 'featured';
  placement?: 'top' | 'middle' | 'bottom';
}

const SponsorAds: React.FC<SponsorAdProps> = ({
  variant = 'banner',
  placement = 'middle'
}) => {
  const { data: sponsors = [], isLoading } = useSponsors(variant === 'featured' ? 'featured' : variant);
  const trackedIds = useRef<Set<string>>(new Set());
  const cardRefs = useRef<Map<string, HTMLElement>>(new Map());

  const setCardRef = useCallback((id: string) => (el: HTMLElement | null) => {
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  if (isLoading || sponsors.length === 0) return null;

  const handleClick = (sponsor: Sponsor) => {
    trackClick(sponsor.id);
  };

  // Sidebar variant
  if (variant === 'sidebar') {
    return (
      <motion.div
        className="mb-6 rounded-lg overflow-hidden"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={containerVariants}
      >
        <h3 className="text-sm text-gray-400 mb-3 uppercase font-medium">Our Sponsors</h3>
        <motion.div
          className="space-y-4"
          variants={containerVariants}
        >
          {sponsors.slice(0, 3).map((sponsor) => (
            <motion.div
              key={sponsor.id}
              className="bg-gaming-dark p-4 rounded-lg border border-gaming-gray/30 transition-all duration-300"
              style={{ '--hover-color': `${sponsor.accent_color}50` } as React.CSSProperties}
              variants={itemVariants}
              whileHover={{ scale: 1.02, borderColor: sponsor.accent_color }}
            >
              <a
                href={sponsor.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
                onClick={() => handleClick(sponsor)}
              >
                {sponsor.banner_image_url && (
                  <div className="relative h-32 overflow-hidden rounded-md mb-3">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent z-10"></div>
                    <img
                      src={sponsor.banner_image_url}
                      alt={sponsor.name}
                      className="object-cover h-full w-full"
                    />
                  </div>
                )}
                <p className="text-sm text-white font-medium">{sponsor.tagline || sponsor.name}</p>
                <p className="text-xs text-gray-400 mt-1">{sponsor.description}</p>
              </a>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    );
  }

  // Featured variant
  if (variant === 'featured') {
    return (
      <motion.div
        className="mb-12"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={containerVariants}
      >
        <h2 className="text-2xl font-bold mb-6">Our <span className="text-gradient">Sponsors</span></h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sponsors.slice(0, 4).map((sponsor) => (
            <motion.div
              key={sponsor.id}
              className="relative rounded-xl overflow-hidden h-[220px] group"
              variants={itemVariants}
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <a
                href={sponsor.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block h-full"
                onClick={() => handleClick(sponsor)}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent z-10"></div>
                {sponsor.banner_image_url && (
                  <img
                    src={sponsor.banner_image_url}
                    alt={sponsor.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                )}
                <div className="absolute top-6 left-6 z-20">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    {sponsor.tagline?.toUpperCase() || sponsor.name.toUpperCase()}
                  </h3>
                  <p className="text-gray-200 max-w-xs">{sponsor.description}</p>
                  <button
                    className="mt-4 px-4 py-2 text-white rounded-md transition-colors"
                    style={{ backgroundColor: sponsor.accent_color }}
                  >
                    {sponsor.cta_text}
                  </button>
                </div>
              </a>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  // Default banner variant
  return (
    <motion.div
      className="my-8 relative overflow-hidden rounded-lg"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={containerVariants}
    >
      <div className="py-4 px-6 bg-esports-dark border border-gaming-gray/30 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <motion.div variants={itemVariants}>
              <p className="text-white font-medium">Official Sponsors of the Esportra Gaming Platform</p>
            </motion.div>
          </div>
          <motion.div variants={itemVariants}>
            <div className="flex space-x-4">
              {sponsors.slice(0, 3).map((sponsor) => (
                <a
                  key={sponsor.id}
                  href={sponsor.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-white text-sm rounded transition-colors"
                  style={{ backgroundColor: sponsor.accent_color }}
                  onClick={() => handleClick(sponsor)}
                >
                  {sponsor.discount_text ? `${sponsor.name} ${sponsor.discount_text}` : sponsor.cta_text}
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default SponsorAds;
