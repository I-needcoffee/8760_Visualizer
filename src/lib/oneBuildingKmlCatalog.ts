/**
 * Climate.OneBuilding.Org publishes WMO-region TMYx location catalogs as KML + XLSX
 * (see each region’s `default.html`). We fetch KML via `/api/proxy-epw` and parse placemarks.
 */

const OB_ORIGIN = 'https://climate.onebuilding.org';

/** Global TMYx coverage: one KML per major land area + Region 4 split (USA / Canada / Central America & Caribbean). */
export const ONE_BUILDING_TMYX_KML_SOURCES: readonly { id: string; label: string; url: string }[] = [
  { id: 'r1-africa', label: 'Africa TMYx', url: `${OB_ORIGIN}/sources/Region1_Africa_TMYx_EPW_Processing_locations.kml` },
  { id: 'r2-asia', label: 'Asia TMYx', url: `${OB_ORIGIN}/sources/Region2_Asia_TMYx_EPW_Processing_locations.kml` },
  { id: 'r3-sa', label: 'South America TMYx', url: `${OB_ORIGIN}/sources/Region3_South_America_TMYx_EPW_Processing_locations.kml` },
  { id: 'r4-usa', label: 'USA TMYx', url: `${OB_ORIGIN}/sources/Region4_USA_TMYx_EPW_Processing_locations.kml` },
  { id: 'r4-can', label: 'Canada TMYx', url: `${OB_ORIGIN}/sources/Region4_Canada_TMYx_EPW_Processing_locations.kml` },
  { id: 'r4-na', label: 'North America — Central & Caribbean TMYx', url: `${OB_ORIGIN}/sources/Region4_NA_CA_Caribbean_TMYx_EPW_Processing_locations.kml` },
  { id: 'r5-pac', label: 'Southwest Pacific TMYx', url: `${OB_ORIGIN}/sources/Region5_Southwest_Pacific_TMYx_EPW_Processing_locations.kml` },
  { id: 'r6-eu', label: 'Europe TMYx', url: `${OB_ORIGIN}/sources/Region6_Europe_TMYx_EPW_Processing_locations.kml` },
  { id: 'r7-ant', label: 'Antarctica TMYx', url: `${OB_ORIGIN}/sources/Region7_Antarctica_TMYx_EPW_Processing_locations.kml` },
] as const;

export interface OneBuildingDatasetZip {
  zipUrl: string;
  /** Short label: TMY3, TMYx 2011–2025, … */
  label: string;
}

export interface OneBuildingKmlPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** Default archive when opening the pin (prefers latest dated TMYx when present). */
  zipUrl: string;
  /** Stable key for deduping TMYx window variants at the same site. */
  stationKey: string;
  /** Which catalog file this row came from (for debugging / future filtering). */
  sourceId: string;
  /** All catalog .zip URLs merged for this station (KML + dedupe); sorted for display. */
  datasetZips?: OneBuildingDatasetZip[];
}

export function stationKeyFromOneBuildingZipUrl(zipUrl: string): string {
  try {
    const u = new URL(zipUrl);
    const base = (u.pathname.split('/').pop() || '').replace(/\.zip$/i, '');
    if (!base) return zipUrl;
    const noWin = base.replace(/_TMYx\.\d{4}-\d{4}$/i, '').replace(/_TMYx$/i, '');
    return noWin || base;
  } catch {
    return zipUrl;
  }
}

function zipBasenameFromObUrl(zipUrl: string): string {
  try {
    const seg = new URL(zipUrl).pathname.split('/').pop() || '';
    return decodeURIComponent(seg).replace(/\.zip$/i, '');
  } catch {
    return '';
  }
}

function humanizeObDatasetSuffix(suffix: string): string {
  if (suffix === 'TMY3') return 'TMY3';
  if (suffix === 'TMY2') return 'TMY2';
  if (suffix === 'TMY') return 'TMY';
  if (suffix === 'TMYx') return 'TMYx (full)';
  if (suffix.startsWith('TMYx.')) return `TMYx ${suffix.slice(5).replace(/-/g, '–')}`;
  if (suffix.startsWith('US.Normals.')) return suffix.replace(/^US\.Normals\./, 'Normals ');
  return suffix;
}

