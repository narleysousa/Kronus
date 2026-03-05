/**
 * Obtém a posição atual do usuário (geolocalização).
 * Retorna null se o usuário negar, der timeout ou não houver suporte.
 * Usa enableHighAccuracy: false para resposta mais rápida (rede/célula).
 */
export function getCurrentPositionAsync(options?: {
  timeout?: number;
  maximumAge?: number;
  enableHighAccuracy?: boolean;
}): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  const timeout = options?.timeout ?? 12000;
  const maximumAge = options?.maximumAge ?? 60_000; // cache de 1 minuto
  const enableHighAccuracy = options?.enableHighAccuracy ?? false; // false = mais rápido e estável

  return new Promise((resolve) => {
    let settled = false;
    const done = (result: { latitude: number; longitude: number } | null) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const id = setTimeout(() => done(null), timeout + 500); // limite extra para não travar

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(id);
        done({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        clearTimeout(id);
        done(null);
      },
      { enableHighAccuracy, timeout, maximumAge }
    );
  });
}

/** Gera link do Google Maps para abrir a localização. */
export function getMapsLink(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}
