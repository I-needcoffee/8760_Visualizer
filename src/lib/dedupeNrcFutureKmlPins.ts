import type { OneBuildingDatasetZip, OneBuildingKmlPin } from './oneBuildingKmlCatalog';
import {
  compareNrcFutureDatasetZips,
  labelNrcFutureDatasetZip,
  primaryNrcFutureZipUrl,
  stationKeyFromNrcFutureZipUrl,
} from './futureNrcKmlCatalog';

/**
 * One map pin per Canadian NRC station; popup lists GW0.5 … GW3.5 archives.
 */
export function dedupeNrcFutureKmlPins(rows: OneBuildingKmlPin[]): OneBuildingKmlPin[] {
  const groups = new Map<string, OneBuildingKmlPin[]>();
  for (const row of rows) {
    const key = stationKeyFromNrcFutureZipUrl(row.zipUrl);
    const list = groups.get(key) ?? [];
    list.push({ ...row, stationKey: key });
    groups.set(key, list);
  }

  const out: OneBuildingKmlPin[] = [];
  for (const [stationKey, group] of groups) {
    const zipToRow = new Map<string, OneBuildingKmlPin>();
    for (const row of group) {
      if (!zipToRow.has(row.zipUrl)) zipToRow.set(row.zipUrl, row);
    }
    const zips = [...zipToRow.keys()];
    const primaryZip = primaryNrcFutureZipUrl(zips);
    const primaryRow = zipToRow.get(primaryZip)!;
    const datasetZips: OneBuildingDatasetZip[] = zips.map(z => ({
      zipUrl: z,
      label: labelNrcFutureDatasetZip(stationKey, z),
    }));
    datasetZips.sort(compareNrcFutureDatasetZips);

    const stableId = `nrc-future-${stationKey.replace(/[^a-zA-Z0-9._-]+/g, '_')}`;
    out.push({
      ...primaryRow,
      id: stableId,
      zipUrl: primaryZip,
      datasetZips,
    });
  }

  return out.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })
  );
}
