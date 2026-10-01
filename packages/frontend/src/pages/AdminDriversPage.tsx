import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAdminStore } from '../stores/adminStore';
import { Driver, DriverStatus } from '@dts/shared';
import StatusBadge from '../components/ui/StatusBadge';
import {
  ArrowLeft,
  Search,
  Filter,
  Star,
  Phone,
  Bike,
  Car,
  Truck,
  CheckCircle,
  MapPin,
} from 'lucide-react';

export const AdminDriversPage: React.FC = () => {
  const { drivers, fetchDrivers, isLoading } = useAdminStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  const filtered = drivers.filter((d) => {
    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
    const matchSearch =
      d.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.vehicleNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.vehicleType.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

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
            <h1 className="font-bold text-gray-900 text-base sm:text-lg">Courier Fleet Directory</h1>
            <p className="text-xs text-gray-400">Total registered couriers: {drivers.length}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-4 flex-1">
        {/* Search & Filter Controls */}
        <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by driver name or vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 text-xs py-2"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            {['ALL', 'AVAILABLE', 'BUSY', 'OFFLINE'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  statusFilter === st
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Drivers Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-44 skeleton rounded-xl" />
            <div className="h-44 skeleton rounded-xl" />
            <div className="h-44 skeleton rounded-xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((drv) => (
              <div key={drv.id} className="card p-5 border border-gray-100 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        drv.user?.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${drv.user?.name}`
                      }
                      alt={drv.user?.name}
                      className="w-12 h-12 rounded-full border border-gray-200 bg-gray-50 object-cover"
                    />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-gray-900 text-sm">{drv.user?.name || 'Courier'}</h4>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                        <span className="font-mono">{drv.vehicleNumber}</span>
                        <span>•</span>
                        <span className="capitalize">{drv.vehicleType.toLowerCase()}</span>
                      </div>
                    </div>
                  </div>

                  <StatusBadge status={drv.status} />
                </div>

                <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-gray-50 rounded-xl text-center text-xs mb-3">
                  <div>
                    <div className="font-bold text-gray-900 flex items-center justify-center gap-0.5 text-amber-500">
                      <Star className="w-3 h-3 fill-amber-400" />
                      <span>{drv.rating || 4.9}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium">Rating</div>
                  </div>

                  <div>
                    <div className="font-bold text-gray-900">{drv.totalDeliveries || 0}</div>
                    <div className="text-[10px] text-gray-400 font-medium">Deliveries</div>
                  </div>

                  <div>
                    <div className="font-bold text-emerald-600">₹{drv.totalEarnings || 0}</div>
                    <div className="text-[10px] text-gray-400 font-medium">Earnings</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-gray-500 font-mono text-[11px]">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    <span>
                      {drv.currentLat ? `${drv.currentLat.toFixed(3)}, ${drv.currentLng?.toFixed(3)}` : 'No GPS lock'}
                    </span>
                  </div>

                  {drv.user?.phone && (
                    <a
                      href={`tel:${drv.user.phone}`}
                      className="text-primary-600 hover:text-primary-800 flex items-center gap-1 font-semibold"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Contact</span>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDriversPage;

