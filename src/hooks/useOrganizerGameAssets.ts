import { useEffect, useSyncExternalStore } from 'react';
import { fetchGameData, type CachedGame } from '@/hooks/useRawgGame';

export type OrganizerGameAssets = CachedGame & {
  carouselIndex: number;
  isLoading: boolean;
};

const IDLE_SNAPSHOT: OrganizerGameAssets = Object.freeze({
  gameLogo: null,
  gameBanner: null,
  cover: null,
  screenshots: [],
  rawgScreenshots: [],
  videos: [],
  carouselIndex: 0,
  isLoading: false,
});

const LOADING_SNAPSHOT: OrganizerGameAssets = Object.freeze({
  ...IDLE_SNAPSHOT,
  isLoading: true,
});

function normalizeGameKey(game: string | null | undefined) {
  return (game ?? '').trim().toLowerCase();
}

type GameStore = {
  assets: CachedGame | null;
  carouselIndex: number;
  isLoading: boolean;
  snapshot: OrganizerGameAssets;
  listeners: Set<() => void>;
  intervalId: ReturnType<typeof setInterval> | null;
};

const stores = new Map<string, GameStore>();

function rebuildSnapshot(store: GameStore) {
  if (!store.assets) {
    store.snapshot = store.isLoading ? LOADING_SNAPSHOT : IDLE_SNAPSHOT;
    return;
  }

  store.snapshot = {
    ...store.assets,
    carouselIndex: store.carouselIndex,
    isLoading: store.isLoading,
  };
}

function getStore(key: string): GameStore {
  let store = stores.get(key);
  if (!store) {
    store = {
      assets: null,
      carouselIndex: 0,
      isLoading: false,
      snapshot: IDLE_SNAPSHOT,
      listeners: new Set(),
      intervalId: null,
    };
    stores.set(key, store);
  }
  return store;
}

function snapshotForKey(key: string): OrganizerGameAssets {
  if (!key) return IDLE_SNAPSHOT;
  return getStore(key).snapshot;
}

function notify(key: string) {
  const store = stores.get(key);
  if (!store) return;
  rebuildSnapshot(store);
  store.listeners.forEach((listener) => listener());
}

function stopCarousel(key: string) {
  const store = stores.get(key);
  if (!store?.intervalId) return;
  clearInterval(store.intervalId);
  store.intervalId = null;
}

function startCarousel(key: string) {
  const store = getStore(key);
  stopCarousel(key);

  const shots = store.assets?.rawgScreenshots ?? [];
  if (shots.length <= 1) return;

  store.intervalId = setInterval(() => {
    store.carouselIndex = (store.carouselIndex + 1) % shots.length;
    notify(key);
  }, 6000);
}

async function ensureGameLoaded(game: string) {
  const key = normalizeGameKey(game);
  if (!key) return;

  const store = getStore(key);

  if (store.assets) return;
  if (store.isLoading) return;

  store.isLoading = true;
  notify(key);

  try {
    const data = await fetchGameData(game.trim());
    store.assets = data;
    store.carouselIndex = 0;
    startCarousel(key);
  } finally {
    store.isLoading = false;
    notify(key);
  }
}

function subscribeGameAssets(game: string, listener: () => void) {
  const key = normalizeGameKey(game);
  if (!key) return () => undefined;

  const store = getStore(key);
  store.listeners.add(listener);
  return () => {
    store.listeners.delete(listener);
  };
}

/**
 * Prefetch unique games once at the list level (deduped by module store).
 */
export function useOrganizerGameAssetsPrefetch(gameNames: (string | null | undefined)[]) {
  const key = gameNames.filter(Boolean).join('|');

  useEffect(() => {
    const unique = Array.from(new Set(gameNames.filter(Boolean).map((g) => g!.trim())));
    unique.forEach((game) => {
      void ensureGameLoaded(game);
    });
  }, [key]);
}

/**
 * Per-card subscription — carousel ticks only re-render cards for that game.
 * Snapshots are cached on the store so getSnapshot stays referentially stable between updates.
 */
export function useOrganizerCardGameAssets(game: string | null | undefined): OrganizerGameAssets {
  const normalized = normalizeGameKey(game);

  useEffect(() => {
    if (normalized) void ensureGameLoaded(game!.trim());
  }, [game, normalized]);

  return useSyncExternalStore(
    (listener) => subscribeGameAssets(game ?? '', listener),
    () => snapshotForKey(normalized),
    () => IDLE_SNAPSHOT,
  );
}

export function resolveOrganizerBannerSrc(
  imageUrl: string | undefined,
  assets: OrganizerGameAssets,
): { src: string; carouselKey?: string } {
  if (imageUrl) return { src: imageUrl };

  const shots = assets.rawgScreenshots;
  if (shots.length > 0) {
    const index = assets.carouselIndex % shots.length;
    return { src: shots[index], carouselKey: `${index}-${shots[index]}` };
  }

  if (assets.gameBanner) return { src: assets.gameBanner };
  if (assets.gameLogo) return { src: assets.gameLogo };
  return { src: '/placeholder.svg' };
}
