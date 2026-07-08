import React, { useState, useRef, useEffect } from 'react';
import { MapPin, X, Loader2 } from 'lucide-react';

interface LocationResult {
  display_name: string;
  city: string;
  state: string;
  country: string;
}

interface CitySearchProps {
  city: string;
  state: string;
  country: string;
  onSelect: (city: string, state: string, country: string) => void;
  className?: string;
}

// Debounce helper
function useDebounce(value: string, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const CitySearch: React.FC<CitySearchProps> = ({ city, state, country, onSelect, className }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 350);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch results from Nominatim
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) { setResults([]); return; }
    let cancelled = false;
    const search = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(debouncedQuery)}&addressdetails=1&limit=6&featuretype=city`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await res.json();
        if (cancelled) return;
        const mapped: LocationResult[] = data.map((r: any) => ({
          display_name: r.display_name,
          city: r.address?.city || r.address?.town || r.address?.village || r.address?.municipality || r.name || '',
          state: r.address?.state || r.address?.province || r.address?.region || '',
          country: r.address?.country || '',
        }));
        // Deduplicate by city+country
        const seen = new Set<string>();
        setResults(mapped.filter(r => {
          const key = `${r.city}|${r.country}`;
          if (seen.has(key) || !r.city) return false;
          seen.add(key);
          return true;
        }));
      } catch { /* non-critical */ }
      if (!cancelled) setLoading(false);
    };
    search();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const handleSelect = (result: LocationResult) => {
    onSelect(result.city, result.state, result.country);
    setQuery('');
    setIsOpen(false);
  };

  const handleClear = () => {
    onSelect('', '', '');
    setQuery('');
  };

  const hasValue = !!city;
  const displayValue = hasValue
    ? [city, state, country].filter(Boolean).join(', ')
    : '';

  return (
    <div ref={wrapperRef} className={`relative ${className || ''}`}>
      {hasValue ? (
        <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-black/30 border border-white/10 text-sm">
          <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="flex-1 truncate text-white">{displayValue}</span>
          <button type="button" onClick={handleClear} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
          <input
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setIsOpen(true); }}
            onFocus={() => query.length >= 2 && setIsOpen(true)}
            placeholder="Search city..."
            className="w-full h-10 pl-9 pr-8 rounded-md bg-black/30 border border-white/10 text-white text-sm placeholder:text-zinc-600 outline-none focus:border-rose-500/50 transition-colors"
          />
          {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 animate-spin" />}
        </div>
      )}

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-52 overflow-y-auto overscroll-contain rounded-xl bg-[#0a0a0c] border border-white/10 shadow-xl" data-lenis-prevent>
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(r)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-sm hover:bg-white/5 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-white font-medium">{r.city}</span>
                {r.state && <span className="text-zinc-500">, {r.state}</span>}
                <span className="text-zinc-600">, {r.country}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CitySearch;
