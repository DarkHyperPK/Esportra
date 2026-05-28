import fs from 'node:fs/promises';

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
    const res = await fetch(`${this.baseUrl}${path}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`GET ${path} failed (${res.status}): ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.headers(),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${path} failed (${res.status}): ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PATCH ${path} failed (${res.status}): ${await res.text()}`);
    return res.json() as Promise<T>;
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PUT ${path} failed (${res.status}): ${await res.text()}`);
    return res.json() as Promise<T>;
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
