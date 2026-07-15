/**
 * apiClient.ts
 *
 * Thin HTTP client that talks to the Esportra .NET backend.
 * Automatically attaches the Supabase session JWT as a Bearer token.
 *
 * Resilience features:
 *   - Auto-retry on 429 (Too Many Requests) with Retry-After + exponential backoff + jitter
 *   - GET request deduplication — concurrent identical GETs share a single in-flight promise
 *
 * Usage:
 *   import { apiClient } from '@/lib/apiClient';
 *   const result = await apiClient.get<UserContext>('/api/me');
 *   const team   = await apiClient.post<Team>('/api/teams', { name: 'Fnatic' });
 */

import { supabase } from '@/lib/supabase';
import { readGhostModeSession } from '@/lib/ghostModeSession';
import { clearUserBrowserStorage } from '@/lib/resetClientSession';
import { type ApiErrorContext, getApiErrorFallback } from '@/utils/apiErrorFallbacks';

const API_BASE_URL = import.meta.env.VITE_API_URL;
if (!API_BASE_URL) {
  throw new Error('VITE_API_URL environment variable is required. Set it in Coolify build variables.');
}

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;
const MAX_JITTER_MS = 500;

function isAuthOrSuspendedRoute(pathname: string): boolean {
  return pathname === '/suspended' || pathname.startsWith('/auth/');
}

function scheduleSuspendedRedirect(): void {
  if (typeof window === 'undefined') return;

  // Defer so in-flight lazy chunks (e.g. SignIn.tsx) are not aborted mid-fetch.
  window.setTimeout(() => {
    const pathname = window.location.pathname;
    if (!isAuthOrSuspendedRoute(pathname)) {
      window.location.assign('/suspended');
    }
  }, 0);
}

// ── Response wrapper ──────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiErrorBody = {
  error?: string;
  message?: string;
  detail?: string;
  title?: string;
  code?: string;
  traceId?: string;
  trace_id?: string;
  errors?: string[] | Record<string, string[]>;
};

function formatErrorsField(errors: ApiErrorBody['errors']): string | null {
  if (!errors) return null;
  if (Array.isArray(errors)) {
    const messages = errors.filter(Boolean);
    return messages.length > 0 ? messages.join('; ') : null;
  }
  const messages = Object.values(errors)
    .flat()
    .filter(Boolean);
  return messages.length > 0 ? messages.join('; ') : null;
}

function readApiErrorBody(body: unknown): ApiErrorBody {
  if (body && typeof body === 'object') return body as ApiErrorBody;
  if (typeof body === 'string') return { message: body };
  return {};
}

function buildApiErrorMessage(
  status: number,
  body: unknown,
  fallback: string,
): string {
  const parsed = readApiErrorBody(body);
  const errorsField = formatErrorsField(parsed.errors);
  const message = errorsField
    || parsed.message
    || parsed.error
    || parsed.detail
    || parsed.title
    || fallback;
  const traceId = parsed.traceId || parsed.trace_id;

  if (traceId) {
    return `${message} Reference ID: ${traceId}`;
  }

  return message || `Request failed (${status}).`;
}

export type GetApiErrorMessageOptions = {
  context?: ApiErrorContext;
  fallback?: string;
};

function resolveApiErrorFallback(options?: string | GetApiErrorMessageOptions): string {
  if (typeof options === 'string') return options;
  if (options?.fallback) return options.fallback;
  return getApiErrorFallback(options?.context ?? 'generic');
}

export function getApiErrorMessage(
  error: unknown,
  options?: string | GetApiErrorMessageOptions,
): string {
  const fallback = resolveApiErrorFallback(options);

  if (error instanceof ApiError) {
    const body = readApiErrorBody(error.body);
    const errorsField = formatErrorsField(body.errors);
    const message = errorsField
      || body.message
      || body.error
      || body.detail
      || body.title
      || fallback;
    const traceId = body.traceId || body.trace_id;
    return traceId
      ? `${message} If this keeps happening, report it with reference ${traceId}.`
      : message;
  }

  if (error instanceof Error && !/^API \d+:/.test(error.message)) {
    return error.message;
  }

  return fallback;
}

// ── GET request deduplication ─────────────────────────────────────────────────

// Cache parsed JSON results (not Response objects — Response.body can only be read once)
const inflightGets = new Map<string, Promise<unknown>>();

// ── Internal fetch with auth header + 429 retry ─────────────────────────────

type FetchOptions = {
  overrideToken?: string;
  skipGhostMode?: boolean;
};

