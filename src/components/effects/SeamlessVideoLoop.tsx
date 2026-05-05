import React, { useRef, useEffect } from 'react';
import { useLowFx } from '@/hooks/useLowFx';

interface SeamlessVideoLoopProps {
    src: string;
    className?: string;
    style?: React.CSSProperties;
}

export const SeamlessVideoLoop: React.FC<SeamlessVideoLoopProps> = ({
    src,
    className,
    style
}) => {
    const isLowFx = useLowFx();
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || isLowFx) return;

        const handleCanPlay = () => {
            video.play().catch(e => console.log('Autoplay blocked', e));
        };

        video.addEventListener('canplay', handleCanPlay);

        return () => {
            video.removeEventListener('canplay', handleCanPlay);
        };
    }, [src, isLowFx]);

    if (isLowFx) {
        // Static dark gradient on low-end devices — zero decode cost
        return (
            <div
                className={`relative w-full h-full overflow-hidden ${className || ''}`}
                style={{ ...style, backgroundImage: 'radial-gradient(ellipse at 60% 40%, #0e0e14 0%, #050505 70%)' }}
                aria-hidden="true"
            />
        );
    }

    return (
        <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={style}>
            <video
                ref={videoRef}
                src={src}
                preload="metadata"
                autoPlay
                muted
                playsInline
                loop
                crossOrigin="anonymous"
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => console.error('Video error:', src, e)}
            />
        </div>
    );
};
