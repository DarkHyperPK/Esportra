import React from 'react';
import { motion } from 'framer-motion';
import { PremiumLoadingScreen } from '@/components/ui/PremiumLoadingScreen';

interface LoadingSpinnerProps {
    size?: number;
    color?: string;
    text?: string;
    className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 60,
    color = '#a855f7',
    text = 'Loading...',
    className = ''
}) => {
    // If it's a small spinner (e.g. inside a button), keep the simple version to avoid breaking UI layout
    if (size < 40) {
        return (
            <div className={`flex items-center justify-center gap-2 ${className}`}>
                <motion.span
                    className="block rounded-full border-2 border-white/20 border-t-white"
                    style={{ width: size, height: size }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
            </div>
        );
    }

    // For larger spinners, use the premium full-screen style but contained if needed
    // However, PremiumLoadingScreen is fixed inset-0.
    // If this usage expects a component inside a div, we need a "Inline" version or just use the Premium one if it's meant to be a page loader.
    // Given the "upgrade loading screen" request, users usually mean the page loader.
    // Let's defer to PremiumLoadingScreen for page-level loaders.

    return (
        <PremiumLoadingScreen text={text === 'Loading...' ? undefined : text} className={className} />
    );
};

// Full page loading overlay
export const LoadingOverlay: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => {
    return (
        <div className="min-h-screen bg-transparent flex items-center justify-center">
            <div className="p-8 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10">
                <LoadingSpinner size={80} text={text} />
            </div>
        </div>
    );
};

export default LoadingSpinner;
