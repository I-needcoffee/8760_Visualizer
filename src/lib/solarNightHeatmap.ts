import SunCalc from 'suncalc';

/** Grey overlay alpha (matches Plotly-style night shading over solar heatmaps). */
export function solarNightOverlayRgba(theme: 'light' | 'dark'): string {
  return theme === 'dark' ? 'rgba(38,38,46,0.58)' : 'rgba(105,105,112,0.46)';
}

export function sunAltitudeDeg(lat: number, lng: number, when: Date): number {
  const pos = SunCalc.getPosition(when, lat, lng);
  return (pos.altitude * 180) / Math.PI;
}

/**
 * EPW row timestamps are wall-clock at the weather station in **standard time** per the
 * LOCATION `timeZone` field (hours east of Greenwich; negative west), matching EnergyPlus.
 * Typical TMY files **do not shift for daylight saving** — hours stay on that fixed offset
 * year-round. We do not apply tzdata DST rules here; if a given EPW used clock time with DST,
 * shading could differ slightly near transition dates.
 *
 * Convert station wall time to a UTC `Date` for SunCalc (which uses absolute epoch time).
 */
export function utcInstantFromEpwStationClock(params: {
  year: number;
  month: number;
  day: number;
  /** 0–23 after EPW hour 1→0 mapping in the parser. */
  jsHour: number;
  /** LOCATION time zone (hours east of Greenwich; negative west). */
  timeZoneHours: number;
  /**
   * Minute within that wall-clock hour. EPW reports hourly blocks; **:30** matches the usual
   * mid-interval sample and avoids a systematic ±1h mismatch vs aggregated radiation.
   */
  minute?: number;
}): Date {
  const minute = params.minute ?? 30;
  const { year, month, day, jsHour, timeZoneHours } = params;
  return new Date(Date.UTC(year, month - 1, day, jsHour - timeZoneHours, minute, 0, 0));
}

/** True when the sun is at or below the horizon at this EPW station instant. */
export function isSolarNightEpwStation(
  lat: number,
  lng: number,
  params: Parameters<typeof utcInstantFromEpwStationClock>[0]
): boolean {
  const when = utcInstantFromEpwStationClock(params);
  return sunAltitudeDeg(lat, lng, when) <= 0;
}
