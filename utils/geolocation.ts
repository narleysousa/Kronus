/**
 * Obtém a posição atual do usuário (geolocalização).
 * Retorna null se o usuário negar, der timeout ou não houver suporte.
 * Prioriza precisão: GPS quando disponível, cache baixo e timeout maior para fix.
 */
export function getCurrentPositionAsync(options?: {
  timeout?: number;
  maximumAge?: number;
  enableHighAccuracy?: boolean;
}): Promise<{ latitude: number; longitude: number } | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve(null);
  }
  const enableHighAccuracy = options?.enableHighAccuracy ?? true; // true = GPS para maior precisão
  // Com high accuracy o GPS pode demorar; timeout maior para obter fix preciso
  const timeout = options?.timeout ?? (enableHighAccuracy ? 20000 : 12000);
  // maximumAge baixo = posição fresca (evita cache antigo e melhora precisão)
  const maximumAge = options?.maximumAge ?? (enableHighAccuracy ? 0 : 60_000);

  return new Promise((resolve) => {
    let settled = false;
    const done = (result: { latitude: number; longitude: number } | null) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const id = setTimeout(() => done(null), timeout + 1000); // margem para não cortar o fix

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

/** Converte string em número; retorna null se inválido (evita NaN no mapa). */
export function parseCoord(value: string | undefined | null): number | null {
  if (value == null || String(value).trim() === '') return null;
  const n = parseFloat(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Gera link do Google Maps para abrir a localização. */
export function getMapsLink(latitude: number, longitude: number): string {
  return `https://www.google.com/maps?q=${latitude},${longitude}`;
}
