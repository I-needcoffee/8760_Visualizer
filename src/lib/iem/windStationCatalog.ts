import type { EPWMetadata } from '../epwParser';
import { fetchIemNetworkGeoJson } from './geojsonNetwork';
import type { IemNetworkGeoJsonFeature } from './geojsonNetwork';
import { haversineKm } from './nearestStation';
import {
  iemAsosNetworkForStateCode,
  iemRwisNetworkForStateCode,
  normalizeUsStateCode,
  resolveUsStateCodeFromMetadata,
} from './usNetworkFromEpw';
import { epwMayUseIemWind, guessUsStateCodeFromEpwFilename } from './usStateCodes';
import {
  stationKindLabel,
  windExpectationForCatalogStation,
  type IemWindStationKind,
  type IemWindStationSelection,
  type WindMapStation,
} from './windStationTypes';

const networkGeoJsonCache = new Map<string, Promise<Awaited<ReturnType<typeof fetchIemNetworkGeoJson>>>>();

const DEFAULT_RADIUS_KM = 200;

function cachedNetworkGeoJson(network: string): Promise<Awaited<ReturnType<typeof fetchIemNetworkGeoJson>>> {
  let p = networkGeoJsonCache.get(network);
  if (!p) {
    p = fetchIemNetworkGeoJson(network).catch(e => {
      networkGeoJsonCache.delete(network);
      throw e;
    });
    networkGeoJsonCache.set(network, p);
  }
  return p;
}

function featureToStation(
  kind: IemWindStationKind,
  feature: IemNetworkGeoJsonFeature,
  epwLat: number,
  epwLng: number,
  referenceYear: number
): WindMapStation | null {
  if (feature.geometry?.type !== 'Point') return null;
  const [flon, flat] = feature.geometry.coordinates;
  const props = feature.properties;
  const sid = props.sid?.trim();
  if (!sid) return null;

  const distanceKm = haversineKm(epwLat, epwLng, flat, flon);
  return {
    kind,
    network: props.network,
    stationId: sid,
    stationName: props.sname?.trim() || sid,
    lat: flat,
    lng: flon,
    distanceKm,
    windExpectation: windExpectationForCatalogStation(kind, props, referenceYear),
    archiveBegin: props.archive_begin ?? null,
    properties: props,
  };
}

export type WindStationCatalogResult =
  | {
      kind: 'ok';
      epwLat: number;
      epwLng: number;
      asosNetwork: string | null;
      rwisNetwork: string | null;
      stations: WindMapStation[];
      rwisUnavailableNote: string | null;
      stateCode: string;
    }
  | {
      kind: 'needs_state';
      detail: string;
      epwLat: number;
      epwLng: number;
      suggestedStateCode: string | null;
    }
  | { kind: 'not_us'; detail: string }
  | { kind: 'no_coordinates'; detail: string };

export type LoadWindStationsOptions = {
  /** When the EPW header state is not a two-letter code (common for uploads). */
  stateCodeOverride?: string;
  sourceFilename?: string;
};

/**
 * Loads state ASOS + RWIS GeoJSON catalogues (cached), keeps online stations within `radiusKm` of the EPW site.
 */
export async function loadWindStationsNearEpw(
  metadata: EPWMetadata,
  radiusKm = DEFAULT_RADIUS_KM,
  referenceYear = new Date().getFullYear(),
  options?: LoadWindStationsOptions
): Promise<WindStationCatalogResult> {
  const sourceFilename = options?.sourceFilename;
  const stateOverride = options?.stateCodeOverride?.trim();

  if (!Number.isFinite(metadata.lat) || !Number.isFinite(metadata.lng)) {
    return {
      kind: 'no_coordinates',
      detail: 'This weather file is missing valid latitude/longitude, so nearby mesonet stations cannot be shown.',
    };
  }

  const epwLat = metadata.lat;
  const epwLng = metadata.lng;

  if (!epwMayUseIemWind(metadata, sourceFilename, stateOverride)) {
    return {
      kind: 'not_us',
      detail:
        'IEM wind station maps are available for U.S. EPW locations. For uploaded files, pick the state in the map dialog when coordinates are present.',
    };
  }

  const stateCode =
    (stateOverride ? normalizeUsStateCode(stateOverride) : null) ??
    resolveUsStateCodeFromMetadata(metadata, sourceFilename);

  if (!stateCode) {
    return {
      kind: 'needs_state',
      detail:
        'Choose the U.S. state for this site so mesonet ASOS/RWIS stations can be loaded (uploaded files often omit a two-letter state in the EPW header).',
      epwLat,
      epwLng,
      suggestedStateCode: guessUsStateCodeFromEpwFilename(sourceFilename),
    };
  }

  const asosNet = iemAsosNetworkForStateCode(stateCode);
  const rwisNet = iemRwisNetworkForStateCode(stateCode);

  if (!asosNet && !rwisNet) {
    return {
      kind: 'needs_state',
      detail: 'Could not resolve an IEM mesonet catalogue for that state code. Pick another state.',
      epwLat,
      epwLng,
      suggestedStateCode: stateCode,
    };
  }
  const stations: WindMapStation[] = [];
  let rwisUnavailableNote: string | null = null;

  const loads: Promise<void>[] = [];

  if (asosNet) {
    loads.push(
      cachedNetworkGeoJson(asosNet).then(gj => {
        for (const f of gj.features) {
          const st = featureToStation('asos', f, epwLat, epwLng, referenceYear);
          if (st && st.distanceKm <= radiusKm) stations.push(st);
        }
      })
    );
  }

  if (rwisNet) {
    loads.push(
      cachedNetworkGeoJson(rwisNet)
        .then(gj => {
          for (const f of gj.features) {
            const st = featureToStation('rwis', f, epwLat, epwLng, referenceYear);
            if (st && st.distanceKm <= radiusKm) stations.push(st);
          }
        })
        .catch(() => {
          rwisUnavailableNote = `No ${stationKindLabel('rwis')} catalogue (${rwisNet}) was returned for this state.`;
        })
    );
  }

  await Promise.all(loads);

  stations.sort((a, b) => a.distanceKm - b.distanceKm);

  return {
    kind: 'ok',
    epwLat,
    epwLng,
    asosNetwork: asosNet,
    rwisNetwork: rwisNet,
    stations,
    rwisUnavailableNote,
    stateCode,
  };
}

export function windMapStationToSelection(st: WindMapStation): IemWindStationSelection {
  return {
    kind: st.kind,
    network: st.network,
    stationId: st.stationId,
    stationName: st.stationName,
    distanceKm: st.distanceKm,
  };
}

export function pickDefaultWindStation(stations: WindMapStation[]): WindMapStation | null {
  const asos = stations.find(s => s.kind === 'asos');
  if (asos) return asos;
  return stations[0] ?? null;
}

export function findWindMapStation(
  stations: WindMapStation[],
  sel: IemWindStationSelection | null | undefined
): WindMapStation | null {
  if (!sel) return null;
  return (
    stations.find(s => s.stationId === sel.stationId && s.network === sel.network && s.kind === sel.kind) ?? null
  );
}
