import * as d3 from 'd3';
import type { EPWVariable } from './epwParser';

/** Five legend tick values (Wh/m²) for direct normal radiation. */
export const DIRECT_NORMAL_RADIATION_LEGEND_TICKS = [0, 250, 500, 750, 1000] as const;

/**
 * Direct normal radiation (Wh/m²): light grey at 0, yellow from ~250, dark orange at 1000.
 */
export function directNormalRadiationParameter(value: number, _domainMin: number, domainMax: number): number {
  const knots: { v: number; t: number }[] = [
    { v: 0, t: 0 },
    { v: 150, t: 0.18 },
    { v: 250, t: 0.32 },
    { v: 500, t: 0.5 },
    { v: 700, t: 0.64 },
    { v: 850, t: 0.78 },
    { v: 1000, t: 1 },
  ];

  const refMax = 1000;
  const scale = domainMax > 0 && Math.abs(domainMax - refMax) > 1 ? domainMax / refMax : 1;
  const x = Math.max(0, Math.min(domainMax, value));

  const vAt = (refV: number) => Math.min(domainMax, refV * scale);

  if (x <= vAt(knots[0]!.v)) return knots[0]!.t;

  for (let i = 1; i < knots.length; i++) {
    const hi = knots[i]!;
    const lo = knots[i - 1]!;
    const vHi = vAt(hi.v);
    if (x <= vHi) {
      const vLo = vAt(lo.v);
      const span = vHi - vLo;
      const f = span > 1e-9 ? (x - vLo) / span : 0;
      return lo.t + f * (hi.t - lo.t);
    }
  }

  return 1;
}

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
  if (colorVarDef.id === 'directNormalRadiation') {
    return v => basis(directNormalRadiationParameter(v, cMin, cMax));
  }
  const lin = d3.scaleLinear<number>().domain([cMin, cMax]).range([0, 1]).clamp(true);
  return v => basis(lin(v));
}
