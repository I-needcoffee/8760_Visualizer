/**
 * Build public/data/ftmy-us-county-index.json from US county GeoJSON centroids.
 * Run: node scripts/build-ftmy-county-index.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'data', 'ftmy-us-county-index.json');
const GEOJSON_URL =
  'https://raw.githubusercontent.com/plotly/datasets/master/geojson-counties-fips.json';

const FIPS_TO_STATE = {
  '01': 'AL',
  '02': 'AK',
  '04': 'AZ',
  '05': 'AR',
  '06': 'CA',
  '08': 'CO',
  '09': 'CT',
  10: 'DE',
  11: 'DC',
  12: 'FL',
  13: 'GA',
  15: 'HI',
  16: 'ID',
  17: 'IL',
  18: 'IN',
  19: 'IA',
  20: 'KS',
  21: 'KY',
  22: 'LA',
  23: 'ME',
  24: 'MD',
  25: 'MA',
  26: 'MI',
  27: 'MN',
  28: 'MS',
  29: 'MO',
  30: 'MT',
  31: 'NE',
  32: 'NV',
  33: 'NH',
  34: 'NJ',
  35: 'NM',
  36: 'NY',
  37: 'NC',
  38: 'ND',
  39: 'OH',
  40: 'OK',
  41: 'OR',
  42: 'PA',
  44: 'RI',
  45: 'SC',
  46: 'SD',
  47: 'TN',
  48: 'TX',
  49: 'UT',
  50: 'VT',
  51: 'VA',
  53: 'WA',
  54: 'WV',
  55: 'WI',
  56: 'WY',
};

function ringCentroid(ring) {
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (const pt of ring) {
    if (!pt || pt.length < 2) continue;
    sx += pt[0];
    sy += pt[1];
    n++;
  }
  if (!n) return null;
  return { lng: sx / n, lat: sy / n };
}

function featureCentroid(feature) {
  const g = feature.geometry;
  if (!g) return null;
  if (g.type === 'Polygon') {
    return ringCentroid(g.coordinates[0]);
  }
  if (g.type === 'MultiPolygon') {
    let best = null;
    let bestLen = 0;
    for (const poly of g.coordinates) {
      const ring = poly?.[0];
      if (!ring?.length) continue;
      if (ring.length > bestLen) {
        bestLen = ring.length;
        best = ringCentroid(ring);
      }
    }
    return best;
  }
  return null;
}

function titleCaseCounty(name) {
  return name
    .split(/\s+/)
    .map(w => (w.length <= 2 && w !== 'and' ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join(' ');
}

const res = await fetch(GEOJSON_URL);
if (!res.ok) throw new Error(`GeoJSON fetch failed: ${res.status}`);
const geo = await res.json();

const rows = [];
for (const f of geo.features ?? []) {
  const fips = String(f.id ?? '').padStart(5, '0');
  if (fips.length !== 5) continue;
  const state = FIPS_TO_STATE[fips.slice(0, 2)];
  if (!state) continue;
  if (state === 'AK' || state === 'HI') continue;
  const pos = featureCentroid(f);
  if (!pos || !Number.isFinite(pos.lat) || !Number.isFinite(pos.lng)) continue;
  const rawName = String(f.properties?.name ?? f.properties?.NAME ?? '').replace(/,\s*[A-Z]{2}$/, '');
  const name = titleCaseCounty(rawName || 'County');
  const row = {
    fips,
    name,
    state,
    lat: Math.round(pos.lat * 1e5) / 1e5,
    lng: Math.round(pos.lng * 1e5) / 1e5,
    epwBasename: '',
  };
  row.epwBasename = `USA_${state}_${name.replace(/\s+County$/i, '').replace(/\s+/g, '.')}.County.${fips}_fTMY.epw`;
  rows.push(row);
}

rows.sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(rows));
console.log(`Wrote ${rows.length} counties to ${OUT}`);
