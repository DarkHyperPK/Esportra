import { useContext } from 'react';
import { GhostModeContext } from '@/contexts/ghostModeContext';

export function useGhostMode() {
  const context = useContext(GhostModeContext);
  if (!context) throw new Error('useGhostMode must be used within GhostModeProvider');
  return context;
}
