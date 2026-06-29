// app/dashboard/tracking/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getRepTrackingData } from '../../actions/trackingActions';
import MapComponent from '../tracking-map';

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
          <MapComponent
            points={trackingData}
            center={center}
            zoom={15}
          />
        </div>

        {trackingData.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-center">
            <p className="text-yellow-800">⚠️ لا توجد نقاط تتبع مسجلة حتى الآن.</p>
            <p className="text-yellow-600 text-sm mt-1">
              سيتم عرض نقاط تتبع المندوبين عند تسجيلها.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}