async function fetchWithAuth(
  path: string,
  init: RequestInit = {},
  attempt = 0,
  options: FetchOptions = {},
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> ?? {}),
  };

  if (options.overrideToken) {
    headers['Authorization'] = `Bearer ${options.overrideToken}`;
  } else if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  // Ghost mode: keep admin's JWT for auth, send ghost token in separate header
  // The backend middleware validates X-Ghost-Token and overrides UserContext
  const ghost = readGhostModeSession();
  if (ghost && !options.skipGhostMode && !options.overrideToken) {
    headers['X-Ghost-Token'] = ghost.token;
    headers['X-Impersonated-By'] = ghost.adminId;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  // Auto-retry on 429 with exponential backoff + jitter
  if (response.status === 429 && attempt < MAX_RETRIES) {
    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfterMs = retryAfterHeader
      ? parseInt(retryAfterHeader, 10) * 1_000
      : BASE_DELAY_MS * Math.pow(2, attempt);
    const jitter = Math.random() * MAX_JITTER_MS;
    const delay = retryAfterMs + jitter;

    console.warn(
      `[apiClient] 429 on ${path}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${MAX_RETRIES})`,
    );

    await new Promise((r) => setTimeout(r, delay));
    return fetchWithAuth(path, init, attempt + 1);
  }

  if (!response.ok) {
    let body: unknown;
    try {
      const text = await response.text();
      try { body = JSON.parse(text); } catch { body = text; }
    } catch { body = null; }

    const parsed = readApiErrorBody(body);
    if (
      response.status === 403
      && parsed.code === 'account_suspended'
      && !path.startsWith('/api/profiles/me')
    ) {
      void supabase.auth.signOut();
      scheduleSuspendedRedirect();
    }

    // Handle session revocation - immediate logout
    // Clear browser storage synchronously BEFORE redirect to prevent stale auth state
    if (response.status === 401 && parsed.code === 'SESSION_REVOKED') {
      clearUserBrowserStorage();
      void supabase.auth.signOut({ scope: 'local' });
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('session_revoked', 'true');
        window.location.assign('/auth/signin');
      }
    }

    throw new ApiError(
      response.status,
      body,
      buildApiErrorMessage(response.status, body, `Request failed (${response.status}).`),
    );
  }

  return response;
}

/**
 * Deduplicated GET fetch — if an identical GET is already in-flight,
 * return the same parsed-JSON promise instead of firing a new request.
 */
function fetchGetDeduped<T>(path: string): Promise<T> {
  const existing = inflightGets.get(path);
  if (existing) return existing as Promise<T>;

  const promise = fetchWithAuth(path)
    .then((res) => res.json())
    .finally(() => inflightGets.delete(path));

  inflightGets.set(path, promise);
  return promise as Promise<T>;
}

// ── Public client ─────────────────────────────────────────────────────────────

export const apiClient = {
  /** GET /api/{path} → parsed JSON (deduplicated) */
  async get<T>(path: string): Promise<T> {
    return fetchGetDeduped<T>(path);
  },

  /** POST with explicit token (bypasses ghost mode, used for ghost exit) */
  async postWithToken<T>(path: string, token: string, body?: unknown): Promise<T> {
    const res = await fetchWithAuth(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }, 0, { overrideToken: token });
    return res.json() as Promise<T>;
  },

  /** GET /api/{path} → Blob (receipt proxy fallback when public storage URL fails) */
  async getBlob(path: string): Promise<Blob> {
    const res = await fetchWithAuth(path, {
      headers: { Accept: 'image/*,application/pdf,*/*' },
    });
    return res.blob();
  },

  /** POST /api/{path} with JSON body → parsed JSON */
  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetchWithAuth(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return res.json() as Promise<T>;
  },

  /** PUT /api/{path} with JSON body → parsed JSON */
  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetchWithAuth(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return res.json() as Promise<T>;
  },

  /** PATCH /api/{path} with JSON body → parsed JSON */
  async patch<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetchWithAuth(path, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return res.json() as Promise<T>;
  },

  /** DELETE /api/{path} → void */
  async delete(path: string): Promise<void> {
    await fetchWithAuth(path, { method: 'DELETE' });
  },

  /** Upload a file via multipart/form-data (no JSON Content-Type) */
  async upload<T>(path: string, formData: FormData, _attempt = 0): Promise<T> {
    const { data: { session } } = await supabase.auth.getSession();

    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    // Ghost mode: keep admin's JWT for auth, send ghost token in separate header
    const ghost = readGhostModeSession();
    if (ghost) {
      headers['X-Ghost-Token'] = ghost.token;
      headers['X-Impersonated-By'] = ghost.adminId;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 429 && _attempt < MAX_RETRIES) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const delay = retryAfterHeader
        ? parseInt(retryAfterHeader, 10) * 1_000
        : BASE_DELAY_MS;
      await new Promise((r) => setTimeout(r, delay));
      return this.upload<T>(path, formData, _attempt + 1);
    }

    if (!response.ok) {
      let body: unknown;
      try {
        const text = await response.text();
        try { body = JSON.parse(text); } catch { body = text; }
      } catch { body = null; }
      throw new ApiError(
        response.status,
        body,
        buildApiErrorMessage(response.status, body, `Upload failed (${response.status}).`),
      );
    }

    return response.json() as Promise<T>;
  },

  /** Health check — returns true if the .NET API is reachable */
  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return res.ok;
    } catch {
      return false;
    }
  },
};
