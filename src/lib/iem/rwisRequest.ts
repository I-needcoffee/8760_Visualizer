import { IEM_BASE } from './constants';
import { fetchIemGetTextWithThrottleRetry } from './iemFetchRetry';
import { runSerializedIem } from './iemThrottle';

export interface IemRwisWindRequest {
  network: string;
  stationId: string;
  stsUtcIso: string;
  etsUtcIso: string;
  resultTimeZone?: 'UTC' | string;
}

/**
 * @see https://mesonet.agron.iastate.edu/cgi-bin/request/rwis.py?help
 */
export function iemRwisWindUrl(req: IemRwisWindRequest): string {
  const u = new URL(`${IEM_BASE}/cgi-bin/request/rwis.py`);
  u.searchParams.set('network', req.network);
  u.searchParams.append('stations', req.stationId);
  u.searchParams.set('sts', req.stsUtcIso);
  u.searchParams.set('ets', req.etsUtcIso);
  u.searchParams.append('vars', 'sknt');
  u.searchParams.append('vars', 'drct');
  u.searchParams.set('src', 'atmos');
  u.searchParams.set('what', 'txt');
  u.searchParams.set('tz', req.resultTimeZone ?? 'UTC');
  return u.toString();
}

export function fetchIemRwisWindCsv(req: IemRwisWindRequest): Promise<string> {
  const url = iemRwisWindUrl(req);
  return runSerializedIem(() => fetchIemGetTextWithThrottleRetry(url, 'IEM rwis wind'));
}
