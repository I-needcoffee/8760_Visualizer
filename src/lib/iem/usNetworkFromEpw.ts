import type { EPWMetadata } from '../epwParser';
import {
  metadataLooksUnitedStates,
  metadataOrFilenameLooksUnitedStates,
  normalizeUsStateCode,
  resolveUsStateCodeFromMetadata,
} from './usStateCodes';

export {
  metadataLooksUnitedStates,
  metadataOrFilenameLooksUnitedStates,
  normalizeUsStateCode,
  resolveUsStateCodeFromMetadata,
} from './usStateCodes';

export function iemAsosNetworkForStateCode(stateCode: string): string | null {
  const st = normalizeUsStateCode(stateCode);
  if (!st) return null;
  return `${st}_ASOS`;
}

export function iemRwisNetworkForStateCode(stateCode: string): string | null {
  const st = normalizeUsStateCode(stateCode);
  if (!st) return null;
  return `${st}_RWIS`;
}

/**
 * IEM organizes CONUS (and territory) airports under `{STATE}_ASOS`. Returns e.g. `NY_ASOS`, or null when the
 * EPW header does not look like US or `state` is not a two-letter code (unless normalized from a full name).
 */
export function iemAsosNetworkForUsEpw(
  metadata: EPWMetadata,
  sourceFilename?: string
): string | null {
  if (!metadataOrFilenameLooksUnitedStates(metadata, sourceFilename)) return null;
  const st = resolveUsStateCodeFromMetadata(metadata, sourceFilename);
  if (!st) return null;
  return iemAsosNetworkForStateCode(st);
}

/** State RWIS catalogue on IEM (e.g. `IA_RWIS`, `MN_RWIS`). */
export function iemRwisNetworkForUsEpw(
  metadata: EPWMetadata,
  sourceFilename?: string
): string | null {
  if (!metadataOrFilenameLooksUnitedStates(metadata, sourceFilename)) return null;
  const st = resolveUsStateCodeFromMetadata(metadata, sourceFilename);
  if (!st) return null;
  return iemRwisNetworkForStateCode(st);
}
