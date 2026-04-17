import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import type {Connect} from 'vite';
import {defineConfig} from 'vite';

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
          'User-Agent': 'ClimateCompare/1.0 (https://github.com; local dev)',
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
        server.middlewares.use('/api/proxy-epw', async (req, res) => {
          try {
            const urlStr = `http://${req.headers.host}${req.originalUrl}`;
            const url = new URL(urlStr);
            const targetUrl = url.searchParams.get('url');
            if (!targetUrl) {
              res.statusCode = 400;
              res.end('URL is required');
              return;
            }
            const response = await fetch(targetUrl);
            const text = await response.text();
            res.setHeader('Content-Type', 'text/plain');
            res.statusCode = response.status;
            res.end(text);
          } catch (err) {
            console.error('Proxy Error:', err);
            res.statusCode = 500;
            res.end('Internal Server Error');
          }
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use('/api/nominatim', nominatimProxyMiddleware());
      },
    },
  ],
});
