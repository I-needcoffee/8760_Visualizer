/**
 * Water fill aligned with Carto light basemaps (Positron vector `water` layer uses `#d4dadc`;
 * `light_all` PNG tiles match this cool grey‑blue). Used behind the map, map shell, and
 * light‑theme dashboard canvas so empty areas match ocean on the opening screen.
 */
export const CARTO_LIGHT_ALL_WATER_HEX = '#d4dadc';

export const GRADIENTS = [
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
