# 8760 Visualizer

Upload hourly (8760) data and explore it with a bar chart and 12×24 heatmap. Paste from Excel, upload CSV/XLSX, or load EPW files. Adjust color gradients and cell label formatting, then export a fixed-layout chart for print or InDesign.

Built with React, Vite, Tailwind CSS, and D3. Forked from [Our_Curious_Climate](https://github.com/I-needcoffee/Our_Curious_Climate).

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically `http://127.0.0.1:5173`).

## Build

```bash
npm run lint
npm run build
npm run preview
```

## Deploy (Vercel)

1. Import this repository in [Vercel](https://vercel.com).
2. Framework preset: **Vite**
3. Build command: `npm run build`
4. Output directory: `dist`

`vercel.json` includes SPA rewrites so client-side routing works on refresh.

## Data formats

- **8760 values** — one column or row of hourly numbers
- **Index + value** — two columns
- **Datetime + value** — year, month, day, hour, value…
- **EPW** — full EnergyPlus weather file

## Export

Use the download button in the header after loading data. Charts render at a canonical **1920×1080** layout so exports stay consistent across aspect ratios (ideal for InDesign placement).
