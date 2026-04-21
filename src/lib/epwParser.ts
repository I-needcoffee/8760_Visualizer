export interface EPWMetadata {
  city: string;
  state: string;
  country: string;
  source: string;
  wmo: string;
  lat: number;
  lng: number;
  timeZone: number;
  elevation: number;
}

export interface EPWDataRow {
  date: Date;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dayOfYear: number;
  [key: string]: any;
}

export interface EPWVariable {
  id: string;
  name: string;
  unit: string;
  min: number;
  max: number;
  category: string;
  fixedMin?: number;
  fixedMax?: number;
}

export const EPW_COLUMNS: { id: string; name: string; unit: string; missing: number; index: number; category: string; fixedMin?: number; fixedMax?: number }[] = [
  /** Narrow fixed domain improves contrast for typical hourly values (heatmap legend span). */
  { id: 'dryBulbTemperature', name: 'Dry Bulb Temperature', unit: '°C', missing: 99.9, index: 6, category: 'Temperature', fixedMin: 5, fixedMax: 35 },
  { id: 'dewPointTemperature', name: 'Dew Point Temperature', unit: '°C', missing: 99.9, index: 7, category: 'Temperature', fixedMin: -20, fixedMax: 30 },
  { id: 'relativeHumidity', name: 'Relative Humidity', unit: '%', missing: 999, index: 8, category: 'Humidity', fixedMin: 0, fixedMax: 100 },
  { id: 'atmosphericPressure', name: 'Atmospheric Station Pressure', unit: 'Pa', missing: 999999, index: 9, category: 'Other', fixedMin: 80000, fixedMax: 110000 },
  { id: 'extraterrestrialHorizontalRadiation', name: 'Extraterrestrial Horizontal Radiation', unit: 'Wh/m²', missing: 9999, index: 10, category: 'Solar', fixedMin: 0, fixedMax: 1200 },
  { id: 'extraterrestrialDirectNormalRadiation', name: 'Extraterrestrial Direct Normal Radiation', unit: 'Wh/m²', missing: 9999, index: 11, category: 'Solar', fixedMin: 0, fixedMax: 1400 },
  { id: 'horizontalInfraredRadiation', name: 'Horizontal Infrared Radiation Intensity', unit: 'Wh/m²', missing: 9999, index: 12, category: 'Solar', fixedMin: 150, fixedMax: 500 },
  { id: 'globalHorizontalRadiation', name: 'Global Horizontal Radiation', unit: 'Wh/m²', missing: 9999, index: 13, category: 'Solar', fixedMin: 0, fixedMax: 1200 },
  { id: 'directNormalRadiation', name: 'Direct Normal Radiation', unit: 'Wh/m²', missing: 9999, index: 14, category: 'Solar', fixedMin: 0, fixedMax: 1100 },
  { id: 'diffuseHorizontalRadiation', name: 'Diffuse Horizontal Radiation', unit: 'Wh/m²', missing: 9999, index: 15, category: 'Solar', fixedMin: 0, fixedMax: 600 },
  { id: 'globalHorizontalIlluminance', name: 'Global Horizontal Illuminance', unit: 'lux', missing: 999999, index: 16, category: 'Solar', fixedMin: 0, fixedMax: 120000 },
  { id: 'directNormalIlluminance', name: 'Direct Normal Illuminance', unit: 'lux', missing: 999999, index: 17, category: 'Solar', fixedMin: 0, fixedMax: 120000 },
  { id: 'diffuseHorizontalIlluminance', name: 'Diffuse Horizontal Illuminance', unit: 'lux', missing: 999999, index: 18, category: 'Solar', fixedMin: 0, fixedMax: 60000 },
  { id: 'zenithLuminance', name: 'Zenith Luminance', unit: 'Cd/m²', missing: 9999, index: 19, category: 'Solar', fixedMin: 0, fixedMax: 40000 },
  { id: 'windDirection', name: 'Wind Direction', unit: 'deg', missing: 999, index: 20, category: 'Wind', fixedMin: 0, fixedMax: 360 },
  /** Narrow max so typical winds use more of the gradient range. */
  { id: 'windSpeed', name: 'Wind Speed', unit: 'm/s', missing: 999, index: 21, category: 'Wind', fixedMin: 0, fixedMax: 12 },
  { id: 'totalSkyCover', name: 'Total Sky Cover', unit: 'tenths', missing: 99, index: 22, category: 'Other', fixedMin: 0, fixedMax: 10 },
  { id: 'opaqueSkyCover', name: 'Opaque Sky Cover', unit: 'tenths', missing: 99, index: 23, category: 'Other', fixedMin: 0, fixedMax: 10 },
  { id: 'visibility', name: 'Visibility', unit: 'km', missing: 9999, index: 24, category: 'Other', fixedMin: 0, fixedMax: 50 },
  { id: 'ceilingHeight', name: 'Ceiling Height', unit: 'm', missing: 99999, index: 25, category: 'Other', fixedMin: 0, fixedMax: 10000 },
  { id: 'precipitableWater', name: 'Precipitable Water', unit: 'mm', missing: 999, index: 28, category: 'Precipitation', fixedMin: 0, fixedMax: 80 },
  { id: 'aerosolOpticalDepth', name: 'Aerosol Optical Depth', unit: 'thousandths', missing: 0.999, index: 29, category: 'Other', fixedMin: 0, fixedMax: 1 },
  { id: 'snowDepth', name: 'Snow Depth', unit: 'cm', missing: 999, index: 30, category: 'Precipitation', fixedMin: 0, fixedMax: 100 },
  { id: 'daysSinceLastSnowfall', name: 'Days Since Last Snowfall', unit: 'days', missing: 99, index: 31, category: 'Precipitation', fixedMin: 0, fixedMax: 90 },
  { id: 'albedo', name: 'Albedo', unit: '', missing: 999, index: 32, category: 'Other', fixedMin: 0, fixedMax: 1 },
  { id: 'liquidPrecipitationDepth', name: 'Liquid Precipitation Depth', unit: 'mm', missing: 999, index: 33, category: 'Precipitation', fixedMin: 0, fixedMax: 50 },
  { id: 'liquidPrecipitationQuantity', name: 'Liquid Precipitation Quantity', unit: 'hr', missing: 99, index: 34, category: 'Precipitation', fixedMin: 0, fixedMax: 24 },
];

