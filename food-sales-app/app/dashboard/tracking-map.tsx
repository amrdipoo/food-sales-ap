// app/dashboard/tracking-map.tsx
'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ✅ طريقة جديدة لإصلاح أيقونات Leaflet في Next.js
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

interface TrackingPoint {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  action_type: string;
  created_at: string;
  user: {
    full_name: string;
    email: string;
  };
}

interface MapComponentProps {
  points?: TrackingPoint[];
  center?: [number, number];
  zoom?: number;
}

export default function MapComponent({
  points = [],
  center = [30.0444, 31.2357],
  zoom = 12,
}: MapComponentProps) {
  const [isMounted, setIsMounted] = useState(false);
  const safePoints = Array.isArray(points) ? points : [];

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="h-[400px] w-full rounded-lg overflow-hidden border border-gray-300 bg-gray-100 flex items-center justify-center">
        <span className="text-gray-500">جاري تحميل الخريطة...</span>
      </div>
    );
  }

  const mapCenter: [number, number] = safePoints.length > 0
    ? [safePoints[0].latitude, safePoints[0].longitude]
    : center;

  return (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border border-gray-300">
      <MapContainer center={mapCenter} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {safePoints.map((point) => (
          <Marker key={point.id} position={[point.latitude, point.longitude]}>
            <Popup>
              <div className="text-sm">
                <p><strong>المندوب:</strong> {point.user?.full_name || 'غير معروف'}</p>
                <p><strong>النوع:</strong> {point.action_type === 'checkin' ? 'تسجيل دخول' : 'تحديث موقع'}</p>
                <p><strong>الدقة:</strong> {point.accuracy} م</p>
                <p><strong>الوقت:</strong> {new Date(point.created_at).toLocaleString('ar-EG')}</p>
              </div>
            </Popup>
          </Marker>
        ))}
        {safePoints.length > 1 && (
          <Polyline
            positions={safePoints.map(p => [p.latitude, p.longitude])}
            color="blue"
            weight={3}
            opacity={0.7}
          />
        )}
      </MapContainer>
    </div>
  );
}