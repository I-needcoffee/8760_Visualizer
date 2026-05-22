import type { IemNetworkFeatureProperties } from './geojsonNetwork';

export type IemWindStationKind = 'asos' | 'rwis';

/** How confidently we expect hourly wind in IEM downloads (catalog heuristic, not probed per station). */
export type WindDataExpectation = 'expected' | 'limited' | 'unknown';

export interface IemWindStationSelection {
  kind: IemWindStationKind;
  network: string;
  stationId: string;
  stationName?: string;
  distanceKm?: number;
}

export interface WindMapStation {
  kind: IemWindStationKind;
  network: string;
  stationId: string;
  stationName: string;
  lat: number;
  lng: number;
  distanceKm: number;
  windExpectation: WindDataExpectation;
  archiveBegin?: string | null;
  properties: IemNetworkFeatureProperties;
}

export function windExpectationLabel(expectation: WindDataExpectation, kind: IemWindStationKind): string {
  if (expectation === 'expected') {
    return kind === 'asos' ? 'Wind expected (METAR hourly)' : 'Wind expected (RWIS archive)';
  }
  if (expectation === 'limited') {
    return 'Wind likely · shorter archive';
  }
  return 'Wind availability unknown';
}

export function windExpectationForCatalogStation(
  kind: IemWindStationKind,
  props: IemNetworkFeatureProperties,
  referenceYear = new Date().getFullYear()
): WindDataExpectation {
  if (kind === 'asos') {
    return props.online === false ? 'unknown' : 'expected';
  }

  if (props.online === false) return 'unknown';

  const begin = props.archive_begin?.trim();
  if (!begin || begin.length < 4) return 'expected';

  const startYear = Number.parseInt(begin.slice(0, 4), 10);
  if (!Number.isFinite(startYear)) return 'expected';

  const yearsOfArchive = referenceYear - startYear;
  if (yearsOfArchive >= 8) return 'expected';
  if (yearsOfArchive >= 2) return 'limited';
  return 'limited';
}

export function stationKindLabel(kind: IemWindStationKind): string {
  return kind === 'asos' ? 'ASOS' : 'RWIS';
}

export function stationMarkerColor(kind: IemWindStationKind): string {
  return kind === 'asos' ? '#2563eb' : '#059669';
}
