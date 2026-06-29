// app/dashboard/tracking-map.tsx
'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl, ScaleControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ✅ أيقونات Leaflet
const defaultIcon = new L.Icon({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

// ✅ تعريف النوع مع user اختياري
export interface TrackingPoint {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  action_type: string;
  created_at: string;
  user?: {
    full_name: string;
    email: string;
  };
}

interface MapComponentProps {
  points?: TrackingPoint[];
  center?: [number, number];
  zoom?: number;
}

// ✅ مكوّن فرعي لتكبير الخريطة
function FitBounds({ points }: { points: TrackingPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(p => [p.latitude, p.longitude]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
    }
  }, [points, map]);
  return null;
}

const MAP_STYLES = {
  voyager: {
    label: '🗺️ Voyager',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  osm: {
    label: '📍 OSM Classic',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  hot: {
    label: '🔥 Hot Style',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  light: {
    label: '☀️ Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
};

export default function MapComponent({
  points = [],
  center = [30.0444, 31.2357],
  zoom = 12,
}: MapComponentProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [activeStyle, setActiveStyle] = useState<keyof typeof MAP_STYLES>('voyager');
  const safePoints = Array.isArray(points) ? points : [];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-[500px] w-full rounded-lg overflow-hidden border border-gray-300 bg-gray-100 flex items-center justify-center">
        <span className="text-gray-500">جاري تحميل الخريطة...</span>
      </div>
    );
  }

  const mapCenter: [number, number] = safePoints.length > 0
    ? [safePoints[0].latitude, safePoints[0].longitude]
    : center;

  const currentStyle = MAP_STYLES[activeStyle];

  const openInGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  return (
    <div className="h-[500px] w-full rounded-lg overflow-hidden border border-gray-300 relative">
      {/* أزرار تبديل الأنماط */}
      <div className="absolute top-2 left-2 z-[1000] flex gap-1 bg-white/90 backdrop-blur-sm p-1.5 rounded-lg shadow-lg border border-gray-200">
        {(Object.keys(MAP_STYLES) as Array<keyof typeof MAP_STYLES>).map((key) => (
          <button
            key={key}
            onClick={() => setActiveStyle(key)}
            className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
              activeStyle === key
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {MAP_STYLES[key].label}
          </button>
        ))}
      </div>

      <MapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer attribution={currentStyle.attribution} url={currentStyle.url} />

        {activeStyle === 'osm' && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            opacity={0.2}
          />
        )}

        <ZoomControl position="bottomright" />
        <ScaleControl position="bottomleft" metric={true} imperial={false} />

        {safePoints.length > 0 && <FitBounds points={safePoints} />}

        {safePoints.map((point) => (
          <Marker key={point.id} position={[point.latitude, point.longitude]}>
            <Popup>
              <div className="text-sm max-w-[250px]" dir="rtl">
                <p className="font-bold text-gray-800">
                  {point.user?.full_name || 'مندوب غير معروف'}
                </p>
                <p className="text-gray-700">
                  {point.action_type === 'checkin' ? '✅ تسجيل دخول' : '📍 تحديث موقع'}
                </p>
                <p className="text-gray-600 text-xs">
                  🎯 الدقة: {point.accuracy} متر
                </p>
                <p className="text-gray-500 text-xs">
                  🕒 {new Date(point.created_at).toLocaleString('ar-EG')}
                </p>
                <hr className="my-2 border-gray-200" />
                <div className="bg-gray-100 rounded p-2 text-xs font-mono text-gray-800 mb-2">
                  <span className="block">Lat: {point.latitude.toFixed(6)}</span>
                  <span className="block">Lng: {point.longitude.toFixed(6)}</span>
                </div>
                <button
                  onClick={() => openInGoogleMaps(point.latitude, point.longitude)}
                  className="w-full bg-blue-600 text-white text-xs font-bold py-1.5 px-3 rounded hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                >
                  <span>📍</span> فتح في خرائط جوجل
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {safePoints.length > 1 && (
          <Polyline
            positions={safePoints.map(p => [p.latitude, p.longitude])}
            color="#2563eb"
            weight={4}
            opacity={0.8}
            dashArray="6, 4"
          />
        )}
      </MapContainer>
    </div>
  );
}