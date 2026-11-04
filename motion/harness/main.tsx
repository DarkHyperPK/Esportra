/**
 * Capture harness entry. Renders the real scrim pages and components from src/
 * with fixture data (served by mockFetch), a signed-in captain, and a frozen
 * React Query cache, so every pixel captured is the shipped UI.
 *
 * Usage: /?scene=<name>
 */
import '@/index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthContext } from '@/contexts/auth-context';
import { GameCatalogContext } from '@/contexts/game-catalog-context';
import { SignalRContext } from '@/contexts/signalr-context';
import { installMockFetch } from './mockFetch';
import { SCENES } from './scenes';
import { USER_ID, VALORANT_GAME } from './fixtures/common';

const params = new URLSearchParams(window.location.search);
const sceneName = params.get('scene') ?? 'discovery';
const scene = SCENES[sceneName];

const user = { id: USER_ID, email: 'captain@example.test', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: new Date().toISOString() };
const auth = {
  user, profile: { id: USER_ID, username: 'hex', full_name: 'Hex', avatar_url: null, email: null },
  loading: false, error: null, isEmailVerified: true,
  signIn: async () => {}, signUp: async () => {}, signInWithGoogle: async () => {}, signInWithDiscord: async () => {},
  signOut: async () => {}, updateProfile: async () => {},
  isOrganizer: () => false, isVenueOwner: () => false, isCasual: () => false,
};
const catalog = { games: [VALORANT_GAME], isReady: true, isLoading: false, isError: false, isUnavailable: false, source: 'api' as const };

// A hub that never connects: realtime is not part of a still frame.
const deadHub = { on: () => {}, off: () => {}, invoke: async () => {}, send: async () => {}, start: async () => {}, stop: async () => {}, onreconnected: () => {}, onclose: () => {}, onreconnecting: () => {}, state: 'Disconnected' };
const signalr = { getConnection: () => deadHub, ensureHubStarted: async () => {} };

async function boot() {
  await document.fonts.ready;
  await Promise.all(['900 34px Poppins', '700 16px Poppins', '400 13px Inter'].map((f) => document.fonts.load(f)));
  if (!scene) {
    document.body.innerHTML = `<pre style="color:#fff">Unknown scene "${sceneName}". Scenes: ${Object.keys(SCENES).join(', ')}</pre>`;
    return;
  }
  installMockFetch(scene.routes());
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, refetchInterval: false, staleTime: Infinity } },
  });
  scene.seed?.(qc);
  // Capture hooks: the capture script plays the opponent (advance the fixture state) and refetches.
  Object.assign(window, { __qc: qc, __ctl: scene.control ?? {} });

  const ctx = {
    AuthContext: AuthContext as React.Context<unknown>,
    GameCatalogContext: GameCatalogContext as React.Context<unknown>,
    SignalRContext: SignalRContext as React.Context<unknown>,
  };

  createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={qc}>
      <ctx.AuthContext.Provider value={auth}>
        <ctx.SignalRContext.Provider value={signalr}>
          <ctx.GameCatalogContext.Provider value={catalog}>
            <TooltipProvider>
              <MemoryRouter initialEntries={[scene.path]}>
                <div id="stage" style={{ width: scene.width ?? '100%', background: '#09090b' }}>
                  <Routes>
                    <Route path={scene.route} element={<scene.Component />} />
                  </Routes>
                </div>
              </MemoryRouter>
            </TooltipProvider>
          </ctx.GameCatalogContext.Provider>
        </ctx.SignalRContext.Provider>
      </ctx.AuthContext.Provider>
    </QueryClientProvider>,
  );
}

void boot();
