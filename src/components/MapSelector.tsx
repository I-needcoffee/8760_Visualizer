import { useState, useRef, ChangeEvent, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Search, Upload, ExternalLink, Database, CloudLightning, Info, Loader2 } from 'lucide-react';
import L from 'leaflet';
import { parseEPW, ParsedEPW, attachParsedEpwSource } from '../lib/epwParser';
import { CARTO_LIGHT_ALL_WATER_HEX } from '../lib/constants';
import JSZip from 'jszip';
import { get, set } from 'idb-keyval';

// Fix Leaflet icon issue in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const smallIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [12, 20],
  iconAnchor: [6, 20],
  popupAnchor: [1, -16],
  shadowSize: [20, 20]
});

const futureIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [12, 20],
  iconAnchor: [6, 20],
  popupAnchor: [1, -16],
  shadowSize: [20, 20]
});

interface EPWLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  url?: string;
  epwData?: string; // For future weather files loaded from ZIP
  isFuture?: boolean;
  /** Basename from URL or ZIP entry */
  filename?: string;
}

/** One downloadable EPW at a map pin (e.g. TMY3 vs TMY2 for the same airport). */
interface EPWFileVariant {
  id: string;
  url?: string;
  epwData?: string;
  filename: string;
  /** Short label for buttons: TMY3, TMY2, TMYX2011, … */
  label: string;
  /** Relative to OneBuilding USA index (state folder + zip name). Loaded via zip extract. */
  oneBuildingZipPath?: string;
}

/** Stations merged when multiple catalog rows describe the same site (WMO/WBAN id or same coordinates). */
interface EPWMapGroup {
  id: string;
  lat: number;
  lng: number;
  /** Human-readable place title for the popup header */
  displayName: string;
  variants: EPWFileVariant[];
  isFuture?: boolean;
  /** `USA_OR_….AP.726980` — matches OneBuilding zip naming for extra datasets. */
  catalogStationKey?: string;
}

const ONE_BUILDING_USA_INDEX =
  'https://climate.onebuilding.org/WMO_Region_4_North_and_Central_America/USA_United_States_of_America/index.html';

const ONE_BUILDING_USA_ZIP_PREFIX =
  'https://climate.onebuilding.org/WMO_Region_4_North_and_Central_America/USA_United_States_of_America/';

interface OneBuildingZipEntry {
  relPath: string;
  label: string;
  suffix: string;
}

function epwBasenameFromUrl(url?: string): string {
  if (!url) return '';
  const path = url.split('?')[0];
  const seg = path.split('/').pop();
  return seg || '';
}

const FILE_TYPE_SUFFIX_RE =
  /_(TMYX\d{4}|TMYX|TMYx\.\d{4}-\d{4}|TMYx|TMY3|TMY2|TMY|IWEC|WYEC2|WYEC|TRY|US\.Normals\.\d{4}-\d{4})$/i;

/** Extracts TMY3 / TMY2 / TMYX2011 / … from an EnergyPlus-style basename. */
function fileTypeLabelFromBasename(basename: string): string {
  const base = basename.replace(/\.epw$/i, '');
  const m = base.match(FILE_TYPE_SUFFIX_RE);
  if (m) {
    const s = m[1];
    if (/^TMYx\.\d{4}-\d{4}$/i.test(s)) return `TMYx ${s.slice(5)}`;
    if (/^US\.Normals\./i.test(s)) return s.replace(/^US\.Normals\./i, 'Normals ');
    return s.toUpperCase();
  }
  const tail = base.split('_').pop();
  if (tail && tail.length <= 14 && !/^\d{6}$/.test(tail)) return tail.toUpperCase();
  return 'EPW';
}

function roundCoord(n: number, places = 6): number {
  const f = 10 ** places;
  return Math.round(n * f) / f;
}

/** Prefer "City, ST" from USA_XX_City… or CAN_XX_… basename; else shorten title. */
function displayNameFromGroup(arr: EPWLocation[]): string {
  const first = arr[0];
  const basename = first.filename || epwBasenameFromUrl(first.url) || '';
  if (basename) {
    let s = basename.replace(/\.epw$/i, '');
    s = s.replace(FILE_TYPE_SUFFIX_RE, '');
    const us = s.match(/^USA_([A-Z]{2})_(.+)$/i);
    if (us) {
      const city = us[2]
        .replace(/\./g, ' ')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return `${city}, ${us[1].toUpperCase()}`;
    }
    const ca = s.match(/^CAN_([A-Z]{2})_(.+)$/i);
    if (ca) {
      const city = ca[2]
        .replace(/\./g, ' ')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      return `${city}, ${ca[1].toUpperCase()}`;
    }
  }
  const t = first.name?.trim() || 'Weather station';
  if (t.length > 56) return `${t.slice(0, 54)}…`;
  return t;
}

function locationToVariant(loc: EPWLocation): EPWFileVariant {
  const filename = loc.filename || epwBasenameFromUrl(loc.url) || 'unknown.epw';
  return {
    id: loc.id,
    url: loc.url,
    epwData: loc.epwData,
    filename,
    label: fileTypeLabelFromBasename(filename),
  };
}

