import React, { useEffect, useRef } from 'react';
import { trackImpression, trackClick } from '@/hooks/useSponsors';
import {
  useTournamentSponsorDisplay,
  sponsorsByZone,
} from '@/hooks/useTournamentSponsorDisplay';

interface Props {
  tournamentId: string;
}

export const TournamentPartnerLogos: React.FC<Props> = ({ tournamentId }) => {
  const { data: links = [] } = useTournamentSponsorDisplay(tournamentId);
  const tracked = useRef(new Set<string>());
  const containerRef = useRef<HTMLDivElement>(null);

  const logoSponsors = sponsorsByZone(links, 'partner_logo');

  useEffect(() => {
    if (logoSponsors.length === 0 || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          logoSponsors.forEach((l) => {
            if (!tracked.current.has(l.sponsor_id)) {
              trackImpression(l.sponsor_id, 'partner_logo', tournamentId);
              tracked.current.add(l.sponsor_id);
            }
          });
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [logoSponsors, tournamentId]);

  if (logoSponsors.length === 0) return null;

  return (
    <div ref={containerRef} className="mt-10 pt-8 border-t border-white/5">
      <div className="flex items-center justify-center gap-8 flex-wrap">
        {logoSponsors.slice(0, 4).map((link) => {
          const logoUrl = link.media_overrides?.['partner_logo_logo'] || link.sponsor.logo_url;
          if (!logoUrl) return null;
          const image = <img src={logoUrl} alt={link.sponsor.name} loading="lazy" decoding="async" className="h-32 w-auto object-contain" />;
          return link.cta_url ? <a key={link.id} href={link.cta_url} target="_blank" rel="noopener noreferrer" onClick={() => trackClick(link.sponsor.id, 'partner_logo', tournamentId)} className="group">{image}</a> : <div key={link.id} className="group">{image}</div>;
        })}
      </div>
    </div>
  );
};
