import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { trackImpression, trackClick } from '@/hooks/useSponsors';
import {
  useTournamentSponsorDisplay,
  sponsorsByZone,
  titleSponsor,
  type TournamentSponsorLink,
} from '@/hooks/useTournamentSponsorDisplay';

interface Props {
  tournamentId: string;
}

/**
 * Renders a co-branding banner at the top of a tournament page.
 * Shows the title sponsor prominently, plus any sponsors assigned to the "header" zone.
 */
export const TournamentSponsorBanner: React.FC<Props> = ({ tournamentId }) => {
  const { data: links = [] } = useTournamentSponsorDisplay(tournamentId);
  const tracked = useRef(new Set<string>());

  const title = titleSponsor(links);
  const headerSponsors = sponsorsByZone(links, 'header').filter(
    (l) => l.sponsor_id !== title?.sponsor_id
  );

  // Track impressions once
  useEffect(() => {
    const all = title ? [title, ...headerSponsors] : headerSponsors;
    all.forEach((l) => {
      if (!tracked.current.has(l.sponsor_id)) {
        trackImpression(l.sponsor_id, tournamentId);
        tracked.current.add(l.sponsor_id);
      }
    });
  }, [links, tournamentId]);

  if (!title && headerSponsors.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-20 border-b border-white/5"
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Title Sponsor */}
        {title && (
          <SponsorPill link={title} tournamentId={tournamentId} isTitle />
        )}

        {/* Other header sponsors */}
        {headerSponsors.length > 0 && (
          <div className="flex items-center gap-3 overflow-x-auto scrollbar-none">
            {headerSponsors.map((l) => (
              <SponsorPill key={l.id} link={l} tournamentId={tournamentId} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

/** Small sponsor chip used inside the banner */
const SponsorPill: React.FC<{
  link: TournamentSponsorLink;
  tournamentId: string;
  isTitle?: boolean;
}> = ({ link, tournamentId, isTitle }) => {
  const s = link.sponsor;
  return (
    <a
      href={s.website_url || '#'}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackClick(s.id, tournamentId)}
      className="flex items-center gap-2 shrink-0 group"
    >
      {isTitle && (
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mr-1">
          Powered by
        </span>
      )}
      {s.logo_url && (
        <img
          src={s.logo_url}
          alt={s.name}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className="h-6 w-auto object-contain"
        />
      )}
      <span
        className={`text-sm font-bold transition-colors ${
          isTitle ? 'text-white group-hover:text-rose-400' : 'text-zinc-400 group-hover:text-white'
        }`}
      >
        {s.name}
      </span>
      <ExternalLink className="w-3 h-3 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
};
