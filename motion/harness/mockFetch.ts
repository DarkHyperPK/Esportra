/**
 * Fetch interceptor for the capture harness. The real hooks call the real API
 * client; this answers those requests with fixture JSON so the real pages render.
 * Anything without a fixture is recorded on window.__unmocked and answered 404.
 */

export type Handler = (url: URL, init?: RequestInit) => unknown | Promise<unknown>;
export type Route = [RegExp, Handler];

declare global {
  interface Window {
    __unmocked: string[];
    __requests: string[];
  }
}

export function installMockFetch(routes: Route[]) {
  window.__unmocked = [];
  window.__requests = [];
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw, window.location.href);
    // Same-origin assets and the public Valorant asset API (agents, maps) load for real.
    if (url.origin === window.location.origin || url.hostname.endsWith('valorant-api.com')) return realFetch(input, init);
    const key = `${init?.method ?? 'GET'} ${url.pathname}${url.search}`;
    window.__requests.push(key);
    for (const [re, handler] of routes) {
      if (re.test(`${url.pathname}${url.search}`)) {
        const body = await handler(url, init);
        return new Response(JSON.stringify(body ?? null), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }
    }
    window.__unmocked.push(key);
    return new Response(JSON.stringify({ error: 'not mocked' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  };
}
