import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type {Connect} from 'vite';
import {defineConfig} from 'vite';

const ONE_BUILDING_ORIGIN = 'https://climate.onebuilding.org';

/** Hosts permitted for `/api/proxy-epw` — NREL catalog links use S3, not raw GitHub. */
const EPW_TEXT_PROXY_PREFIXES = [
  `${ONE_BUILDING_ORIGIN}/`,
  'https://raw.githubusercontent.com/',
  'https://energyplus-weather.s3.amazonaws.com/',
];

function isAllowedEpwTextProxyUrl(targetUrl: string): boolean {
  return EPW_TEXT_PROXY_PREFIXES.some(prefix => targetUrl.startsWith(prefix));
}

function epwTextProxyMiddleware(): Connect.NextHandleFunction {
  return async (req, res) => {
    try {
      const urlStr = `http://${req.headers.host ?? 'localhost'}${req.originalUrl ?? ''}`;
      const url = new URL(urlStr);
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        res.statusCode = 400;
        res.end('URL is required');
        return;
      }
      if (!isAllowedEpwTextProxyUrl(targetUrl)) {
        res.statusCode = 403;
        res.end('URL host not allowed');
        return;
      }
      const response = await fetch(targetUrl);
      const text = await response.text();
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.statusCode = response.status;
      res.end(text);
    } catch (err) {
      console.error('EPW text proxy error:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  };
}

function oneBuildingBinaryProxyMiddleware(): Connect.NextHandleFunction {
  return async (req, res) => {
    try {
      const urlStr = `http://${req.headers.host ?? 'localhost'}${req.originalUrl ?? ''}`;
      const url = new URL(urlStr);
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        res.statusCode = 400;
        res.end('URL is required');
        return;
      }
      if (!targetUrl.startsWith(ONE_BUILDING_ORIGIN + '/')) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }
      const response = await fetch(targetUrl);
      const buf = Buffer.from(await response.arrayBuffer());
      res.statusCode = response.status;
      const ct = response.headers.get('content-type') || 'application/octet-stream';
      res.setHeader('Content-Type', ct);
      res.end(buf);
    } catch (err) {
      console.error('OneBuilding binary proxy error:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  };
}

/** Forward geocode requests with a proper User-Agent (required by Nominatim). */
function nominatimProxyMiddleware(): Connect.NextHandleFunction {
  return async (req, res, next) => {
    try {
      const urlStr = `http://${req.headers.host ?? 'localhost'}${req.url ?? ''}`;
      const u = new URL(urlStr);
      const q = u.searchParams.get('q')?.trim();
      if (!q) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({error: 'Missing q parameter'}));
        return;
      }
      const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`;
      const response = await fetch(nomUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'ClimateCompare/1.0 (https://colorfulclimate.com)',
        },
      });
      const text = await response.text();
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = response.status;
      res.end(text);
    } catch (err) {
      console.error('Nominatim proxy error:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({error: 'Geocoding failed'}));
    }
  };
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    hmr: process.env.DISABLE_HMR !== 'true',
  },
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'dev-api-proxy',
      configureServer(server) {
        server.middlewares.use('/api/nominatim', nominatimProxyMiddleware());
        server.middlewares.use('/api/proxy-epw', epwTextProxyMiddleware());
        server.middlewares.use('/api/proxy-binary', oneBuildingBinaryProxyMiddleware());
      },
      configurePreviewServer(server) {
        server.middlewares.use('/api/nominatim', nominatimProxyMiddleware());
        server.middlewares.use('/api/proxy-epw', epwTextProxyMiddleware());
        server.middlewares.use('/api/proxy-binary', oneBuildingBinaryProxyMiddleware());
      },
    },
  ],
});
