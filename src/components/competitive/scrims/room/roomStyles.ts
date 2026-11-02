/** Shared class tokens for the scrim room panels. */
export const ROOM_EYEBROW = 'font-mono text-[10px] tracking-[0.28em] text-zinc-500 uppercase';
export const ROOM_PANEL = 'border border-white/[0.08] bg-white/[0.03] p-4 space-y-3';
export const ROOM_GHOST =
  'text-[13px] border border-white/[0.08] text-white/55 hover:text-white rounded-none px-4 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40';
export const ROOM_FIELD =
  'h-10 w-full border border-white/10 bg-black/30 px-3 text-[14px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/30 transition-colors';

/** Faint hairline grid used behind scrim headers; masked so it fades at the edges. */
export const GRID_TEXTURE_STYLE = {
  backgroundImage:
    'linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)',
  backgroundSize: '48px 48px',
  maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
} as const;
