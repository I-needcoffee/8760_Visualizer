import type { EPWMetadata } from '../epwParser';
import { fetchIemNetworkGeoJson } from './geojsonNetwork';
import type { IemNetworkGeoJsonFeature } from './geojsonNetwork';
import { haversineKm } from './nearestStation';
import { iemAsosNetworkForUsEpw, iemRwisNetworkForUsEpw } from './usNetworkFromEpw';
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
    }
  | { kind: 'not_us'; detail: string }
  | { kind: 'no_coordinates'; detail: string };

/**
 * Loads state ASOS + RWIS GeoJSON catalogues (cached), keeps online stations within `radiusKm` of the EPW site.
 */
export async function loadWindStationsNearEpw(
  metadata: EPWMetadata,
  radiusKm = DEFAULT_RADIUS_KM,
  referenceYear = new Date().getFullYear()
): Promise<WindStationCatalogResult> {
  const asosNet = iemAsosNetworkForUsEpw(metadata);
  const rwisNet = iemRwisNetworkForUsEpw(metadata);

  if (!asosNet && !rwisNet) {
    return {
      kind: 'not_us',
      detail:
        'IEM wind station maps are available for U.S. EPW locations with a two-letter state code in the file header.',
    };
  }

  if (!Number.isFinite(metadata.lat) || !Number.isFinite(metadata.lng)) {
    return {
      kind: 'no_coordinates',
      detail: 'This weather file is missing valid latitude/longitude, so nearby mesonet stations cannot be shown.',
    };
  }

  const epwLat = metadata.lat;
  const epwLng = metadata.lng;
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
