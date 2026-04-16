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

## EPW proxy (development)

The dev server exposes `/api/proxy-epw` so the app can fetch remote EPW files without browser CORS issues.
