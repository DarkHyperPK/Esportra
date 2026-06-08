export type GhostModeSession = {
  token: string;
  sessionId: string;
  adminId: string;
  targetUserId: string;
  targetLabel: string;
  scopes: string[];
  expiresAt: string;
};

const STORAGE_KEY = 'esportra:ghost-mode-session';

export function readGhostModeSession(): GhostModeSession | null {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as GhostModeSession;
    if (!parsed.token || new Date(parsed.expiresAt).getTime() <= Date.now()) {
      clearGhostModeSession();
      return null;
    }
    return parsed;
  } catch {
    clearGhostModeSession();
    return null;
  }
}

export function writeGhostModeSession(session: GhostModeSession): void {
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new CustomEvent('ghost-mode-session-changed'));
}

export function clearGhostModeSession(): void {
  window.sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent('ghost-mode-session-changed'));
}
