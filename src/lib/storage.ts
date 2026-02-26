/**
 * Centralized Storage Utility
 * 
 * Manages Supabase Storage URLs to ensure domain consistency across the app.
 */

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || 'https://api.esportra.com').replace(/\/$/, '');
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
