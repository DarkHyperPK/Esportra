import { createImage } from '@/lib/imageUtils';

const SKIP_COMPRESS_TYPES = new Set(['image/gif', 'image/svg+xml']);
const SKIP_SIZE_BYTES = 300 * 1024;

export type CompressImageOptions = {
    maxWidth: number;
    maxHeight: number;
    quality?: number;
    mimeType?: 'image/jpeg' | 'image/webp';
};

export const AVATAR_COMPRESS_PRESET: CompressImageOptions = {
    maxWidth: 512,
    maxHeight: 512,
};

export const PLAYER_CARD_COMPRESS_PRESET: CompressImageOptions = {
    maxWidth: 900,
    maxHeight: 1200,
};

function scaledDimensions(
    width: number,
    height: number,
    maxWidth: number,
    maxHeight: number,
): { width: number; height: number } {
    const scale = Math.min(maxWidth / width, maxHeight / height, 1);
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    };
}

function outputExtension(mimeType: 'image/jpeg' | 'image/webp'): string {
    return mimeType === 'image/webp' ? '.webp' : '.jpg';
}

export async function compressImageForUpload(
    file: File,
    options: CompressImageOptions,
): Promise<File> {
    const {
        maxWidth,
        maxHeight,
        quality = 0.85,
        mimeType = 'image/jpeg',
    } = options;

    if (SKIP_COMPRESS_TYPES.has(file.type)) {
        return file;
    }

    const objectUrl = URL.createObjectURL(file);

    try {
        const image = await createImage(objectUrl);
        const fitsBounds = image.width <= maxWidth && image.height <= maxHeight;

        if (fitsBounds && file.size < SKIP_SIZE_BYTES) {
            return file;
        }

        const { width, height } = scaledDimensions(
            image.width,
            image.height,
            maxWidth,
            maxHeight,
        );

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return file;
        }

        if (mimeType === 'image/jpeg') {
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(image, 0, 0, width, height);

        const blob = await new Promise<Blob | null>((resolve) => {
            canvas.toBlob(resolve, mimeType, quality);
        });

        if (!blob) {
            return file;
        }

        const baseName = file.name.replace(/\.[^.]+$/, '') || 'upload';
        const extension = outputExtension(mimeType);

        return new File([blob], `${baseName}${extension}`, { type: mimeType });
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}
