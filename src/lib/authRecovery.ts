const RECOVERY_SESSION_KEY = 'password_recovery_pending';

export function markRecoverySession(): void {
  sessionStorage.setItem(RECOVERY_SESSION_KEY, 'true');
}

export function clearRecoverySession(): void {
  sessionStorage.removeItem(RECOVERY_SESSION_KEY);
}

export function hasRecoverySession(): boolean {
  return sessionStorage.getItem(RECOVERY_SESSION_KEY) === 'true';
}
