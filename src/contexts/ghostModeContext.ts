import { createContext } from 'react';
import type { GhostModeSession } from '@/lib/ghostModeSession';

export type StartGhostModeInput = {
  targetUserId: string;
  reason: string;
  scopes?: string[];
};

export type GhostModeContextValue = {
  session: GhostModeSession | null;
  isActive: boolean;
  start: (input: StartGhostModeInput) => Promise<void>;
  exit: () => Promise<void>;
};

export const GhostModeContext = createContext<GhostModeContextValue | undefined>(undefined);
