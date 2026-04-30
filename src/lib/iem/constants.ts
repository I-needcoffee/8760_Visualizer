/** Iowa Environmental Mesonet public web services (same origin prefix for geo + ASOS CGI). */
export const IEM_BASE = 'https://mesonet.agron.iastate.edu';

/** Minimum spacing between consecutive IEM HTTP requests (server returns 429 when burst). */
export const IEM_MIN_REQUEST_GAP_MS = 2800;

/** Retrying asos/network after 429: base pause before exponential backoff (ms). */
export const IEM_RETRY_BASE_BACKOFF_MS = 5000;

/** Max attempts per URL including first try (429/503 only). */
export const IEM_MAX_HTTP_ATTEMPTS = 6;

/** Wind speed in asos.py output: nautical knots → m/s for EPW-style values. */
export function knotsToMs(knots: number): number {
  return knots * 0.514444444444444;
}
