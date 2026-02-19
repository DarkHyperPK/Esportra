import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    className?: string;
    // If true, will try to use the closest standard breakpoint width
    responsive?: boolean;
}

/**
 * OptimizedImage
 * 
 * Automates Supabase Image Transformations for performance.
 * - Automatically appends ?transform params for Supabase Storage URLs
 * - Handles loading states with a skeleton
 * - Fade-in effect on load
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
    src,
    alt,
    width,
    height,
    className,
    responsive = true,
    ...props
}) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    // Helper to optimize Supabase URLs
    const getOptimizedUrl = (originalUrl: string) => {
        if (!originalUrl) return '';
        // Check if it's a Supabase Storage URL
        if (!originalUrl.includes('supabase.co/storage/v1/object/public')) {
            return originalUrl;
        }

        // Prepare transform params
        const params = new URLSearchParams();

        // Default quality
        params.set('quality', '80');
        // Force WebP for better compression
        params.set('format', 'webp');

        if (width) {
            // If responsive, snap to common breakpoints to maximize cache hits
            // 640, 750, 828, 1080, 1200, 1920
            const targetWidth = responsive
                ? [640, 750, 828, 1080, 1200, 1920].find(w => w >= width) || width
                : width;
            params.set('width', targetWidth.toString());
        }

        if (height && !responsive) {
            params.set('height', height.toString());
        }

        // Append params (handle existing query string if any)
        const separator = originalUrl.includes('?') ? '&' : '?';
        return `${originalUrl}${separator}transform=${params.toString()}`;
    };

    const optimizedSrc = getOptimizedUrl(src);

    return (
        <div className={cn("relative overflow-hidden", className)} style={{ width: width ? 'fit-content' : '100%' }}>
            {isLoading && (
                <Skeleton
                    className="absolute inset-0 w-full h-full z-10"
                    style={{ aspectRatio: width && height ? `${width}/${height}` : undefined }}
                />
            )}
            <img
                src={optimizedSrc}
                alt={alt}
                width={width}
                height={height}
                loading="lazy"
                decoding="async"
                onLoad={() => setIsLoading(false)}
                onError={() => {
                    setIsLoading(false);
                    setError(true);
                }}
                className={cn(
                    "transition-opacity duration-500",
                    isLoading ? "opacity-0" : "opacity-100",
                    className
                )}
                {...props}
            />
        </div>
    );
};
