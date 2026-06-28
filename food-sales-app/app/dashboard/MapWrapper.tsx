// app/dashboard/MapWrapper.tsx
'use client';

import dynamic from 'next/dynamic';

const MapComponent = dynamic(
  () => import('./tracking-map'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] w-full rounded-lg overflow-hidden border border-gray-300 bg-gray-100 flex items-center justify-center">
        <span className="text-gray-500">جاري تحميل الخريطة...</span>
      </div>
    ),
  }
);

interface MapWrapperProps {
  points?: any[];
  center?: [number, number];
  zoom?: number;
}

export default function MapWrapper({ points = [], center, zoom }: MapWrapperProps) {
  const safePoints = Array.isArray(points) ? points : [];
  return <MapComponent points={safePoints} center={center} zoom={zoom} />;
}