export interface ParsedEPW {
  metadata: EPWMetadata;
  data: EPWDataRow[];
  variables: EPWVariable[];
  /** Original basename when known (e.g. USA_OR_…_TMY3.epw or path inside a ZIP). */
  sourceFilename?: string;
  /** Short dataset label (TMY3, TMYx …) derived from the filename when available. */
  sourceFileLabel?: string;
}

/** Attach catalog/upload identity after `parseEPW` (mutates `parsed`). */
export function attachParsedEpwSource(
  parsed: ParsedEPW,
  sourceFilename: string,
  sourceFileLabel?: string
): void {
  parsed.sourceFilename = sourceFilename;
  if (sourceFileLabel !== undefined && sourceFileLabel.trim() !== '') {
    parsed.sourceFileLabel = sourceFileLabel.trim();
  }
}

export function parseEPW(csvString: string): ParsedEPW {
  // Detect if there are multiple LOCATION blocks (concatenated EPWs)
  const blocks = csvString.split(/(?=LOCATION,)/).filter(b => b.trim().length > 0);
  if (blocks.length > 1) {
    console.log(`Detected ${blocks.length} EPW blocks in file. Parsing the first one.`);
    return parseSingleEPW(blocks[0]);
  }
  return parseSingleEPW(csvString);
}

function parseSingleEPW(csvString: string): ParsedEPW {
  // Remove BOM if present and split into lines
  const cleanString = csvString.replace(/^\uFEFF/, '');
  const lines = cleanString.split(/\r?\n/).map(l => l.trim());
  
  // Find the LOCATION line
  let locationLineIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('LOCATION,')) {
      locationLineIndex = i;
      break;
    }
  }

  if (locationLineIndex === -1) {
    throw new Error("Invalid EPW file: Missing LOCATION header");
  }

  // Parse Header (LOCATION line)
  const headerParts = lines[locationLineIndex].split(',');
  
  const metadata: EPWMetadata = {
    city: headerParts[1]?.trim() || 'Unknown',
    state: headerParts[2]?.trim() || '',
    country: headerParts[3]?.trim() || '',
    source: headerParts[4]?.trim() || '',
    wmo: headerParts[5]?.trim() || '',
    lat: parseFloat(headerParts[6]),
    lng: parseFloat(headerParts[7]),
    timeZone: parseFloat(headerParts[8]),
    elevation: parseFloat(headerParts[9]),
  };

  const data: EPWDataRow[] = [];
  const varMinMax: Record<string, { min: number; max: number }> = {};

  EPW_COLUMNS.forEach(col => {
    varMinMax[col.id] = { min: Infinity, max: -Infinity };
  });

  // Parse Data
  for (let i = locationLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    
    const parts = line.split(',');
    // Data lines in EPW have many columns (usually 35+)
    if (parts.length < 30) continue;
    
    // Check if the first few parts are numbers (Year, Month, Day, Hour)
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    const hour = parseInt(parts[3], 10);
    const minute = parseInt(parts[4], 10);

    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour)) continue;

    // EPW hours are 1-24 (end-of-hour). We convert to 0-23 for filtering/labels.
    const jsHour = hour - 1;

    /**
     * IMPORTANT:
     * `SunCalc` expects a real UTC instant (`Date.getTime()`), but EPW timestamps are in the
     * station's local standard time (`metadata.timeZone`, hours offset from UTC).
     *
     * Many earlier bugs come from constructing `new Date(year,...)` which uses the viewer's local
     * timezone (and DST rules), causing some files to appear “time-shifted” (e.g. morning plotted as afternoon).
     *
     * Convert station-local time → UTC instant:  utc = local - tzHours.
     * (EPW timeZone is e.g. -8 for Pacific: local = UTC-8 ⇒ UTC = local - (-8) = local + 8)
     */
    const utcMs = Date.UTC(year, month - 1, day, jsHour - metadata.timeZone, minute);
    const jsDate = new Date(utcMs);

    // Calculate day of year from calendar date (stable, DST-independent).
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 0)) / oneDay);

    const row: EPWDataRow = {
      date: jsDate,
      year,
      month,
      day,
      hour: jsHour,
      minute,
      dayOfYear,
    };

    EPW_COLUMNS.forEach(col => {
      let val = parseFloat(parts[col.index]);
      // Handle missing values
      if (val === col.missing || isNaN(val)) {
        val = null as any; 
      } else {
        if (val < varMinMax[col.id].min) varMinMax[col.id].min = val;
        if (val > varMinMax[col.id].max) varMinMax[col.id].max = val;
      }
      row[col.id] = val;
    });

    data.push(row);
  }

  // Create variables list
  const variables: EPWVariable[] = EPW_COLUMNS.map(col => {
    const minMax = varMinMax[col.id];
    return {
      id: col.id,
      name: col.name,
      unit: col.unit,
      min: minMax.min === Infinity ? 0 : minMax.min,
      max: minMax.max === -Infinity ? 100 : minMax.max,
      category: col.category,
      fixedMin: col.fixedMin,
      fixedMax: col.fixedMax,
    };
  }).filter(v => v.min !== v.max || v.id === 'dryBulbTemperature'); 

  return { metadata, data, variables };
}
