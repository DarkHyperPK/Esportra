import React, { useState, useRef, useEffect, useMemo } from 'react';
import { X, Gamepad2 } from 'lucide-react';
import { useGameCatalog } from '@/hooks/useGameCatalog';
import { listCatalogGames } from '@/utils/gameFeatures';

interface Game {
  name: string;
  slug: string;
  logo: string;
  category: string;
}

interface GamesPickerProps {
  /** Comma-separated game names string */
  value: string;
  /** Called with updated comma-separated string */
  onChange: (value: string) => void;
  className?: string;
}

const GamesPicker: React.FC<GamesPickerProps> = ({ value, onChange, className }) => {
  const { data: catalogData } = useGameCatalog();
  const allGames = useMemo(
    () => (catalogData?.games ?? listCatalogGames()).map((game) => ({
      name: game.name,
      slug: game.slug,
      logo: game.logo,
      category: game.category,
    })),
    [catalogData],
  );

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedNames = useMemo(() =>
    value ? value.split(',').map(s => s.trim()).filter(Boolean) : [],
    [value]
  );

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return allGames;
    const q = query.toLowerCase();
    return allGames.filter(g => g.name.toLowerCase().includes(q) || g.slug.includes(q));
  }, [allGames, query]);

  const isSelected = (name: string) => selectedNames.some(s => s.toLowerCase() === name.toLowerCase());

  const toggleGame = (game: Game) => {
    let updated: string[];
    if (isSelected(game.name)) {
      updated = selectedNames.filter(s => s.toLowerCase() !== game.name.toLowerCase());
    } else {
      updated = [...selectedNames, game.name];
    }
    onChange(updated.join(', '));
    setQuery('');
  };

  const removeGame = (name: string) => {
    const updated = selectedNames.filter(s => s.toLowerCase() !== name.toLowerCase());
    onChange(updated.join(', '));
  };

  const getGameLogo = (name: string): string | undefined => {
    return allGames.find(g => g.name.toLowerCase() === name.toLowerCase())?.logo;
  };

  return (
    <div ref={wrapperRef} className={`relative ${className || ''}`}>
      {/* Selected tags + search input */}
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-[40px] px-2.5 py-1.5 rounded-md bg-black/30 border border-white/10 cursor-text focus-within:border-rose-500/50 transition-colors"
        onClick={() => { inputRef.current?.focus(); setIsOpen(true); }}
      >
        {selectedNames.map(name => {
          const logo = getGameLogo(name);
          return (
            <span key={name} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs text-white">
              {logo && <img src={logo} alt="" className="w-4 h-4 rounded-sm object-contain" />}
              {name}
              <button type="button" onClick={e => { e.stopPropagation(); removeGame(name); }}
                className="text-zinc-500 hover:text-white transition-colors ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          );
        })}
        <div className="relative flex-1 min-w-[120px]">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedNames.length === 0 ? 'Search games...' : 'Add more...'}
            className="w-full h-7 bg-transparent text-white text-sm placeholder:text-zinc-600 outline-none"
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto overscroll-contain rounded-xl bg-[#0a0a0c] border border-white/10 shadow-xl" data-lenis-prevent>
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-sm text-zinc-500">
              <Gamepad2 className="w-5 h-5 mx-auto mb-1 opacity-50" />
              No games found
            </div>
          ) : (
            filtered.map(game => {
              const selected = isSelected(game.name);
              return (
                <button
                  key={game.slug}
                  type="button"
                  onClick={() => toggleGame(game)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-colors ${selected ? 'bg-rose-500/10' : ''}`}
                >
                  <img src={game.logo} alt={game.name} className="w-8 h-8 rounded-lg object-contain bg-black/30 p-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{game.name}</div>
                    <div className="text-xs text-zinc-500">{game.category}</div>
                  </div>
                  {selected && (
                    <span className="text-xs text-rose-400 font-medium px-2 py-0.5 rounded-full bg-rose-500/10">Selected</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default GamesPicker;
