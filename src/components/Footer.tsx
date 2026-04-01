import { Link } from "react-router-dom";
import { Twitter, Instagram, Facebook, Linkedin, Mail, Github } from "lucide-react";
import { getWebsiteAssetUrl } from "@/lib/storage";

const Footer = () => {
  return (
    <footer className="bg-[#0a0a0a] border-t border-white/5 pt-24 pb-12 overflow-hidden">
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
                <a key={i} href={href} className="text-white/20 hover:text-white transition-colors duration-300">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
              <a href="https://discord.gg/ZMBvC5vjRF" target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-[#5865F2] transition-colors duration-300" aria-label="Discord">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Links Col 1: Resources (merged System + Resources) */}
          <div>
            <h4 className="text-white text-sm font-medium tracking-[0.2em] uppercase mb-10">Resources</h4>
            <ul className="space-y-4">
              {[
                { label: 'Tournaments', to: '/tournaments' },
                { label: 'Venues', to: '/venues' },
                { label: 'Help Centre', to: '/help' },
                { label: 'Be a Partner', to: '/be-a-partner' },
                { label: 'FAQ', to: '/about/faq' },
              ].map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className="text-white/40 hover:text-white font-light transition-all duration-300">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Col 2: Company */}
          <div className="relative">
            <h4 className="text-white text-sm font-medium tracking-[0.2em] uppercase mb-10">Company</h4>
            <ul className="space-y-4">
              {['About', 'Privacy', 'Contact', 'Terms'].map((link) => (
                <li key={link}>
                  <Link to={`/${link.toLowerCase()}`} className="text-white/40 hover:text-white font-light transition-all duration-300">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Subtle bottom-right accent */}
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-white/20 text-xs font-light tracking-widest uppercase">
            © {new Date().getFullYear()} eSPORTRA. All rights reserved.
          </p>
          <div className="flex items-center gap-8">
            <span className="text-[10px] text-white/10 tracking-[0.3em] uppercase hidden md:block">Esports. Elevated.</span>
            <div className="flex items-center gap-2 px-3 py-1 bg-white/[0.02] border border-white/5 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-white/40 uppercase tracking-widest">Protocol Active</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
