/**
 * competitiveApiClient
 *
 * Thin wrapper around apiClient that applies toCamelCaseDeep on every response.
 * Competitive/LFG hooks were written against camelCase types; this wrapper
 * keeps that contract without polluting the global apiClient transport.
 *
 * All other feature areas use apiClient directly (snake_case responses).
 */

import { apiClient } from '@/lib/apiClient';
import { toCamelCaseDeep } from '@/lib/caseTransform';

const camel = <T>(data: unknown): T => toCamelCaseDeep(data) as T;

export const competitiveApiClient = {
  get:    <T>(path: string)                  => apiClient.get<unknown>(path).then(camel<T>),
  post:   <T>(path: string, body?: unknown)  => apiClient.post<unknown>(path, body).then(camel<T>),
  put:    <T>(path: string, body?: unknown)  => apiClient.put<unknown>(path, body).then(camel<T>),
  patch:  <T>(path: string, body?: unknown)  => apiClient.patch<unknown>(path, body).then(camel<T>),
  delete: (path: string)                     => apiClient.delete(path),
};
