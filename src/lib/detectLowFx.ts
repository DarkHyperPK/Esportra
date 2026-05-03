/**
 * Low-FX detection.
 *
 * Determines whether the runtime should degrade expensive visual effects
 * (backdrop-blur, large Gaussian blurs, mix-blend, animated shaders).
 *
 * Signals considered:
 *   1. WebGL UNMASKED_RENDERER matches a known software rasterizer
 *      (SwiftShader, llvmpipe, Mesa software, ANGLE SwiftShader).
 *   2. WebGL is completely unavailable (very old browser, strict privacy mode).
 *   3. prefers-reduced-motion: reduce (accessibility / user preference).
 *   4. navigator.hardwareConcurrency <= 2 (low-end CPU).
 *   5. navigator.deviceMemory <= 2 (low-RAM device).
 *
 * The function is SSR-safe (returns false when `document`/`navigator` missing)
 * and caches its result. Detection is designed to run BEFORE React mounts
 * (see `src/main.tsx` bootstrap) so the html[data-low-fx] attribute is set
 * on the first paint, avoiding a flash of expensive effects.
 */

const SOFTWARE_RENDERER_PATTERNS: ReadonlyArray<string> = [
  'swiftshader',
  'llvmpipe',
  'mesa offscreen',
  'software',
  'angle (swiftshader',
  'google swiftshader',
];

export interface LowFxDetectionResult {
  readonly isLowFx: boolean;
  readonly reasons: ReadonlyArray<string>;
}

let cached: LowFxDetectionResult | null = null;

function getWebGLRenderer(): { renderer: string; vendor: string } | null {
  if (typeof document === 'undefined') return null;
  let canvas: HTMLCanvasElement | null = null;
  try {
    canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return null;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) {
      // Firefox strict-privacy / Safari may hide this; WebGL still works → assume hardware.
      return { renderer: 'unknown', vendor: 'unknown' };
    }
    const renderer = String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? '');
    const vendor = String(gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) ?? '');
    // Release the context to avoid leaking a GPU resource on boot.
    const loseCtx = gl.getExtension('WEBGL_lose_context');
    loseCtx?.loseContext();
    return { renderer, vendor };
  } catch {
    return null;
  } finally {
    canvas = null;
  }
}

/**
 * Run detection. Result is cached for the lifetime of the page.
 */
export function detectLowFx(): LowFxDetectionResult {
  if (cached) return cached;

  // SSR guard.
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    cached = { isLowFx: false, reasons: [] };
    return cached;
  }

  const reasons: string[] = [];

  // 1–2. WebGL renderer check.
  const gpu = getWebGLRenderer();
  if (!gpu) {
    reasons.push('webgl-unavailable');
  } else if (gpu.renderer && gpu.renderer !== 'unknown') {
    const r = gpu.renderer.toLowerCase();
    if (SOFTWARE_RENDERER_PATTERNS.some((p) => r.includes(p))) {
      reasons.push(`software-renderer:${gpu.renderer}`);
    }
  }

  // 3. Reduced motion preference.
  try {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      reasons.push('prefers-reduced-motion');
    }
  } catch {
    // matchMedia not supported — skip.
  }

  // 4. Low CPU core count.
  const cores = navigator.hardwareConcurrency;
  if (typeof cores === 'number' && cores > 0 && cores <= 2) {
    reasons.push(`low-cpu-cores:${cores}`);
  }

  // 5. Low device memory (Chromium/Android only).
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory;
  if (typeof memory === 'number' && memory > 0 && memory <= 2) {
    reasons.push(`low-device-memory:${memory}`);
  }

  cached = { isLowFx: reasons.length > 0, reasons };
  return cached;
}

/**
 * Backwards-compatible boolean accessor.
 */
export function isSoftwareRendering(): boolean {
  return detectLowFx().isLowFx;
}

/**
 * Clear the cached detection result. Mainly for tests.
 */
export function resetLowFxDetection(): void {
  cached = null;
}
