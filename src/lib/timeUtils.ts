/**
 * Universal Time Utilities
 * 
 * All times are stored in UTC in the database (Supabase uses timestamptz).
 * These helpers ensure:
 * 1. Inputs (datetime-local) are correctly converted from local → UTC before saving.
 * 2. Displays format UTC timestamps into the user's local timezone.
 * 3. Timezone labels are shown so users know what time zone they're seeing.
 */

import { format } from 'date-fns';

// ─── Timezone Detection ───────────────────────────────────────────────────

/**
 * Returns the user's IANA timezone string, e.g. "America/New_York", "Asia/Dubai"
 */
export const getUserTimezone = (): string => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

/**
 * Returns a short timezone abbreviation for display, e.g. "EST", "GST", "PKT"
 */
export const getTimezoneAbbr = (): string => {
    const now = new Date();
    // Use Intl to get the short timezone name
    const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' }).formatToParts(now);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart?.value || 'UTC';
};

/**
 * Returns a human-readable timezone label like "EST" or "UTC+5"
 */
export const getTimezoneLabel = (): string => {
    return getTimezoneAbbr();
};

// ─── Input Conversion (Local → UTC) ──────────────────────────────────────

/**
 * Converts a `datetime-local` input value (which is in user's local time)
 * to a proper UTC ISO string for database storage.
 * 
 * `datetime-local` gives us a string like "2026-02-20T18:00" with NO timezone info.
 * `new Date("2026-02-20T18:00")` interprets this as LOCAL time, which is correct.
 * `.toISOString()` then converts it to UTC.
 * 
 * @param localDateTimeStr - Value from an <input type="datetime-local">, e.g. "2026-02-20T18:00"
 * @returns UTC ISO string, e.g. "2026-02-20T13:00:00.000Z" (if user is UTC+5)
 */
export const localInputToUTC = (localDateTimeStr: string): string => {
    if (!localDateTimeStr) return '';
    // new Date() interprets a string without timezone as local time
    const date = new Date(localDateTimeStr);
    // Strip milliseconds and seconds to enforce "yyyy-MM-ddThh:mm:00.000Z" when saving,
    // though the DB will interpret any valid ISO.
    // However, since we feed this back to datetime-local sometimes, maintaining a clean
    // string helps.
    return date.toISOString().replace(/:\d{2}\.\d{3}Z$/, ':00.000Z');
};

/**
 * Converts a UTC ISO string from the database back to a `datetime-local` compatible string
 * in the user's local timezone.
 * 
 * @param utcIsoStr - UTC ISO string from DB, e.g. "2026-02-20T13:00:00.000Z"
 * @returns Local datetime string for input, e.g. "2026-02-20T18:00" (if user is UTC+5)
 */
export const utcToLocalInput = (utcIsoStr: string): string => {
    if (!utcIsoStr) return '';
    const date = new Date(utcIsoStr);
    // Build the local datetime string manually to avoid timezone offset issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// ─── Display Formatting (UTC → Local) ────────────────────────────────────

/**
 * Formats a UTC timestamp for display in the user's local timezone.
 * Wraps date-fns `format()` — which already handles local conversion via `new Date()`.
 * 
 * @param utcIsoStr - UTC ISO string from DB
 * @param formatStr - date-fns format string, defaults to 'MMM d, h:mm a'
 * @returns Formatted local time string
 */
export const formatLocalTime = (utcIsoStr: string, formatStr: string = 'MMM d, h:mm a'): string => {
    if (!utcIsoStr) return '—';
    try {
        return format(new Date(utcIsoStr), formatStr);
    } catch {
        return '—';
    }
};

/**
 * Formats a UTC timestamp with timezone label appended.
 * e.g. "Feb 20, 6:00 PM EST"
 */
export const formatLocalTimeWithTZ = (utcIsoStr: string, formatStr: string = 'MMM d, h:mm a'): string => {
    const time = formatLocalTime(utcIsoStr, formatStr);
    if (time === '—') return time;
    return `${time} ${getTimezoneAbbr()}`;
};

/**
 * Formats just the time portion with timezone.
 * e.g. "6:00 PM EST"
 */
export const formatTimeWithTZ = (utcIsoStr: string): string => {
    return formatLocalTimeWithTZ(utcIsoStr, 'h:mm a');
};

/**
 * Converts a date-only input value (from <input type="date">) to a UTC ISO string
 * with the time set to end-of-day (23:59) in the user's local timezone.
 * 
 * @param dateStr - Value from an <input type="date">, e.g. "2026-02-20"
 * @returns UTC ISO string representing 23:59 local time of that date
 */
export const dateInputToUTCEndOfDay = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(`${dateStr}T23:59:00`);
    return date.toISOString();
};

/**
 * Extracts the local date portion from a UTC ISO string.
 * Useful for populating <input type="date"> from a stored UTC timestamp.
 * 
 * @param utcIsoStr - UTC ISO string from DB
 * @returns Local date string, e.g. "2026-02-20"
 */
export const utcToLocalDate = (utcIsoStr: string): string => {
    if (!utcIsoStr) return '';
    const date = new Date(utcIsoStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Extracts the local time portion from a UTC ISO string.
 * Useful for populating <input type="time"> from a stored UTC timestamp.
 * 
 * @param utcIsoStr - UTC ISO string from DB
 * @returns Local time string, e.g. "18:00"
 */
export const utcToLocalTime = (utcIsoStr: string): string => {
    if (!utcIsoStr) return '';
    const date = new Date(utcIsoStr);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

/**
 * Combines a local date string and a local time string into a UTC ISO string.
 * 
 * @param dateStr - Local date, e.g. "2026-03-17"
 * @param timeStr - Local time, e.g. "18:00"
 * @returns UTC ISO string
 */
export const localDateTimeToUTC = (dateStr: string, timeStr: string): string => {
    if (!dateStr || !timeStr) return '';
    const date = new Date(`${dateStr}T${timeStr}`);
    return date.toISOString();
};
