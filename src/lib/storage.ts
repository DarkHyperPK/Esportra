/**
 * Centralized Storage Utility
 * 
 * Manages Supabase Storage URLs to ensure domain consistency across the app.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
if (!SUPABASE_URL) {
  throw new Error('VITE_SUPABASE_URL environment variable is required. Set it in Coolify build variables.');
}
export const STORAGE_ROOT = `${SUPABASE_URL}/storage/v1/object/public`;

/** Rewrites legacy prod storage URLs to the current Supabase project (staging/local). */
export function normalizeStorageUrl(url?: string | null): string | undefined {
    if (!url) return undefined;
    const trimmed = url.trim();
    if (!trimmed) return undefined;

    if (trimmed.startsWith('/')) {
        return `${SUPABASE_URL}${trimmed}`;
    }

    try {
        const parsed = new URL(trimmed);
        if (!parsed.pathname.includes('/storage/v1/object/')) return trimmed;

        const stagingHost = new URL(SUPABASE_URL).host;
        if (parsed.host === stagingHost) return trimmed;

        return `${SUPABASE_URL}${parsed.pathname}${parsed.search}`;
    } catch {
        return trimmed;
    }
}

/**
 * Generates a full Supabase storage URL for a given bucket and path.
 * 
 * @param bucket - The storage bucket ID
 * @param path - The path to the file within the bucket
 * @returns The full public URL
 */
export const getStorageUrl = (bucket: string, path: string): string => {
    // Remove leading slash if present
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;

    // Properly encode each segment of the path to handle spaces, dashes, and special characters
    // This helps avoid net::ERR_HTTP2_PROTOCOL_ERROR on certain proxies/WAFs
    const encodedPath = cleanPath.split('/').map(segment => encodeURIComponent(segment)).join('/');

    return `${STORAGE_ROOT}/${bucket}/${encodedPath}`;
};

/**
 * Helper for website assets (most common use case)
 */
export const getWebsiteAssetUrl = (path: string): string => {
    return getStorageUrl('system.assets.website', path);
};

/** Build a stable public URL from a payment_receipt_url DB ref or legacy full URL. */
export function resolvePaymentReceiptUrl(receiptRef?: string | null): string | undefined {
    if (!receiptRef?.trim()) return undefined;

    const trimmed = receiptRef.trim();
    if (trimmed.startsWith('http')) return normalizeStorageUrl(trimmed);

    const slash = trimmed.indexOf('/');
    if (slash <= 0) return undefined;

    return getStorageUrl(trimmed.slice(0, slash), trimmed.slice(slash + 1));
}
