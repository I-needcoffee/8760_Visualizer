/**
 * Canadian NRC future TMY stations on Climate One Building (KML + per-station .zip).
 * @see https://climate.onebuilding.org/WMO_Region_4_North_and_Central_America/default.html
 */

export const CANADA_NRC_FUTURE_TMY_KML_URL =
  'https://climate.onebuilding.org/sources/Region4_Canada_NRC_Future_TMY_Year_EPW_Processing_locations.kml';

export const CANADA_NRC_FUTURE_KML_SOURCE_ID = 'canada-nrc-future-tmy';

/** Strip `_TMY_GW0.5` (etc.) so warming levels group under one station. */
export function stationKeyFromNrcFutureZipUrl(zipUrl: string): string {
  try {
    const u = new URL(zipUrl);
    const base = (u.pathname.split('/').pop() || '').replace(/\.zip$/i, '');
    if (!base) return zipUrl;
    const noGw = base.replace(/_TMY_GW[\d.]+$/i, '');
    return noGw || base;
  } catch {
    return zipUrl;
  }
}

export function nrcGwLabelFromZipUrl(zipUrl: string): string {
  const m = zipUrl.match(/_TMY_(GW[\d.]+)\.zip$/i);
  if (!m?.[1]) return 'Future TMY';
  return m[1].replace(/^GW/i, 'GW ');
}

export function nrcGwSortKey(zipUrl: string): number {
  const m = zipUrl.match(/_TMY_GW([\d.]+)\.zip$/i);
  if (!m?.[1]) return 999;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : 999;
}

export function labelNrcFutureDatasetZip(stationKey: string, zipUrl: string): string {
  const gw = nrcGwLabelFromZipUrl(zipUrl);
  if (gw !== 'Future TMY') return gw;
  const file = zipUrl.split('/').pop()?.replace(/\.zip$/i, '') ?? '';
  if (file.startsWith(stationKey + '_')) {
    return file.slice(stationKey.length + 1).replace(/^TMY_/, '');
  }
  return gw;
}

export function compareNrcFutureDatasetZips(
  a: { zipUrl: string; label: string },
  b: { zipUrl: string; label: string }
): number {
  const ga = nrcGwSortKey(a.zipUrl);
  const gb = nrcGwSortKey(b.zipUrl);
  if (ga !== gb) return ga - gb;
  return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' });
}

/** Prefer GW0.5 as the default “near-term” scenario when opening a pin. */
export function primaryNrcFutureZipUrl(candidates: string[]): string {
  return candidates.slice().sort((a, b) => nrcGwSortKey(a) - nrcGwSortKey(b))[0]!;
}
