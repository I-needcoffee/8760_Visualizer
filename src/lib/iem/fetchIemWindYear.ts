import { fetchParsedAsosWindYear } from './fetchAsosYearWind';
import { fetchParsedRwisWindYear } from './fetchRwisYearWind';
import type { ParsedIemWindRow } from './parseAsosCsv';
import type { IemWindStationSelection } from './windStationTypes';

export function fetchParsedIemWindYear(selection: IemWindStationSelection, year: number): Promise<ParsedIemWindRow[]> {
  if (selection.kind === 'rwis') {
    return fetchParsedRwisWindYear(selection.network, selection.stationId, year);
  }
  return fetchParsedAsosWindYear(selection.stationId, year);
}

export async function fetchParsedIemWindYears(
  selection: IemWindStationSelection,
  years: number[]
): Promise<Map<number, ParsedIemWindRow[]>> {
  const out = new Map<number, ParsedIemWindRow[]>();
  for (const y of years) {
    out.set(y, await fetchParsedIemWindYear(selection, y));
  }
  return out;
}
