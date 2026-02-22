import { Link } from "react-router-dom";
import { Twitter, Instagram, Facebook, Linkedin, Mail, Github } from "lucide-react";
import { getWebsiteAssetUrl } from "@/lib/storage";

const Footer = () => {
  return (
    <footer className="bg-[#0a0a0a] border-t border-white/5 pt-24 pb-12 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 lg:gap-24 mb-24">

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
              {[Twitter, Instagram, Facebook, Github].map((Icon, i) => (
                <a key={i} href="#" className="text-white/20 hover:text-white transition-colors duration-300">
                  <Icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Col 1: Platform */}
          <div>
            <h4 className="text-white text-sm font-medium tracking-[0.2em] uppercase mb-10">System</h4>
            <ul className="space-y-4">
              {['Venues', 'Tournaments'].map((link) => (
                <li key={link}>
                  <Link to={`/${link.toLowerCase()}`} className="text-white/40 hover:text-white font-light transition-all duration-300">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Col 2: Resources */}
          <div>
            <h4 className="text-white text-sm font-medium tracking-[0.2em] uppercase mb-10">Resources</h4>
            <ul className="space-y-4">
              {['For Organizers', 'For Venues', 'FAQ'].map((link) => (
                <li key={link}>
                  <Link to={`/${link.toLowerCase().replace(' ', '-')}`} className="text-white/40 hover:text-white font-light transition-all duration-300">
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links Col 3: Company */}
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
