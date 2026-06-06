import { get, set } from 'idb-keyval';
import type { OneBuildingKmlPin } from './oneBuildingKmlCatalog';
import { CANADA_NRC_FUTURE_KML_SOURCE_ID } from './futureNrcKmlCatalog';

const CACHE_KEY = 'canada_nrc_future_tmy_kml_pins_v1';
const CACHE_VERSION = 1;

type CachedCatalog = {
  version: number;
  savedAt: number;
  pins: OneBuildingKmlPin[];
};

export async function loadCachedCanadaNrcFuturePins(): Promise<OneBuildingKmlPin[] | null> {
  try {
    const raw = await get<CachedCatalog>(CACHE_KEY);
    if (!raw || raw.version !== CACHE_VERSION || !Array.isArray(raw.pins) || !raw.pins.length) {
      return null;
    }
    return raw.pins;
  } catch (e) {
    console.warn('Canada NRC future KML cache read failed:', e);
    return null;
  }
}

export async function saveCachedCanadaNrcFuturePins(pins: OneBuildingKmlPin[]): Promise<void> {
  if (!pins.length) return;
  try {
    const payload: CachedCatalog = {
      version: CACHE_VERSION,
      savedAt: Date.now(),
      pins,
    };
    await set(CACHE_KEY, payload);
  } catch (e) {
    console.warn('Canada NRC future KML cache write failed:', e);
  }
}

export { CANADA_NRC_FUTURE_KML_SOURCE_ID };
