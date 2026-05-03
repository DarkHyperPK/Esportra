import { useEffect, useState } from 'react';
import { detectLowFx } from '@/lib/detectLowFx';

export const LOW_FX_OVERRIDE_KEY = 'esportra_low_fx_override';
export const LOW_FX_ATTR = 'data-low-fx';

type Override = 'on' | 'off' | null;

function readOverride(): Override {
  if (typeof localStorage === 'undefined') return null;
  const v = localStorage.getItem(LOW_FX_OVERRIDE_KEY);
  if (v === 'true' || v === 'on') return 'on';
  if (v === 'false' || v === 'off') return 'off';
  return null;
}

/**
 * Compute the effective low-fx state from override + auto-detection.
 * - override === 'on'  → always low-fx
 * - override === 'off' → never low-fx (user overrode)
 * - null               → fall back to detection
 */
export function computeEffectiveLowFx(): boolean {
  const override = readOverride();
  if (override === 'on') return true;
  if (override === 'off') return false;
  return detectLowFx().isLowFx;
}

/**
 * Apply the effective state to the <html> data attribute.
 * Idempotent — safe to call repeatedly.
 */
export function applyLowFxAttribute(): boolean {
  if (typeof document === 'undefined') return false;
  const effective = computeEffectiveLowFx();
  const root = document.documentElement;
  if (effective) root.setAttribute(LOW_FX_ATTR, 'true');
  else root.removeAttribute(LOW_FX_ATTR);
  return effective;
}

/**
 * React hook — reactive to:
 *   - data-low-fx attribute changes on <html>
 *   - localStorage changes (cross-tab sync)
 */
export function useLowFx(): boolean {
  const [isLowFx, setIsLowFx] = useState<boolean>(() => {
    if (typeof document === 'undefined') return false;
    return document.documentElement.hasAttribute(LOW_FX_ATTR);
  });

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const sync = () => {
      setIsLowFx(document.documentElement.hasAttribute(LOW_FX_ATTR));
    };

    // Observe attribute changes on <html>.
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [LOW_FX_ATTR],
    });

    // Cross-tab sync via `storage` event.
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LOW_FX_OVERRIDE_KEY) return;
      applyLowFxAttribute();
      sync();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return isLowFx;
}

/**
 * Set (or clear) the manual user override and update the attribute.
 * Pass `null` to clear and return to automatic detection.
 */
export function setLowFxOverride(value: boolean | null): void {
  if (typeof localStorage === 'undefined') return;
  if (value === null) {
    localStorage.removeItem(LOW_FX_OVERRIDE_KEY);
  } else {
    localStorage.setItem(LOW_FX_OVERRIDE_KEY, value ? 'on' : 'off');
  }
  applyLowFxAttribute();
}

/**
 * Convenience: clear the override (auto-detection takes over).
 */
export function clearLowFxOverride(): void {
  setLowFxOverride(null);
}

/**
 * Read the current override value (without applying).
 */
export function getLowFxOverride(): 'on' | 'off' | null {
  return readOverride();
}
