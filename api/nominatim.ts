/**
 * OpenStreetMap Nominatim forward proxy (browser cannot send a compliant User-Agent).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';

function singleQuery(val: string | string[] | undefined): string | undefined {
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val[0];
  return undefined;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const q = singleQuery(req.query.q as string | string[] | undefined)?.trim();
  if (!q) {
    res.status(400).setHeader('Content-Type', 'application/json').send(JSON.stringify({ error: 'Missing q parameter' }));
    return;
  }
  const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
  try {
    const response = await fetch(nomUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ClimateCompare/1.0 (https://colorfulclimate.com)',
      },
    });
    const text = await response.text();
    res.setHeader('Content-Type', 'application/json');
    res.status(response.status).send(text);
  } catch (err) {
    console.error('Nominatim proxy error:', err);
    res.status(500).setHeader('Content-Type', 'application/json').send(JSON.stringify({ error: 'Geocoding failed' }));
  }
}