/** Human-readable dataset name from a OneBuilding .zip URL and its station id prefix. */
export function labelDatasetZip(stationKey: string, zipUrl: string): string {
  const file = zipBasenameFromObUrl(zipUrl);
  if (file.startsWith(stationKey + '_')) {
    return humanizeObDatasetSuffix(file.slice(stationKey.length + 1));
  }
  const m = file.match(/^(.+\.\d{6})_(.+)$/);
  if (m?.[2]) return humanizeObDatasetSuffix(m[2]);
  const last = file.split('_').pop();
  return last ? humanizeObDatasetSuffix(last) : file;
}

function tmyxWindowSpan(zipUrl: string): { start: number; end: number } | null {
  const m = zipUrl.match(/_TMYx\.(\d{4})-(\d{4})\.zip$/i);
  if (!m) return null;
  return { start: parseInt(m[1]!, 10), end: parseInt(m[2]!, 10) };
}

function datasetFamilySortKey(zipUrl: string): number {
  const f = zipUrl.toLowerCase();
  if (/_tmy3\.zip$/i.test(f)) return 10;
  if (/_tmy2\.zip$/i.test(f)) return 20;
  if (/_tmy\.zip$/i.test(f) && !/tmyx/.test(f)) return 30;
  if (/_iwec\.zip$/i.test(f)) return 35;
  if (/_tmyx\.\d{4}-\d{4}\.zip$/i.test(f)) return 40;
  if (/_tmyx\.zip$/i.test(f)) return 50;
  if (/_wyec/.test(f)) return 55;
  return 90;
}

/** Sort order for listing archives: classic TMY first, then TMYx windows by start year. */
export function compareDatasetZipsForDisplay(a: OneBuildingDatasetZip, b: OneBuildingDatasetZip): number {
  const fa = datasetFamilySortKey(a.zipUrl);
  const fb = datasetFamilySortKey(b.zipUrl);
  if (fa !== fb) return fa - fb;
  if (fa === 40 && fb === 40) {
    const sa = tmyxWindowSpan(a.zipUrl);
    const sb = tmyxWindowSpan(b.zipUrl);
    if (sa && sb && sa.start !== sb.start) return sa.start - sb.start;
    if (sa && sb && sa.end !== sb.end) return sa.end - sb.end;
  }
  return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' });
}

/** Higher = preferred default `zipUrl` when several archives exist (newer TMYx window wins over TMY3-only rows). */
function tmyxWindowRank(zipUrl: string): number {
  const m = zipUrl.match(/_TMYx\.(\d{4})-(\d{4})\.zip$/i);
  if (m) {
    const end = parseInt(m[2]!, 10);
    return 1000 + (Number.isFinite(end) ? end : 0);
  }
  if (/_TMYx\.zip$/i.test(zipUrl)) return 3000;
  return 0;
}

function nonTmyxPreferTier(zipUrl: string): number {
  if (/_tmy3\.zip$/i.test(zipUrl)) return 0;
  if (/_tmy2\.zip$/i.test(zipUrl)) return 1;
  if (/_tmy\.zip$/i.test(zipUrl) && !/tmyx/i.test(zipUrl)) return 2;
  if (/_iwec\.zip$/i.test(zipUrl)) return 3;
  return 9;
}

function primaryDatasetZipUrl(candidates: string[]): string {
  return candidates.slice().sort((a, b) => {
    const dr = tmyxWindowRank(b) - tmyxWindowRank(a);
    if (dr !== 0) return dr;
    return nonTmyxPreferTier(a) - nonTmyxPreferTier(b);
  })[0]!;
}

function parseFirstLngLatAlt(text: string): { lng: number; lat: number } | null {
  const chunk = text.trim().split(/\s+/)[0];
  if (!chunk) return null;
  const parts = chunk.split(',');
  if (parts.length < 2) return null;
  const lng = parseFloat(parts[0]!);
  const lat = parseFloat(parts[1]!);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lng, lat };
}

function textContent(el: Element | null | undefined): string {
  return el?.textContent?.trim() ?? '';
}

function extractZipUrlFromDescription(html: string): string | null {
  const m = html.match(/URL\s+(https:\/\/climate\.onebuilding\.org\/[^\s<]+\.zip)/i);
  return m?.[1] ?? null;
}

const KML_NS_21 = 'http://earth.google.com/kml/2.1';
const KML_NS_22 = 'http://www.opengis.net/kml/2.2';

