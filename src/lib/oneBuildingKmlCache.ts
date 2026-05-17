import { get, set } from 'idb-keyval';
import type { OneBuildingKmlPin } from './oneBuildingKmlCatalog';
import { ONE_BUILDING_TMYX_KML_SOURCES } from './oneBuildingKmlCatalog';

const CACHE_KEY = 'onebuilding_tmyx_kml_pins_v1';
const CACHE_VERSION = 1;

type CachedCatalog = {
  version: number;
  savedAt: number;
  sourceIds: string[];
  pins: OneBuildingKmlPin[];
};

/** Load deduped TMYx pins from IndexedDB (instant map layer on repeat visits). */
export async function loadCachedOneBuildingKmlPins(): Promise<OneBuildingKmlPin[] | null> {
  try {
    const raw = await get<CachedCatalog>(CACHE_KEY);
    if (!raw || raw.version !== CACHE_VERSION || !Array.isArray(raw.pins) || !raw.pins.length) {
      return null;
    }
    const expected = ONE_BUILDING_TMYX_KML_SOURCES.map(s => s.id).join(',');
    const got = (raw.sourceIds ?? []).join(',');
    if (got !== expected) return null;
    return raw.pins;
  } catch (e) {
    console.warn('OneBuilding KML cache read failed:', e);
    return null;
  }
}

export async function saveCachedOneBuildingKmlPins(pins: OneBuildingKmlPin[]): Promise<void> {
  if (!pins.length) return;
  try {
    const payload: CachedCatalog = {
      version: CACHE_VERSION,
      savedAt: Date.now(),
      sourceIds: ONE_BUILDING_TMYX_KML_SOURCES.map(s => s.id),
      pins,
    };
    await set(CACHE_KEY, payload);
  } catch (e) {
    console.warn('OneBuilding KML cache write failed:', e);
  }
}
