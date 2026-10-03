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
