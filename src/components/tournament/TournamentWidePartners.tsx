import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
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

  const wideSponsors = sponsorsByZone(links, 'wide_partner');

  useEffect(() => {
    wideSponsors.forEach((l) => {
      if (!tracked.current.has(l.sponsor_id)) {
        trackImpression(l.sponsor_id, 'wide_partner', tournamentId);
        tracked.current.add(l.sponsor_id);
      }
    });
  }, [wideSponsors, tournamentId]);

  if (wideSponsors.length === 0) return null;

  return (
    <div className="mt-16">
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
  const logoUrl = link.media_overrides?.['wide_partner_logo'] || s.logo_url;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative bg-[#0a0a0a] border border-white/5 overflow-hidden hover:border-white/10 transition-all duration-500 rounded-lg"
    >
      <a
        href={s.website_url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackClick(s.id, 'wide_partner', tournamentId)}
        className="block p-5"
      >
        <div className="absolute top-3 right-3">
          <span className="text-[8px] font-mono uppercase tracking-widest text-zinc-600 bg-white/5 px-2 py-0.5 rounded">
            Sponsored
          </span>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[120px] gap-3">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={s.name}
              loading="lazy"
              decoding="async"
              className="h-10 w-auto object-contain opacity-70 group-hover:opacity-100 transition-opacity"
            />
          )}
          <span className="text-lg font-medium text-zinc-400 group-hover:text-white transition-colors text-center">
            {s.name}
          </span>
          {s.tagline && (
            <p className="text-xs text-zinc-600 text-center line-clamp-1">{s.tagline}</p>
          )}
        </div>

        <div className="flex items-center justify-center gap-1 mt-3 text-[10px] text-zinc-600 group-hover:text-zinc-400 transition-colors">
          <span>{s.cta_text || 'Learn more'}</span>
          <ExternalLink className="w-3 h-3" />
        </div>
      </a>
    </motion.div>
  );
};
