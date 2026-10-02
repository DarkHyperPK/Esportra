import type { CSSProperties } from 'react';

/** A stable hue per team, so a team keeps its colour everywhere it appears. */
export function teamHue(key: string): number {
    // FNV-1a, then the golden angle so similar ids still land far apart on the wheel.
    let hash = 0x811c9dc5;
    for (let i = 0; i < key.length; i += 1) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return Math.round((hash % 997) * 137.508) % 360;
}

/** Team colour lives inside the team's own frame (crest well), never in our chrome. */
export const crestTint = (key: string): CSSProperties => {
    const hue = teamHue(key);
    return {
        backgroundColor: `hsl(${hue} 42% 19%)`,
        color: `hsl(${hue} 85% 82%)`,
        boxShadow: `inset 0 0 0 1px hsl(${hue} 55% 45% / 0.45)`,
    };
};

/** A soft glow in the champion's colour, behind their crest on the champion seat. */
export const championGlow = (key: string) => `hsl(${teamHue(key)} 70% 50% / 0.32)`;
