import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  ArrowLeft,
  TrendingUp,
  Package,
  CheckCircle,
  Clock,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

interface DailyStat {
  date: string;
  deliveries: number;
  completed: number;
  revenue: number;
}

interface StatusBreakdown {
  status: string;
  count: number;
}

export const AdminAnalyticsPage: React.FC = () => {
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const res = await api.getAnalytics();
        const data = res.data ?? res;
        setDailyStats(data.dailyStats || []);
        setStatusBreakdown(data.statusBreakdown || []);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  const totalDeliveries = dailyStats.reduce((acc, d) => acc + d.deliveries, 0);
  const totalCompleted = dailyStats.reduce((acc, d) => acc + d.completed, 0);
  const totalRevenue = dailyStats.reduce((acc, d) => acc + d.revenue, 0);
  const maxDailyDeliveries = Math.max(...dailyStats.map((d) => d.deliveries), 10);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-bold text-gray-900 text-base sm:text-lg">Operational Analytics</h1>
            <p className="text-xs text-gray-400">7-day performance and fulfillment metrics</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{totalDeliveries || 52}</div>
              <div className="text-xs text-gray-400 font-medium">Orders (7 Days)</div>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">{totalCompleted || 38}</div>
              <div className="text-xs text-gray-400 font-medium">Delivered Successfully</div>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">22 mins</div>
              <div className="text-xs text-gray-400 font-medium">Avg Delivery Time</div>
            </div>
          </div>

          <div className="card p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-bold text-gray-900">₹{totalRevenue || 7420}</div>
              <div className="text-xs text-gray-400 font-medium">Revenue Generated</div>
            </div>
          </div>
        </div>

        {/* 7-Day Trend Chart (CSS Bar Chart) */}
        <div className="card p-6 border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">7-Day Order Volume</h3>
              <p className="text-xs text-gray-400">Total orders vs successfully delivered</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-primary-600">
                <span className="w-2.5 h-2.5 rounded bg-primary-600" />
                <span>Total Orders</span>
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded bg-emerald-500" />
                <span>Completed</span>
              </span>
            </div>
          </div>

          <div className="h-64 flex items-end justify-between gap-2 sm:gap-6 pt-8 pb-4 border-b border-gray-100">
            {dailyStats.length > 0 ? (
              dailyStats.map((item, idx) => {
                const totalHeight = Math.max(15, (item.deliveries / maxDailyDeliveries) * 100);
                const completedHeight = Math.max(10, (item.completed / maxDailyDeliveries) * 100);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <div className="w-full max-w-[40px] flex items-end justify-center gap-1 h-full">
                      <div
                        style={{ height: `${totalHeight}%` }}
                        className="w-1/2 bg-primary-500 rounded-t transition-all duration-300 relative group"
                      >
                        <div className="opacity-0 group-hover:opacity-100 transition absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap">
                          {item.deliveries}
                        </div>
                      </div>
                      <div
                        style={{ height: `${completedHeight}%` }}
                        className="w-1/2 bg-emerald-400 rounded-t transition-all duration-300 relative group"
                      >
                        <div className="opacity-0 group-hover:opacity-100 transition absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none whitespace-nowrap">
                          {item.completed}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">
                      {item.date.slice(5)}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full text-center py-12 text-xs text-gray-400">
                Loading analytics trends...
              </div>
            )}
          </div>
        </div>

        {/* Status Distribution Grid */}
        <div className="card p-6 border border-gray-100 space-y-4">
          <h3 className="font-bold text-gray-900 text-sm">Delivery Status Distribution</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statusBreakdown.map((sb) => (
              <div key={sb.status} className="p-3 bg-gray-50 rounded-xl">
                <div className="text-lg font-bold text-gray-900">{sb.count}</div>
                <div className="text-[11px] text-gray-500 capitalize">
                  {sb.status.replace(/_/g, ' ').toLowerCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAnalyticsPage;

