export type GeocodeResult = { lat: number; lng: number };

/**
 * Looks an address or area up in Gdańsk with OpenStreetMap's free Nominatim search (fair use: one request per
 * click, no key). Returns null when nothing is found; throws when the service cannot be reached.
 */
export async function geocodeGdansk(query: string, signal?: AbortSignal): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    q: `${query}, Gdańsk`,
    format: "jsonv2",
    limit: "1",
    viewbox: "18.45,54.46,18.75,54.28", // west,north,east,south
    bounded: "1",
  });
  const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal });
  if (!res.ok) throw new Error(`Address search failed (${res.status})`);
  const hits = (await res.json()) as { lat: string; lon: string }[];
  const first = hits[0];
  if (!first) return null;
  return { lat: Number(first.lat), lng: Number(first.lon) };
}
