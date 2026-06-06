# Climate Compare

Web dashboard for comparing EPW (EnergyPlus Weather) datasets: sun path, data explorer, wind, wind rose, and UTCI comfort views. Built with React, Vite, Tailwind CSS, and D3.

## Prerequisites

- [Node.js](https://nodejs.org/) (current LTS recommended)

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (typically `http://127.0.0.1:5173`).

## Build

```bash
npm run build
npm run preview
```

Quality gate before publishing:

```bash
npm run lint
npm run build
```

## EPW / geocode proxy (development + production)

The app calls same-origin **`/api/*`** routes so the browser can:

- Fetch EPW text and zip payloads from allowed hosts without CORS (`/api/proxy-epw`, `/api/proxy-binary`, `/api/proxy-zenodo` for ORNL fTMY state archives).
- Geocode places via Nominatim with a proper **`User-Agent`** (`/api/nominatim`).

**Local:** Vite registers these in `vite.config.ts` (`configureServer` / `configurePreviewServer`).

**Vercel:** Serverless handlers live in the repo-root **`api/`** folder (`api/proxy-epw.ts`, `api/nominatim.ts`, `api/proxy-binary.ts`). Connect the Git repo, use the default **Vite** build (`npm run build` → `dist`), and deploy — `vercel.json` sets `outputDirectory` to `dist`. No extra server config is required for the API routes; Vercel maps `/api/*` to those files automatically.

If geocoding or EPW loading fails in production, confirm the deployment includes the `api/` directory and that you are not overriding routes in the Vercel dashboard in a way that blocks `/api/*`.

## Domain on Vercel

1. Import the Git repository and deploy (Framework Preset: **Vite**, or leave auto-detect).
2. **Project → Settings → Domains** — add `climatecanvas.app` and follow DNS instructions.

## Footer / contributions

The footer shows **Created at ClimateCanvas.app** and **Support**. Support opens a dialog with PayPal and Venmo links (configured in `SiteFooter.tsx`).
