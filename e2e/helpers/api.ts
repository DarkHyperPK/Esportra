import fs from 'node:fs/promises';

export type ApiErrorPayload = {
  error?: string;
  message?: string;
  detail?: string;
  title?: string;
};

export function parseErrorBody(body: string): ApiErrorPayload {
  try {
    const parsed = JSON.parse(body) as unknown;
    if (parsed && typeof parsed === 'object') return parsed as ApiErrorPayload;
  } catch {
    // Plain text responses are still useful for assertions.
  }
  return { message: body };
}

export function getErrorText(body: string): string {
  const parsed = parseErrorBody(body);
  return parsed.error || parsed.message || parsed.detail || parsed.title || body;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetriableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function isRetriableApiError(message: string): boolean {
  return (
    message.includes('(429)')
    || message.includes('Too many requests')
    || /\((500|502|503|504)\)/.test(message)
  );
}

function getRetryWaitMs(message: string, attempt: number): number {
  const retryMatch = message.match(/"retryAfterSeconds"\s*:\s*(\d+)/);
  if (retryMatch) return (parseInt(retryMatch[1], 10) + 2) * 1_000;
  if (message.includes('(429)')) return 35_000;
  return Math.min(2_000 * 2 ** attempt, 15_000);
}

/**
 * Retry staging API calls that fail due to rate limits (429) or transient server errors.
 */
export async function withRateLimitRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!isRetriableApiError(message) || attempt >= maxRetries) throw error;
      await sleep(getRetryWaitMs(message, attempt));
      attempt += 1;
    }
  }
}

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly accessToken: string,
  ) {}

  private headers(extra?: HeadersInit): HeadersInit {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  async get<T>(path: string): Promise<T> {
    return withRateLimitRetry(async () => {
      const res = await fetch(`${this.baseUrl}${path}`, { headers: this.headers() });
      if (!res.ok) throw new Error(`GET ${path} failed (${res.status}): ${await res.text()}`);
      return res.json() as Promise<T>;
    });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return withRateLimitRetry(async () => {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: this.headers(),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`POST ${path} failed (${res.status}): ${await res.text()}`);
      return res.json() as Promise<T>;
    });
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return withRateLimitRetry(async () => {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'PATCH',
        headers: this.headers(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`PATCH ${path} failed (${res.status}): ${await res.text()}`);
      return res.json() as Promise<T>;
    });
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return withRateLimitRetry(async () => {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: 'PUT',
        headers: this.headers(),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`PUT ${path} failed (${res.status}): ${await res.text()}`);
      return res.json() as Promise<T>;
    });
  }

  async request(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<{ status: number; body: string }> {
    return withRateLimitRetry(async () => {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: this.headers(),
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const responseBody = await res.text();
      if (isRetriableStatus(res.status)) {
        throw new Error(`${method} ${path} failed (${res.status}): ${responseBody}`);
      }
      return { status: res.status, body: responseBody };
    });
  }

  async expectFailure(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT',
    path: string,
    expectedStatus: number,
    body?: unknown,
  ): Promise<string> {
    const { status, body: responseBody } = await this.request(method, path, body);
    if (status !== expectedStatus) {
      throw new Error(
        `${method} ${path} expected ${expectedStatus} but got ${status}: ${responseBody}`,
      );
    }
    return responseBody;
  }

  async expectFailureText(
    method: 'GET' | 'POST' | 'PATCH' | 'PUT',
    path: string,
    expectedStatus: number,
    body?: unknown,
  ): Promise<string> {
    return getErrorText(await this.expectFailure(method, path, expectedStatus, body));
  }

  async uploadEvidenceImage(filePath: string, fileName = 'evidence.png'): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    const form = new FormData();
    form.append('file', new Blob([fileBuffer], { type: 'image/png' }), fileName);
    form.append('bucket', 'tournaments.results');

    const res = await fetch(`${this.baseUrl}/api/storage/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.accessToken}` },
      body: form,
    });
    if (!res.ok) throw new Error(`Upload failed (${res.status}): ${await res.text()}`);

    const payload = (await res.json()) as { url?: string };
    if (!payload.url) throw new Error('Upload response missing url');
    return payload.url;
  }
}
