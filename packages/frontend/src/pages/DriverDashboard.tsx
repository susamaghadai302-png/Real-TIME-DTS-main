import React, { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useDriverStore } from '../stores/driverStore';
import { useSocket } from '../hooks/useSocket';
import { api } from '../services/api';
import {
  Delivery,
  DeliveryStatus,
  DriverStatus,
  SOCKET_EVENTS,
} from '@dts/shared';
import MapView from '../components/map/MapView';
import StatusBadge from '../components/ui/StatusBadge';
import ConnectionStatus from '../components/ui/ConnectionStatus';
import {
  Navigation,
  Play,
  Square,
  Radio,
  CheckCircle2,
  Clock,
  MapPin,
  Store,
  DollarSign,
  TrendingUp,
  Star,
  LogOut,
  Power,
  RefreshCw,
  Phone,
  AlertCircle,
} from 'lucide-react';

export const DriverDashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const {
    profile,
    fetchProfile,
    updateDriverStatus,
  } = useDriverStore();

  const { socket, isConnected } = useSocket();

  const [activeDelivery, setActiveDelivery] = useState<Delivery | null>(null);
  const [completedDeliveries, setCompletedDeliveries] = useState<Delivery[]>([]);
  const [useRealGPS, setUseRealGPS] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number; heading?: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const watchIdRef = useRef<number | null>(null);

  // Load driver profile, assigned deliveries
  const loadDriverData = async () => {
    await fetchProfile();
    try {
      const res = await api.getDeliveries({ pageSize: 50 });
      const items: Delivery[] = res.data?.items ?? [];
      const active = items.find((d) =>
        [
          DeliveryStatus.DRIVER_ASSIGNED,
          DeliveryStatus.DRIVER_ACCEPTED,
          DeliveryStatus.DRIVER_PICKED_UP,
          DeliveryStatus.IN_TRANSIT,
          DeliveryStatus.NEAR_DESTINATION,
        ].includes(d.status)
      );
      setActiveDelivery(active || null);
      setCompletedDeliveries(items.filter((d) => d.status === DeliveryStatus.DELIVERED));
    } catch (err) {
      console.error('Failed to load driver deliveries:', err);
    }
  };

  useEffect(() => {
    loadDriverData();
  }, []);

  // Join driver room on socket connection
  useEffect(() => {
    if (!socket || !profile?.id) return;

    socket.emit(SOCKET_EVENTS.JOIN_DRIVER_ROOM, profile.id);
    socket.emit(SOCKET_EVENTS.DRIVER_CONNECT, profile.id);

    // Listen to new assigned deliveries
    const handleAssigned = (newDelivery: Delivery) => {
      setActiveDelivery(newDelivery);
    };

    // Listen to self location echo (from location service)
    const handleLocation = (payload: { lat: number; lng: number; heading?: number; driverId: string }) => {
      if (payload.driverId === profile.id) {
        setCurrentCoords({ lat: payload.lat, lng: payload.lng, heading: payload.heading });
      }
    };

    socket.on(SOCKET_EVENTS.DELIVERY_ASSIGNED, handleAssigned);
    socket.on(SOCKET_EVENTS.DRIVER_LOCATION, handleLocation);

    return () => {
      socket.off(SOCKET_EVENTS.DELIVERY_ASSIGNED, handleAssigned);
      socket.off(SOCKET_EVENTS.DRIVER_LOCATION, handleLocation);
    };
  }, [socket, profile?.id]);

  // Handle Real Browser GPS Toggle
  const toggleRealGPS = () => {
    if (useRealGPS) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setUseRealGPS(false);
      setGpsError(null);
    } else {
      if (!('geolocation' in navigator)) {
        setGpsError('Geolocation is not supported by your browser.');
        return;
      }

      setUseRealGPS(true);
      setGpsError(null);

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, heading, speed, accuracy } = pos.coords;
          setCurrentCoords({
            lat: latitude,
            lng: longitude,
            heading: heading ?? undefined,
          });

          // Send to backend via Socket.IO
          if (socket && profile?.id) {
            socket.emit(SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, {
              driverId: profile.id,
              deliveryId: activeDelivery?.id,
              lat: latitude,
              lng: longitude,
              heading: heading ?? undefined,
              speed: speed ? speed * 3.6 : undefined, // m/s to km/h
              accuracy,
            });
          }
        },
        (err) => {
          console.warn('GPS watch error:', err.message);
          setGpsError(`GPS error: ${err.message}. Switch to Simulation Mode.`);
          setUseRealGPS(false);
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      );
    }
  };

  // Toggle Driver Online / Offline Status
  const handleToggleOnline = async () => {
    if (!profile) return;
    const newStatus = profile.status === DriverStatus.OFFLINE ? DriverStatus.AVAILABLE : DriverStatus.OFFLINE;
    await updateDriverStatus(newStatus);
  };

  // Advance Delivery Status Machine
  const handleAdvanceStatus = async (nextStatus: DeliveryStatus) => {
    if (!activeDelivery) return;
    setIsUpdatingStatus(true);
    try {
      await api.updateDeliveryStatus(activeDelivery.id, nextStatus);
      setActiveDelivery((prev) => (prev ? { ...prev, status: nextStatus } : null));

      if (nextStatus === DeliveryStatus.DELIVERED) {
        // If completed, refresh deliveries
        setTimeout(loadDriverData, 1000);
      }
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to advance delivery status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const isOnline = profile?.status !== DriverStatus.OFFLINE;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ConnectionStatus isConnected={isConnected} />

      {/* Driver Portal Top Bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
            🛵
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 text-sm">DTS Courier</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {profile?.status || 'OFFLINE'}
              </span>
            </div>
            <div className="text-[11px] text-gray-400">
              Vehicle: {profile?.vehicleNumber || 'KA-01-EQ-1234'} ({profile?.vehicleType || 'BIKE'})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleOnline}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              isOnline
                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isOnline ? 'Go Offline' : 'Go Online'}</span>
          </button>

          <button
            onClick={logout}
            className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100 transition"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-5 flex-1">
        {/* Today's KPI Statistics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold flex-shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-bold text-gray-900">{completedDeliveries.length}</div>
              <div className="text-[11px] text-gray-400 font-medium">Completed Today</div>
            </div>
          </div>

          <div className="card p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-bold text-gray-900">
                ₹{profile?.totalEarnings ? profile.totalEarnings : (completedDeliveries.length * 120) || 1840}
              </div>
              <div className="text-[11px] text-gray-400 font-medium">Earnings Today</div>
            </div>
          </div>

          <div className="card p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold flex-shrink-0">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <div className="text-base font-bold text-gray-900">74.3 km</div>
              <div className="text-[11px] text-gray-400 font-medium">Distance Traveled</div>
            </div>
          </div>

          <div className="card p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold flex-shrink-0">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <div className="text-base font-bold text-gray-900">{profile?.rating || 4.9} ★</div>
              <div className="text-[11px] text-gray-400 font-medium">Driver Rating</div>
            </div>
          </div>
        </div>

        {/* Active Delivery Card (or Idle state) */}
        {activeDelivery ? (
          <div className="card p-5 border-2 border-primary-400 bg-white shadow-md space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-primary-600 uppercase tracking-wider">
                  Active Assignment
                </span>
                <h3 className="text-lg font-bold text-gray-900">
                  Order #{activeDelivery.trackingNumber}
                </h3>
              </div>
              <StatusBadge status={activeDelivery.status} />
            </div>

            {/* Address Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-gray-50 rounded-lg flex items-start gap-2.5">
                <Store className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-700">Pickup Location</div>
                  <div className="text-gray-900 font-medium">{activeDelivery.pickupAddress?.street}</div>
                  <div className="text-gray-500">{activeDelivery.pickupAddress?.city}</div>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-gray-700">Customer Destination</div>
                  <div className="text-gray-900 font-medium">{activeDelivery.destinationAddress?.street}</div>
                  <div className="text-gray-500">{activeDelivery.destinationAddress?.city}</div>
                </div>
              </div>
            </div>

            {/* Customer Contact & Notes */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-600 bg-primary-50/40 p-3 rounded-lg">
              <div>
                <span className="font-semibold text-gray-800">Customer: </span>
                <span>{activeDelivery.customer?.user?.name || 'Customer'}</span>
                {activeDelivery.customer?.user?.phone && (
                  <span className="ml-2 font-mono text-gray-500">
                    ({activeDelivery.customer.user.phone})
                  </span>
                )}
              </div>

              {activeDelivery.customer?.user?.phone && (
                <a
                  href={`tel:${activeDelivery.customer.user.phone}`}
                  className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1"
                >
                  <Phone className="w-3 h-3 text-emerald-600" />
                  <span>Call Customer</span>
                </a>
              )}
            </div>

            {/* Status Machine Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              {activeDelivery.status === DeliveryStatus.DRIVER_ASSIGNED && (
                <>
                  <button
                    onClick={() => handleAdvanceStatus(DeliveryStatus.DRIVER_ACCEPTED)}
                    disabled={isUpdatingStatus}
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Accept Delivery</span>
                  </button>
                  <button
                    onClick={() => handleAdvanceStatus(DeliveryStatus.CANCELLED)}
                    disabled={isUpdatingStatus}
                    className="btn-secondary text-xs text-rose-600 hover:bg-rose-50"
                  >
                    Decline
                  </button>
                </>
              )}

              {activeDelivery.status === DeliveryStatus.DRIVER_ACCEPTED && (
                <button
                  onClick={() => handleAdvanceStatus(DeliveryStatus.DRIVER_PICKED_UP)}
                  disabled={isUpdatingStatus}
                  className="btn-primary text-xs bg-amber-600 hover:bg-amber-700 flex items-center gap-1.5"
                >
                  <Store className="w-3.5 h-3.5" />
                  <span>Mark Picked Up from Store</span>
                </button>
              )}

              {activeDelivery.status === DeliveryStatus.DRIVER_PICKED_UP && (
                <button
                  onClick={() => handleAdvanceStatus(DeliveryStatus.IN_TRANSIT)}
                  disabled={isUpdatingStatus}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Start Transit towards Customer</span>
                </button>
              )}

              {activeDelivery.status === DeliveryStatus.IN_TRANSIT && (
                <>
                  <button
                    onClick={() => handleAdvanceStatus(DeliveryStatus.NEAR_DESTINATION)}
                    disabled={isUpdatingStatus}
                    className="btn-primary text-xs bg-teal-600 hover:bg-teal-700 flex items-center gap-1.5"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Arrived Near Destination</span>
                  </button>
                  <button
                    onClick={() => handleAdvanceStatus(DeliveryStatus.DELIVERED)}
                    disabled={isUpdatingStatus}
                    className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Mark as Delivered</span>
                  </button>
                </>
              )}

              {activeDelivery.status === DeliveryStatus.NEAR_DESTINATION && (
                <button
                  onClick={() => handleAdvanceStatus(DeliveryStatus.DELIVERED)}
                  disabled={isUpdatingStatus}
                  className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 py-2 px-4 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete & Mark Delivered</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="card p-8 text-center border-dashed border-2 border-gray-200">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-2 font-bold text-xl">
              ✓
            </div>
            <h3 className="font-bold text-gray-900 text-sm">No Active Assignment</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              You are currently ready to receive new delivery orders. Keep your status online.
            </p>
          </div>
        )}

        {/* GPS Tracking & Simulation Control Panel */}
        <div className="card p-5 border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-primary-600" />
              <h3 className="font-semibold text-gray-900 text-sm">GPS & Location Engine</h3>
            </div>

            <div className="flex items-center gap-2">
              {useRealGPS ? (
                <span className="badge-green flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>Real GPS Active</span>
                </span>
              ) : (
                <span className="badge-gray">Idle / Offline</span>
              )}
            </div>
          </div>

          {gpsError && (
            <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Mode Switchers */}
          <div className="grid grid-cols-1 gap-4 pt-1">
            {/* Real Hardware GPS Switcher */}
            <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/40 space-y-3 flex flex-col justify-between">
              <div>
                <div className="font-bold text-xs text-indigo-900">Device Browser Geolocation</div>
                <div className="text-[11px] text-indigo-700">Uses device GPS via watchPosition()</div>
              </div>

              <div className="text-[11px] text-gray-500">
                {currentCoords ? (
                  <span className="font-mono text-[10px] bg-white px-2 py-1 rounded border border-gray-200 block">
                    Lat: {currentCoords.lat.toFixed(5)}, Lng: {currentCoords.lng.toFixed(5)}
                  </span>
                ) : (
                  'No position lock acquired yet.'
                )}
              </div>

              <button
                onClick={toggleRealGPS}
                className={`btn-secondary text-xs flex items-center justify-center gap-1.5 py-2 w-full ${
                  useRealGPS ? 'border-emerald-500 text-emerald-700 bg-emerald-50' : ''
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{useRealGPS ? 'Stop Device GPS' : 'Enable Real Device GPS'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Live Navigation Mini Map */}
        <div className="card p-3 border border-gray-100">
          <div className="flex items-center justify-between px-2 py-1 mb-2">
            <h4 className="font-semibold text-gray-900 text-xs">Live Route & Location Map</h4>
            {currentCoords && (
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live Broadcast Active
              </span>
            )}
          </div>
          <div className="h-72 w-full rounded-lg overflow-hidden">
            <MapView
              driverLocation={currentCoords}
              pickupLocation={
                activeDelivery?.pickupAddress
                  ? {
                      lat: activeDelivery.pickupAddress.lat,
                      lng: activeDelivery.pickupAddress.lng,
                      label: activeDelivery.pickupAddress.street,
                    }
                  : null
              }
              destinationLocation={
                activeDelivery?.destinationAddress
                  ? {
                      lat: activeDelivery.destinationAddress.lat,
                      lng: activeDelivery.destinationAddress.lng,
                      label: activeDelivery.destinationAddress.street,
                    }
                  : null
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DriverDashboard;

