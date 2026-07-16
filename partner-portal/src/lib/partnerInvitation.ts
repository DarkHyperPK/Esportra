const INVITATION_TOKEN_KEY = 'partner_invitation_token';
const PASSWORD_SETUP_KEY = 'partner_invitation_password_setup';
const otpExchanges = new Map<string, Promise<{ error: Error | null }>>();

export function storeInvitationToken(token: string): void {
  const normalizedToken = token.trim().toUpperCase();
  if (sessionStorage.getItem(INVITATION_TOKEN_KEY) !== normalizedToken) {
    clearInvitationPasswordSetup();
  }
  sessionStorage.setItem(INVITATION_TOKEN_KEY, normalizedToken);
}

export function readInvitationToken(): string | null {
  const token = sessionStorage.getItem(INVITATION_TOKEN_KEY);
  if (!token || !/^[A-F0-9]{64}$/.test(token)) {
    clearInvitationToken();
    clearInvitationPasswordSetup();
    return null;
  }
  return token;
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

export function exchangeInvitationOtp(
  tokenHash: string,
  authType: 'invite' | 'magiclink',
  exchange: () => Promise<{ error: Error | null }>,
): Promise<{ error: Error | null }> {
  const exchangeKey = `${authType}:${tokenHash}`;
  const existingExchange = otpExchanges.get(exchangeKey);
  if (existingExchange) return existingExchange;

  const exchangePromise = exchange().finally(() => {
    const search = new URLSearchParams(window.location.search);
    search.delete('auth_token_hash');
    search.delete('auth_type');
    const nextSearch = search.size > 0 ? `?${search.toString()}` : '';
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${nextSearch}${window.location.hash}`);
    window.setTimeout(() => otpExchanges.delete(exchangeKey), 1_000);
  });
  otpExchanges.set(exchangeKey, exchangePromise);
  return exchangePromise;
}

