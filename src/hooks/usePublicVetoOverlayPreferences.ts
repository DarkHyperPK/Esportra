import { useCallback, useEffect, useRef, useState } from 'react';
import { buildPublicVetoOverlayUrl } from '@/pages/tools/publicMapVetoUtils';
import { readOverlayPreferences, saveOverlayPreferences, type OverlayPreferences } from '@/pages/tools/publicVetoOverlayPreferences';

export function usePublicVetoOverlayPreferences(token: string) {
  const [preferences, setPreferences] = useState(readOverlayPreferences);
  const [storageFailed, setStorageFailed] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const url = buildPublicVetoOverlayUrl(token, preferences.transition, preferences.theme, 'live', preferences.transparent);

  useEffect(() => () => clearTimeout(timer.current), []);
  const update = useCallback((change: Partial<OverlayPreferences>) => {
    setPreferences((current) => {
      const next = { ...current, ...change };
      setStorageFailed(!saveOverlayPreferences(next));
      return next;
    });
    clearTimeout(timer.current);
    setCopyState('idle');
  }, []);
  const copy = async () => {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(url);
      setCopyState('copied');
      timer.current = setTimeout(() => setCopyState('idle'), 2000);
    } catch { setCopyState('failed'); }
  };
  return { preferences, update, url, copy, copyState, storageFailed };
}
