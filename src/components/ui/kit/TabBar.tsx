import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  /** Small number next to the label (e.g. how many rows are inside). Omit when it adds nothing. */
  count?: number;
}

interface TabBarProps {
  tabs: readonly TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** Names the tab list for screen readers, e.g. "Scrim insights sections". */
  label: string;
  className?: string;
}

/** Stable ids so a tab and its panel point at each other. */
const tabId = (base: string, id: string) => `${base}-tab-${id}`;
const panelId = (base: string, id: string) => `${base}-panel-${id}`;

/**
 * A row of tabs: arrow keys move between them (wrapping), Home/End jump to the ends, only the selected tab is in the tab order.
 * On a narrow screen the row scrolls sideways instead of wrapping. Pair each tab with a `TabPanel` using the same `base`.
 */
export function TabBar({ tabs, value, onChange, label, base, className }: TabBarProps & { base: string }) {
  const list = useRef<HTMLDivElement>(null);
  // On a narrow screen the open tab may sit past the edge of the scrolling strip; bring it into view.
  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>(`[data-tab="${value}"]`);
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }, [value]);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = tabs.findIndex((t) => t.id === value);
    const last = tabs.length - 1;
    const target = event.key === 'ArrowRight' ? (index + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? last : -1;
    if (target < 0 || index < 0) return;
    event.preventDefault();
    const next = tabs[target];
    onChange(next.id);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${next.id}"]`)?.focus();
  };

  return (
    <div ref={list} role="tablist" aria-label={label} onKeyDown={onKeyDown} data-lenis-prevent
      className={cn('flex gap-1 overflow-x-auto border-b border-white/[0.08] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}>
      {tabs.map((t) => {
        const selected = t.id === value;
        return (
          <button key={t.id} type="button" role="tab" id={tabId(base, t.id)} data-tab={t.id} aria-selected={selected}
            aria-controls={panelId(base, t.id)} tabIndex={selected ? 0 : -1} onClick={() => onChange(t.id)}
            className={cn('relative inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap px-4 text-[13px] font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50',
              selected ? 'text-white' : 'text-zinc-500 hover:text-zinc-200')}>
            {t.label}
            {t.count !== undefined && <span className="rounded-none bg-white/[0.08] px-1.5 text-[11px] tabular-nums text-zinc-300">{t.count}</span>}
            {selected && <span aria-hidden className="absolute inset-x-2 -bottom-px h-0.5 bg-white" />}
          </button>
        );
      })}
    </div>
  );
}

/** The content of one tab. Only the selected panel is mounted, so a tab that is not open costs nothing. */
export function TabPanel({ base, id, value, children, className }: { base: string; id: string; value: string; children: ReactNode; className?: string }) {
  if (id !== value) return null;
  return <div role="tabpanel" id={panelId(base, id)} aria-labelledby={tabId(base, id)} tabIndex={0} className={cn('focus-visible:outline-none', className)}>{children}</div>;
}
