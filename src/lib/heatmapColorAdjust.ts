import * as d3 from 'd3';
import type { EPWVariable } from './epwParser';

/** Push dry “orange” bias further across RH values; blues begin ramping strongly after ~25%. */
export function humiditySpectrumParameter(value: number, domainMin: number, domainMax: number): number {
  if (!(domainMax > domainMin)) return 0;
  let x = (value - domainMin) / (domainMax - domainMin);
  x = Math.max(0, Math.min(1, x));

  const pivotRh = 25;
  const pivotNorm = Math.max(0, Math.min(1, (pivotRh - domainMin) / (domainMax - domainMin)));

  /** Share of the basis ramp spent in the orange-forward segment — lower = more RH range in blue→violet. */
  const orangeBiasSpan = 0.28;

  if (x <= pivotNorm || pivotNorm < 1e-9) {
    const denom = Math.max(pivotNorm, 1e-9);
    return (x / denom) * orangeBiasSpan;
  }
  return orangeBiasSpan + ((x - pivotNorm) / (1 - pivotNorm)) * (1 - orangeBiasSpan);
}

/** Sequential heatmap coloring (difference mode keeps its own diverging scale in chart code). */
export function sequentialHeatmapColorFn(
  colors: readonly string[],
  colorVarDef: EPWVariable,
  cMin: number,
  cMax: number
): (value: number) => string {
  const basis = d3.interpolateRgbBasis([...colors]);
  if (colorVarDef.id === 'relativeHumidity') {
    /** Full basis to 100% RH: humid end is strong but not near‑black blue. */
    return v => basis(humiditySpectrumParameter(v, cMin, cMax));
  }
  const lin = d3.scaleLinear<number>().domain([cMin, cMax]).range([0, 1]).clamp(true);
  return v => basis(lin(v));
}
