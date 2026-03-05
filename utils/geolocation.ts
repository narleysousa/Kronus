/**
 * Obtém a posição atual do usuário (geolocalização).
 * Retorna null se o usuário negar, der timeout ou não houver suporte.
 */
export function getCurrentPositionAsync(options?: {
  timeout?: number;
  maximumAge?: number;
}): Promise<{ latitude: number; longitude: number } | null> {
  if (!navigator?.geolocation) return Promise.resolve(null);
  const timeout = options?.timeout ?? 8000;
  const maximumAge = options?.maximumAge ?? 60_000; // cache de 1 minuto

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge }
    );
  });
}

/** Gera link do Google Maps para abrir a localização. */
export function getMapsLink(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}
