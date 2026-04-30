import { useEffect, useState } from 'react';
import type { EPWDataRow, EPWMetadata } from '../lib/epwParser';
import { mergeHourlyWindFromMultiYearIemIntoEpw } from '../lib/iem/mergeEpwWind';
import { fetchParsedAsosWindYear } from '../lib/iem/fetchAsosYearWind';
import { resolveNearestUsAsosForEpw, type IemNearestUsStationResult } from '../lib/iem/resolveNearestUsAsosStation';
import type { CompareWindIemSharedControls } from '../lib/iem/windIemPrefsShared';

function messageForResolve(r: IemNearestUsStationResult): string {
  switch (r.kind) {
    case 'not_us_epw_location':
      return r.detail;
    case 'station_not_found':
      return `No online ASOS station was found in the IEM ${r.network} catalogue for this map location. IEM wind overlay is not available here yet.`;
    default:
      return '';
  }
}

export interface ResolvedIemWindState {
  /** Rows used for charts (EPW file winds, or file winds merged with IEM ASOS). */
  rows: EPWDataRow[];
  loadingIem: boolean;
  /** When user asked for IEM but we fell back to the weather file. */
  iemFallbackNote: string | null;
  /** When IEM ASOS wind is successfully merged into `rows`. */
  iemActive: boolean;
  iemStationLine: string | null;
}

const initial = (rows: EPWDataRow[]): ResolvedIemWindState => ({
  rows,
  loadingIem: false,
  iemFallbackNote: null,
  iemActive: false,
  iemStationLine: null,
});

function inclusiveYears(start: number, end: number): number[] {
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const out: number[] = [];
  for (let y = lo; y <= hi; y++) out.push(y);
  return out;
}

/**
 * Resolves optional IEM ASOS hourly wind for US sites and merges onto the EPW timeline
 * (reference calendar year(s)), otherwise returns the original EPW rows.
 */
export function useResolvedIemWindRows(
  epwRows: EPWDataRow[],
  metadata: EPWMetadata | undefined,
  iem: Pick<CompareWindIemSharedControls, 'source' | 'iemYearStart' | 'iemYearEnd'>,
  skip = false
): ResolvedIemWindState {
  const [st, setSt] = useState<ResolvedIemWindState>(() => initial(epwRows));

  useEffect(() => {
    if (skip) {
      setSt(initial(epwRows));
      return;
    }

    if (iem.source === 'epw') {
      setSt(initial(epwRows));
      return;
    }

    if (!metadata) {
      setSt({
        rows: epwRows,
        loadingIem: false,
        iemFallbackNote:
          'This chart has no EPW location metadata, so an Iowa Environmental Mesonet (IEM) ASOS match cannot be run. Using wind from the weather file.',
        iemActive: false,
        iemStationLine: null,
      });
      return;
    }

    const years = inclusiveYears(iem.iemYearStart, iem.iemYearEnd);
    if (years.length === 0) {
      setSt({
        rows: epwRows,
        loadingIem: false,
        iemFallbackNote: 'Choose at least one valid IEM year.',
        iemActive: false,
        iemStationLine: null,
      });
      return;
    }

    let cancelled = false;
    setSt({
      rows: epwRows,
      loadingIem: true,
      iemFallbackNote: null,
      iemActive: false,
      iemStationLine: null,
    });

    (async () => {
      try {
        const res = await resolveNearestUsAsosForEpw(metadata);
        if (cancelled) return;

        if (res.kind !== 'eligible') {
          setSt({
            rows: epwRows,
            loadingIem: false,
            iemFallbackNote: messageForResolve(res),
            iemActive: false,
            iemStationLine: null,
          });
          return;
        }

        const asosByYear = new Map<number, Awaited<ReturnType<typeof fetchParsedAsosWindYear>>>();
        for (const y of years) {
          const asos = await fetchParsedAsosWindYear(res.stationId, y);
          if (cancelled) return;
          asosByYear.set(y, asos);
        }

        const merged = mergeHourlyWindFromMultiYearIemIntoEpw(epwRows, metadata, years, asosByYear);
        const nm = res.stationName ? ` (${res.stationName})` : '';
        const yLo = years[0]!;
        const yHi = years[years.length - 1]!;
        const rangeLabel = yLo === yHi ? `${yLo}` : `${yLo}–${yHi}`;
        const compositeNote =
          years.length > 1 ? ` · ${years.length}-year vector mean (UTC hour matched per year)` : ` · UTC-aligned to EPW clock`;

        const stationLine = `Nearest IEM ASOS: ${res.stationId}${nm} · ~${res.distanceKm.toFixed(1)} km · ${rangeLabel}${compositeNote}`;

        setSt({
          rows: merged,
          loadingIem: false,
          iemFallbackNote: null,
          iemActive: true,
          iemStationLine: stationLine,
        });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setSt({
          rows: epwRows,
          loadingIem: false,
          iemFallbackNote: `Could not load IEM ASOS wind (${msg}). Using wind from the weather file.`,
          iemActive: false,
          iemStationLine: null,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [skip, iem.source, iem.iemYearStart, iem.iemYearEnd, metadata, epwRows]);

  return st;
}
