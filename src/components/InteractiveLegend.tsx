import React from 'react';
import { EPWVariable } from '../lib/epwParser';
import * as d3 from 'd3';

/** Matches `DataExplorer` bar rects (`.style("opacity", 0.6)` on filled bars). */
const LEGEND_FILL_OPACITY = 0.6;

function legendSurface(theme: 'light' | 'dark') {
  return theme === 'dark' ? '#111827' : '#ffffff';
}

function blendOnto(surfaceHex: string, colorHex: string, opacity: number) {
  const a = Math.max(0, Math.min(1, opacity));
  const S = d3.rgb(surfaceHex);
  const C = d3.rgb(colorHex);
  return d3
    .rgb(
      Math.round(C.r * a + S.r * (1 - a)),
      Math.round(C.g * a + S.g * (1 - a)),
      Math.round(C.b * a + S.b * (1 - a))
    )
    .formatHex();
}

/** Shared pill height for `InteractiveLegend` and UTCI footer strips (tweak both together). */
export function getLegendBarHeightPx(scale: number) {
  return Math.max(9, Math.round(16 * scale));
}

export interface GradientDef {
  id: string;
  name: string;
  colors: string[];
}

interface InteractiveLegendProps {
  variable: EPWVariable;
  gradientId: string;
  setGradientId: (id: string) => void;
  gradients: GradientDef[];
  fontScale?: number;
  isDifference?: boolean;
  /** Optional DOM id for onboarding / scroll targets (tutorial layout). */
  domId?: string;
}

export function InteractiveLegend({ 
  variable, 
  gradientId, 
  setGradientId, 
  gradients, 
  theme = 'light',
  fontScale = 0.72,
  isDifference = false,
  domId,
}: InteractiveLegendProps & { theme?: 'light' | 'dark' }) {
  const gradientDef = gradients.find(g => g.id === gradientId) || gradients[0];
  
  // Colors used for segment rendering and contrast calc.
  let colors = gradientDef.colors;
  let domain = [variable.min, variable.max];

  if (isDifference) {
    // For difference mode, we use a fixed Blue-White-Red scale
    colors = ["#3b82f6", theme === 'dark' ? "#1f2937" : "#ffffff", "#ef4444"];
    domain = [variable.min, 0, variable.max];
  }

  const pad = 3 * fontScale;
  const gap = 2 * fontScale;
  const barH = getLegendBarHeightPx(fontScale);
  const barBg = legendSurface(theme);

  const contrastText = (bg: string) => {
    const c = d3.color(bg);
    if (!c) return theme === 'dark' ? '#fff' : '#000';
    const rgb = c.rgb();
    const toLin = (v: number) => {
      const s = v / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    const L = 0.2126 * toLin(rgb.r) + 0.7152 * toLin(rgb.g) + 0.0722 * toLin(rgb.b);
    return L < 0.5 ? '#fff' : '#111827';
  };

  const formatValue = (v: number) => {
    if (isDifference && v > 0) return `+${v.toFixed(v === 0 ? 0 : 1)}`;
    return v.toFixed(v === 0 ? 0 : 1);
  };

  // Build one label per segment and center it in that segment.
  const segColors = colors.length > 0 ? colors : ['#999'];
  const segLabels = (() => {
    const n = segColors.length;
    if (isDifference && domain.length === 3 && n === 3) {
      return [domain[0], domain[1], domain[2]].map(formatValue);
    }
    if (n === 1) return [formatValue(variable.min)];
    const min = variable.min;
    const max = variable.max;
    return Array.from({ length: n }, (_, i) => {
      const t = min + ((max - min) * i) / (n - 1);
      return formatValue(t);
    });
  })();

  // Max text size that still fits in the pill segments.
  const labelBasePx = Math.max(8 * fontScale, Math.floor(barH * 0.56));

  return (
    <div
      id={domId}
      className={`flex w-full select-none flex-col ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
      style={{ padding: `${pad}px`, gap: `${gap}px` }}
    >
      <div
        className={`relative w-full overflow-hidden rounded-full border ${
          theme === 'dark' ? 'border-gray-700 bg-[#111827]' : 'border-gray-200 bg-white'
        }`}
        style={{ height: `${barH}px` }}
      >
        <div className="absolute inset-0" style={{ backgroundColor: barBg }} />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(to right, ${segColors.join(', ')})`,
            opacity: LEGEND_FILL_OPACITY,
          }}
        />

        {segLabels.map((label, i) => {
          const n = Math.max(1, segColors.length);
          const rawAtCenter = d3.interpolateRgbBasis(segColors)((i + 0.5) / n);
          const blended = blendOnto(barBg, rawAtCenter, LEGEND_FILL_OPACITY);
          const fg = contrastText(blended);
          const shadow =
            fg === '#fff'
              ? '0 1px 2px rgba(0,0,0,0.35)'
              : '0 1px 2px rgba(255,255,255,0.35)';
          const len = Math.max(1, label.length);
          const fitFactor = Math.min(1, 6 / len);
          const labelPx = Math.max(7 * fontScale, Math.floor(labelBasePx * fitFactor));
          return (
            <span
              key={i}
              className="absolute top-1/2 tabular-nums font-normal leading-none"
              style={{
                left: `${((i + 0.5) / n) * 100}%`,
                transform: 'translate(-50%, -50%)',
                fontSize: `${labelPx}px`,
                color: fg,
                textShadow: shadow,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'clip',
                maxWidth: `${100 / n}%`,
                textAlign: 'center',
              }}
            >
              {label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
