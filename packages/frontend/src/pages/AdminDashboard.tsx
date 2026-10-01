import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useAdminStore } from '../stores/adminStore';
import { useSocket } from '../hooks/useSocket';
import { api } from '../services/api';
import { Driver, Delivery, DeliveryStatus, DriverStatus, SOCKET_EVENTS } from '@dts/shared';
import MapView from '../components/map/MapView';
import StatusBadge from '../components/ui/StatusBadge';
import StatsCard from '../components/ui/StatsCard';
import NotificationCenter from '../components/ui/NotificationCenter';
import ConnectionStatus from '../components/ui/ConnectionStatus';
import {
  LayoutDashboard,
  Package,
  Users,
  BarChart3,
  LogOut,
  Truck,
  Clock,
  AlertTriangle,
  CheckCircle,
  Phone,
  Star,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { stats, deliveries, drivers, fetchStats, fetchDeliveries, fetchDrivers } = useAdminStore();
  const { socket, isConnected } = useSocket();

  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [liveDrivers, setLiveDrivers] = useState<Driver[]>([]);

  // Initial load
  useEffect(() => {
    fetchStats();
    fetchDeliveries({ pageSize: 15 });
    fetchDrivers();
  }, [fetchStats, fetchDeliveries, fetchDrivers]);

  // Sync drivers to local state for live map updates
  useEffect(() => {
    setLiveDrivers(drivers);
  }, [drivers]);

  // Socket setup for admin room
  useEffect(() => {
    if (!socket) return;

    socket.emit(SOCKET_EVENTS.JOIN_ADMIN_ROOM);

    // Listen to live driver location broadcasts
    const handleLocation = (payload: {
      driverId: string;
      lat: number;
      lng: number;
      heading?: number;
      speed?: number;
    }) => {
      setLiveDrivers((prev) =>
        prev.map((d) =>
          d.id === payload.driverId
            ? { ...d, currentLat: payload.lat, currentLng: payload.lng, status: DriverStatus.BUSY }
            : d
        )
      );
    };

    // Listen to live delivery status changes
    const handleStatus = () => {
      fetchStats();
      fetchDeliveries({ pageSize: 15 });
    };

    socket.on(SOCKET_EVENTS.DRIVER_LOCATION, handleLocation);
    socket.on(SOCKET_EVENTS.DELIVERY_STATUS, handleStatus);
    socket.on(SOCKET_EVENTS.DELIVERY_CREATED, handleStatus);

    return () => {
      socket.off(SOCKET_EVENTS.DRIVER_LOCATION, handleLocation);
      socket.off(SOCKET_EVENTS.DELIVERY_STATUS, handleStatus);
      socket.off(SOCKET_EVENTS.DELIVERY_CREATED, handleStatus);
    };
  }, [socket, fetchStats, fetchDeliveries]);

  // Periodic stats refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const activeDeliveriesList = deliveries.filter((d) =>
    [
      DeliveryStatus.ORDER_CREATED,
      DeliveryStatus.DRIVER_ASSIGNED,
      DeliveryStatus.DRIVER_ACCEPTED,
      DeliveryStatus.DRIVER_PICKED_UP,
      DeliveryStatus.IN_TRANSIT,
      DeliveryStatus.NEAR_DESTINATION,
      DeliveryStatus.DELAYED,
    ].includes(d.status)
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <ConnectionStatus isConnected={isConnected} />

      {/* Desktop Persistent Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-100 flex flex-col hidden md:flex">
        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            🚀
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-base leading-tight">DTS Logistics</h2>
            <span className="text-[10px] text-primary-600 font-bold uppercase tracking-wider">
              Admin Ops Center
            </span>
          </div>
        </div>

        <nav className="p-4 space-y-1.5 flex-1">
          <Link
            to="/admin"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-primary-50 text-primary-700 shadow-xs"
          >
            <LayoutDashboard className="w-4 h-4 text-primary-600" />
            <span>Overview & Live Map</span>
          </Link>

          <Link
            to="/admin/deliveries"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            <Package className="w-4 h-4 text-gray-400" />
            <span>Manage Orders</span>
          </Link>

          <Link
            to="/admin/drivers"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            <Truck className="w-4 h-4 text-gray-400" />
            <span>Courier Fleet</span>
          </Link>

          <Link
            to="/admin/analytics"
            className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
          >
            <BarChart3 className="w-4 h-4 text-gray-400" />
            <span>Analytics & Reports</span>
          </Link>
        </nav>

        <div className="p-4 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
              alt={user?.name}
              className="w-8 h-8 rounded-full border border-gray-200 bg-gray-50"
            />
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-gray-800 truncate">{user?.name}</div>
              <div className="text-[10px] text-gray-400 truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Operations Header */}
        <header className="bg-white border-b border-gray-100 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs sticky top-0 z-20">
          <div>
            <h1 className="font-bold text-gray-900 text-base sm:text-lg">Live Operations Center</h1>
            <p className="text-xs text-gray-400 hidden sm:block">
              Real-time telemetry and fleet supervision
            </p>
          </div>

          <div className="flex items-center gap-3">
            <NotificationCenter />
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Real-Time Stream Active</span>
            </div>
          </div>
        </header>

        {/* Dashboard Body */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1 overflow-y-auto">
          {/* Top KPI Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Active Deliveries"
              value={stats?.activeDeliveries ?? 38}
              subtitle="Currently in transit"
              icon={<Package className="w-6 h-6" />}
              color="indigo"
            />
            <StatsCard
              title="Available Couriers"
              value={stats?.availableDrivers ?? 17}
              subtitle="Ready for dispatch"
              icon={<Truck className="w-6 h-6" />}
              color="green"
            />
            <StatsCard
              title="Delayed Orders"
              value={stats?.delayedDeliveries ?? 2}
              subtitle="Requires monitoring"
              icon={<AlertTriangle className="w-6 h-6" />}
              color="yellow"
            />
            <StatsCard
              title="Completed Today"
              value={stats?.completedToday ?? 126}
              subtitle="Successfully delivered"
              icon={<CheckCircle className="w-6 h-6" />}
              color="blue"
            />
          </div>

          {/* LIVE FLEET MAP */}
          <div className="card p-4 border border-gray-100 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Live Courier Fleet Overview</h3>
                <p className="text-xs text-gray-400">
                  Showing active driver coordinates and status across the operating region
                </p>
              </div>

              {/* Map Legend */}
              <div className="flex items-center gap-3 text-[11px] font-medium text-gray-600">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Available</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Delivering</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Delayed</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                  <span>Offline</span>
                </span>
              </div>
            </div>

            <div className="h-96 w-full rounded-xl overflow-hidden border border-gray-100">
              <MapView
                drivers={liveDrivers}
                onDriverClick={(drv) => setSelectedDriver(drv)}
              />
            </div>
          </div>

          {/* Active Deliveries Table */}
          <div className="card border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Active Deliveries</h3>
                <p className="text-xs text-gray-400">
                  Orders requiring active dispatch supervision
                </p>
              </div>

              <Link
                to="/admin/deliveries"
                className="text-xs text-primary-600 font-semibold hover:text-primary-700 flex items-center gap-1"
              >
                <span>View All Orders</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-gray-400 font-semibold uppercase text-[10px] tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4">Tracking #</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Assigned Driver</th>
                    <th className="py-3 px-4">Route</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeDeliveriesList.slice(0, 10).map((d) => (
                    <tr
                      key={d.id}
                      onClick={() => setSelectedDelivery(d)}
                      className="hover:bg-gray-50/70 transition cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-primary-600">
                        {d.trackingNumber}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {d.customer?.user?.name || 'Customer'}
                      </td>
                      <td className="py-3 px-4">
                        {d.driver ? (
                          <div className="flex items-center gap-1.5 font-medium text-gray-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>{d.driver.user?.name || 'Assigned'}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-500 truncate max-w-xs">
                        {d.pickupAddress?.city} → {d.destinationAddress?.city}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={d.status} />
                      </td>
                      <td className="py-3 px-4">
                        <a
                          href={`/track/${d.trackingNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary-600 hover:text-primary-800 inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Track</span>
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Driver Detail Slide-Over Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/30 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right">
            <div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <h3 className="text-base font-bold text-gray-900">Driver Telemetry</h3>
                <button
                  onClick={() => setSelectedDriver(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-3 mb-5">
                <img
                  src={
                    selectedDriver.user?.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${selectedDriver.user?.name}`
                  }
                  alt={selectedDriver.user?.name}
                  className="w-14 h-14 rounded-full border-2 border-primary-200 object-cover"
                />
                <div>
                  <h4 className="font-bold text-gray-900 text-base">
                    {selectedDriver.user?.name}
                  </h4>
                  <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                    <span>{selectedDriver.vehicleNumber}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      {selectedDriver.rating}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-400">Current Status</span>
                  <StatusBadge status={selectedDriver.status} />
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-400">Vehicle Type</span>
                  <span className="font-semibold text-gray-800">
                    {selectedDriver.vehicleType}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-400">Total Deliveries</span>
                  <span className="font-semibold text-gray-800">
                    {selectedDriver.totalDeliveries || 0}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-400">Phone Contact</span>
                  <span className="font-semibold text-gray-800 font-mono">
                    {selectedDriver.user?.phone || '+91 98765 43210'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-400">GPS Position</span>
                  <span className="font-semibold text-gray-800 font-mono">
                    {selectedDriver.currentLat?.toFixed(4)}, {selectedDriver.currentLng?.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <a
                href={`tel:${selectedDriver.user?.phone || '+919876543210'}`}
                className="btn-primary text-xs w-full flex items-center justify-center gap-2"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Driver Directly</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Detail Slide-Over Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/30 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right">
            <div>
              <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    Order Details
                  </span>
                  <h3 className="text-base font-bold text-gray-900">
                    #{selectedDelivery.trackingNumber}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedDelivery(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-500">Status</span>
                  <StatusBadge status={selectedDelivery.status} />
                </div>

                <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="font-semibold text-gray-700">Customer</div>
                  <div>Name: {selectedDelivery.customer?.user?.name || 'Customer'}</div>
                  <div>Phone: {selectedDelivery.customer?.user?.phone || 'N/A'}</div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="font-semibold text-gray-700">Assigned Driver</div>
                  <div>
                    {selectedDelivery.driver?.user?.name ? (
                      `${selectedDelivery.driver.user.name} (${selectedDelivery.driver.vehicleNumber})`
                    ) : (
                      <span className="text-gray-400 italic">Unassigned</span>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="font-semibold text-gray-700">Pickup Address</div>
                  <div className="text-gray-600">
                    {selectedDelivery.pickupAddress?.street}, {selectedDelivery.pickupAddress?.city}
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="font-semibold text-gray-700">Destination Address</div>
                  <div className="text-gray-600">
                    {selectedDelivery.destinationAddress?.street},{' '}
                    {selectedDelivery.destinationAddress?.city}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex gap-2">
              <a
                href={`/track/${selectedDelivery.trackingNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary text-xs flex-1 text-center"
              >
                Open Live Tracking
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
