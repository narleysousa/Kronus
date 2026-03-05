/**
 * Reverse geocoding via Nominatim (OpenStreetMap).
 * Converte coordenadas em endereço legível.
 * Uso: https://operations.osmfoundation.org/policies/nominatim/
 */
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
const USER_AGENT = 'KronusPonto/1.0 (contato@kronus.app)';

export interface ReverseGeocodeResult {
  address: string;
  displayName?: string;
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult | null> {
  try {
    const params = new URLSearchParams({
      lat: String(latitude),
      lon: String(longitude),
      format: 'json',
      addressdetails: '1',
    });
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: Record<string, string>;
      display_name?: string;
    };
    const displayName = data.display_name ?? null;
    if (!displayName) return null;
    // Formato curto: rua, número, bairro, cidade
    const a = data.address;
    if (a) {
      const parts = [
        [a.road, a.house_number].filter(Boolean).join(', '),
        a.suburb ?? a.neighbourhood ?? a.quarter,
        a.city ?? a.town ?? a.village ?? a.municipality,
        a.state,
      ].filter(Boolean);
      return { address: parts.join(' — '), displayName };
    }
    return { address: displayName, displayName };
  } catch {
    return null;
  }
}
