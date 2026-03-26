import React, { useEffect, useRef } from 'react';
import { trackImpression, trackClick } from '@/hooks/useSponsors';
import {
  useTournamentSponsorDisplay,
  sponsorsByZone,
} from '@/hooks/useTournamentSponsorDisplay';

interface Props {
  tournamentId: string;
}

/**
 * Auto-scrolling ticker of sponsor logos for the "ticker" placement zone.
 * Uses CSS animation for smooth infinite scroll.
 */
export const TournamentSponsorTicker: React.FC<Props> = ({ tournamentId }) => {
  const { data: links = [] } = useTournamentSponsorDisplay(tournamentId);
  const tracked = useRef(new Set<string>());

  const tickerSponsors = sponsorsByZone(links, 'ticker');

  useEffect(() => {
    tickerSponsors.forEach((l) => {
      if (!tracked.current.has(l.sponsor_id)) {
        trackImpression(l.sponsor_id, tournamentId);
        tracked.current.add(l.sponsor_id);
      }
    });
  }, [links, tournamentId]);

  if (tickerSponsors.length === 0) return null;

  // Double the items for seamless infinite scroll
  const items = [...tickerSponsors, ...tickerSponsors];

  return (
    <div className="relative overflow-hidden border-t border-white/5 bg-[#050505]/80 backdrop-blur-sm py-4">
      <div className="flex items-center animate-ticker gap-12 w-max">
        {items.map((l, i) => {
          const s = l.sponsor;
          return (
            <a
              key={`${l.id}-${i}`}
              href={s.website_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick(s.id, tournamentId)}
              className="flex items-center gap-3 shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            >
              {s.logo_url ? (
                <img
                  src={s.logo_url}
                  alt={s.name}
                  className="h-5 w-auto object-contain grayscale hover:grayscale-0 transition-all"
                />
              ) : (
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  {s.name}
                </span>
              )}
            </a>
          );
        })}
      </div>

      {/* Fade edges */}
      <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#050505] to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#050505] to-transparent pointer-events-none" />
    </div>
  );
};