/** Station id line in `USA_ST_City…AP.726980` form — matches OneBuilding zip basenames. */
function catalogStationKeyFromBasename(basename: string): string | null {
  const b = basename.replace(/\.(epw|zip)$/i, '');
  if (!/^USA_/i.test(b)) return null;
  const m = b.match(/^(.+\.\d{6})_/);
  return m?.[1] ?? null;
}

function humanizeObSuffix(suffix: string): string {
  if (suffix === 'TMY3') return 'TMY3';
  if (suffix === 'TMY2') return 'TMY2';
  if (suffix === 'TMY') return 'TMY';
  if (suffix === 'TMYx') return 'TMYx (full)';
  if (suffix.startsWith('TMYx.')) return `TMYx ${suffix.slice(5)}`;
  if (suffix.startsWith('US.Normals.')) return suffix.replace(/^US\.Normals\./, 'Normals ');
  return suffix;
}

/** Parses the monolithic OneBuilding USA index HTML for `STATE/USA_….zip` links. */
function parseOneBuildingUsaIndexHtml(html: string): Map<string, OneBuildingZipEntry[]> {
  const map = new Map<string, OneBuildingZipEntry[]>();
  const re = /href="([^"]+\.zip)"/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const rel = m[1].replace(/&amp;/g, '&');
    const file = rel.split('/').pop() || '';
    if (!file.startsWith('USA_')) continue;
    const base = file.replace(/\.zip$/i, '');
    const sm = base.match(/^(.+\.\d{6})_(.+)$/);
    if (!sm) continue;
    const stationKey = sm[1];
    const suffix = sm[2];
    const label = humanizeObSuffix(suffix);
    const arr = map.get(stationKey) ?? [];
    arr.push({ relPath: rel, label, suffix });
    map.set(stationKey, arr);
  }
  for (const [k, arr] of map) {
    const byPath = new Map(arr.map(x => [x.relPath, x]));
    map.set(
      k,
      [...byPath.values()].sort((a, b) =>
        a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
      )
    );
  }
  return map;
}

function mergeOneBuildingIntoGroup(
  group: EPWMapGroup,
  obMap: Map<string, OneBuildingZipEntry[]> | null
): EPWMapGroup {
  if (group.isFuture || !obMap || !group.catalogStationKey) return group;
  const obList = obMap.get(group.catalogStationKey);
  if (!obList?.length) return group;
  const byLabel = new Map<string, EPWFileVariant>();
  for (const ob of obList) {
    byLabel.set(ob.label, {
      id: `ob-${group.catalogStationKey}-${ob.suffix}`,
      filename: ob.relPath.split('/').pop()!,
      label: ob.label,
      oneBuildingZipPath: ob.relPath,
    });
  }
  for (const v of group.variants) {
    if (!byLabel.has(v.label)) byLabel.set(v.label, v);
  }
  const variants = [...byLabel.values()].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
  );
  return { ...group, variants };
}

/** Lower tier = preferred default when opening a pin (TMY3 → TMY2 → TMY → …). */
function variantDefaultTier(v: EPWFileVariant): number {
  const base = (v.filename || '').replace(/\.(epw|zip)$/i, '');
  const m = base.match(FILE_TYPE_SUFFIX_RE);
  const sufRaw = m?.[1] ?? '';
  const sufU = sufRaw.toUpperCase();
  const lab = v.label.trim().toUpperCase();

  if (sufU === 'TMY3' || lab === 'TMY3') return 0;
  if (sufU === 'TMY2' || lab === 'TMY2') return 1;
  if (
    (sufU === 'TMY' || lab === 'TMY') &&
    !/^TMYX/i.test(sufU) &&
    !lab.startsWith('TMYX')
  )
    return 2;
  if (/^IWEC$/i.test(sufRaw) || lab === 'IWEC') return 3;
  if (/^WYEC2?$/i.test(sufRaw) || /^WYEC/.test(lab)) return 3;
  if (/TMYX|TMYx/i.test(sufRaw) || /TMYx|TMYX/i.test(v.label)) return 4;
  if (/NORMALS|US\.NORMALS/i.test(sufRaw) || /NORMALS/i.test(lab)) return 5;
  if (sufU === 'TRY' || lab === 'TRY') return 6;
  return 7;
}

function pickDefaultVariant(variants: EPWFileVariant[]): EPWFileVariant {
  const first = variants[0];
  if (!first) throw new Error('pickDefaultVariant: empty variants');
  if (variants.length === 1) return first;
  return [...variants].sort((a, b) => {
    const da = variantDefaultTier(a);
    const db = variantDefaultTier(b);
    if (da !== db) return da - db;
    return a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' });
  })[0]!;
}

function otherVariantsSorted(defaultV: EPWFileVariant, variants: EPWFileVariant[]): EPWFileVariant[] {
  return variants
    .filter(v => v.id !== defaultV.id)
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
    );
}

/**
 * USA-style EPW names embed `…_727930_TMY3` before the extension — same id groups TMY2/TMY3 rows even when
 * GeoJSON coordinates differ slightly between files. Otherwise fall back to rounded lat/lng.
 */