function placemarksInDocument(doc: Document): Element[] {
  const a = doc.getElementsByTagNameNS(KML_NS_21, 'Placemark');
  if (a.length) return Array.from(a);
  const b = doc.getElementsByTagNameNS(KML_NS_22, 'Placemark');
  if (b.length) return Array.from(b);
  const c = doc.getElementsByTagName('Placemark');
  if (c.length) return Array.from(c);
  return Array.from(doc.getElementsByTagName('*')).filter(e => e.localName === 'Placemark');
}

function firstChildText(pm: Element, local: string): string {
  const n21 = pm.getElementsByTagNameNS(KML_NS_21, local);
  if (n21.length) return textContent(n21[0]);
  const n22 = pm.getElementsByTagNameNS(KML_NS_22, local);
  if (n22.length) return textContent(n22[0]);
  const n = pm.getElementsByTagName(local);
  return n.length ? textContent(n[0]) : '';
}

/**
 * Parse OneBuilding-style KML 2.1 documents into placemarks (namespace-agnostic).
 */
export function parseOneBuildingKmlDocument(xml: string, sourceId: string): OneBuildingKmlPin[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const parseErr = doc.querySelector('parsererror');
  if (parseErr) {
    console.warn(`KML parse error (${sourceId}):`, parseErr.textContent);
    return [];
  }

  const out: OneBuildingKmlPin[] = [];
  const list = placemarksInDocument(doc);

  for (let i = 0; i < list.length; i++) {
    const pm = list[i]!;
    const name = firstChildText(pm, 'name');
    if (/\bData\s*$/i.test(name)) continue;
    const desc = firstChildText(pm, 'description');
    const zipUrl = extractZipUrlFromDescription(desc);
    if (!zipUrl) continue;

    let coordStr = '';
    const c21 = pm.getElementsByTagNameNS(KML_NS_21, 'coordinates');
    if (c21.length) coordStr = textContent(c21[0]);
    else {
      const c22 = pm.getElementsByTagNameNS(KML_NS_22, 'coordinates');
      if (c22.length) coordStr = textContent(c22[0]);
      else {
        const c = pm.getElementsByTagName('coordinates');
        if (c.length) coordStr = textContent(c[0]);
      }
    }
    const pos = parseFirstLngLatAlt(coordStr);
    if (!pos) continue;

    const stationKey = stationKeyFromOneBuildingZipUrl(zipUrl);
    const id = `obkml-${sourceId}-${stationKey}-${i}`.replace(/\s+/g, '_');
    out.push({
      id,
      name: name || stationKey,
      lat: pos.lat,
      lng: pos.lng,
      zipUrl,
      stationKey,
      sourceId,
    });
  }

  return out;
}

/**
 * One pin per station: merges every placemark .zip (TMY3, TMY2, TMYx windows, …),
 * keeps the same default `zipUrl` preference as before (latest TMYx when available),
 * and fills `datasetZips` for the popup.
 */
export function dedupeOneBuildingKmlPins(rows: OneBuildingKmlPin[]): OneBuildingKmlPin[] {
  const groups = new Map<string, OneBuildingKmlPin[]>();
  for (const row of rows) {
    const list = groups.get(row.stationKey) ?? [];
    list.push(row);
    groups.set(row.stationKey, list);
  }

  const out: OneBuildingKmlPin[] = [];
  for (const [stationKey, group] of groups) {
    const zipToRow = new Map<string, OneBuildingKmlPin>();
    for (const row of group) {
      if (!zipToRow.has(row.zipUrl)) zipToRow.set(row.zipUrl, row);
    }
    const zips = [...zipToRow.keys()];
    const primaryZip = primaryDatasetZipUrl(zips);
    const primaryRow = zipToRow.get(primaryZip)!;
    const datasetZips: OneBuildingDatasetZip[] = zips.map(z => ({
      zipUrl: z,
      label: labelDatasetZip(stationKey, z),
    }));
    datasetZips.sort(compareDatasetZipsForDisplay);

    const stableId = `obkml-${stationKey.replace(/[^a-zA-Z0-9._-]+/g, '_')}`;
    out.push({
      ...primaryRow,
      id: stableId,
      zipUrl: primaryZip,
      datasetZips,
    });
  }

  return out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
}
