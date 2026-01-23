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
                muted
                playsInline
                loop
                className="absolute inset-0 w-full h-full object-cover"
            />
        </div>
    );
};
