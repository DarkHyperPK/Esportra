import React from 'react';

/**
 * Wraps React.lazy with retry + reload logic for chunk load failures.
 * After deployments, stale cached HTML may reference old chunk filenames.
 * When the server returns HTML (SPA fallback) instead of JS, the module
 * resolves without a .default export, crashing React with:
 *   TypeError: undefined is not an object (evaluating 't._result.default')
 */
export function lazyWithRetry(
  factory: () => Promise<{ default: React.ComponentType<any> }>,
): React.LazyExoticComponent<React.ComponentType<any>> {
  return React.lazy(async () => {
    const hasReloaded = sessionStorage.getItem('chunk-reload-retry') === '1';

    try {
      const module = await factory();

      // Guard: if the chunk was served as HTML (e.g. SPA fallback on 404),
      // the import resolves but .default is undefined
      if (!module?.default) {
        if (!hasReloaded) {
          sessionStorage.setItem('chunk-reload-retry', '1');
          window.location.reload();
          return new Promise(() => {});
        }
        throw new Error('Chunk loaded but missing default export');
      }

      sessionStorage.removeItem('chunk-reload-retry');
      return module;
    } catch (error) {
      if (!hasReloaded) {
        sessionStorage.setItem('chunk-reload-retry', '1');
        window.location.reload();
        // Never-resolving promise prevents render during reload
        return new Promise(() => {});
      }
      // Already retried once — let ErrorBoundary handle it
      throw error;
    }
  });
}
