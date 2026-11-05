import { create } from 'zustand';

interface PeekStore {
  peekUserId: string | null;
  peekGameSlug: string | null;
  openPeek: (userId: string, gameSlug?: string) => void;
  closePeek: () => void;
}

export const usePeekStore = create<PeekStore>((set) => ({
  peekUserId: null,
  peekGameSlug: null,
  openPeek: (userId: string, gameSlug?: string) => set({ peekUserId: userId, peekGameSlug: gameSlug ?? null }),
  closePeek: () => set({ peekUserId: null, peekGameSlug: null }),
}));
