import React, { useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';
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
  const logoUrl = link.media_overrides?.['sidebar_partner_logo'] || s.logo_url;

  const content = (
    <>
      <div className="absolute top-3 left-3 z-20">
        <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-[8px] font-mono uppercase tracking-widest text-zinc-400">Official Partner</span>
      </div>
      <div className="aspect-[1/2] relative overflow-hidden">
        {bannerUrl ? <img src={bannerUrl} alt={s.name} loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all [transition-duration:1500ms]" /> : <div className="absolute inset-0 bg-gradient-to-b from-zinc-900 to-black" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
        <div className="absolute bottom-6 left-6 right-6 z-20">
          {logoUrl && <img src={logoUrl} alt={s.name} loading="lazy" decoding="async" className="h-8 w-auto object-contain mb-3" />}
          <p className="text-white font-bold text-sm group-hover:text-rose-400 transition-colors">{link.headline || s.name}</p>
        </div>
      </div>
      <div className="p-5 bg-zinc-950/50 border-t border-white/5">
        {s.tagline && <p className="text-gray-500 text-xs mb-4 font-light line-clamp-2">{s.tagline}</p>}
        {link.cta_url && <div className="flex items-center gap-2 text-[10px] font-mono text-white hover:text-rose-400 transition-colors"><span>{link.cta_text || 'Learn more'}</span><ChevronRight className="w-3 h-3" /></div>}
      </div>
    </>
  );

  return (
    <div className="relative group bg-[#080808] border border-white/5 overflow-hidden transition-all duration-500 hover:border-white/10">
      {link.cta_url ? <a href={link.cta_url} target="_blank" rel="noopener noreferrer" onClick={() => trackClick(s.id, 'sidebar_partner', tournamentId)} className="block">{content}</a> : content}
    </div>
  );
};