function extractStationIdFromBasename(basename: string): string | null {
  const base = basename.replace(/\.epw$/i, '');
  const m = base.match(
    /[._](\d{6})_(?:TMYX\d{4}|TMYX|TMYx\.\d{4}-\d{4}|TMYx|TMY3|TMY2|TMY|IWEC|WYEC2|WYEC|TRY)$/i
  );
  return m?.[1] ?? null;
}

function groupingKeyForLocation(loc: EPWLocation): string | null {
  const basename = loc.filename || epwBasenameFromUrl(loc.url) || '';
  const sid = basename ? extractStationIdFromBasename(basename) : null;
  if (sid) return `sid:${sid}`;
  if (typeof loc.lat !== 'number' || !Number.isFinite(loc.lat)) return null;
  if (typeof loc.lng !== 'number' || !Number.isFinite(loc.lng)) return null;
  return `ll:${roundCoord(loc.lat)},${roundCoord(loc.lng)}`;
}

/** Merges catalog rows for the same station (id in filename preferred; else coordinates). */
function groupLocationsByCoordinates(locs: EPWLocation[]): EPWMapGroup[] {
  const map = new Map<string, EPWLocation[]>();
  for (const loc of locs) {
    const key = groupingKeyForLocation(loc);
    if (!key) continue;
    const bucket = map.get(key) ?? [];
    bucket.push(loc);
    map.set(key, bucket);
  }

  const groups: EPWMapGroup[] = [];
  for (const [mergeKey, arr] of map) {
    const byUrl = new Map<string, EPWFileVariant>();
    for (const loc of arr) {
      const v = locationToVariant(loc);
      const dedupeKey = v.url || v.epwData || v.id;
      if (!byUrl.has(dedupeKey)) byUrl.set(dedupeKey, v);
    }
    const variants = [...byUrl.values()].sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true, sensitivity: 'base' })
    );
    if (variants.length === 0) continue;
    const lat = arr[0].lat;
    const lng = arr[0].lng;
    const primaryBasename =
      variants[0]?.filename || epwBasenameFromUrl(arr[0].url || '') || '';
    groups.push({
      id: `grp-${mergeKey.replace(/:/g, '-')}`,
      lat,
      lng,
      displayName: displayNameFromGroup(arr),
      variants,
      isFuture: arr.some(l => l.isFuture),
      catalogStationKey: catalogStationKeyFromBasename(primaryBasename) || undefined,
    });
  }
  return groups;
}

function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const la1 = (aLat * Math.PI) / 180;
  const la2 = (bLat * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function nearestGroupsFromPoint(
  groups: EPWMapGroup[],
  lat: number,
  lng: number,
  count: number
): EPWMapGroup[] {
  const valid = groups.filter(
    g =>
      typeof g.lat === 'number' &&
      !isNaN(g.lat) &&
      isFinite(g.lat) &&
      typeof g.lng === 'number' &&
      !isNaN(g.lng) &&
      isFinite(g.lng)
  );
  return [...valid]
    .sort(
      (a, b) =>
        haversineKm(lat, lng, a.lat, a.lng) - haversineKm(lat, lng, b.lat, b.lng)
    )
    .slice(0, count);
}

interface MapSelectorProps {
  onSelect: (data: ParsedEPW, compareData?: ParsedEPW) => void;
  isSelectingCompare?: boolean;
  initialCenter?: [number, number];
  initialZoom?: number;
}

// Component to handle bounding box filtering
function MapBoundsListener({
  groups,
  setVisibleGroups,
}: {
  groups: EPWMapGroup[];
  setVisibleGroups: (g: EPWMapGroup[]) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      updateVisible();
    },
    zoomend: () => {
      updateVisible();
    }
  });

  const updateVisible = () => {
    try {
      const bounds = map.getBounds();
      if (!bounds || !bounds.isValid()) return;
      
      // Add a small buffer to the bounds
      const paddedBounds = bounds.pad(0.1);
      
      const visible = groups.filter(loc => {
        if (typeof loc.lat !== 'number' || isNaN(loc.lat) || !isFinite(loc.lat) ||
            typeof loc.lng !== 'number' || isNaN(loc.lng) || !isFinite(loc.lng)) {
          return false;
        }
        return paddedBounds.contains([loc.lat, loc.lng]);
      });

      // Limit to 500 markers to prevent browser freeze
      setVisibleGroups(visible.slice(0, 500));
    } catch (e) {
      console.warn("Error updating visible locations:", e);
    }
  };

  // Initial update
  useEffect(() => {
    updateVisible();
  }, [groups]);

  return null;
}

// Component to handle flying to user location
function LocationFlyer({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMapEvents({});
  useEffect(() => {
    if (center && center.length === 2 && 
        typeof center[0] === 'number' && !isNaN(center[0]) && isFinite(center[0]) &&
        typeof center[1] === 'number' && !isNaN(center[1]) && isFinite(center[1])) {
      
      const size = map.getSize();
      if (size.x > 0 && size.y > 0) {
        map.flyTo(center, zoom, { duration: 1.5 });
      } else {
        map.setView(center, zoom);
      }
    }
  }, [center, zoom, map]);
  return null;
}

/** Fits the map so all given points (search pin + nearest stations) stay in view. */
function FitBoundsController({
  points,
  trigger,
}: {
  points: [number, number][] | null;
  trigger: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (!trigger || !points || points.length === 0) return;
    try {
      const b = L.latLngBounds(points);
      if (b.isValid()) {
        map.fitBounds(b, { padding: [88, 88], maxZoom: 11, animate: true });
      }
    } catch (e) {
      console.warn('fitBounds failed', e);
    }
  }, [trigger, points, map]);
  return null;
}

