import type { EPWMetadata } from '../epwParser';

const US_VARIANTS = new Set(['USA', 'US', 'U.S.A.', 'U.S.A', 'UNITED STATES', 'UNITED STATES OF AMERICA']);

/** CONUS + DC (+ common territories with IEM catalogues). */
export const US_STATE_OPTIONS: readonly { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const NAME_TO_CODE = new Map<string, string>();
for (const row of US_STATE_OPTIONS) {
  NAME_TO_CODE.set(row.name.toUpperCase(), row.code);
  NAME_TO_CODE.set(row.code, row.code);
}

/** Normalize full state name, abbreviation, or `California-CA` style strings to a two-letter code. */
export function normalizeUsStateCode(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper) && NAME_TO_CODE.has(upper)) return upper;

  const suffix = upper.match(/(?:^|[-\s])([A-Z]{2})$/);
  if (suffix?.[1] && NAME_TO_CODE.has(suffix[1])) return suffix[1];

  const direct = NAME_TO_CODE.get(upper);
  if (direct) return direct;

  const withoutPunct = upper.replace(/[^A-Z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return NAME_TO_CODE.get(withoutPunct) ?? null;
}

export function guessUsStateCodeFromEpwFilename(filename?: string): string | null {
  if (!filename) return null;
  const base = filename.split(/[/\\]/).pop()?.replace(/\.epw$/i, '') ?? '';
  const atStart = base.match(/^USA_([A-Z]{2})_/i);
  if (atStart?.[1]) return normalizeUsStateCode(atStart[1]);
  const anywhere = base.match(/USA_([A-Z]{2})_/i);
  if (anywhere?.[1]) return normalizeUsStateCode(anywhere[1]);
  return null;
}

const NON_US_COUNTRY_MARKERS = new Set([
  'CAN',
  'CANADA',
  'MEX',
  'MEXICO',
  'GBR',
  'UK',
  'AUS',
  'AUSTRALIA',
  'DEU',
  'GERMANY',
  'FRA',
  'FRANCE',
  'JPN',
  'JAPAN',
  'CHN',
  'CHINA',
  'IND',
  'INDIA',
]);

/** True when the EPW header country clearly refers to a non-U.S. nation. */
export function metadataLooksClearlyNonUs(metadata: EPWMetadata): boolean {
  const country = metadata.country.trim();
  if (!country || country === '-' || /^n\/?a$/i.test(country) || /^unknown$/i.test(country)) {
    return false;
  }
  const upper = country.toUpperCase();
  if (metadataLooksUnitedStates(metadata)) return false;
  if (NON_US_COUNTRY_MARKERS.has(upper)) return true;
  if (/^CANADA\b/.test(upper)) return true;
  if (/^MEXICO\b/.test(upper)) return true;
  // ISO-style codes that are not U.S.
  if (/^[A-Z]{2,3}$/.test(upper) && !US_VARIANTS.has(upper)) return true;
  return false;
}

/**
 * Whether IEM mesonet wind may apply: explicit U.S. metadata/filename, user-picked state,
 * or ambiguous uploads with coordinates (user chooses state in the picker).
 */
export function epwMayUseIemWind(
  metadata: EPWMetadata,
  sourceFilename?: string,
  stateCodeOverride?: string
): boolean {
  if (stateCodeOverride?.trim()) return true;
  if (metadataOrFilenameLooksUnitedStates(metadata, sourceFilename)) return true;
  if (metadataLooksClearlyNonUs(metadata)) return false;
  return Number.isFinite(metadata.lat) && Number.isFinite(metadata.lng);
}

export function metadataLooksUnitedStates(metadata: EPWMetadata): boolean {
  const country = metadata.country.trim().toUpperCase();
  if (US_VARIANTS.has(country)) return true;
  if (/\bUNITED STATES\b/.test(metadata.country.toUpperCase())) return true;
  if (/\bU\.?\s*S\.?\s*A\.?\b/i.test(metadata.country.trim())) return true;
  return false;
}

export function metadataOrFilenameLooksUnitedStates(
  metadata: EPWMetadata,
  sourceFilename?: string
): boolean {
  if (metadataLooksUnitedStates(metadata)) return true;
  return !!guessUsStateCodeFromEpwFilename(sourceFilename);
}

export function resolveUsStateCodeFromMetadata(
  metadata: EPWMetadata,
  sourceFilename?: string
): string | null {
  return (
    normalizeUsStateCode(metadata.state) ?? guessUsStateCodeFromEpwFilename(sourceFilename)
  );
}
