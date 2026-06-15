import { parseEPW, type EPWDataRow, type EPWMetadata, type EPWVariable, type ParsedEPW } from './epwParser';
import { UNIT_C } from './unitConversion';

export const UPLOAD_VALUE_ID = 'uploadedValue';
/** Second uploaded 8760 series merged onto the calendar for heatmap cell label text. */
export const UPLOAD_OVERLAY_VALUE_ID = 'uploadedOverlayValue';

export interface Parsed8760Upload extends ParsedEPW {
  /** How the file was interpreted (for UI feedback). */
  parseMode: 'epw' | 'values-only' | 'tabular';
  /** Original column label when detected from a header row. */
  valueColumnLabel?: string;
}

export class Parse8760Error extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'Parse8760Error';
  }
}

const EXPECTED_HOURS = 8760;

function daysInMonth(month: number): number {
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 30;
}

function dayOfYearFromCalendar(year: number, month: number, day: number): number {
  return Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / (1000 * 60 * 60 * 24));
}

/** Synthetic TMY calendar (365 × 24 = 8760) for value-only uploads. */
export function build8760Calendar(referenceYear = 2023, timeZone = 0): EPWDataRow[] {
  const rows: EPWDataRow[] = [];
  for (let month = 1; month <= 12; month++) {
    for (let day = 1; day <= daysInMonth(month); day++) {
      for (let hour = 0; hour < 24; hour++) {
        const utcMs = Date.UTC(referenceYear, month - 1, day, hour - timeZone, 0);
        rows.push({
          date: new Date(utcMs),
          year: referenceYear,
          month,
          day,
          hour,
          minute: 0,
          dayOfYear: dayOfYearFromCalendar(referenceYear, month, day),
          [UPLOAD_VALUE_ID]: null,
        });
      }
    }
  }
  return rows;
}

