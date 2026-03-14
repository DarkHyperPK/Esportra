/**
 * Shared helpers for the comprehensive E2E test suite.
 * Auth, API, DB, UI utilities for every feature scenario.
 */
import { type Page, type BrowserContext, expect } from '@playwright/test';

// ── Config ────────────────────────────────────────────────────────────────────
export const SUPABASE_URL = 'https://staging.esportra.com';
export const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzM1Njg5NjAwLCJleHAiOjQ4OTEzNjMyMDB9.xtzWCr6-LxvVs5gxBsy08U5fQ64Jmj8cEd5QxM4KHIg';
export const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3MzU2ODk2MDAsImV4cCI6NDg5MTM2MzIwMH0.1ZMulYbXS9hCgi3586fEkKOmLZch7wHxqiVNsMGt8f4';
export const API_URL = 'https://api-staging.esportra.com';

// Test accounts
export const ORGANIZER = { email: 'player2@gmail.com', password: 'Darkz123!' };
export const ADMIN     = { email: 'paradox1632000@gmail.com', password: 'Paradox18!@#' };

// ── Auth helpers ──────────────────────────────────────────────────────────────

export async function getToken(creds: { email: string; password: string }): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

export async function getSession(creds: { email: string; password: string }) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON_KEY },
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status}`);
  return res.json();
}

export async function loginViaAPI(page: Page, creds: { email: string; password: string }) {
  const session = await getSession(creds);
  await page.goto('/');
  await page.evaluate((s: any) => {
    const key = Object.keys(localStorage).find(k => k.includes('auth-token')) || 'sb-staging-auth-token';
    localStorage.setItem(key, JSON.stringify({
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_in: s.expires_in,
      expires_at: Math.floor(Date.now() / 1000) + s.expires_in,
      token_type: s.token_type,
      user: s.user,
    }));
  }, session);
  await page.reload();
  await page.waitForTimeout(2000);
}

export async function loginViaUI(page: Page, creds: { email: string; password: string }) {
  await page.goto('/auth/signin');
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', creds.email);
  await page.fill('input[type="password"]', creds.password);
  await page.click('button[type="submit"]');
  await expect(page).not.toHaveURL(/signin/, { timeout: 15000 });
}

// ── Direct API helpers ────────────────────────────────────────────────────────

export async function api(method: string, path: string, token: string, body?: unknown) {
  const opts: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(`${API_URL}${path}`, opts);
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, ok: res.ok, data: json };
}

/** Supabase REST API (PostgREST) for direct DB access */
export async function db(method: string, table: string, query = '', body?: unknown) {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? '?' + query : ''}`;
  const opts: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: method === 'POST' ? 'return=representation' : 'return=minimal',
    },
  };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, ok: res.ok, data: json };
}

// ── Data fetchers ─────────────────────────────────────────────────────────────

export async function getMe(token: string) {
  const { data } = await api('GET', '/api/me', token);
  return data;
}

export async function getMyProfile(token: string) {
  const { data } = await api('GET', '/api/me/profile', token);
  return data;
}

export async function getMyTeams(token: string) {
  const { data } = await api('GET', '/api/teams/me', token);
  return Array.isArray(data) ? data : [];
}

export async function getTeamMembers(token: string, teamId: string) {
  const { data } = await api('GET', `/api/teams/${teamId}/members/detailed`, token);
  return Array.isArray(data) ? data : [];
}

export async function getTournaments(token: string) {
  const { data } = await api('GET', '/api/tournaments', token);
  return Array.isArray(data) ? data : [];
}

export async function getMyOrg(token: string) {
  const { ok, data } = await api('GET', '/api/organizations/mine', token);
  if (!ok) return null;
  return Array.isArray(data) ? data[0] : data;
}

export async function getOrgStaff(token: string, orgId: string) {
  const { data } = await api('GET', `/api/organizations/${orgId}/staff`, token);
  return Array.isArray(data) ? data : [];
}

export async function getStages(token: string, tournamentId: string) {
  const { data } = await api('GET', `/api/tournaments/${tournamentId}/stages`, token);
  return Array.isArray(data) ? data : [];
}

export async function getBracketVersions(token: string, tournamentId: string) {
  const { data } = await api('GET', `/api/tournaments/${tournamentId}/bracket-versions`, token);
  return Array.isArray(data) ? data : [];
}

export async function getBracketGraph(token: string, versionId: string) {
  const { data } = await api('GET', `/api/brackets/${versionId}/graph`, token);
  return data;
}

export async function getTournamentParticipants(token: string, tournamentId: string) {
  const { data } = await api('GET', `/api/tournaments/${tournamentId}/participants`, token);
  return Array.isArray(data) ? data : [];
}

export async function getRiotAccount(token: string) {
  const { data } = await api('GET', '/api/integrations/riot', token);
  return data;
}

export async function getFaceitAccount(token: string) {
  const { data } = await api('GET', '/api/integrations/faceit', token);
  return data;
}

// ── UI Helpers ────────────────────────────────────────────────────────────────

