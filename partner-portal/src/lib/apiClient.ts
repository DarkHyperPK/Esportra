/**
 * apiClient.ts — Partner Portal
 *
 * Thin HTTP client for the Esportra .NET backend.
 * Mirrors the main app's apiClient but scoped to the partner-portal.
 */

import { supabase } from '@/lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5200';

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

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

export const apiClient = {
  async get<T>(path: string): Promise<T> {
    const res = await fetchWithAuth(path);
    return res.json() as Promise<T>;
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetchWithAuth(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return res.json() as Promise<T>;
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetchWithAuth(path, {
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    return res.json() as Promise<T>;
  },

  async delete(path: string): Promise<void> {
    await fetchWithAuth(path, { method: 'DELETE' });
  },
};
