import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { useMobileApp, useDeepLink } from '@/hooks/useMobileApp';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { BottomTabNav } from './BottomTabNav';
import { OfflineBanner } from './OfflineBanner';

export function MobileProvider({ children }: { children: React.ReactNode }) {
  const { isNative, isOnline } = useMobileApp();
  const navigate = useNavigate();

  // Register push notification listeners
  usePushNotifications();

  // Handle deep links: esportra://tournament/some-slug
  useDeepLink((url) => {
    try {
      const path = new URL(url).pathname;
      navigate(path);
    } catch {
      // ignore malformed URLs
    }
  });

  useEffect(() => {
    if (!isNative) return;

    const init = async () => {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#0a0a0a' });
      await SplashScreen.hide({ fadeOutDuration: 300 });
    };

    init().catch(console.error);
  }, [isNative]);

  // On web: render children as-is (no bottom nav, no offline banner)
  if (!isNative) return <>{children}</>;

  return (
    <>
      <OfflineBanner isOnline={isOnline} />
      {/* Push bottom content up to make room for tab bar */}
      <div className="pb-[calc(60px+env(safe-area-inset-bottom))]">
        {children}
      </div>
      <BottomTabNav />
    </>
  );
}
