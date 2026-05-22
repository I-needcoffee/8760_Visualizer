import { IEM_BASE } from './constants';
import { fetchIemGetTextWithThrottleRetry } from './iemFetchRetry';
import { runSerializedIem } from './iemThrottle';

export interface IemNetworkFeatureProperties {
  sid: string;
  sname?: string;
  network: string;
  state?: string;
  country?: string;
  tzname?: string | null;
  online?: boolean;
  archive_begin?: string | null;
  archive_end?: string | null;
  time_domain?: string | null;
}

export interface IemNetworkGeoJsonFeature {
  type: 'Feature';
  id?: string | number;
  properties: IemNetworkFeatureProperties;
  geometry: { type: 'Point'; coordinates: [number, number] };
}

export interface IemNetworkGeoJson {
  type: 'FeatureCollection';
  features: IemNetworkGeoJsonFeature[];
}

export function fetchIemNetworkGeoJson(network: string): Promise<IemNetworkGeoJson> {
  const u = new URL(`${IEM_BASE}/geojson/network.py`);
  u.searchParams.set('network', network);
  u.searchParams.set('only_online', '1');
  const url = u.toString();
  return runSerializedIem(async () => {
    const text = await fetchIemGetTextWithThrottleRetry(url, `IEM network geojson (${network})`);
    return JSON.parse(text) as IemNetworkGeoJson;
  });
}
