import type { GradientDef } from '../components/InteractiveLegend';
import type { EPWVariable } from './epwParser';

/** EPW column id → preset gradient (overrides category). */
const VARIABLE_GRADIENT: Record<string, string> = {
  totalSkyCover: 'cloud-cover-gray',
  opaqueSkyCover: 'cloud-cover-gray',
  /** Compass direction: sequential wind palette is misleading; use a multi-hue ramp. */
  windDirection: 'turbo',
};

/** Variable category → default gradient when encoding that quantity. */
const CATEGORY_GRADIENT: Record<string, string> = {
  Temperature: 'temperature-comfort',
  Humidity: 'humidity-spectrum',
  Solar: 'solar-yellow-orange',
  Wind: 'wind-intensity-blue',
};

function firstAvailableGradientId(gradients: GradientDef[], preferred: string): string {
  if (gradients.some(g => g.id === preferred)) return preferred;
  return gradients[0]?.id ?? preferred;
}

/**
 * Choose a sensible default palette for the EPW column used as the color encoding.
 * Used when the user changes the variable on Data/Wind/Sun Path/Wind Rose cards.
 */
export function defaultGradientIdForVariable(
  variableId: string,
  variables: EPWVariable[],
  gradients: GradientDef[]
): string {
  const byVar = VARIABLE_GRADIENT[variableId];
  if (byVar) return firstAvailableGradientId(gradients, byVar);

  const def = variables.find(v => v.id === variableId);
  if (!def) return firstAvailableGradientId(gradients, 'temperature-comfort');

  const byCat = CATEGORY_GRADIENT[def.category];
  if (byCat) return firstAvailableGradientId(gradients, byCat);

  return firstAvailableGradientId(gradients, 'temperature-comfort');
}
