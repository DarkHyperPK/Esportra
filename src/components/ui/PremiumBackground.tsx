import React from 'react';

/**
 * PremiumBackground - Subtle iridescent noise gradient background
 * Creates a premium, "expensive" feel with slow drift animation
 * 
 * Usage: Wrap your page content with this component
 * 
 * Features:
 * - Iridescent gradient overlay (purple/blue/cyan tints)
 * - Subtle noise texture
 * - Very slow drift animation (45s loop)
 * - No heavy WebGL, pure CSS
 */

interface PremiumBackgroundProps {
    children: React.ReactNode;
    /** Enable slow drift animation (default: true for landing, false for dashboard) */
    animated?: boolean;
    /** Intensity of the gradient (0-1, default: 0.15) */
    intensity?: number;
    className?: string;
}

const PremiumBackground: React.FC<PremiumBackgroundProps> = ({
    children,
    animated = false,
    intensity = 0.15,
    className = ''
}) => {
    return (
        <div className={`relative min-h-screen ${className}`}>
            {/* Base dark background */}
            <div className="fixed inset-0 bg-[#050507] -z-30" />

            {/* Iridescent gradient layer */}
            <div
                className={`fixed inset-0 -z-20 ${animated ? 'animate-premium-drift' : ''}`}
                style={{
                    background: `
            radial-gradient(ellipse 80% 50% at 20% 40%, rgba(120, 80, 200, ${intensity}) 0%, transparent 50%),
            radial-gradient(ellipse 60% 40% at 80% 20%, rgba(60, 140, 200, ${intensity * 0.8}) 0%, transparent 45%),
            radial-gradient(ellipse 50% 60% at 50% 80%, rgba(40, 180, 180, ${intensity * 0.6}) 0%, transparent 40%),
            radial-gradient(ellipse 100% 100% at 50% 50%, rgba(20, 15, 35, 1) 0%, rgba(5, 5, 7, 1) 70%)
          `
                }}
            />

            {/* Noise texture overlay */}
            <div
                className="fixed inset-0 -z-10 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'repeat',
                    backgroundSize: '128px 128px'
                }}
            />

            {/* Content */}
            <div className="relative z-0">
                {children}
            </div>
        </div>
    );
};

export default PremiumBackground;
