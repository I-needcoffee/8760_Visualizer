import type { GradientDef } from '../components/InteractiveLegend';
import type { EPWVariable } from './epwParser';

const BUILTIN_IDS = new Set([
  'temperature-comfort',
  'humidity-spectrum',
  'solar-yellow-orange',
  'direct-normal-radiation',
  'wind-intensity-blue',
  'wind-speed-warm',
  'cloud-cover-gray',
  'turbo',
  'magma',
  'viridis',
  'coolwarm',
  'utci-categories',
]);

function customGradients(gradients: GradientDef[]) {
  return gradients.filter(g => !BUILTIN_IDS.has(g.id));
}

function allowIds(ids: string[], gradients: GradientDef[]) {
  const byId = new Map(gradients.map(g => [g.id, g] as const));
  return ids.map(id => byId.get(id)).filter(Boolean) as GradientDef[];
}

export function gradientsForVariable(
  variableId: string,
  variables: EPWVariable[],
  gradients: GradientDef[]
): GradientDef[] {
  const def = variables.find(v => v.id === variableId);
  if (!def) return [...allowIds(['temperature-comfort'], gradients), ...customGradients(gradients)];

  // Explicit overrides for “special” variables.
  if (variableId === 'windDirection') {
    return [...allowIds(['turbo'], gradients), ...customGradients(gradients)];
  }
  if (variableId === 'totalSkyCover' || variableId === 'opaqueSkyCover') {
    return [...allowIds(['cloud-cover-gray'], gradients), ...customGradients(gradients)];
  }
  if (variableId === 'directNormalRadiation') {
    return [...allowIds(['direct-normal-radiation', 'solar-yellow-orange'], gradients), ...customGradients(gradients)];
  }

  // Category defaults.
  const cat = def.category;
  if (cat === 'Temperature' || cat === 'Comfort') {
    return [...allowIds(['temperature-comfort'], gradients), ...customGradients(gradients)];
  }
  if (cat === 'Humidity') {
    return [...allowIds(['humidity-spectrum'], gradients), ...customGradients(gradients)];
  }
  if (cat === 'Solar') {
    return [...allowIds(['solar-yellow-orange'], gradients), ...customGradients(gradients)];
  }
  if (cat === 'Wind') {
    return [...allowIds(['wind-intensity-blue'], gradients), ...customGradients(gradients)];
  }
  if (cat === 'Uploaded') {
    return [
      ...allowIds(
        ['temperature-comfort', 'humidity-spectrum', 'wind-speed-warm', 'solar-yellow-orange', 'cloud-cover-gray', 'coolwarm', 'viridis', 'magma', 'utci-categories'],
        gradients
      ),
      ...customGradients(gradients),
    ];
  }

  // Fallback: just show customs + a safe default.
  return [...allowIds(['temperature-comfort'], gradients), ...customGradients(gradients)];
}

export function gradientsForUtci(gradients: GradientDef[]): GradientDef[] {
  return [...allowIds(['temperature-comfort'], gradients), ...customGradients(gradients)];
}