const generateSampleEPW = (name: string, year: number, baseTemp: number, amplitude: number) => {
  const header = `LOCATION,${name},CA,USA,Custom,999999,37.7749,-122.4194,-8.0,2.0
DESIGN CONDITIONS,1,Climate Design Data 2009 ASHRAE Handbook,,Heating,1,-5.4,-3.4,-14.7,0.9,-3.9,-12.3,1.2,-2.1,13.3,10.6,12.1,10.1,2.5,350,Cooling,7,8.8,28.2,16.8,25.9,16.1,23.9,15.5,18.0,25.1,16.9,23.3,16.3,4.1,300,Extreme,10.1,8.5,7.3,31.5,-9.6,33.5,-11.2,35.2,-12.7,37.1,-14.5,39.2
TYPICAL/ACTUAL,TYPICAL,1980-2059,CMIP6-SSP585
GROUND TEMPERATURES,3,0.5,,,12.5,12.2,12.4,13.5,15.2,17.1,18.5,19.1,18.8,17.7,16.0,14.1,2.0,,,13.1,12.8,12.9,13.6,14.8,16.3,17.5,18.1,18.0,17.2,16.0,14.5,4.0,,,13.8,13.5,13.5,13.9,14.7,15.8,16.7,17.3,17.4,16.9,16.0,14.9
HOLIDAYS/DAYLIGHT SAVINGS,No,0,0,0
COMMENTS 1,Typical Meteorological Year - Sample Data
COMMENTS 2,Generated for demonstration purposes.
DATA PERIODS,1,1,Data,Sunday, 1/ 1,12/31
`;
  let data = '';
  for (let m = 1; m <= 12; m++) {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
    for (let d = 1; d <= daysInMonth; d++) {
      for (let h = 1; h <= 24; h++) {
        const seasonal = Math.sin((m - 1) / 12 * Math.PI * 2 - Math.PI / 2) * 10;
        const daily = Math.sin((h - 1) / 24 * Math.PI * 2 - Math.PI / 2) * amplitude;
        const temp = baseTemp + seasonal + daily + (Math.random() - 0.5) * 2;
        data += `${year},${m},${d},${h},0,?9?9?9?9?9?9?9?9?9?9?9?9?9?9?9?9?9?9?9?9?9?9?9?9,${temp.toFixed(1)},${(temp - 2).toFixed(1)},80,101325,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0\n`;
      }
    }
  }
  return header + data;
};

const SAMPLE_FUTURE_EPW = generateSampleEPW('SAN_FRANCISCO_FUTURE', 2050, 18, 6);
const SAMPLE_HISTORICAL_EPW = generateSampleEPW('SAN_FRANCISCO_HISTORICAL', 2005, 14, 4);

