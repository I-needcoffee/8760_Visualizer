import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
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
        }
      }
    ],
  };
});
