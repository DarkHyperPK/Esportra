import { useState, useRef, useEffect } from 'react';
import type { CatalogRankTier } from '@/types/competitive';
import { getRankIconUrl } from '@/lib/valorantRanks';

export function LfgRankSelect({ label, game, ranks, value, onChange }: { label: string; game: string; ranks: CatalogRankTier[]; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = ranks.find(r => String(r.sortOrder) === value);
  const selectedIcon = selected ? (selected.iconUrl || (game === 'valorant' ? getRankIconUrl(selected.sortOrder) : null)) : null;
  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  return <div className="lfg-field lfg-rank-select" ref={ref}>
    <span>{label}</span>
    <button type="button" className="lfg-input lfg-rank-trigger" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="listbox">
      {selected ? <span className="lfg-rank-option">{selectedIcon && <img src={selectedIcon} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />}{selected.displayName}</span> : 'Any rank'}
    </button>
    {open && <div className="lfg-rank-list" role="listbox" aria-label={label}>
      <button type="button" role="option" className={`lfg-rank-item ${!value ? 'active' : ''}`} aria-selected={!value} onClick={() => { onChange(''); setOpen(false); }}>Any rank</button>
      {ranks.map(rank => {
        const icon = rank.iconUrl || (game === 'valorant' ? getRankIconUrl(rank.sortOrder) : null);
        const active = String(rank.sortOrder) === value;
        return <button type="button" role="option" key={rank.id} className={`lfg-rank-item ${active ? 'active' : ''}`} aria-selected={active} onClick={() => { onChange(String(rank.sortOrder)); setOpen(false); }}>
          {icon && <img src={icon} alt="" onError={e => { e.currentTarget.style.display = 'none'; }} />}{rank.displayName}
        </button>;
      })}
    </div>}
  </div>;
}
