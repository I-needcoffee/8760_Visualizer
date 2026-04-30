import { IEM_BASE } from './constants';
import { fetchIemGetTextWithThrottleRetry } from './iemFetchRetry';
import { runSerializedIem } from './iemThrottle';

export interface IemAsosWindRequest {
  stationId: string;
  stsUtcIso: string;
  etsUtcIso: string;
  /** Passed to asos.py `tz`; use UTC when aligning to EPW-derived UTC slots. */
  resultTimeZone?: 'UTC' | string;
}

/**
 * Hourly-aligned routine METAR (report_type 3): one sample per nominal hour (~:54 past).
 * @see https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?help
 */
export function iemAsosWindUrl(req: IemAsosWindRequest): string {
  const u = new URL(`${IEM_BASE}/cgi-bin/request/asos.py`);
  u.searchParams.append('station', req.stationId);
  u.searchParams.append('data', 'sknt');
  u.searchParams.append('data', 'drct');
  u.searchParams.set('sts', req.stsUtcIso);
  u.searchParams.set('ets', req.etsUtcIso);
  u.searchParams.set('tz', req.resultTimeZone ?? 'UTC');
  u.searchParams.set('format', 'onlycomma');
  u.searchParams.set('report_type', '3');
  u.searchParams.set('missing', 'null');
  return u.toString();
}

export function fetchIemAsosWindCsv(req: IemAsosWindRequest): Promise<string> {
  const url = iemAsosWindUrl(req);
  return runSerializedIem(() => fetchIemGetTextWithThrottleRetry(url, 'IEM asos wind'));
}
