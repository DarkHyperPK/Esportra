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

/**
 * Sidebar sponsor ads for tournament pages.
 * Renders sponsors assigned to the "sidebar" placement zone.
 */
export const TournamentSponsorSidebar: React.FC<Props> = ({ tournamentId }) => {
  const { data: links = [] } = useTournamentSponsorDisplay(tournamentId);
  const tracked = useRef(new Set<string>());

  const sidebarSponsors = sponsorsByZone(links, 'sidebar');

  useEffect(() => {
    sidebarSponsors.forEach((l) => {
      if (!tracked.current.has(l.sponsor_id)) {
        trackImpression(l.sponsor_id, tournamentId);
        tracked.current.add(l.sponsor_id);
      }
    });
  }, [sidebarSponsors, tournamentId]);

  if (sidebarSponsors.length === 0) return null;

  return (
    <div className="mt-12 space-y-6">
      <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-600">
        Tournament Sponsors
      </p>
      {sidebarSponsors.slice(0, 3).map((l) => (
        <SidebarCard key={l.id} link={l} tournamentId={tournamentId} />
      ))}
    </div>
  );
};

const SidebarCard: React.FC<{
  link: ReturnType<typeof sponsorsByZone>[number];
  tournamentId: string;
}> = ({ link, tournamentId }) => {
  const s = link.sponsor;
  const ref = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="group relative bg-[#080808] border border-white/5 overflow-hidden hover:border-white/10 transition-all duration-500"
    >
      <a
        href={s.website_url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackClick(s.id, tournamentId)}
        className="block"
      >
        {/* Banner */}
        {s.banner_image_url && (
          <div className="relative h-32 overflow-hidden">
            <img
              src={s.banner_image_url}
              alt={s.name}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#080808] via-transparent to-transparent" />
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            {s.logo_url && (
                <img
                  src={s.logo_url}
                  alt={s.name}
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                  className="h-5 w-auto object-contain"
                />
            )}
            <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">
              {link.sponsor_type.replace('_', ' ')}
            </span>
          </div>
          {s.tagline && (
            <p className="text-sm font-medium text-white mb-1 group-hover:text-rose-400 transition-colors">
              {s.tagline}
            </p>
          )}
          <div className="flex items-center gap-1 text-[10px] text-zinc-600 group-hover:text-zinc-400 transition-colors">
            <span>{s.cta_text}</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        </div>
      </a>
    </motion.div>
  );
};
