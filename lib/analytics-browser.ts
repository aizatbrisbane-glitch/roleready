// Analytics work starts on a later task, never inside a business handler.
export function deferBrowserAnalytics(work: () => unknown | Promise<unknown>): void {
  try { setTimeout(() => { try { void Promise.resolve(work()).catch(() => {}); } catch {} }, 0); } catch {}
}

export function notifySignup(method: string, attribution?: unknown): void {
  deferBrowserAnalytics(() => fetch("/api/track/signup", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ method, attribution }), keepalive: true,
    signal: AbortSignal.timeout(3000),
  }));
}
