/**
 * apiClient.ts
 *
 * Thin HTTP client that talks to the Esportra .NET backend.
 * Automatically attaches the Supabase session JWT as a Bearer token.
 *
 * Usage:
 *   import { apiClient } from '@/lib/apiClient';
 *   const result = await apiClient.get<UserContext>('/api/me');
 *   const team   = await apiClient.post<Team>('/api/teams', { name: 'Fnatic' });
 *
 * Phase 0 — foundation only. Endpoints are empty until Phase 1 (Edge Function migration).
 */

import { supabase } from '@/lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5200';

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

// ── Internal fetch with auth header ──────────────────────────────────────────

async function fetchWithAuth(path: string, init: RequestInit = {}): Promise<Response> {
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

  if (!response.ok) {
    let body: unknown;
    try { body = await response.json(); } catch { body = await response.text(); }
    throw new ApiError(response.status, body, `API ${response.status}: ${path}`);
  }

  return response;
}

// ── Public client ─────────────────────────────────────────────────────────────

export const apiClient = {
  /** GET /api/{path} → parsed JSON */
  async get<T>(path: string): Promise<T> {
    const res = await fetchWithAuth(path);
    return res.json() as Promise<T>;
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
