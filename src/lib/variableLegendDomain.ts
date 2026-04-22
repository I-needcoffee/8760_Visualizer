import type { EPWDataRow, EPWVariable } from './epwParser';
import { symmetricDiffBound } from './symmetricDiffDomain';

export type LegendUnitSystem = 'metric' | 'imperial';

function convertValue(
  val: number | null | undefined,
  unit: string,
  unitSystem: LegendUnitSystem,
  isDelta = false
) {
  if (val === null || val === undefined) return 0;
  if (unitSystem === 'imperial') {
    if (unit === '°C') return isDelta ? val * (9 / 5) : val * (9 / 5) + 32;
    if (unit === 'm/s') return val * 2.23694;
    if (unit === 'mm') return val / 25.4;
  }
  return val;
}

function convertUnit(unit: string, unitSystem: LegendUnitSystem) {
  if (unitSystem === 'imperial') {
    if (unit === '°C') return '°F';
    if (unit === 'm/s') return 'mph';
    if (unit === 'mm') return 'in';
  }
  return unit;
}

/** Matches `DataExplorer` / `WindExplorer` legend domain for heatmap color scales. */
export function variableLegendDomain(
  variables: EPWVariable[],
  colorVarId: string,
  unitSystem: LegendUnitSystem,
  showDifference: boolean,
  data: EPWDataRow[],
  compareData?: EPWDataRow[]
) {
  const def = variables.find(v => v.id === colorVarId) ?? variables[0];
  let min =
    def.fixedMin !== undefined
      ? convertValue(def.fixedMin, def.unit, unitSystem)
      : convertValue(def.min, def.unit, unitSystem);
  let max =
    def.fixedMax !== undefined
      ? convertValue(def.fixedMax, def.unit, unitSystem)
      : convertValue(def.max, def.unit, unitSystem);
  const unit = convertUnit(def.unit, unitSystem);

  if (showDifference && compareData) {
    const diffs = data.map((d, i) => {
      const primaryVal = d[colorVarId] as number;
      const compareVal = compareData[i]?.[colorVarId] as number;
      if (primaryVal === null || compareVal === null) return 0;
      return compareVal - primaryVal;
    });
    const bound = symmetricDiffBound(diffs);
    const half = bound > 0 ? bound : 1;
    min = convertValue(-half, def.unit, unitSystem, true);
    max = convertValue(half, def.unit, unitSystem, true);
  }
  return { colorVarDef: def, cMin: min, cMax: max, cUnit: unit };
}
