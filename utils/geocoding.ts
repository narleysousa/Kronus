/**
 * Reverse geocoding via Nominatim (OpenStreetMap).
 * Converte coordenadas em endereço legível.
 * zoom=18: máximo detalhe (nível de edificação) para precisão da rua.
 * Uso: https://operations.osmfoundation.org/policies/nominatim/
 */
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'KronusPonto/1.0 (contato@kronus.app)';

/** Chaves possíveis para nome da rua no OSM (ordem de preferência). */
const STREET_KEYS = ['road', 'street', 'pedestrian', 'footway', 'path', 'residential', 'cycleway', 'trunk', 'primary', 'secondary'] as const;

function getStreetName(addr: Record<string, string>): string | null {
  for (const key of STREET_KEYS) {
    const v = addr[key];
    if (v && typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

export interface ReverseGeocodeResult {
  address: string;
  displayName?: string;
}

async function reverseGeocodeWithZoom(
  latitude: number,
  longitude: number,
  zoom: number
): Promise<{ address?: Record<string, string>; display_name?: string } | null> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'json',
    addressdetails: '1',
    zoom: String(zoom),
  });
  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) return null;
  return res.json();
}

function buildAddressFromData(data: { address?: Record<string, string>; display_name?: string }): string | null {
  const displayName = data.display_name ?? null;
  if (!displayName) return null;
  const a = data.address;
  if (a) {
    const street = getStreetName(a);
    const houseNumber = a.house_number ?? a.housenumber ?? '';
    const streetPart = [street, houseNumber].filter(Boolean).join(', ');
    const neighbourhood = a.suburb ?? a.neighbourhood ?? a.quarter ?? a.city_district ?? a.district;
    const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county;
    const state = a.state;
    const parts = [streetPart, neighbourhood, city, state].filter(Boolean);
    return parts.length > 0 ? parts.join(' — ') : displayName;
  }
  return displayName;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult | null> {
  try {
    // zoom 18 = nível de edificação (rua + número mais preciso)
    let data = await reverseGeocodeWithZoom(latitude, longitude, 18);
    if (!data) return null;

    let address = buildAddressFromData(data);
    const displayName = data.display_name ?? null;
    if (!displayName) return null;

    // Se não veio rua no zoom 18, tenta zoom 17 (ruas principais e secundárias)
    if (address && !getStreetName(data.address ?? {})) {
      const data17 = await reverseGeocodeWithZoom(latitude, longitude, 17);
      if (data17?.address && getStreetName(data17.address)) {
        const addr17 = buildAddressFromData(data17);
        if (addr17) address = addr17;
      }
    }

    return { address: address ?? displayName, displayName };
  } catch {
    return null;
  }
}