export function MapSelector({ onSelect, isSelectingCompare, initialCenter, initialZoom }: MapSelectorProps) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locations, setLocations] = useState<EPWLocation[]>([]);
  const [futureLocations, setFutureLocations] = useState<EPWLocation[]>([]);
  const [showFuture, setShowFuture] = useState(false);
  const [visibleGroups, setVisibleGroups] = useState<EPWMapGroup[]>([]);
  /** Parsed OneBuilding USA index — many `.zip` datasets per US station (TMYx windows, normals, …). */
  const [usaObZipByStation, setUsaObZipByStation] = useState<Map<
    string,
    OneBuildingZipEntry[]
  > | null>(null);
  const [loadingDb, setLoadingDb] = useState(true);
  const [searchPin, setSearchPin] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [fitBoundsPoints, setFitBoundsPoints] = useState<[number, number][] | null>(null);
  const [fitBoundsTrigger, setFitBoundsTrigger] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  
  // Default to Seattle region or initialCenter
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    initialCenter && !isNaN(initialCenter[0]) ? initialCenter : [47.6062, -122.3321]
  );
  const [mapZoom, setMapZoom] = useState(initialZoom || 7);

  // Sync with initialCenter if it changes
  useEffect(() => {
    if (initialCenter && !isNaN(initialCenter[0]) && !isNaN(initialCenter[1])) {
      setMapCenter(initialCenter);
      if (initialZoom) setMapZoom(initialZoom);
    }
  }, [initialCenter, initialZoom]);

  // If we are selecting a comparison, we should probably default to showing future weather if it's available
  useEffect(() => {
    if (isSelectingCompare && futureLocations.length > 0) {
      setShowFuture(true);
    }
  }, [isSelectingCompare, futureLocations.length]);

  useEffect(() => {
    setSearchPin(null);
    setFitBoundsPoints(null);
  }, [showFuture]);

  // Load cached ZIP on mount
  useEffect(() => {
    const checkCache = async () => {
      try {
        const cachedZip = await get('future_weather_zip');
        if (cachedZip) {
          console.log("Loading cached Future Weather ZIP...");
          processZip(cachedZip);
        }
      } catch (e) {
        console.warn("Failed to load IndexedDB cache:", e);
      }
    };
    checkCache();
  }, []);

  useEffect(() => {
    // Try to get user's actual location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = Number(position.coords.latitude);
          const lng = Number(position.coords.longitude);
          if (typeof lat === 'number' && !isNaN(lat) && isFinite(lat) &&
              typeof lng === 'number' && !isNaN(lng) && isFinite(lng)) {
            setMapCenter([lat, lng]);
            setMapZoom(8);
          }
        },
        (error) => {
          console.log("Geolocation error or denied, using default location.", error);
        },
        { timeout: 5000 }
      );
    }

    const fetchLocations = async () => {
      try {
        const response = await fetch('https://raw.githubusercontent.com/NREL/EnergyPlus/develop/weather/master.geojson');
        if (!response.ok) throw new Error('Failed to fetch EPW database');
        
        const geojson = await response.json();
        
        const parsedLocations: EPWLocation[] = geojson.features.map((feature: any, index: number) => {
          // Extract URL from HTML string: <a href=https://...>Download...</a>
          const epwHtml = feature.properties.epw || '';
          const urlMatch = epwHtml.match(/href=([^>]+)>/);
          const url = urlMatch ? urlMatch[1] : '';
          
          const coords = feature.geometry?.coordinates;
          const lat = coords && coords.length >= 2 ? Number(coords[1]) : NaN;
          const lng = coords && coords.length >= 2 ? Number(coords[0]) : NaN;
          
          return {
            id: `epw-${index}`,
            name: feature.properties.title || 'Unknown Location',
            lat,
            lng,
            url: url,
            filename: url ? epwBasenameFromUrl(url) : undefined,
          };
        }).filter((loc: EPWLocation) => {
          return loc.url && 
                 typeof loc.lat === 'number' && !isNaN(loc.lat) && isFinite(loc.lat) &&
                 typeof loc.lng === 'number' && !isNaN(loc.lng) && isFinite(loc.lng);
        });
        
        setLocations(parsedLocations);
      } catch (error) {
        console.error("Error loading EPW database:", error);
        setErrorMsg("Failed to load global weather database.");
      } finally {
        setLoadingDb(false);
      }
    };

    fetchLocations();
  }, []);

  const processZip = async (data: ArrayBuffer | Blob) => {
    setLoading(true);
    setLoadingProgress(0);
    try {
      const zip = new JSZip();
      const loadedZip = await zip.loadAsync(data);
      
      const newFutureLocations: EPWLocation[] = [];
      const entries = Object.entries(loadedZip.files).filter(([name, entry]) => !entry.dir && name.endsWith('.epw'));
      const total = entries.length;
      let count = 0;
      
      for (const [filename, zipEntry] of entries) {
        const text = await zipEntry.async("string");
        const lines = text.split('\n');
        if (lines.length > 0 && lines[0].startsWith('LOCATION')) {
          const parts = lines[0].split(',');
          if (parts.length >= 8) {
            const city = parts[1];
            const state = parts[2];
            const lat = parseFloat(parts[6]);
            const lng = parseFloat(parts[7]);
            
            if (!isNaN(lat) && !isNaN(lng)) {
              newFutureLocations.push({
                id: `future-${count}`,
                name: `${city}, ${state} (${filename})`,
                lat,
                lng,
                epwData: text,
                isFuture: true,
                filename
              });
            }
          }
        }
        count++;
        if (count % 50 === 0) setLoadingProgress(Math.round((count / total) * 100));
      }
      
      if (newFutureLocations.length > 0) {
        setFutureLocations(newFutureLocations);
        // Don't auto-switch to future if we just loaded from cache on mount
        // Only switch if it's a fresh upload
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Failed to process ZIP file.");
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  };

  const handleZipUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      // Save to IndexedDB for next time
      await set('future_weather_zip', arrayBuffer);
      await processZip(arrayBuffer);
      setShowFuture(true);
    } catch (error) {
      console.error(error);
      setErrorMsg("Failed to upload ZIP file.");
    } finally {
      if (zipInputRef.current) zipInputRef.current.value = '';
    }
  };

  const loadSampleFuture = () => {
    const sampleFuture: EPWLocation = {
      id: 'future-sample',
      name: 'San Francisco (Sample Future 2050)',
      lat: 37.7749,
      lng: -122.4194,
      epwData: SAMPLE_FUTURE_EPW,
      isFuture: true,
      filename: 'SF_2050.epw'
    };
    const sampleHistorical: EPWLocation = {
      id: 'historical-sample',
      name: 'San Francisco (Sample Historical 2005)',
      lat: 37.7749,
      lng: -122.4194,
      epwData: SAMPLE_HISTORICAL_EPW,
      isFuture: true, // We mark it as future so it shows up in the same list for the sample
      filename: 'SF_2005.epw'
    };
    setFutureLocations([sampleHistorical, sampleFuture]);
    setShowFuture(true);
    setMapCenter([37.7749, -122.4194]);
    setMapZoom(10);
  };

  const activeLocations = useMemo(() => {
    return showFuture ? futureLocations : locations;
  }, [showFuture, futureLocations, locations]);

  const activeGroups = useMemo(
    () => groupLocationsByCoordinates(activeLocations),
    [activeLocations]
  );

  const activeGroupsWithOneBuilding = useMemo(
    () => activeGroups.map(g => mergeOneBuildingIntoGroup(g, usaObZipByStation)),
    [activeGroups, usaObZipByStation]
  );

  useEffect(() => {
    if (showFuture) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/proxy-epw?url=${encodeURIComponent(ONE_BUILDING_USA_INDEX)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        if (cancelled) return;
        setUsaObZipByStation(parseOneBuildingUsaIndexHtml(html));
      } catch (e) {
        console.warn('Could not load Climate.OneBuilding USA file listing:', e);
        if (!cancelled) setUsaObZipByStation(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showFuture]);

  const handleLocationSearch = async () => {
    const q = search.trim();
    if (!q) return;
    setErrorMsg(null);

    if (activeGroupsWithOneBuilding.length === 0) {
      setErrorMsg(
        showFuture
          ? 'Add a future-weather ZIP (or sample), or switch to Historical to search the global catalog.'
          : 'Weather stations are still loading — try again in a moment.'
      );
      return;
    }

    setLocating(true);
    try {
      const res = await fetch(`/api/nominatim?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Geocoding service error');
      const data = (await res.json()) as { lat?: string; lon?: string }[];
      if (!Array.isArray(data) || data.length === 0) {
        setErrorMsg('Location not found. Try a city, airport code, address, or landmark.');
        return;
      }
      const lat = parseFloat(String(data[0].lat));
      const lon = parseFloat(String(data[0].lon));
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        setErrorMsg('Unexpected geocoding response.');
        return;
      }
      const nearest = nearestGroupsFromPoint(activeGroupsWithOneBuilding, lat, lon, 2);
      if (nearest.length === 0) {
        setErrorMsg('No stations found near that place in the current dataset.');
        return;
      }
      const pts: [number, number][] = [[lat, lon]];
      for (const s of nearest) {
        const dup = pts.some(
          p => Math.abs(p[0] - s.lat) < 1e-7 && Math.abs(p[1] - s.lng) < 1e-7
        );
        if (!dup) pts.push([s.lat, s.lng]);
      }
      setSearchPin({ lat, lng: lon });
      setFitBoundsPoints(pts);
      setFitBoundsTrigger(t => t + 1);
    } catch (e) {
      console.error(e);
      setErrorMsg(
        'Could not look up that place. Run the app with Vite (npm run dev / vite preview) so /api/nominatim is available, or pan the map to pick a station.'
      );
    } finally {
      setLocating(false);
    }
  };

  const handleVariantSelect = async (group: EPWMapGroup, variant: EPWFileVariant) => {
    const loc: EPWLocation = {
      id: variant.id,
      name: group.displayName,
      lat: group.lat,
      lng: group.lng,
      url: variant.url,
      epwData: variant.epwData,
      isFuture: group.isFuture,
      filename: variant.filename,
    };
    setLoading(true);
    setErrorMsg(null);
    try {
      if (loc.epwData) {
        const parsed = parseEPW(loc.epwData);
        attachParsedEpwSource(
          parsed,
          loc.filename || 'weather.epw',
          variant.label
        );

        // If this is a future location and we are NOT selecting a comparison yet,
        // try to find a baseline (e.g. 2020 or historical) in the same dataset to default the comparison
        if (!isSelectingCompare && loc.filename) {
          const baseName = loc.name.split('(')[0].trim();
          const otherYears = futureLocations.filter(
            f => f.id !== loc.id && f.name.startsWith(baseName)
          );

          if (otherYears.length > 0) {
            const baseline =
              otherYears.find(f => f.filename?.includes('2020') || f.filename?.includes('2005')) ||
              otherYears[0];
            if (baseline.epwData) {
              const parsedBaseline = parseEPW(baseline.epwData);
              attachParsedEpwSource(
                parsedBaseline,
                baseline.filename || 'baseline.epw',
                fileTypeLabelFromBasename(baseline.filename || '')
              );
              onSelect(parsed, parsedBaseline);
              return;
            }
          }
        }

        onSelect(parsed);
      } else if (variant.oneBuildingZipPath) {
        const fullUrl = `${ONE_BUILDING_USA_ZIP_PREFIX}${variant.oneBuildingZipPath}`;
        const response = await fetch(`/api/proxy-binary?url=${encodeURIComponent(fullUrl)}`);
        if (!response.ok) throw new Error('Failed to download weather archive');
        const buf = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(buf);
        const epwEntry = Object.entries(zip.files).find(
          ([name, f]) => !f.dir && name.toLowerCase().endsWith('.epw')
        );
        if (!epwEntry) throw new Error('No EPW file found in zip archive');
        const text = await epwEntry[1].async('string');
        const parsed = parseEPW(text);
        const innerBase = epwEntry[0].split('/').pop() || variant.filename;
        attachParsedEpwSource(parsed, innerBase, variant.label);
        onSelect(parsed);
      } else if (loc.url) {
        const response = await fetch(`/api/proxy-epw?url=${encodeURIComponent(loc.url)}`);
        if (!response.ok) throw new Error('Failed to fetch EPW file');
        const text = await response.text();
        const parsed = parseEPW(text);
        attachParsedEpwSource(parsed, variant.filename || epwBasenameFromUrl(loc.url), variant.label);
        onSelect(parsed);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg('Failed to load weather file. The file might be unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseEPW(text);
        attachParsedEpwSource(parsed, file.name, fileTypeLabelFromBasename(file.name));
        onSelect(parsed);
      } catch (error) {
        console.error(error);
        setErrorMsg("Failed to parse EPW file. Ensure it is a valid format.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full w-full relative" style={{ backgroundColor: CARTO_LIGHT_ALL_WATER_HEX }}>
      {loading && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[2000] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-700 font-medium">
              Processing ZIP Archive... {loadingProgress > 0 ? `${loadingProgress}%` : ''}
            </p>
          </div>
        </div>
      )}
      
      {errorMsg && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[2000] bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl shadow-md flex items-center gap-3">
          <span className="block sm:inline">{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-bold leading-none text-red-700 transition-colors hover:bg-red-200/60 hover:text-red-900"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      )}

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-3xl px-4 flex flex-col sm:flex-row gap-2 items-center pointer-events-none">
        <div className="relative flex-1 w-full pointer-events-auto bg-white p-2 rounded-full shadow-hard-md border border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex min-w-0 flex-1 flex-row items-center">
            {locating ? (
              <Loader2
                className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 animate-spin text-gray-500"
                aria-hidden
              />
            ) : (
              <Search
                className="pointer-events-none absolute left-3 top-1/2 z-[1] h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden
              />
            )}
            <input
              type="text"
              placeholder={`City, airport, landmark — Enter to zoom (${activeGroupsWithOneBuilding.length || '…'} ${showFuture ? 'future' : 'global'} stations)`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleLocationSearch();
                }
              }}
              aria-describedby="map-search-hint"
              disabled={locating || loadingDb}
              className="min-w-0 flex-1 border-none bg-transparent py-2 pl-9 pr-4 text-sm text-gray-700 outline-none transition-all focus:ring-0 disabled:opacity-60"
            />
          </div>
          <p id="map-search-hint" className="sr-only">
            Enter a city, airport, landmark, or address, then press Enter. The map zooms to that location and frames the two closest weather stations.
          </p>
          <div
            className="inline-flex h-11 items-stretch rounded-full border border-gray-200 bg-gray-100 p-1 shadow-hard-sm gap-0.5 shrink-0"
            role="group"
            aria-label="Weather dataset source"
          >
            <button
              type="button"
              aria-pressed={!showFuture}
              onClick={() => setShowFuture(false)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 sm:px-4 text-xs sm:text-sm font-semibold transition-all min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-1 ${
                !showFuture
                  ? 'bg-gray-300 text-gray-900 shadow-md hover:bg-gray-600 hover:text-white'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-white/60'
              }`}
              title="NREL global EPW database (typical years)"
            >
              <Database className="w-4 h-4 shrink-0 opacity-80" />
              <span className="truncate">Historical</span>
            </button>
            <button
              type="button"
              aria-pressed={showFuture}
              onClick={() => setShowFuture(true)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 sm:px-4 text-xs sm:text-sm font-semibold transition-all min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-1 ${
                showFuture
                  ? 'bg-white text-orange-700 shadow-sm ring-1 ring-orange-200/80'
                  : 'text-gray-500 hover:text-orange-800 hover:bg-white/60'
              }`}
              title="Future projections from uploaded ZIP or samples"
            >
              <CloudLightning className="w-4 h-4 shrink-0" />
              <span className="truncate">Future</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-2 pointer-events-auto">

          <input 
            type="file" 
            accept=".epw" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center w-12 h-12 bg-white text-gray-700 rounded-full shadow-hard-md hover:bg-gray-50 transition-colors border border-gray-200"
            title="Upload .epw"
          >
            <Upload className="w-5 h-5" />
          </button>
          
          <a
            href="https://climate.onebuilding.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-12 h-12 bg-white text-gray-600 rounded-full shadow-hard-md hover:bg-gray-50 transition-colors border border-gray-200"
            title="OneBuilding EPW"
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
      </div>

      {showFuture && futureLocations.length === 0 && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[1000] bg-white p-6 rounded-2xl shadow-hard-lg border border-gray-200 max-w-md w-full pointer-events-auto">
          <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
            <CloudLightning className="w-5 h-5 text-orange-600" />
            Future Weather Data
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Zenodo projections are not pre-loaded due to size (115MB). You can upload the dataset once, and it will be cached in your browser.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={loadSampleFuture}
              className="flex items-center justify-center gap-2 rounded-full border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-200"
            >
              <Info className="w-4 h-4" />
              Try with Sample Data
            </button>
            
            <div className="h-px bg-gray-100 my-1" />

            <a 
              href="https://zenodo.org/records/6939750" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-xl font-medium transition-colors text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Download from Zenodo
            </a>
            
            <input 
              type="file" 
              accept=".zip" 
              className="hidden" 
              ref={zipInputRef}
              onChange={handleZipUpload}
            />
            <button 
              onClick={() => zipInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-full bg-orange-600 px-4 py-2 text-sm font-medium text-white shadow-hard-sm transition-colors hover:bg-orange-700"
            >
              <Upload className="w-4 h-4" />
              Upload & Cache Dataset
            </button>
          </div>
        </div>
      )}
      
      <div className="h-full w-full z-0">
        {typeof mapCenter[0] === 'number' && !isNaN(mapCenter[0]) && isFinite(mapCenter[0]) &&
         typeof mapCenter[1] === 'number' && !isNaN(mapCenter[1]) && isFinite(mapCenter[1]) ? (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full"
            minZoom={2}
            zoomControl={false}
            style={{ background: CARTO_LIGHT_ALL_WATER_HEX }}
          >
            <LocationFlyer center={mapCenter} zoom={mapZoom} />
            <FitBoundsController points={fitBoundsPoints} trigger={fitBoundsTrigger} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <MapBoundsListener groups={activeGroupsWithOneBuilding} setVisibleGroups={setVisibleGroups} />

            {searchPin &&
              Number.isFinite(searchPin.lat) &&
              Number.isFinite(searchPin.lng) && (
                <CircleMarker
                  center={[searchPin.lat, searchPin.lng]}
                  radius={11}
                  pathOptions={{
                    color: '#1d4ed8',
                    fillColor: '#93c5fd',
                    fillOpacity: 0.85,
                    weight: 2,
                  }}
                />
              )}

            {visibleGroups.map(group => {
              if (typeof group.lat !== 'number' || isNaN(group.lat) || !isFinite(group.lat) ||
                  typeof group.lng !== 'number' || isNaN(group.lng) || !isFinite(group.lng)) {
                return null;
              }
              const defaultVariant = pickDefaultVariant(group.variants);
              const alternateVariants = otherVariantsSorted(defaultVariant, group.variants);
              const hasAlternates = alternateVariants.length > 0;
              const btnBase =
                'rounded-full text-xs font-semibold transition-colors shadow-hard-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';
              const btnHistorical = `${btnBase} bg-[#3388ff] text-white hover:bg-[#2d7de0] focus-visible:ring-[#3388ff]`;
              const btnFuture = `${btnBase} bg-orange-600 text-white hover:bg-orange-700 focus-visible:ring-orange-400`;
              const btnClass = group.isFuture ? btnFuture : btnHistorical;
              const selectBase =
                'max-w-[min(11rem,calc(85vw-8rem))] rounded-full border border-gray-200 bg-white py-2 pl-2.5 pr-7 text-xs font-semibold text-gray-800 shadow-hard-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ' +
                (group.isFuture
                  ? 'focus-visible:ring-orange-400 border-orange-100'
                  : 'focus-visible:ring-[#3388ff]');
              return (
                <Marker key={group.id} position={[group.lat, group.lng]} icon={group.isFuture ? futureIcon : smallIcon}>
                  <Popup className="rounded-2xl">
                    <div
                      className={`p-2 text-center ${hasAlternates ? 'max-w-[min(280px,85vw)]' : 'max-w-[220px]'}`}
                    >
                      <h3 className="font-semibold leading-snug text-gray-900 line-clamp-3">
                        {group.displayName}
                      </h3>
                      <p className="mb-2 mt-1 text-[11px] text-gray-500">
                        {group.isFuture ? 'Future weather projection' : 'EnergyPlus weather database'}
                      </p>
                      {!group.isFuture && group.variants.some(v => !!v.oneBuildingZipPath) ? (
                        <p className="mb-2 text-[10px] leading-snug text-slate-500">
                          Extra formats from{' '}
                          <span className="whitespace-nowrap">climate.onebuilding.org</span> via Load other….
                        </p>
                      ) : null}
                      <div className="flex flex-nowrap items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleVariantSelect(group, defaultVariant)}
                          className={`${btnClass} shrink-0 px-3 py-2 text-sm font-medium`}
                          title={defaultVariant.filename}
                        >
                          Load {defaultVariant.label}
                        </button>
                        {hasAlternates ? (
                          <select
                            className={`${selectBase} min-w-0 shrink`}
                            aria-label="Load other weather file formats"
                            defaultValue=""
                            onChange={e => {
                              const id = e.target.value;
                              const el = e.currentTarget;
                              if (!id) return;
                              const v = group.variants.find(x => x.id === id);
                              if (v) void handleVariantSelect(group, v);
                              el.value = '';
                            }}
                          >
                            <option value="">Load other…</option>
                            {alternateVariants.map(v => (
                              <option key={v.id} value={v.id}>
                                {v.label}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        ) : (
          <div
            className="h-full w-full flex items-center justify-center"
            style={{ backgroundColor: CARTO_LIGHT_ALL_WATER_HEX }}
          >
            <p className="text-gray-500">Initializing map...</p>
          </div>
        )}
      </div>
    </div>
  );
}
