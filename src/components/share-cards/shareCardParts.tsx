import type { CSSProperties, ReactNode } from 'react';
import { crestTint } from '@/components/bracket/teamTint';
import { DISPLAY, HAIR, LOGO_URL, MONO, PANEL, ROSE } from './shareCardTheme';

/** A wide mono caption, the house eyebrow. */
export function Caption({ children, size = 14, color = '#A1A1AA', spacing = '0.28em', style }: {
    children: ReactNode; size?: number; color?: string; spacing?: string; style?: CSSProperties;
}) {
    return <span style={{ ...MONO, fontSize: size, letterSpacing: spacing, color, ...style }}>{children}</span>;
}

/** The team's crest: its logo, or initials in the team's own colour. */
export function Crest({ name, logo, size, dim = false }: { name: string; logo?: string; size: number; dim?: boolean }) {
    const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase() || '?';
    return (
        <div
            style={{
                ...(logo ? { background: PANEL, boxShadow: `inset 0 0 0 1px ${HAIR}` } : crestTint(name)),
                width: size, height: size, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: dim ? 0.55 : 1,
            }}
        >
            {logo ? (
                <img src={logo} crossOrigin="anonymous" alt="" style={{ width: '78%', height: '78%', objectFit: 'contain' }} />
            ) : (
                <span style={{ ...DISPLAY, fontWeight: 800, fontSize: size * 0.36 }}>{initials}</span>
            )}
        </div>
    );
}

/** The cue light: a short rose bar. Used once per card. */
export const Cue = ({ width = 96, style }: { width?: number; style?: CSSProperties }) => (
    <div style={{ width, height: 4, background: ROSE, ...style }} />
);

export const Wordmark = ({ height = 34 }: { height?: number }) => (
    <img src={LOGO_URL} crossOrigin="anonymous" alt="Esportra" style={{ height, width: 'auto', objectFit: 'contain' }} />
);
