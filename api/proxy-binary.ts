/**
 * Binary proxy for Climate.OneBuilding zip archives (same origin rule as vite dev server).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

const ONE_BUILDING_ORIGIN = 'https://climate.onebuilding.org';

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
  if (!targetUrl.startsWith(`${ONE_BUILDING_ORIGIN}/`)) {
    res.status(403).send('Forbidden');
    return;
  }
  try {
    const response = await fetch(targetUrl);
    const buf = Buffer.from(await response.arrayBuffer());
    const ct = response.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', ct);
    res.status(response.status).send(buf);
  } catch (err) {
    console.error('OneBuilding binary proxy error:', err);
    res.status(500).send('Internal Server Error');
  }
}
