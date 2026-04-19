import type { ParsedEPW } from './epwParser';

/** Primary place line for UI (city, state). */
export function weatherPlaceLine(f: ParsedEPW): string {
  return [f.metadata.city, f.metadata.state].filter(Boolean).join(', ');
}

/** Dataset / file-type label only (TMY3, TMYx …), when known from the loaded file. */
export function weatherFileTypeLine(f: ParsedEPW): string | undefined {
  const t = f.sourceFileLabel?.trim();
  return t || undefined;
}

/** Location line for chart chrome: "City, ST · TMY3" when both place and file type are known. */
export function weatherLocationTypeCaption(f: ParsedEPW): string {
  const place = weatherPlaceLine(f);
  const label = weatherFileTypeLine(f);
  if (place && label) return `${place} · ${label}`;
  if (place) return place;
  if (label) return label;
  return '';
}

/** Full primary line for export header fallback when no basename was recorded. */
export function exportFilenameLine(f: ParsedEPW): string {
  if (f.sourceFilename?.trim()) return f.sourceFilename.trim();
  const place = weatherPlaceLine(f);
  const label = weatherFileTypeLine(f);
  if (place && label) return `${place} · ${label}.epw`;
  if (place) return `${place}.epw`;
  return 'Weather data (EPW)';
}
