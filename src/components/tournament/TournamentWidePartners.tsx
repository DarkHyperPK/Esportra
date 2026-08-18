import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { trackImpression, trackClick } from '@/hooks/useSponsors';
import {
  useTournamentSponsorDisplay,
  sponsorsByZone,
} from '@/hooks/useTournamentSponsorDisplay';

interface Props {
  tournamentId: string;
}

export const TournamentWidePartners: React.FC<Props> = ({ tournamentId }) => {
  const { data: links = [] } = useTournamentSponsorDisplay(tournamentId);
  const tracked = useRef(new Set<string>());
  const containerRef = useRef<HTMLDivElement>(null);

  const wideSponsors = sponsorsByZone(links, 'wide_partner');

  useEffect(() => {
    if (wideSponsors.length === 0 || !containerRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        wideSponsors.forEach((l) => {
          if (!tracked.current.has(l.sponsor_id)) {
            trackImpression(l.sponsor_id, 'wide_partner', tournamentId);
            tracked.current.add(l.sponsor_id);
          }
        });
        observer.disconnect();
      }
    }, { threshold: 0.5 });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [wideSponsors, tournamentId]);

  if (wideSponsors.length === 0) return null;

  return (
    <div ref={containerRef} className="mt-16">
      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-600 mb-6">
        Tournament Partners
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {wideSponsors.slice(0, 4).map((l) => (
          <WidePartnerCard key={l.id} link={l} tournamentId={tournamentId} />
        ))}
      </div>
    </div>
  );
};

const WidePartnerCard: React.FC<{
  link: ReturnType<typeof sponsorsByZone>[number];
  tournamentId: string;
}> = ({ link, tournamentId }) => {
  const s = link.sponsor;
  const bannerUrl = link.media_overrides?.['wide_partner_banner'];

  const content = (
    <img src={bannerUrl} alt="" loading="lazy" decoding="async" className="aspect-[16/7] w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]" />
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative bg-[#0a0a0a] border border-white/5 overflow-hidden hover:border-white/10 transition-all duration-500 rounded-lg"
    >
      {link.cta_url ? (
        <a href={link.cta_url} target="_blank" rel="noopener noreferrer" onClick={() => trackClick(s.id, 'wide_partner', tournamentId)} className="block">{content}</a>
      ) : content}
    </motion.div>
  );
};
