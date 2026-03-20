/**
 * Centralized Storage Utility (Partner Portal)
 * 
 * Manages Supabase Storage URLs to ensure domain consistency.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
if (!SUPABASE_URL) throw new Error('VITE_SUPABASE_URL environment variable is required');
export const STORAGE_ROOT = `${SUPABASE_URL}/storage/v1/object/public`;

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

    // Let the browser/fetch APIs handle URL encoding natively to prevent double-encoding
    return `${STORAGE_ROOT}/${bucket}/${cleanPath}`;
};

/**
 * Helper for website assets
 */
export const getWebsiteAssetUrl = (path: string): string => {
    return getStorageUrl('system.assets.website', path);
};
