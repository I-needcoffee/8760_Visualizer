/**
 * Water fill aligned with Carto light basemaps (Positron vector `water` layer uses `#d4dadc`;
 * `light_all` PNG tiles match this cool grey‑blue). Used behind the map, map shell, and
 * light‑theme dashboard canvas so empty areas match ocean on the opening screen.
 */
export const CARTO_LIGHT_ALL_WATER_HEX = '#d4dadc';

/**
 * Temperature heatmap palette from EPW tooling (`temperature_js.html` Plotly colorscale /
 * annotation colors). Blue → teal → green → yellow → orange (cool → warm).
 */
export const TEMPERATURE_COMFORT_GRADIENT_COLORS = [
  '#0069b4',
  '#40b2a6',
  '#addb8b',
  '#fde767',
  '#f06441',
] as const;

export const GRADIENTS = [
  {
    id: 'temperature-comfort',
    name: 'Temperature (comfort)',
    colors: [...TEMPERATURE_COMFORT_GRADIENT_COLORS],
  },
  /** Dry → humid: warm low-end, neutral mid, stronger blue at high RH. */
  {
    id: 'humidity-spectrum',
    name: 'Humidity (dry→humid)',
    colors: ['#e79d18', '#cbbba0', '#e5e7eb', '#bcd0e7', '#7ea6d6', '#4f7fbf', '#2f66aa', '#1f4f8a'],
  },
  /** Solar radiation (`solar_radiation_js.html`): yellow → orange. */
  {
    id: 'solar-yellow-orange',
    name: 'Solar (yellow→orange)',
    colors: ['#ffff00', '#d97706'],
  },
  /** Wind: light grey → yellow → burnt orange (muted, high contrast). */
  {
    id: 'wind-intensity-blue',
    name: 'Wind speed (calm→storm)',
    colors: ['#e5e7eb', '#fde767', '#d97706', '#9a3412'],
  },
  /** Cloud cover (`Cloud Cover_js.html`): white → mid grey for 0–100% cover. */
  {
    id: 'cloud-cover-gray',
    name: 'Sky cover (clear→overcast)',
    colors: ['#ffffff', '#969696'],
  },
  { id: 'turbo', name: 'Turbo', colors: ['#30123B', '#4686FB', '#1AE4B6', '#A4FC3C', '#FABA39', '#E4460A', '#7A0403'] },
  { id: 'magma', name: 'Magma', colors: ['#000004', '#3B0F70', '#8C2981', '#DE4968', '#FE9F6D', '#FCFDBF'] },
  { id: 'viridis', name: 'Viridis', colors: ['#440154', '#414487', '#2A788E', '#22A884', '#7AD151', '#FDE725'] },
  { id: 'coolwarm', name: 'Cool to Warm', colors: ['#3B4CC0', '#8DB0FE', '#E2E2E2', '#F49A7B', '#B40426'] },
];

export const VARIABLES = [
  { id: 'temperature', name: 'Temperature (°C)', min: -10, max: 40 },
  { id: 'radiation', name: 'Solar Radiation (W/m²)', min: 0, max: 1000 },
  { id: 'windSpeed', name: 'Wind Speed (m/s)', min: 0, max: 15 },
  { id: 'humidity', name: 'Relative Humidity (%)', min: 0, max: 100 },
];
