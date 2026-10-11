import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPublicVetoOverlayUrl } from '../publicMapVetoUtils';
import { DEFAULT_OVERLAY_PREFERENCES, readOverlayPreferences, saveOverlayPreferences } from '../publicVetoOverlayPreferences';

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); });

describe('stream overlay preferences', () => {
  it('defaults to Esportra, Up and opaque', () => {
    expect(readOverlayPreferences()).toEqual({ theme: 'broadcast', transition: 'up', transparent: false });
  });
  it('restores validated preferences and stores no session token', () => {
    const prefs = { theme: 'broadcast', transition: 'right', transparent: true } as const;
    saveOverlayPreferences(prefs);
    expect(readOverlayPreferences()).toEqual(prefs);
    expect(localStorage.getItem('pub-veto-overlay-prefs')).toBe(JSON.stringify(prefs));
  });
  it('rejects malformed and unrecognized stored values', () => {
    localStorage.setItem('pub-veto-overlay-prefs', '{broken');
    expect(readOverlayPreferences()).toEqual(DEFAULT_OVERLAY_PREFERENCES);
    localStorage.setItem('pub-veto-overlay-prefs', JSON.stringify({ theme: 'bad', transition: 'spin', transparent: 'false' }));
    expect(readOverlayPreferences()).toEqual(DEFAULT_OVERLAY_PREFERENCES);
    // legacy 'vct' stored values fall back to default
    localStorage.setItem('pub-veto-overlay-prefs', JSON.stringify({ theme: 'vct', transition: 'right', transparent: true }));
    expect(readOverlayPreferences()).toEqual(DEFAULT_OVERLAY_PREFERENCES);
  });
  it('works when browser storage is denied', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    expect(readOverlayPreferences()).toEqual(DEFAULT_OVERLAY_PREFERENCES);
    expect(() => saveOverlayPreferences(DEFAULT_OVERLAY_PREFERENCES)).not.toThrow();
  });
  it('preserves old URL callers and extends transparency compatibly', () => {
    expect(buildPublicVetoOverlayUrl('token')).toBe(`${location.origin}/tools/map-veto/overlay/token?transition=up&theme=broadcast`);
    const url = new URL(buildPublicVetoOverlayUrl('token', 'left', 'vct', 'replay', true));
    expect(Object.fromEntries(url.searchParams)).toEqual({ transition: 'left', theme: 'vct', playback: 'replay', transparent: '1' });
  });
});
