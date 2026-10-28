import { useState, useRef, useEffect } from 'react';
import type { CatalogRankTier } from '@/types/competitive';
import { getRankIconUrl } from '@/lib/valorantRanks';

function RankBadge({ rank, game }: { rank: CatalogRankTier; game: string }) {
  const primary = rank.iconUrl || (game === 'valorant' ? getRankIconUrl(rank.sortOrder) : null);
  const fallback = game === 'valorant' ? getRankIconUrl(rank.sortOrder) : null;
  const [src, setSrc] = useState(primary);
  const [hidden, setHidden] = useState(false);
  if (hidden || !src) return null;
  return <img src={src} alt="" onError={() => {
    if (src !== fallback && fallback) setSrc(fallback);
    else setHidden(true);
  }} />;
}

export function LfgRankSelect({ label, game, ranks, value, onChange }: { label: string; game: string; ranks: CatalogRankTier[]; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = ranks.find(r => String(r.sortOrder) === value);
  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return <div className="lfg-field lfg-rank-select" ref={ref}>
    <span>{label}</span>
    <button type="button" className="lfg-input lfg-rank-trigger" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="listbox">
      {selected ? <span className="lfg-rank-option"><RankBadge rank={selected} game={game} />{selected.displayName}</span> : 'Any rank'}
    </button>
    {open && <div className="lfg-rank-list" role="listbox" aria-label={label}>
      <button type="button" role="option" className={`lfg-rank-item ${!value ? 'active' : ''}`} aria-selected={!value} onClick={() => { onChange(''); setOpen(false); }}>Any rank</button>
      {ranks.map(rank => {
        const active = String(rank.sortOrder) === value;
        return <button type="button" role="option" key={rank.id} className={`lfg-rank-item ${active ? 'active' : ''}`} aria-selected={active} onClick={() => { onChange(String(rank.sortOrder)); setOpen(false); }}>
          <RankBadge rank={rank} game={game} />{rank.displayName}
        </button>;
      })}
    </div>}
  </div>;
}
