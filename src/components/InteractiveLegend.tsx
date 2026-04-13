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
  fontScale = 1,
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

  return (
    <div 
      className={`border flex flex-col w-full shadow-hard-lg transition-colors ${theme === 'dark' ? 'bg-gray-800/50 border-gray-800' : 'bg-white border-gray-200'}`}
      style={{ padding: `${6 * fontScale}px`, gap: `${4 * fontScale}px`, borderRadius: `${8 * fontScale}px` }}
    >
      <div className="flex justify-between items-center px-0.5">
        <span className={`font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`} style={{ fontSize: `${10 * fontScale}px` }}>
          {isDifference ? `Δ ${variable.name}` : variable.name} ({variable.unit})
        </span>
      </div>
      
      <div className={`relative w-full rounded-full overflow-hidden flex border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`} style={{ height: `${9 * fontScale}px` }}>
        {isDifference ? (
          <div className="w-full h-full" style={{ background: `linear-gradient(to right, ${colors.join(', ')})` }} />
        ) : (
          gradientDef.colors.map((c, i) => (
            <div key={i} className="flex-1 h-full" style={{ backgroundColor: c }} />
          ))
        )}
      </div>
      
      <div className="flex justify-between px-0.5">
        {ticks.map((t, i) => (
          <span key={i} className={`font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`} style={{ fontSize: `${8.5 * fontScale}px` }}>
            {t > 0 && isDifference ? '+' : ''}{t.toFixed(t === 0 ? 0 : 1)}
          </span>
        ))}
      </div>
    </div>
  );
}
