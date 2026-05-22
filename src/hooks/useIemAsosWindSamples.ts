import { useEffect, useMemo, useState } from 'react';
import type { EPWDataRow, EPWMetadata } from '../lib/epwParser';
import { fetchParsedIemWindYear } from '../lib/iem/fetchIemWindYear';
import { messageForResolvedIemWindStation, resolveIemWindStationForEpw } from '../lib/iem/resolveIemWindStation';
import type { CompareWindIemSharedControls } from '../lib/iem/windIemPrefsShared';
import type { ParsedIemWindRow } from '../lib/iem/parseAsosCsv';

export type IemAsosSamplesState =
  | {
      kind: 'epw';
      loading: false;
      samples: EPWDataRow[];
      fallbackNote: null;
    }
  | {
      kind: 'iem';
      loading: boolean;
      samples: EPWDataRow[];
      fallbackNote: string | null;
    };

function inclusiveYears(start: number, end: number): number[] {
  const lo = Math.min(start, end);
  const hi = Math.max(start, end);
  const out: number[] = [];
  for (let y = lo; y <= hi; y++) out.push(y);
  return out;
}

function samplesToEpwRows(rows: ParsedIemWindRow[]): EPWDataRow[] {
  return rows
    .filter(r => Number.isFinite(r.validMs))
    .map(r => {
      const d = new Date(r.validMs);
      const year = d.getUTCFullYear();
      const month = d.getUTCMonth() + 1;
      const day = d.getUTCDate();
      const hour = d.getUTCHours();
      return {
        date: d,
        year,
        month,
        day,
        hour,
        minute: d.getUTCMinutes(),
        dayOfYear: 0,
        windSpeed: r.windMs,
        windDirection: r.windFromDeg,
      } as EPWDataRow;
    });
}

/**
 * Fetch raw mesonet wind samples (one row per observation) for the selected IEM year range.
 * Unlike the EPW-merge path, this keeps the full distribution across years for wind rose binning.
 */
export function useIemAsosWindSamples(
  metadata: EPWMetadata | undefined,
  iem: Pick<
    CompareWindIemSharedControls,
    'source' | 'iemYearStart' | 'iemYearEnd' | 'iemStation'
  >,
  skip = false
): IemAsosSamplesState {
  const years = useMemo(() => inclusiveYears(iem.iemYearStart, iem.iemYearEnd), [iem.iemYearStart, iem.iemYearEnd]);

  const [st, setSt] = useState<IemAsosSamplesState>(() => ({
    kind: iem.source === 'iem' ? 'iem' : 'epw',
    loading: false,
    samples: [],
    fallbackNote: null,
  }));

  useEffect(() => {
    if (skip || iem.source !== 'iem') {
      setSt({ kind: 'epw', loading: false, samples: [], fallbackNote: null });
      return;
    }

    if (!metadata) {
      setSt({
        kind: 'iem',
        loading: false,
        samples: [],
        fallbackNote:
          'This chart has no EPW location metadata, so an Iowa Environmental Mesonet station match cannot be run.',
      });
      return;
    }

    if (!years.length) {
      setSt({ kind: 'iem', loading: false, samples: [], fallbackNote: 'Choose at least one valid IEM year.' });
      return;
    }

    let cancelled = false;
    setSt({ kind: 'iem', loading: true, samples: [], fallbackNote: null });

    (async () => {
      try {
        const res = await resolveIemWindStationForEpw(metadata, iem.iemStation);
        if (cancelled) return;
        if (res.kind !== 'eligible') {
          setSt({
            kind: 'iem',
            loading: false,
            samples: [],
            fallbackNote: messageForResolvedIemWindStation(res),
          });
          return;
        }

        const all: ParsedIemWindRow[] = [];
        for (const y of years) {
          const yr = await fetchParsedIemWindYear(res.selection, y);
          if (cancelled) return;
          all.push(...yr);
        }

        setSt({ kind: 'iem', loading: false, samples: samplesToEpwRows(all), fallbackNote: null });
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setSt({
          kind: 'iem',
          loading: false,
          samples: [],
          fallbackNote: `Could not load IEM wind (${msg}).`,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [skip, iem.source, iem.iemStation, metadata, years]);

  return st;
}
