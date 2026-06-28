// app/dashboard/LeafletMap.tsx
'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// إصلاح أيقونات Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function LeafletMap({ data }: { data: any[] }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div className="h-[500px] bg-gray-100 rounded-lg flex items-center justify-center">جاري تحميل الخريطة...</div>;
  }

  const center: [number, number] = data.length > 0
    ? [data[0].latitude, data[0].longitude]
    : [24.7136, 46.6753];

  const createCustomIcon = (actionType: string) => {
    const color = actionType === 'login' ? '#16a34a' : '#2563eb';
    const emoji = actionType === 'login' ? '🟢' : '🔵';
    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 16px;">${emoji}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
  };

  return (
    <MapContainer center={center} zoom={10} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {data.map((point: any) => (
        <Marker
          key={point.id}
          position={[point.latitude, point.longitude]}
          icon={createCustomIcon(point.action_type)}
        >
          <Popup>
            <div style={{ textAlign: 'right', direction: 'rtl', minWidth: '220px' }}>
              <p style={{ fontWeight: 'bold', color: point.action_type === 'login' ? '#16a34a' : '#2563eb', margin: '5px 0', fontSize: '16px' }}>
                {point.action_type === 'login' ? '🟢 بداية الرحلة' : '🔵 محطة بيع'}
              </p>
              <p style={{ fontSize: '14px', color: '#333', margin: '5px 0', fontWeight: 'bold' }}>
                {point.users?.full_name || 'مندوب'}
              </p>
              <p style={{ fontSize: '13px', color: '#666', margin: '3px 0' }}>
                📅 {new Date(point.created_at).toLocaleString('ar-EG')}
              </p>
              <p style={{ fontSize: '12px', color: '#999', margin: '3px 0' }}>
                📍 دقة الموقع: {Math.round(point.accuracy)} متر
              </p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}