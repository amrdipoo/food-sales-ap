// app/dashboard/tracking/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getRepTrackingData } from '../../actions/trackingActions';

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
  rep_id: string;
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

export default function TrackingPage() {
  const [trackingData, setTrackingData] = useState<TrackingPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getRepTrackingData();
        setTrackingData(data);
      } catch (err: any) {
        console.error('خطأ في جلب بيانات التتبع:', err);
        setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات التتبع...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">حدث خطأ</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  const center: [number, number] = trackingData.length > 0
    ? [trackingData[0].latitude, trackingData[0].longitude]
    : [30.0444, 31.2357];

  return (
    <div className="min-h-screen bg-gray-50 p-6" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-gradient-to-l from-blue-600 to-blue-700 text-white p-6 rounded-xl shadow-md">
          <h1 className="text-3xl font-bold">📍 تتبع المندوبين</h1>
          <p className="text-blue-100 mt-1">عرض مواقع المندوبين في الوقت الفعلي</p>
          <p className="text-blue-200 text-sm mt-2">
            عدد النقاط المسجلة: {trackingData.length}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="h-[600px] w-full rounded-lg overflow-hidden border border-gray-300">
            <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {trackingData.map((point) => (
                <Marker key={point.id} position={[point.latitude, point.longitude]}>
                  <Popup>
                    <div className="text-sm">
                      <p><strong>المندوب:</strong> {point.user?.full_name || 'غير معروف'}</p>
                      <p><strong>النوع:</strong> {point.action_type === 'checkin' ? '✅ تسجيل دخول' : '📍 تحديث موقع'}</p>
                      <p><strong>الدقة:</strong> {point.accuracy} م</p>
                      <p><strong>الوقت:</strong> {new Date(point.created_at).toLocaleString('ar-EG')}</p>
                    </div>
                  </Popup>
                </Marker>
              ))}
              {trackingData.length > 1 && (
                <Polyline
                  positions={trackingData.map(p => [p.latitude, p.longitude])}
                  color="blue"
                  weight={3}
                  opacity={0.7}
                />
              )}
            </MapContainer>
          </div>
        </div>

        {trackingData.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-center">
            <p className="text-yellow-800">⚠️ لا توجد نقاط تتبع مسجلة حتى الآن.</p>
            <p className="text-yellow-600 text-sm mt-1">سيتم عرض نقاط تتبع المندوبين عند تسجيلها.</p>
          </div>
        )}
      </div>
    </div>
  );
}