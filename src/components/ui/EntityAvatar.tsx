import React, { useState, useMemo, useEffect } from 'react';
import { normalizeStorageUrl } from '@/lib/storage';
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
    /** `circle` clips to a round frame; `natural` shows the image without a shape container. */
    shape?: 'circle' | 'natural';
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

const FALLBACK_TONES = [
    'bg-gradient-to-br from-rose-500/80 to-orange-500/70',
    'bg-gradient-to-br from-blue-500/80 to-cyan-500/70',
    'bg-gradient-to-br from-emerald-500/80 to-teal-500/70',
    'bg-gradient-to-br from-fuchsia-500/80 to-rose-500/70',
    'bg-gradient-to-br from-amber-500/80 to-yellow-500/70',
    'bg-gradient-to-br from-zinc-500/80 to-slate-500/70',
];

const getHash = (value: string) => value.split('').reduce((acc, char) => ((acc * 31) + char.charCodeAt(0)) >>> 0, 0);

const getInitials = (value: string) => {
    const parts = value
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
};

/**
 * EntityAvatar
 *
 * Renders a profile picture with an automatic DiceBear fallback.
 * - If `src` is provided and loads successfully → shows the uploaded image.
 * - Otherwise → renders a deterministic DiceBear avatar seeded by name/id.
 */
const EntityAvatar: React.FC<EntityAvatarProps> = React.memo(({
    src,
    name,
    entityId,
    type = 'team',
    shape = 'circle',
    size = 'w-10 h-10',
    className,
    imgClassName,
    fallbackClassName,
}) => {
    const [imgError, setImgError] = useState(false);
    const isNatural = shape === 'natural';

    // Reset error state when src changes (e.g. after new upload)
    useEffect(() => {
        setImgError(false);
    }, [src]);

    const seed = name || entityId || 'unknown';
    const style = DICEBEAR_STYLE[type];
    const fallbackTone = useMemo(
        () => FALLBACK_TONES[getHash(`${style}:${seed}`) % FALLBACK_TONES.length],
        [style, seed]
    );
    const initials = useMemo(() => getInitials(seed), [seed]);

    const resolvedSrc = normalizeStorageUrl(src);
    const showFallback = !resolvedSrc || imgError;

    return (
        <div
            className={cn(
                'relative flex-shrink-0 flex items-center justify-center',
                isNatural ? 'bg-transparent' : 'rounded-full overflow-hidden bg-zinc-900',
                size,
                className
            )}
        >
            {showFallback ? (
                isNatural ? (
                    <span
                        aria-label={name || 'Avatar'}
                        className={cn(
                            'select-none text-2xl font-bold uppercase tracking-wider text-zinc-400',
                            fallbackClassName
                        )}
                    >
                        {initials}
                    </span>
                ) : (
                <div
                    aria-label={name || 'Avatar'}
                    className={cn(
                        'flex h-full w-full items-center justify-center text-white font-semibold uppercase',
                        fallbackTone,
                        imgClassName,
                        fallbackClassName
                    )}
                >
                    <span className="select-none">{initials}</span>
                </div>
                )
            ) : (
                <img
                    src={resolvedSrc}
                    alt={name || 'Avatar'}
                    className={cn(
                        isNatural
                            ? 'max-h-full max-w-full h-auto w-auto object-contain'
                            : 'w-full h-full object-cover',
                        imgClassName
                    )}
                    loading="lazy"
                    decoding="async"
                    onError={() => setImgError(true)}
                />
            )}
        </div>
    );
});

export default EntityAvatar;
