/**
 * Escape a value for safe CSV output (RFC 4180).
 * Wraps in double quotes if the value contains commas, quotes, or newlines.
 * Neutralises formula injection by prefixing dangerous chars with a single quote.
 */
export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  // Neutralise formula injection — prefix with single quote
  if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Triggers a server-side CSV export download.
 * The API returns the CSV as a file — we download it via a blob link.
 */
export async function downloadCsvExport(
  endpoint: string,
  params: Record<string, string | number | undefined>,
  fallbackFilename: string
): Promise<void> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') qs.set(key, String(value));
  }
  const url = `${endpoint}${qs.toString() ? `?${qs}` : ''}`;

  // Use raw fetch with auth token since apiClient.get parses JSON
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
  const token = session?.access_token;

  const res = await fetch(`${baseUrl}${url}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  // Try to get filename from Content-Disposition header, fall back to provided name
  const disposition = res.headers.get('Content-Disposition');
  const match = disposition?.match(/filename="?([^"]+)"?/);
  a.download = match?.[1] || fallbackFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
}
