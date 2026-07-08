import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';

export function useMobileApp() {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (!isNative) return;

    Network.getStatus().then((s) => setIsOnline(s.connected));

    const listener = Network.addListener('networkStatusChange', (s) => {
      setIsOnline(s.connected);
    });

    return () => { listener.then((l) => l.remove()); };
  }, [isNative]);

  return { isNative, platform, isOnline };
}

export function useDeepLink(onLink: (url: string) => void) {
  const { isNative } = useMobileApp();

  useEffect(() => {
    if (!isNative) return;

    const listener = App.addListener('appUrlOpen', (event) => {
      onLink(event.url);
    });

    return () => { listener.then((l) => l.remove()); };
  }, [isNative, onLink]);
}
