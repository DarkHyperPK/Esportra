import type { CSSProperties } from 'react';
import { getWebsiteAssetUrl } from '@/lib/storage';

/**
 * Share cards are exported to PNG at their native size, so they use fixed pixel
 * sizes and inline font stacks instead of responsive classes.
 */
export const DISPLAY: CSSProperties = { fontFamily: 'Poppins, system-ui, sans-serif', letterSpacing: '-0.02em', lineHeight: 1 };
export const BODY: CSSProperties = { fontFamily: 'Inter, system-ui, sans-serif' };
export const MONO: CSSProperties = {
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    fontWeight: 700,
    textTransform: 'uppercase',
};

export const STAGE = '#09090B';
export const PANEL = '#111114';
export const HAIR = 'rgba(255,255,255,0.08)';
export const MUTED = '#71717A';
export const ROSE = '#F43F5E';

export const LOGO_URL = getWebsiteAssetUrl('eSportra-Logo/eSPORTRA-white-transparent.png');

export const MATCH_CARD_SIZE = { width: 1920, height: 1080 };
export const PLAYER_CARD_SIZE = { width: 1080, height: 1350 };

/** A team's own colour as hex: the given one, or a stable hue from its name. */
export function teamAccent(name: string, given?: string | null): string {
    if (given && /^#[0-9a-f]{6}$/i.test(given)) return given;
    let hash = 0x811c9dc5;
    for (let i = 0; i < name.length; i += 1) {
        hash ^= name.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hslToHex(Math.round((hash % 997) * 137.508) % 360, 62, 52);
}

function hslToHex(h: number, s: number, l: number): string {
    const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
        return Math.round(c * 255).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

/** "#rrggbb" plus alpha as rgba(). */
export function rgba(hex: string, alpha: number): string {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
