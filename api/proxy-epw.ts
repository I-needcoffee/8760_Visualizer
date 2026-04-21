/**
 * Production counterpart to `vite.config.ts` EPW text proxy — required on Vercel where
 * Vite middleware does not run. Same allowlist as dev.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ONE_BUILDING_ORIGIN = 'https://climate.onebuilding.org';

const EPW_TEXT_PROXY_PREFIXES = [
  `${ONE_BUILDING_ORIGIN}/`,
  'https://raw.githubusercontent.com/',
  'https://energyplus-weather.s3.amazonaws.com/',
];

function isAllowedEpwTextProxyUrl(targetUrl: string): boolean {
  return EPW_TEXT_PROXY_PREFIXES.some(prefix => targetUrl.startsWith(prefix));
}

function singleQuery(val: string | string[] | undefined): string | undefined {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val[0];
  return undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const targetUrl = singleQuery(req.query.url as string | string[] | undefined);
  if (!targetUrl) {
    res.status(400).send('URL is required');
    return;
  }
  if (!isAllowedEpwTextProxyUrl(targetUrl)) {
    res.status(403).send('URL host not allowed');
    return;
  }
  try {
    const response = await fetch(targetUrl);
    const text = await response.text();
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.status(response.status).send(text);
  } catch (err) {
    console.error('EPW text proxy error:', err);
    res.status(500).send('Internal Server Error');
  }
}
