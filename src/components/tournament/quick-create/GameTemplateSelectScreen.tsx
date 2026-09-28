import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useTournamentTemplates } from '@/hooks/useTournamentTemplates';
import type { TournamentTemplateDto } from '@/types/tournamentTemplate';

interface Props {
  onSelect: (template: TournamentTemplateDto) => void;
  onBack: () => void;
}

export const GameTemplateSelectScreen: React.FC<Props> = ({ onSelect, onBack }) => {
  const { data: templates, isLoading, isError } = useTournamentTemplates();
  const [logoErrors, setLogoErrors] = useState<Set<string>>(new Set());

  const gameTypeBadge = (t: TournamentTemplateDto): string => {
    if (t.gameType === 'battle_royale') return 'BR';
    return t.gameType === 'bracket' ? 'Bracket' : '';
  };

  return (
    <div className="w-full">
      {/* Top bar */}
      <div className="px-6 md:px-10 lg:px-14 py-6 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="font-mono text-xs uppercase tracking-wider">Back</span>
        </button>
      </div>

      {/* Section heading */}
      <div className="px-6 md:px-10 lg:px-14 mb-8">
        <div className="font-mono text-[10px] uppercase tracking-[0.45em] text-rose-400 mb-3">
          Quick Template
        </div>
        <h1 className="font-heading text-3xl md:text-4xl font-black uppercase tracking-tight text-white">
          Select a Game
        </h1>
      </div>

      {isLoading && (
        <div className="px-6 md:px-10 lg:px-14 py-10 flex items-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-mono text-xs uppercase tracking-wider">Loading templates…</span>
        </div>
      )}

      {isError && (
        <div className="px-6 md:px-10 lg:px-14 py-10 flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">Failed to load game templates. Please try again.</span>
        </div>
      )}

      {templates && templates.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 w-full px-6 md:px-10 lg:px-14 pb-10">
          {templates.map((template) => (
            <motion.button
              key={template.id}
              type="button"
              onClick={() => onSelect(template)}
              whileHover={{
                y: -4,
                scale: 1.02,
                transition: { type: 'spring', stiffness: 380, damping: 28 },
              }}
              whileTap={{
                scale: 0.96,
                transition: { type: 'spring', stiffness: 500, damping: 30 },
              }}
              className={[
                'group relative aspect-[3/2] border border-white/10 rounded-none overflow-hidden',
                'bg-[#0a0a0a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
              ].join(' ')}
            >
              {/* Logo — stretched to fill card like a banner */}
              {template.logoUrl && !logoErrors.has(template.id) ? (
                <img
                  src={template.logoUrl}
                  alt={template.gameName}
                  className="absolute inset-0 w-full h-full object-contain p-5 group-hover:scale-[1.04] transition-transform duration-200"
                  onError={() => setLogoErrors(prev => new Set([...prev, template.id]))}
                  loading="lazy"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-6">
                  <span className="text-base font-bold uppercase tracking-tight text-white/30 text-center">
                    {template.gameName}
                  </span>
                </div>
              )}

              {/* Bottom scrim */}
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/90 to-transparent" />

              {/* Bottom label */}
              <div className="absolute bottom-0 left-0 right-0 px-3 pb-2.5">
                <span className="block font-bold text-xs uppercase tracking-wide text-white leading-tight mb-0.5">
                  {template.gameName}
                </span>
                <div className="flex items-center gap-2">
                  {gameTypeBadge(template) && (
                    <span className="font-mono text-[9px] uppercase tracking-widest text-gray-500">
                      {gameTypeBadge(template)}
                    </span>
                  )}
                  <span className="font-mono text-[9px] uppercase tracking-widest text-gray-500">
                    Bo{template.defaultBestOf}
                  </span>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};
