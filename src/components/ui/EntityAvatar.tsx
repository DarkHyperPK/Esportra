import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';

type EntityType = 'user' | 'team' | 'org';

interface EntityAvatarProps {
    /** The image URL. If falsy, a DiceBear fallback is generated. */
    src?: string | null;
    /** Name used for alt text and as the DiceBear seed. */
    name?: string;
    /** Optional stable ID used as fallback seed if name is missing. */
    entityId?: string;
    /** Entity type — controls the DiceBear style. */
    type?: EntityType;
    /** Tailwind size classes (e.g. "w-10 h-10"). Defaults to "w-10 h-10". */
    size?: string;
    /** Additional className for the wrapper. */
    className?: string;
    /** Additional className for the <img> element. */
    imgClassName?: string;
    /** Additional className for the fallback <img> specifically. */
    fallbackClassName?: string;
}

// DiceBear style per entity type
const DICEBEAR_STYLE: Record<EntityType, string> = {
    user: 'initials',
    team: 'shapes',
    org: 'initials',
};

/**
 * EntityAvatar
 *
 * Renders a profile picture with an automatic DiceBear fallback.
 * - If `src` is provided and loads successfully → shows the uploaded image.
 * - Otherwise → renders a deterministic DiceBear avatar seeded by name/id.
 */
const EntityAvatar: React.FC<EntityAvatarProps> = ({
    src,
    name,
    entityId,
    type = 'team',
    size = 'w-10 h-10',
    className,
    imgClassName,
    fallbackClassName,
}) => {
    const [imgError, setImgError] = useState(false);

    // Reset error state when src changes (e.g. after new upload)
    useEffect(() => {
        setImgError(false);
    }, [src]);

    const seed = name || entityId || 'unknown';
    const style = DICEBEAR_STYLE[type];

    const fallbackUrl = useMemo(
        () => `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&radius=50&backgroundColor=0a0a0c,111111,1a1a2e&backgroundType=gradientLinear`,
        [style, seed]
    );

    const showFallback = !src || imgError;

    return (
        <div
            className={cn(
                'relative rounded-full overflow-hidden bg-zinc-900 flex-shrink-0 flex items-center justify-center',
                size,
                className
            )}
        >
            {showFallback ? (
                <img
                    src={fallbackUrl}
                    alt={name || 'Avatar'}
                    className={cn('w-full h-full object-cover', imgClassName, fallbackClassName)}
                    loading="lazy"
                    decoding="async"
                />
            ) : (
                <img
                    src={src}
                    alt={name || 'Avatar'}
                    className={cn('w-full h-full object-cover', imgClassName)}
                    loading="lazy"
                    decoding="async"
                    onError={() => setImgError(true)}
                />
            )}
        </div>
    );
};

export default EntityAvatar;
