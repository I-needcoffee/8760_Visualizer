import type { EPWMetadata } from '../epwParser';

const US_VARIANTS = new Set(['USA', 'US', 'U.S.A.', 'U.S.A', 'UNITED STATES', 'UNITED STATES OF AMERICA']);

function metadataLooksUnitedStates(metadata: EPWMetadata): boolean {
  const country = metadata.country.trim().toUpperCase();
  if (US_VARIANTS.has(country)) return true;
  if (/\bUNITED STATES\b/.test(metadata.country.toUpperCase())) return true;
  if (/\bU\.?\s*S\.?\s*A\.?\b/i.test(metadata.country.trim())) return true;
  return false;
}

/**
 * IEM organizes CONUS (and territory) airports under `{STATE}_ASOS`. Returns e.g. `NY_ASOS`, or null when the
 * EPW header does not look like US or `state` is not a two-letter code.
 */
export function iemAsosNetworkForUsEpw(metadata: EPWMetadata): string | null {
  if (!metadataLooksUnitedStates(metadata)) return null;

  const st = metadata.state.trim().toUpperCase();
  if (st.length !== 2) return null;
  return `${st}_ASOS`;
}

/** State RWIS catalogue on IEM (e.g. `IA_RWIS`, `MN_RWIS`). */
export function iemRwisNetworkForUsEpw(metadata: EPWMetadata): string | null {
  if (!metadataLooksUnitedStates(metadata)) return null;

  const st = metadata.state.trim().toUpperCase();
  if (st.length !== 2) return null;
  return `${st}_RWIS`;
}
