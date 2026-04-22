import * as d3 from 'd3';
import { EPWDataRow } from './epwParser';

export type DataExplorerAggregation = 'hour' | 'day' | 'week' | 'month';

/**
 * Per-cell display-space Δ values, matching the heatmap’s aggregation
 * (month/week = group-mean diffs; day/hour = per-row diffs after unit conversion).
 *
 * @param data Master EPW table — `compareData` and `data.indexOf(row)` are keyed by the same
 *  ordering as the primary file.
 * @param groupSource Rows used to build month/week groups and the day/hour series (defaults
 *  to `data`). **Wind** passes filtered rows so the domain matches a heatmap that aggregates
 *  only the filtered slice.
 */
export function dataExplorerDiffValuesForAggregation(
  aggregation: DataExplorerAggregation,
  data: EPWDataRow[],
  compareData: EPWDataRow[],
  colorVar: string,
  baseUnit: string,
  convertValue: (val: number | null | undefined, unit: string, isDelta?: boolean) => number,
  groupSource: EPWDataRow[] = data
): number[] {
  const out: number[] = [];

  if (aggregation === 'month') {
    const groups = d3.group(groupSource, d => d.month, d => d.hour);
    Array.from(groups).forEach(([, hourGroups]) => {
      Array.from(hourGroups).forEach(([, values]) => {
        const primaryAvg = d3.mean(values, d => d[colorVar] as number) || 0;
        const compareValues = values
          .map((v) => {
            const idx = data.indexOf(v);
            return compareData[idx]?.[colorVar] as number;
          })
          .filter((v) => v !== null);
        const compareAvg = d3.mean(compareValues) || 0;
        out.push(convertValue(compareAvg - primaryAvg, baseUnit, true));
      });
    });
  } else if (aggregation === 'week') {
    const groups = d3.group(groupSource, d => Math.floor((d.dayOfYear - 1) / 7), d => d.hour);
    Array.from(groups).forEach(([, hourGroups]) => {
      Array.from(hourGroups).forEach(([, values]) => {
        const primaryAvg = d3.mean(values, d => d[colorVar] as number) || 0;
        const compareValues = values
          .map((v) => {
            const idx = data.indexOf(v);
            return compareData[idx]?.[colorVar] as number;
          })
          .filter((v) => v !== null);
        const compareAvg = d3.mean(compareValues) || 0;
        out.push(convertValue(compareAvg - primaryAvg, baseUnit, true));
      });
    });
  } else {
    groupSource.forEach((d) => {
      const i = data.indexOf(d);
      out.push(
        convertValue(
          (compareData[i]?.[colorVar] as number || 0) - (d[colorVar] as number || 0),
          baseUnit,
          true
        )
      );
    });
  }

  return out;
}