export async function waitForAPI(page: Page, urlPattern: string | RegExp, method = 'GET') {
  const response = await page.waitForResponse(
    res => {
      const url = res.url();
      const match = typeof urlPattern === 'string' ? url.includes(urlPattern) : urlPattern.test(url);
      return match && res.request().method() === method;
    },
    { timeout: 15000 },
  );
  try { return await response.json(); } catch { return null; }
}

export async function clickButton(page: Page, text: string | RegExp, timeout = 10000) {
  const btn = page.locator('button').filter({ hasText: text }).first();
  await btn.waitFor({ state: 'visible', timeout });
  await btn.click();
}

export async function clickLink(page: Page, text: string | RegExp, timeout = 10000) {
  const link = page.locator('a').filter({ hasText: text }).first();
  await link.waitFor({ state: 'visible', timeout });
  await link.click();
}

export async function fillInput(page: Page, selector: string, value: string) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout: 5000 });
  await el.clear();
  await el.fill(value);
}

export async function selectRadixOption(page: Page, triggerSelector: string, optionText: string | RegExp) {
  const trigger = page.locator(triggerSelector).first();
  await trigger.waitFor({ state: 'visible', timeout: 5000 });
  await trigger.click();
  await page.waitForTimeout(300);
  const option = page.locator('[role="option"]').filter({ hasText: optionText }).first();
  await option.waitFor({ state: 'visible', timeout: 5000 });
  await option.click();
}

export async function selectOption(page: Page, triggerText: string, optionText: string) {
  const trigger = page.locator(`[role="combobox"], [data-state]`).filter({ hasText: triggerText }).first();
  if (await trigger.isVisible({ timeout: 3000 }).catch(() => false)) {
    await trigger.click();
    await page.waitForTimeout(300);
  }
  const option = page.locator(`[role="option"]`).filter({ hasText: optionText }).first();
  await option.click({ timeout: 5000 });
}

export async function expectVisible(page: Page, text: string | RegExp, timeout = 10000) {
  const loc = page.locator(typeof text === 'string' ? `text=${text}` : text).first();
  await expect(loc).toBeVisible({ timeout });
}

export async function expectNotVisible(page: Page, text: string, timeout = 3000) {
  const loc = page.locator(`text=${text}`).first();
  await expect(loc).not.toBeVisible({ timeout });
}

/** Assert text content exists on page */
export async function expectTextContent(page: Page, text: string | RegExp, timeout = 10000) {
  const loc = page.locator('body');
  if (typeof text === 'string') {
    await expect(loc).toContainText(text, { timeout });
  } else {
    await expect(loc.locator(`text=${text.source}`).first()).toBeVisible({ timeout });
  }
}

/** Get inner text of first matching element */
export async function getTextOf(page: Page, selector: string, timeout = 5000): Promise<string> {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout });
  return (await el.innerText()).trim();
}

/** Check image loaded (not broken) */
export async function expectImageLoaded(page: Page, selector: string) {
  const img = page.locator(selector).first();
  if (await img.isVisible({ timeout: 3000 }).catch(() => false)) {
    const loaded = await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0);
    expect(loaded).toBe(true);
  }
}

/** Count matching elements */
export async function countElements(page: Page, selector: string): Promise<number> {
  return page.locator(selector).count();
}

export async function waitForLoad(page: Page, ms = 3000) {
  await page.waitForTimeout(ms);
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function testSlug(prefix: string) {
  return `${prefix}-e2e-${uid()}`;
}

/** Future date helper (days from now) */
export function futureDate(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString();
}

/** Create tournament via API (shortcut for tests that need a tournament) */
export async function createTournament(token: string, overrides: Record<string, any> = {}) {
  const slug = testSlug('e2e');
  const defaults = {
    name: `E2E ${uid()}`,
    game: 'Valorant',
    startDate: futureDate(7),
    endDate: futureDate(8),
    maxTeams: 8,
    slug,
    format: 'single_elimination',
    teamSize: 5,
    isPublic: true,
    rules: 'E2E test rules.',
    prizePool: 1000,
  };
  const { ok, data } = await api('POST', '/api/tournaments', token, { ...defaults, ...overrides });
  if (!ok) throw new Error(`Failed to create tournament: ${JSON.stringify(data)}`);
  return { ...data, slug };
}

/** Create team via API */
export async function createTeam(token: string, overrides: Record<string, any> = {}) {
  const defaults = {
    name: `Team ${uid()}`,
    tag: uid().slice(0, 3).toUpperCase(),
    game: 'Valorant',
  };
  const { ok, data } = await api('POST', '/api/teams', token, { ...defaults, ...overrides });
  if (!ok) throw new Error(`Failed to create team: ${JSON.stringify(data)}`);
  return data;
}

/** Register team in tournament via API */
export async function registerTeam(token: string, tournamentId: string, teamId: string) {
  return api('POST', `/api/tournaments/${tournamentId}/register`, token, {
    teamId,
    participantType: 'team',
  });
}

/** Cleanup helper: delete tournament and teams */
export async function cleanup(token: string, tournamentId?: string, teamIds?: string[]) {
  if (tournamentId) await api('DELETE', `/api/tournaments/${tournamentId}`, token).catch(() => {});
  for (const id of (teamIds || [])) {
    await api('DELETE', `/api/teams/${id}`, token).catch(() => {});
  }
}
