import { IEM_MAX_HTTP_ATTEMPTS, IEM_RETRY_BASE_BACKOFF_MS } from './constants';
import { throttleIemRequest } from './iemThrottle';

/** Parse Retry-After as delta-seconds or HTTP-date (RFC 7231). */
export function parseRetryAfterMs(res: Response): number | null {
  const ra = res.headers.get('Retry-After');
  if (!ra) return null;
  const sec = Number(ra);
  if (Number.isFinite(sec) && sec >= 0) return Math.min(120_000, sec * 1000);
  const until = Date.parse(ra);
  if (Number.isFinite(until)) return Math.max(0, Math.min(120_000, until - Date.now()));
  return null;
}

export function sleepMs(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export type IemRetryableFetchResult =
  | { ok: true; text: string }
  | { ok: false; status: number; bodySnippet: string };

/**
 * GET url with throttle before each attempt; retry on 429/503 with Respect Retry-After or exponential backoff.
 */
export async function fetchIemGetTextWithThrottleRetry(
  url: string,
  errorContext: string
): Promise<string> {
  let lastErr = '';

  for (let attempt = 0; attempt < IEM_MAX_HTTP_ATTEMPTS; attempt++) {
    await throttleIemRequest();
    const res = await fetch(url, { credentials: 'omit' });
    if (res.ok) {
      return res.text();
    }

    const bodySnippet = (await res.text().catch(() => '')).slice(0, 400);
    lastErr = `${errorContext}: ${res.status}${bodySnippet ? `: ${bodySnippet}` : ''}`;

    if ((res.status === 429 || res.status === 503) && attempt < IEM_MAX_HTTP_ATTEMPTS - 1) {
      const fromHeader = parseRetryAfterMs(res);
      const exp = Math.min(120_000, IEM_RETRY_BASE_BACKOFF_MS * Math.pow(2, attempt));
      const waitMs = fromHeader ?? exp;
      const jitter = Math.floor(Math.random() * 900);
      await sleepMs(waitMs + jitter);
      continue;
    }

    throw new Error(lastErr);
  }

  throw new Error(lastErr || `${errorContext}: exhausted retries`);
}
