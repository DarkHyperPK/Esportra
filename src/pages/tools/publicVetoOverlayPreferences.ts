export type OverlayPreferences = {
  theme: 'broadcast';
  transition: 'up' | 'left' | 'right' | 'none';
  transparent: boolean;
};

export const DEFAULT_OVERLAY_PREFERENCES: OverlayPreferences = { theme: 'broadcast', transition: 'up', transparent: false };
const STORAGE_KEY = 'pub-veto-overlay-prefs';

export function readOverlayPreferences(): OverlayPreferences {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return DEFAULT_OVERLAY_PREFERENCES;
    const prefs = raw as Record<string, unknown>;
    if (prefs.theme !== 'broadcast' ||
      !['up', 'left', 'right', 'none'].includes(String(prefs.transition)) || typeof prefs.transparent !== 'boolean') {
      return DEFAULT_OVERLAY_PREFERENCES;
    }
    return prefs as OverlayPreferences;
  } catch {
    return DEFAULT_OVERLAY_PREFERENCES;
  }
}

export function saveOverlayPreferences(prefs: OverlayPreferences): boolean {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); return true; }
  catch { return false; }
}
