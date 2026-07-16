const INVITATION_TOKEN_KEY = 'partner_invitation_token';
const PASSWORD_SETUP_KEY = 'partner_invitation_password_setup';

export function storeInvitationToken(token: string): void {
  const normalizedToken = token.trim().toUpperCase();
  if (sessionStorage.getItem(INVITATION_TOKEN_KEY) !== normalizedToken) {
    clearInvitationPasswordSetup();
  }
  sessionStorage.setItem(INVITATION_TOKEN_KEY, normalizedToken);
}

export function readInvitationToken(): string | null {
  return sessionStorage.getItem(INVITATION_TOKEN_KEY);
}

export function clearInvitationToken(): void {
  sessionStorage.removeItem(INVITATION_TOKEN_KEY);
}

export function markInvitationPasswordSetup(): void {
  sessionStorage.setItem(PASSWORD_SETUP_KEY, 'true');
}

export function hasInvitationPasswordSetup(): boolean {
  return sessionStorage.getItem(PASSWORD_SETUP_KEY) === 'true';
}

export function clearInvitationPasswordSetup(): void {
  sessionStorage.removeItem(PASSWORD_SETUP_KEY);
}

export function readInvitationTokenFromUrl(): string | null {
  const token = new URLSearchParams(window.location.search).get('token');
  return token?.trim().toUpperCase() ?? null;
}

