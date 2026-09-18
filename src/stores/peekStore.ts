import { create } from 'zustand';

interface PeekStore {
  peekUserId: string | null;
  openPeek: (userId: string) => void;
  closePeek: () => void;
}

export const usePeekStore = create<PeekStore>((set) => ({
  peekUserId: null,
  openPeek: (userId: string) => set({ peekUserId: userId }),
  closePeek: () => set({ peekUserId: null }),
}));
