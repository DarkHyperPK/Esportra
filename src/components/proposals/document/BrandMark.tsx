import { useState } from 'react';
import { getWebsiteAssetUrl } from '@/lib/storage';
import { DISPLAY } from './docStyles';

const LOGO_PATH = 'eSportra-Logo/eSPORTRA-white-transparent.png';

/** The Esportra wordmark. Falls back to set type if the asset can't load, so print never shows a broken image. */
export function BrandMark({ className = 'h-7' }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className={`${DISPLAY} text-xl uppercase tracking-[0.12em]`}>Esportra</span>;
  }
  return (
    <img
      src={getWebsiteAssetUrl(LOGO_PATH)}
      alt="Esportra"
      className={`pd-logo w-auto ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
