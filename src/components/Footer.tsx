import { Link } from "react-router-dom";
import { Twitter, Instagram, Facebook, Github } from "lucide-react";
import { getWebsiteAssetUrl } from "@/lib/storage";

const Footer = () => {
  return (
    <footer className="overflow-hidden border-t border-white/10 bg-[#0a0a0c] pb-12 pt-24">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 lg:gap-24 mb-24">

          {/* Brand Col */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-block mb-8">
              <img
                src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
                alt="eSPORTRA"
                className="h-10 opacity-90"
              />
            </Link>
            <p className="text-white/40 font-light leading-relaxed mb-8 max-w-xs">
              Elevating the digital arena. We're building the infrastructure for the next generation of competitive excellence.
            </p>
            <div className="flex gap-5">
              {[
                { Icon: Twitter, href: '#' },
                { Icon: Instagram, href: '#' },
                { Icon: Facebook, href: '#' },
                { Icon: Github, href: '#' },
              ].map(({ Icon, href }, i) => (
                <a key={i} href={href} className="text-white/30 transition-colors duration-300 hover:text-white">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
              <a href="https://discord.gg/ZMBvC5vjRF" target="_blank" rel="noopener noreferrer" className="text-white/30 transition-colors duration-300 hover:text-white" aria-label="Discord">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Links Col 1: Resources (merged System + Resources) */}
          <div>
            <h4 className="mb-10 font-mono text-sm font-bold uppercase tracking-[0.2em] text-white">Resources</h4>
            <ul className="space-y-4">
              {[
                { label: 'Tournaments', to: '/tournaments' },
                { label: 'Venues', to: '/venues' },
                { label: 'Help Centre', to: '/help' },
                { label: 'Be a Partner', to: '/be-a-partner' },
                { label: 'FAQ', to: '/about/faq' },
              ].map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-white/50 transition-colors duration-300 hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Col 2: Company */}
          <div className="relative">
            <h4 className="mb-10 font-mono text-sm font-bold uppercase tracking-[0.2em] text-white">Company</h4>
            <ul className="space-y-4">
              {[
                { label: 'About', to: '/about' },
                { label: 'Privacy', to: '/privacy' },
                { label: 'Contact', to: '/contact' },
                { label: 'Terms', to: '/terms' },
                { label: 'Refund Policy', to: '/refund-policy' },
              ].map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-white/50 transition-colors duration-300 hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Subtle bottom-right accent */}
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-center justify-between gap-6 border-t border-white/10 pt-12 md:flex-row">
          <p className="text-white/20 text-xs font-light tracking-widest uppercase">
            © {new Date().getFullYear()} eSPORTRA. All rights reserved.
          </p>
          <div className="flex items-center gap-8">
            <span className="text-[10px] text-white/10 tracking-[0.3em] uppercase hidden md:block">Esports. Elevated.</span>
            <div className="flex items-center gap-2 border border-white/10 bg-white/[0.02] px-3 py-1">
              <div className="h-1.5 w-1.5 animate-pulse bg-rose-500" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">Protocol Active</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
