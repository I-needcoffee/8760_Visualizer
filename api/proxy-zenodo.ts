/**
 * Binary proxy for Zenodo fTMY state archives (county EPWs inside state .zip files).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ZENODO_API = 'https://zenodo.org/api/records/';

const ALLOWED_RECORDS = new Set(['6939750', '8338549', '8335815']);

function singleQuery(val: string | string[] | undefined): string | undefined {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val[0];
  return undefined;
}

function isAllowedZenodoUrl(targetUrl: string): boolean {
  if (!targetUrl.startsWith(ZENODO_API)) return false;
  const m = targetUrl.match(/^https:\/\/zenodo\.org\/api\/records\/(\d+)\/files\/[^/]+\/content$/);
  if (!m) return false;
  return ALLOWED_RECORDS.has(m[1]!);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const targetUrl = singleQuery(req.query.url as string | string[] | undefined);
  if (!targetUrl) {
    res.status(400).send('URL is required');
    return;
  }
  if (!isAllowedZenodoUrl(targetUrl)) {
    res.status(403).send('Forbidden');
    return;
  }
  try {
    const response = await fetch(targetUrl);
    const buf = Buffer.from(await response.arrayBuffer());
    const ct = response.headers.get('content-type') || 'application/zip';
    res.setHeader('Content-Type', ct);
    res.status(response.status).send(buf);
  } catch (err) {
    console.error('Zenodo binary proxy error:', err);
    res.status(500).send('Internal Server Error');
  }
}
