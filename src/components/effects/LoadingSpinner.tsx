import React from 'react';
import { motion } from 'framer-motion';

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
    const spinnerSize = size;
    const strokeWidth = size / 10;

    return (
        <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
            <div className="relative" style={{ width: size, height: size }}>
                <motion.span
                    className="block rounded-full border-4 border-white/20 border-t-white"
                    style={{ width: size, height: size }}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
            </div>
            {text && (
                <p className="text-sm font-medium text-gray-400 animate-pulse">{text}</p>
            )}
        </div>
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
