import React from 'react';
import { EPWVariable } from '../lib/epwParser';
import * as d3 from 'd3';

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
}

export function InteractiveLegend({ 
  variable, 
  gradientId, 
  setGradientId, 
  gradients, 
  theme = 'light',
  fontScale = 0.72,
  isDifference = false
}: InteractiveLegendProps & { theme?: 'light' | 'dark' }) {
  const gradientDef = gradients.find(g => g.id === gradientId) || gradients[0];
  
  // Create a continuous color scale for the legend ticks
  let colors = gradientDef.colors;
  let domain = [variable.min, variable.max];

  if (isDifference) {
    // For difference mode, we use a fixed Blue-White-Red scale
    colors = ["#3b82f6", theme === 'dark' ? "#1f2937" : "#ffffff", "#ef4444"];
    domain = [variable.min, 0, variable.max];
  }

  const ticks = d3.ticks(variable.min, variable.max, 5);

  const pad = 3 * fontScale;
  const gap = 2 * fontScale;
  const titlePx = 8 * fontScale;
  const tickPx = 7 * fontScale;
  const barH = 5 * fontScale;

  return (
    <div
      className={`flex flex-col w-full select-none ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}
      style={{ padding: `${pad}px`, gap: `${gap}px` }}
    >
      <div className="flex justify-between items-center min-w-0 gap-1">
        <span
          className="font-semibold uppercase tracking-wide truncate leading-tight"
          style={{ fontSize: `${titlePx}px` }}
        >
          {isDifference ? `Δ ${variable.name}` : variable.name} ({variable.unit})
        </span>
      </div>

      <div
        className="relative w-full rounded-sm overflow-hidden flex"
        style={{ height: `${barH}px` }}
      >
        {isDifference ? (
          <div className="w-full h-full" style={{ background: `linear-gradient(to right, ${colors.join(', ')})` }} />
        ) : (
          gradientDef.colors.map((c, i) => (
            <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
          ))
        )}
      </div>

      <div className="flex justify-between gap-0.5 min-w-0">
        {ticks.map((t, i) => (
          <span
            key={i}
            className={`tabular-nums shrink-0 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}
            style={{ fontSize: `${tickPx}px` }}
          >
            {t > 0 && isDifference ? '+' : ''}
            {t.toFixed(t === 0 ? 0 : 1)}
          </span>
        ))}
      </div>
    </div>
  );
}
