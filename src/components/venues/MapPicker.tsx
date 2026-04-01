import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Leaflet CSS is imported in the component to avoid global side-effects
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';

// Fix default marker icon (Leaflet + bundlers strip the default icon paths)
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapPickerProps {
  latitude: number | null;
  longitude: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: string;
  readonly?: boolean;
  /** Pre-fill search with venue address */
  address?: string;
}

// Sub-component: click handler for placing marker
function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Sub-component: fly to coords when they change externally
function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], 15, { duration: 1 });
  }, [lat, lng, map]);
  return null;
}

const MapPicker: React.FC<MapPickerProps> = ({
  latitude,
  longitude,
  onChange,
  height = '300px',
  readonly = false,
  address = '',
}) => {
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const hasPosition = latitude != null && longitude != null;
  const center: [number, number] = hasPosition ? [latitude!, longitude!] : [25.2048, 55.2708];
  const zoom = hasPosition ? 15 : 4;

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const handleSearch = async (query?: string) => {
    const q = (query || searchQuery).trim();
    if (!q) return;
    setSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`, {
        headers: { 'Accept-Language': 'en' },
      });
      const data = await res.json();
      if (data?.[0]) {
        onChange(parseFloat(data[0].lat), parseFloat(data[0].lon));
      }
    } catch { /* non-critical */ }
    setSearching(false);
  };

  // Auto-geocode from address prop on mount if no coordinates set
  const geocoded = useRef(false);
  useEffect(() => {
    if (!geocoded.current && !hasPosition && address) {
      geocoded.current = true;
      handleSearch(address);
    }
  }, [address, hasPosition]);

  return (
    <div className="space-y-2">
      {!readonly && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <Input
              placeholder="Search address or city..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
              className="bg-black/30 border-white/10 focus:border-rose-500/50 h-8 text-xs"
            />
            <Button type="button" variant="outline" size="sm"
              className="border-white/10 hover:bg-white/5 text-xs h-8 px-2.5 shrink-0"
              onClick={() => handleSearch()} disabled={searching}>
              <Search className={`w-3.5 h-3.5 ${searching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <Button type="button" variant="outline" size="sm"
            className="border-white/10 hover:bg-white/5 text-xs h-8"
            onClick={handleLocateMe} disabled={locating}>
            <Navigation className={`w-3.5 h-3.5 mr-1.5 ${locating ? 'animate-pulse' : ''}`} />
            {locating ? 'Locating...' : 'Use my location'}
          </Button>
        </div>
      )}

      <div className="rounded-xl overflow-hidden border border-white/10" style={{ height }}>
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={!readonly}
          dragging={!readonly}
          style={{ height: '100%', width: '100%' }}
          zoomControl={!readonly}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {!readonly && <ClickHandler onChange={onChange} />}
          {hasPosition && (
            <>
              <Marker position={[latitude!, longitude!]} icon={defaultIcon} />
              <FlyTo lat={latitude!} lng={longitude!} />
            </>
          )}
        </MapContainer>
      </div>

      {hasPosition && (
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <MapPin className="w-3 h-3" />
          <span>{latitude!.toFixed(6)}, {longitude!.toFixed(6)}</span>
        </div>
      )}
    </div>
  );
};

export default MapPicker;
