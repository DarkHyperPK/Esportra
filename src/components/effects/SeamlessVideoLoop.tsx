import React, { useRef, useEffect } from 'react';

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
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleCanPlay = () => {
            video.play().catch(e => console.log('Autoplay blocked', e));
        };

        video.addEventListener('canplay', handleCanPlay);

        return () => {
            video.removeEventListener('canplay', handleCanPlay);
        };
    }, [src]);

    return (
        <div className={`relative w-full h-full overflow-hidden ${className || ''}`} style={style}>
            <video
                ref={videoRef}
                src={src}
                preload="auto"
                autoPlay
                muted
                playsInline
                loop
                crossOrigin="anonymous"
                className="absolute inset-0 w-full h-full object-cover"
                onPlay={() => console.log('Video playing:', src)}
                onError={(e) => console.error('Video error:', src, e)}
            />
        </div>
    );
};
