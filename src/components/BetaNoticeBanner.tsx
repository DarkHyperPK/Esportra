import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getWebsiteAssetUrl } from '@/lib/storage';

const DISMISSED_KEY = 'beta-notice-permanent-dismiss';

// Valorant Ascent map splash for visual flair
const VALORANT_SPLASH = 'https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/splash.png';

const BetaNoticeBanner = () => {
  // Permanently dismissed via "Don't show again" → localStorage
  // Session-dismissed via X / backdrop → React state only (resets on hard refresh / new tab)
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  });
  const [imageLoaded, setImageLoaded] = useState(false);

  // Preload the hero image so it's ready before render
  useEffect(() => {
    if (dismissed) return;
    const img = new Image();
    img.src = VALORANT_SPLASH;
    img.onload = () => setImageLoaded(true);
  }, [dismissed]);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleDontShowAgain = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={handleDismiss}>
      <div
        className="relative mx-4 w-full max-w-md border border-white/10 bg-[#0a0a0c] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.65)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero image header */}
        <div className="relative h-36 overflow-hidden bg-[#0a0a0c]">
          <img
            src={VALORANT_SPLASH}
            alt=""
            className={`w-full h-full object-cover object-center transition-opacity duration-500 ${imageLoaded ? 'opacity-50' : 'opacity-0'}`}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0c]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-transparent opacity-80" />
          {/* Logo centered on the image */}
          <div className="absolute inset-0 flex items-center justify-center">
            <img
              src={getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png')}
              alt="Esportra"
              className="h-10 drop-shadow-lg"
            />
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 border border-white/10 p-1.5 text-white/40 hover:text-white hover:border-rose-500 transition-colors z-10"
          aria-label="Dismiss beta notice"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center gap-4 px-8 pb-8 -mt-2">
          <div>
            <h2 className="font-heading text-xl font-black uppercase tracking-tight text-white mb-2">Welcome to the Beta!</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Esportra just launched and is currently in its beta phase. We understand you might encounter some issues along the way.
            </p>
          </div>

          <p className="text-white/50 text-sm leading-relaxed">
            Help us improve by reporting any problems on our Discord — we'll work to resolve them as quickly as possible.
          </p>

          <a
            href="https://discord.gg/ZMBvC5vjRF"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative mt-2 w-full flex items-center justify-center gap-2 overflow-hidden border border-white bg-white text-black font-mono text-xs font-bold uppercase tracking-wider py-3 px-6 transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
            </svg>
            Join our Discord
          </a>

          <button
            onClick={handleDontShowAgain}
            className="text-white/30 hover:text-white/60 text-xs transition-colors"
          >
            Don't show me again
          </button>
        </div>
      </div>
    </div>
  );
};

export default BetaNoticeBanner;
