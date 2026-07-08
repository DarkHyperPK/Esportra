import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { supabase } from '@/lib/supabase';

export function usePushNotifications() {
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!isNative) return;

    PushNotifications.requestPermissions().then(({ receive }) => {
      if (receive === 'granted') {
        PushNotifications.register();
      }
    });

    const reg = PushNotifications.addListener('registration', async (token) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('device_tokens').upsert({
        user_id: user.id,
        token: token.value,
        platform: Capacitor.getPlatform(),
      }, { onConflict: 'token' });
    });

    // Foreground notification — show in-app toast
    const recv = PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Received in foreground:', notification.title);
    });

    return () => {
      reg.then((l) => l.remove());
      recv.then((l) => l.remove());
    };
  }, [isNative]);
}
