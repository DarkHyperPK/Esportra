import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App.tsx'
import './index.css'
import React from 'react'

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';

// ── Sentry Error Tracking ────────────────────────────────────────────────────
Sentry.init({
  dsn: "https://4703ee71e2bd056974b5323646faa4be@o4511166930878464.ingest.de.sentry.io/4511166944837712",
  environment: import.meta.env.PROD ? 'production' : 'staging',
  enabled: import.meta.env.PROD || window.location.hostname.includes('staging'),
  sendDefaultPii: true,
  tracesSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
});

// Auto-reload once when lazy chunks 404 after a new deployment
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  if (!sessionStorage.getItem('chunk-reload')) {
    sessionStorage.setItem('chunk-reload', '1');
    window.location.reload();
  }
});
// Clear flag on successful load so future deploys can trigger reload
sessionStorage.removeItem('chunk-reload');

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Failed to find the root element')

// GLOBAL SECURITY: Silence all console logs in production
if (import.meta.env.PROD) {
  console.log = () => { };
  console.warn = () => { };
  console.debug = () => { };
  // console.error is kept for critical troubleshooting
}

const root = createRoot(rootElement)

root.render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<div className="min-h-screen flex items-center justify-center bg-[#050505] text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
        <p className="text-zinc-400 mb-4">An unexpected error occurred. Our team has been notified.</p>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-rose-500 rounded-lg hover:bg-rose-600 transition">
          Reload Page
        </button>
      </div>
    </div>}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>
)
