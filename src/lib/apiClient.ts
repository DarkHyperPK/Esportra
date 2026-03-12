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

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5200';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1_000;
const MAX_JITTER_MS = 500;

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

// ── GET request deduplication ─────────────────────────────────────────────────

// Cache parsed JSON results (not Response objects — Response.body can only be read once)
const inflightGets = new Map<string, Promise<unknown>>();

// ── Internal fetch with auth header + 429 retry ─────────────────────────────

async function fetchWithAuth(
  path: string,
  init: RequestInit = {},
  attempt = 0,
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> ?? {}),
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
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
    throw new ApiError(response.status, body, `API ${response.status}: ${path}`);
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
  async upload<T>(path: string, formData: FormData): Promise<T> {
    const { data: { session } } = await supabase.auth.getSession();

    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (response.status === 429) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const delay = retryAfterHeader
        ? parseInt(retryAfterHeader, 10) * 1_000
        : BASE_DELAY_MS;
      await new Promise((r) => setTimeout(r, delay));
      return this.upload<T>(path, formData);
    }

    if (!response.ok) {
      let body: unknown;
      try {
        const text = await response.text();
        try { body = JSON.parse(text); } catch { body = text; }
      } catch { body = null; }
      throw new ApiError(response.status, body, `Upload failed ${response.status}: ${path}`);
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
