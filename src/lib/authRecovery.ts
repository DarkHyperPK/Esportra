const RECOVERY_SESSION_KEY = 'password_recovery_pending';

function hasRecoveryLink(): boolean {
  if (typeof window === 'undefined') return false;

  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  return search.get('type') === 'recovery' || hash.get('type') === 'recovery';
}

function removeRecoveryCredentials(): void {
  if (typeof window === 'undefined' || !hasRecoveryLink()) return;

  window.history.replaceState({}, '', window.location.pathname);
}

export function markRecoverySession(): void {
  sessionStorage.setItem(RECOVERY_SESSION_KEY, 'true');
}

export function initializeRecoverySession(): boolean {
  if (!hasRecoveryLink()) return hasRecoverySession();

  markRecoverySession();
  removeRecoveryCredentials();
  return true;
}

export function clearRecoverySession(): void {
  sessionStorage.removeItem(RECOVERY_SESSION_KEY);
}

export function hasRecoverySession(): boolean {
  return sessionStorage.getItem(RECOVERY_SESSION_KEY) === 'true';
}