function parseNumericCell(raw: string): number | null {
  const cleaned = raw.trim().replace(/^["']|["']$/g, '').replace(/,/g, '');
  if (cleaned === '' || cleaned === '—' || cleaned === '-') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function splitDelimitedLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t');
  if (line.includes(';')) return line.split(';');
  return line.split(',');
}

function isHeaderRow(cells: string[]): boolean {
  const nums = cells.map(parseNumericCell);
  const numericCount = nums.filter(v => v !== null).length;
  return numericCount < cells.length * 0.5;
}

function extractTabularRows(text: string): { rows: string[][]; header?: string[] } {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length === 0) throw new Parse8760Error('No data found in the pasted or uploaded content.');

  const matrix = lines.map(splitDelimitedLine);
  if (matrix.length === 1 && matrix[0].length >= EXPECTED_HOURS) {
    return { rows: matrix[0].map(v => [v]) };
  }

  let header: string[] | undefined;
  let body = matrix;
  if (matrix.length > 1 && isHeaderRow(matrix[0])) {
    header = matrix[0];
    body = matrix.slice(1);
  }
  return { rows: body, header };
}

function pickValueColumn(rows: string[][], header?: string[]): { colIndex: number; label: string } {
  if (rows.length === 0) throw new Parse8760Error('No data rows found.');

  const colCount = Math.max(...rows.map(r => r.length));
  if (colCount === 1) return { colIndex: 0, label: header?.[0]?.trim() || 'Uploaded values' };

  // Hour index + value (two columns)
  if (colCount === 2) {
    const firstColNumeric = rows.every(r => parseNumericCell(r[0] ?? '') !== null);
    const secondColNumeric = rows.filter(r => parseNumericCell(r[1] ?? '') !== null).length > rows.length * 0.8;
    if (firstColNumeric && secondColNumeric) {
      return { colIndex: 1, label: header?.[1]?.trim() || header?.[0]?.trim() || 'Uploaded values' };
    }
    return { colIndex: colCount - 1, label: header?.[colCount - 1]?.trim() || 'Uploaded values' };
  }

  // Datetime columns: year, month, day, hour, … value
  const hasDateTime =
    colCount >= 5 &&
    rows.slice(0, 12).every(r => {
      const y = parseNumericCell(r[0] ?? '');
      const m = parseNumericCell(r[1] ?? '');
      const d = parseNumericCell(r[2] ?? '');
      const h = parseNumericCell(r[3] ?? '');
      return y !== null && m !== null && d !== null && h !== null && m! >= 1 && m! <= 12 && d! >= 1 && d! <= 31;
    });

  if (hasDateTime) {
    const valueCol = colCount - 1;
    return { colIndex: valueCol, label: header?.[valueCol]?.trim() || 'Uploaded values' };
  }

  // Default: last numeric-heavy column
  let bestCol = colCount - 1;
  let bestScore = -1;
  for (let c = 0; c < colCount; c++) {
    const score = rows.filter(r => parseNumericCell(r[c] ?? '') !== null).length;
    if (score > bestScore) {
      bestScore = score;
      bestCol = c;
    }
  }
  return { colIndex: bestCol, label: header?.[bestCol]?.trim() || 'Uploaded values' };
}

function valuesFromTabular(text: string): { values: (number | null)[]; label: string; mode: 'values-only' | 'tabular' } {
  const { rows, header } = extractTabularRows(text);
  const { colIndex, label } = pickValueColumn(rows, header);

  if (rows.length === 1 && rows[0].length >= EXPECTED_HOURS) {
    const values = rows[0].map(c => parseNumericCell(c));
    if (values.length !== EXPECTED_HOURS) {
      throw new Parse8760Error(`Expected ${EXPECTED_HOURS} hourly values but found ${values.length}.`);
    }
    return { values, label, mode: 'values-only' };
  }

  const values: (number | null)[] = rows.map(r => parseNumericCell(r[colIndex] ?? ''));
  const finite = values.filter((v): v is number => v !== null);
  if (finite.length === 0) {
    throw new Parse8760Error('Could not find numeric values in the uploaded data.');
  }

  if (values.length !== EXPECTED_HOURS) {
    throw new Parse8760Error(
      `Expected exactly ${EXPECTED_HOURS} hourly rows but found ${values.length}. ` +
        'Paste or upload one value per hour (8760 rows), or a single row/column of 8760 numbers.'
    );
  }

  return { values, label, mode: 'tabular' };
}

function buildUploadMetadata(label: string): EPWMetadata {
  return {
    city: 'Uploaded data',
    state: '',
    country: '',
    source: label,
    wmo: '',
    lat: 0,
    lng: 0,
    timeZone: 0,
    elevation: 0,
    daylightSavings: 'unspecified',
  };
}

function buildUploadVariable(values: number[], label: string, id = UPLOAD_VALUE_ID): EPWVariable {
  const finite = values.filter(Number.isFinite);
  const min = finite.length ? Math.min(...finite) : 0;
  const max = finite.length ? Math.max(...finite) : 100;
  return {
    id,
    name: label,
    unit: '',
    min,
    max,
    category: 'Uploaded',
  };
}

/** Hourly values from a parsed upload (values-only column or EPW variable column). */
export function hourlyValuesFromParsed(parsed: Parsed8760Upload, fieldId = UPLOAD_VALUE_ID): (number | null)[] {
  return parsed.data.map(row => {
    const v = row[fieldId] as number | null | undefined;
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  });
}

/** Attach a second 8760 series for heatmap cell label text (hour index must align). */
export function mergeOverlaySeries(base: Parsed8760Upload, overlaySource: Parsed8760Upload): Parsed8760Upload {
  if (overlaySource.data.length !== base.data.length) {
    throw new Parse8760Error(
      `Overlay data has ${overlaySource.data.length} rows; expected ${base.data.length} to match the color data.`
    );
  }

  const overlayField =
    overlaySource.variables.find(v => v.id === UPLOAD_VALUE_ID)?.id ??
    overlaySource.variables[0]?.id ??
    UPLOAD_VALUE_ID;
  const values = hourlyValuesFromParsed(overlaySource, overlayField);
  const numericValues = values.filter((v): v is number => v !== null);
  const label =
    overlaySource.valueColumnLabel ??
    overlaySource.variables.find(v => v.id === overlayField)?.name ??
    'Cell labels';

  const data = base.data.map((row, i) => ({
    ...row,
    [UPLOAD_OVERLAY_VALUE_ID]: values[i] ?? null,
  }));

  const overlayVariable = buildUploadVariable(numericValues, label, UPLOAD_OVERLAY_VALUE_ID);
  const variables = [
    ...base.variables.filter(v => v.id !== UPLOAD_OVERLAY_VALUE_ID),
    overlayVariable,
  ];

  return {
    ...base,
    data,
    variables,
  };
}

function attachValuesToCalendar(values: (number | null)[], label: string): Parsed8760Upload {
  const calendar = build8760Calendar();
  const numericValues: number[] = [];

  for (let i = 0; i < EXPECTED_HOURS; i++) {
    const v = values[i] ?? null;
    calendar[i][UPLOAD_VALUE_ID] = v;
    if (v !== null) numericValues.push(v);
  }

  return {
    metadata: buildUploadMetadata(label),
    data: calendar,
    variables: [buildUploadVariable(numericValues, label)],
    parseMode: 'tabular',
    valueColumnLabel: label,
  };
}

/** Parse pasted text, CSV string, or EPW content into 8760 hourly rows. */
export function parse8760Upload(text: string): Parsed8760Upload {
  const trimmed = text.trim();
  if (!trimmed) throw new Parse8760Error('No data to parse.');

  if (/^LOCATION,/m.test(trimmed)) {
    const epw = parseEPW(trimmed);
    if (epw.data.length !== EXPECTED_HOURS) {
      throw new Parse8760Error(
        `EPW file has ${epw.data.length} hourly rows; expected ${EXPECTED_HOURS} for a full-year profile.`
      );
    }
    return { ...epw, parseMode: 'epw' };
  }

  const { values, label, mode } = valuesFromTabular(trimmed);
  const parsed = attachValuesToCalendar(values, label);
  parsed.parseMode = mode;
  return parsed;
}

/** Read a File (CSV, TSV, TXT, or XLSX) into parse8760Upload input text. */
export async function read8760UploadFile(file: File): Promise<string> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Parse8760Error('Excel workbook has no sheets.');
    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_csv(sheet);
  }
  return file.text();
}

/** Convenience: file → parsed 8760 dataset. */
export async function parse8760UploadFile(file: File): Promise<Parsed8760Upload> {
  const text = await read8760UploadFile(file);
  return parse8760Upload(text);
}

/** Detect likely temperature data for default gradient selection. */
export function inferDefaultGradientId(label: string, unit: string, min: number, max: number): string {
  const hay = `${label} ${unit}`.toLowerCase();
  if (hay.includes('utci')) {
    return 'utci-categories';
  }
  if (hay.includes('temp') || hay.includes('utci') || unit === UNIT_C || (min > -60 && max < 60)) {
    return 'temperature-comfort';
  }
  if (hay.includes('humid') || hay.includes('rh') || (min >= 0 && max <= 1.05)) {
    return 'humidity-spectrum';
  }
  if (hay.includes('wind') || hay.includes('speed')) {
    return 'wind-speed-warm';
  }
  if (hay.includes('solar') || hay.includes('radiation') || hay.includes('irradiance')) {
    return 'solar-yellow-orange';
  }
  if (hay.includes('cloud') || hay.includes('cover')) {
    return 'cloud-cover-gray';
  }
  return 'turbo';
}
