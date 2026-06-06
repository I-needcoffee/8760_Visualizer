/**
 * ORNL / Zenodo county-level fTMY (CONUS). Archives are one .zip per state (large);
 * there is no public KML — counties are mapped via a bundled centroid index.
 */

export const FTMY_ZENODO_CITY_RECORD = '6939750';
export const FTMY_ZENODO_WEST_MIDWEST = '8338549';
export const FTMY_ZENODO_EAST_SOUTH = '8335815';

/** States whose county EPWs are in the West & Midwest Zenodo deposit. */
export const FTMY_WEST_MIDWEST_STATES = new Set([
  'AZ',
  'CA',
  'CO',
  'IA',
  'ID',
  'IL',
  'IN',
  'KS',
  'MI',
  'MN',
  'MO',
  'MT',
  'ND',
  'NE',
  'NM',
  'NV',
  'OH',
  'OR',
  'SD',
  'UT',
  'WA',
  'WI',
  'WY',
]);

export function ftmyZenodoRecordIdForState(stateAbbr: string): string {
  const st = stateAbbr.toUpperCase();
  return FTMY_WEST_MIDWEST_STATES.has(st) ? FTMY_ZENODO_WEST_MIDWEST : FTMY_ZENODO_EAST_SOUTH;
}

export function ftmyStateZipDownloadUrl(stateAbbr: string): string {
  const st = stateAbbr.toUpperCase();
  const rec = ftmyZenodoRecordIdForState(st);
  return `https://zenodo.org/api/records/${rec}/files/${st}.zip/content`;
}

export function ftmyStateZipZenodoPage(stateAbbr: string): string {
  const st = stateAbbr.toUpperCase();
  const rec = ftmyZenodoRecordIdForState(st);
  return `https://zenodo.org/records/${rec}`;
}

export interface FtmyUsCountyIndexRow {
  /** 5-digit FIPS */
  fips: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  /** Lowercase EPW basename inside the state .zip (no path). */
  epwBasename: string;
}

/** Guess EPW entry name inside a state archive (ORNL naming). */
export function ftmyEpwBasenameForCounty(row: Pick<FtmyUsCountyIndexRow, 'fips' | 'state' | 'name'>): string {
  const fips = row.fips.padStart(5, '0');
  const state = row.state.toUpperCase();
  const county = row.name
    .replace(/\s+County$/i, '')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/\s+/g, '.');
  return `USA_${state}_${county}.County.${fips}_fTMY.epw`;
}
