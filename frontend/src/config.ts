export const MAP_STYLE_LIGHT = "https://tiles.openfreemap.org/styles/liberty";
export const MAP_STYLE_DARK = "https://tiles.openfreemap.org/styles/dark";
export const MAP_CENTER: [number, number] = [18.6531, 54.3487];
export const MAP_ZOOM = 13;

// Fallback start point when the visitor's location is unavailable: ul. Długa 11, Gdańsk (approximate).
// Keep in sync with citytrail.default-start in backend application.yml.
export const DEFAULT_START = { lat: 54.3493, lng: 18.65, label: "ul. Długa 11, Gdańsk" };

// Rough box around Gdańsk, mirrors the backend's check. Locations outside it use the default start.
export const GDANSK_BOUNDS = { minLat: 54.28, maxLat: 54.46, minLng: 18.45, maxLng: 18.75 };
