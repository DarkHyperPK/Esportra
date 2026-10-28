import { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';
import type { CatalogRankTier } from '@/types/competitive';
import { getRankIconUrl } from '@/lib/valorantRanks';
import { useValorantTiers } from '@/hooks/useValorantCatalog';

function RankBadge({ rank, game, liveIcon }: { rank: CatalogRankTier; game: string; liveIcon?: string }) {
  const primary = game === 'valorant' ? liveIcon || getRankIconUrl(rank.sortOrder) : rank.iconUrl;
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
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = ranks.find(r => String(r.sortOrder) === value);
  const tiers = useValorantTiers(game === 'valorant');
  const badge = (rank: CatalogRankTier) => {
    const tier = tiers.data?.[rank.sortOrder + 3];
    const liveIcon = tier?.smallIcon || tier?.largeIcon;
    return <RankBadge key={`${game}:${rank.id}:${rank.sortOrder}:${rank.iconUrl}:${liveIcon}`} rank={rank} game={game} liveIcon={liveIcon} />;
  };
  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  useEffect(() => {
    const list = listRef.current;
    if (!open || !list) return;
    const wheel = (event: WheelEvent) => {
      if (list.scrollHeight <= list.clientHeight) return;
      event.preventDefault();
      list.scrollTop += event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? list.clientHeight : 1);
    };
    list.addEventListener('wheel', wheel, { passive: false });
    return () => list.removeEventListener('wheel', wheel);
  }, [open]);
  function openWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'Escape' && open) { event.preventDefault(); setOpen(false); return; }
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    setOpen(true);
    requestAnimationFrame(() => listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]')?.focus());
  }
  function listKeys(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const options = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
    const current = options.indexOf(document.activeElement as HTMLButtonElement);
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : Math.max(0, Math.min(options.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1)));
    options[index]?.focus();
    options[index]?.scrollIntoView({ block: 'nearest' });
  }
  function choose(next: string) { onChange(next); setOpen(false); triggerRef.current?.focus(); }
  return <div className="lfg-field lfg-rank-select" ref={ref}>
    <span>{label}</span>
    <button ref={triggerRef} type="button" className="lfg-input lfg-rank-trigger" aria-label={label} onKeyDown={openWithKeyboard} onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="listbox">
      {selected ? <span className="lfg-rank-option">{badge(selected)}{selected.displayName}</span> : 'Any rank'}
    </button>
    {open && <div ref={listRef} className="lfg-rank-list" role="listbox" aria-label={label} onKeyDown={listKeys}>
      <button type="button" role="option" className={`lfg-rank-item ${!value ? 'active' : ''}`} aria-selected={!value} onClick={() => choose('')}>Any rank</button>
      {ranks.map(rank => {
        const active = String(rank.sortOrder) === value;
        return <button type="button" role="option" key={rank.id} className={`lfg-rank-item ${active ? 'active' : ''}`} aria-selected={active} onClick={() => choose(String(rank.sortOrder))}>
          {badge(rank)}{rank.displayName}
        </button>;
      })}
    </div>}
  </div>;
}
