import JSZip from 'jszip';

/** Base path for Climate.OneBuilding “CAN_Canada_Future” archives (NRC / CanESM2 warming levels). */
export const ONE_BUILDING_CANADA_FUTURE_BASE =
  'https://climate.onebuilding.org/WMO_Region_4_North_and_Central_America/';

/**
 * Real future TMY EPWs (NRC Canada, v12022) — GW0.5 ≈ current/near-term, GW3.5 ≈ high-warming scenario.
 * See https://climate.onebuilding.org/sources/ (Canadian Future Data).
 */
export const NRC_FUTURE_SAMPLE_ZIPS: {
  /** Short name for UI and baseline matching (same prefix for a station pair). */
  placeTitle: string;
  /** Path under {@link ONE_BUILDING_CANADA_FUTURE_BASE}. */
  zipRel: string;
}[] = [
  {
    placeTitle: 'Toronto (Pearson), ON',
    zipRel:
      'CAN_Canada_Future/ON_Ontario/CAN_ON_Toronto-Pearson.Intl.AP.716240_NRCv12022_TMY_GW0.5.zip',
  },
  {
    placeTitle: 'Toronto (Pearson), ON',
    zipRel:
      'CAN_Canada_Future/ON_Ontario/CAN_ON_Toronto-Pearson.Intl.AP.716240_NRCv12022_TMY_GW1.0.zip',
  },
  {
    placeTitle: 'Toronto (Pearson), ON',
    zipRel:
      'CAN_Canada_Future/ON_Ontario/CAN_ON_Toronto-Pearson.Intl.AP.716240_NRCv12022_TMY_GW1.5.zip',
  },
  {
    placeTitle: 'Toronto (Pearson), ON',
    zipRel:
      'CAN_Canada_Future/ON_Ontario/CAN_ON_Toronto-Pearson.Intl.AP.716240_NRCv12022_TMY_GW2.0.zip',
  },
  {
    placeTitle: 'Toronto (Pearson), ON',
    zipRel:
      'CAN_Canada_Future/ON_Ontario/CAN_ON_Toronto-Pearson.Intl.AP.716240_NRCv12022_TMY_GW3.5.zip',
  },
];

export interface EpwLocationInput {
  id: string;
  name: string;
  lat: number;
  lng: number;
  epwData: string;
  isFuture: boolean;
  filename: string;
}

function gwLabelFromRelPath(zipRel: string): string {
  const m = zipRel.match(/_TMY_(GW[\d.]+)\.zip$/i);
  return m?.[1] ?? '';
}

/**
 * Fetches each listed NRC `.zip` via `fetchBinary`, extracts the first `.epw`, and returns locations
 * suitable for the Future map. Coordinates come from the EPW `LOCATION` row.
 */
export async function loadNrcFutureSampleLocations(
  fetchBinary: (absoluteUrl: string) => Promise<ArrayBuffer>
): Promise<EpwLocationInput[]> {
  const out: EpwLocationInput[] = [];
  let index = 0;
  for (const row of NRC_FUTURE_SAMPLE_ZIPS) {
    const url = `${ONE_BUILDING_CANADA_FUTURE_BASE}${row.zipRel}`;
    const buf = await fetchBinary(url);
    const zip = await JSZip.loadAsync(buf);
    const epwEntry = Object.entries(zip.files).find(
      ([name, f]) => !f.dir && name.toLowerCase().endsWith('.epw')
    );
    if (!epwEntry) {
      throw new Error(`No EPW in archive: ${row.zipRel}`);
    }
    const text = await epwEntry[1].async('string');
    const lines = text.split(/\r?\n/);
    const locLine = lines.find(l => l.trim().startsWith('LOCATION,'));
    let lat = NaN;
    let lng = NaN;
    if (locLine) {
      const parts = locLine.split(',');
      if (parts.length >= 8) {
        lat = parseFloat(parts[6]!);
        lng = parseFloat(parts[7]!);
      }
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new Error(`Missing coordinates in EPW from ${row.zipRel}`);
    }
    const filename = epwEntry[0].split('/').pop() || `nrc-sample-${index}.epw`;
    const gw = gwLabelFromRelPath(row.zipRel);
    const gwHuman = gw ? ` · ${gw}` : '';
    out.push({
      id: `future-nrc-${index}`,
      name: `${row.placeTitle} (NRC future TMY${gwHuman})`,
      lat,
      lng,
      epwData: text,
      isFuture: true,
      filename,
    });
    index++;
  }
  return out;
}
