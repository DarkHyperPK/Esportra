import React, { useEffect, useRef } from 'react';
import { trackClick, trackImpression } from '@/hooks/useSponsors';
import {
  useTournamentSponsorDisplay,
  sponsorsByZone,
} from '@/hooks/useTournamentSponsorDisplay';

interface Props {
  tournamentId: string;
}

export const VerticalAdPlacement: React.FC<Props> = ({ tournamentId }) => {
  const { data: links = [] } = useTournamentSponsorDisplay(tournamentId);
  const tracked = useRef(new Set<string>());
  const containerRef = useRef<HTMLDivElement>(null);

  const sidebarSponsors = sponsorsByZone(links, 'sidebar_partner');

  useEffect(() => {
    if (sidebarSponsors.length === 0 || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          sidebarSponsors.forEach((l) => {
            if (!tracked.current.has(l.sponsor_id)) {
              trackImpression(l.sponsor_id, 'sidebar_partner', tournamentId);
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
  }, [sidebarSponsors, tournamentId]);

  if (sidebarSponsors.length === 0) return null;

  return (
    <div ref={containerRef} className="mt-12 hidden lg:flex flex-col gap-8">
      {sidebarSponsors.slice(0, 2).map((l) => (
        <SidebarPartnerCard key={l.id} link={l} tournamentId={tournamentId} />
      ))}
    </div>
  );
};

const SidebarPartnerCard: React.FC<{
  link: ReturnType<typeof sponsorsByZone>[number];
  tournamentId: string;
}> = ({ link, tournamentId }) => {
  const s = link.sponsor;
  const bannerUrl = link.media_overrides?.['sidebar_partner_banner'] || s.banner_image_url;

  const content = (
    <div className="aspect-[1/2] relative overflow-hidden">
      {bannerUrl ? <img src={bannerUrl} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.02]" /> : <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black" />}
    </div>
  );

  return (
    <div className="relative group bg-[#080808] border border-white/5 overflow-hidden transition-all duration-500 hover:border-white/10">
      {link.cta_url ? <a href={link.cta_url} target="_blank" rel="noopener noreferrer" onClick={() => trackClick(s.id, 'sidebar_partner', tournamentId)} className="block">{content}</a> : content}
    </div>
  );
};
