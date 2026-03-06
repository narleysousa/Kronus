import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { reverseGeocode } from '../utils/geocoding';

// Corrige ícone padrão do Marker no bundler (Vite/Webpack)
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = defaultIcon;

const BRAZIL_CENTER: [number, number] = [-15.77972, -47.92972];
const DEFAULT_ZOOM = 14;

export interface LocationMapPickerProps {
  /** Coordenadas iniciais (ex.: da geolocalização ou do registro). */
  initialLat?: number | null;
  initialLng?: number | null;
  /** Altura do mapa em px */
  height?: number;
  /** Chamado quando o usuário escolhe um ponto (clique ou arraste). */
  onSelect: (lat: number, lng: number, address: string) => void;
  /** Endereço inicial já conhecido (apenas exibição). */
  initialAddress?: string;
}

function MapClickHandler({
  onPositionChange,
}: {
  onPositionChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng;
      onPositionChange(lat, lng);
    },
  });
  return null;
}

export const LocationMapPicker: React.FC<LocationMapPickerProps> = ({
  initialLat,
  initialLng,
  height = 220,
  onSelect,
  initialAddress = '',
}) => {
  const hasInitial = initialLat != null && initialLng != null && Number.isFinite(initialLat) && Number.isFinite(initialLng);
  const [position, setPosition] = useState<[number, number] | null>(
    hasInitial ? [initialLat, initialLng] : null
  );
  const [address, setAddress] = useState(initialAddress || '');
  const [loading, setLoading] = useState(false);
  const fetchedInitialRef = useRef(false);

  const fetchAddress = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const result = await reverseGeocode(lat, lng);
      const addr = result?.address ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddress(addr);
      onSelect(lat, lng, addr);
    } catch {
      const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      setAddress(fallback);
      onSelect(lat, lng, fallback);
    } finally {
      setLoading(false);
    }
  }, [onSelect]);

  useEffect(() => {
    if (hasInitial && !position) setPosition([initialLat!, initialLng!]);
  }, [hasInitial, initialLat, initialLng, position]);

  useEffect(() => {
    if (hasInitial && !initialAddress && !fetchedInitialRef.current) {
      fetchedInitialRef.current = true;
      fetchAddress(initialLat!, initialLng!);
    }
  }, [hasInitial, initialAddress, initialLat, initialLng, fetchAddress]);

  const handlePositionChange = useCallback((lat: number, lng: number) => {
    setPosition([lat, lng]);
    void fetchAddress(lat, lng);
  }, [fetchAddress]);

  const center: [number, number] = position ?? (hasInitial ? [initialLat!, initialLng!] : BRAZIL_CENTER);
  const zoom = position ? DEFAULT_ZOOM : (hasInitial ? 15 : 4);

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600">
      <div style={{ height }} className="relative bg-slate-100 dark:bg-slate-800">
        <MapContainer
          center={center}
          zoom={zoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onPositionChange={handlePositionChange} />
          {position && <Marker position={position} />}
        </MapContainer>
      </div>
      <div className="px-3 py-2 bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-700">
        {loading ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Buscando endereço...</p>
        ) : address ? (
          <>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200" title={address}>
              {address}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Se a rua estiver incorreta, clique no mapa para reposicionar o pin.
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">Clique no mapa para escolher o local do ponto.</p>
        )}
      </div>
    </div>
  );
};
