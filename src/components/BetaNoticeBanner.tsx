import { useState } from 'react';
import { X, MessageCircle } from 'lucide-react';

const DISMISSED_KEY = 'beta-notice-dismissed';

const BetaNoticeBanner = () => {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem(DISMISSED_KEY) === 'true';
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="relative z-50 bg-gradient-to-r from-rose-600/90 via-rose-500/90 to-pink-600/90 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-2 text-sm text-white">
        <MessageCircle className="h-4 w-4 flex-shrink-0" />
        <p className="text-center">
          <span className="font-semibold">Esportra is in beta!</span>
          {' '}If you encounter any issues, please report them on our{' '}
          <a
            href="https://discord.gg/ZMBvC5vjRF"
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold hover:text-white/80 transition-colors"
          >
            Discord
          </a>
          {' '}so we can quickly resolve them.
        </p>
        <button
          onClick={handleDismiss}
          className="ml-2 p-1 rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
          aria-label="Dismiss beta notice"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default BetaNoticeBanner;
