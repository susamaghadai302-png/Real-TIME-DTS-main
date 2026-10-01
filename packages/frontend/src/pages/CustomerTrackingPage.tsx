import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useDeliveryStore } from '../stores/deliveryStore';
import { useSocket } from '../hooks/useSocket';
import { SOCKET_EVENTS, DeliveryStatus, ETAResult } from '@dts/shared';
import MapView from '../components/map/MapView';
import DeliveryTimeline from '../components/delivery/DeliveryTimeline';
import ETAIndicator from '../components/delivery/ETAIndicator';
import DriverCard from '../components/driver/DriverCard';
import StatusBadge from '../components/ui/StatusBadge';
import ConnectionStatus from '../components/ui/ConnectionStatus';
import BottomSheet from '../components/ui/BottomSheet';
import { SkeletonCard } from '../components/ui/SkeletonLoader';
import { ArrowLeft, MapPin, Store, ShieldAlert, ChevronUp, Share2, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const CustomerTrackingPage: React.FC = () => {
  const { trackingNumber } = useParams<{ trackingNumber: string }>();
  const {
    currentDelivery,
    driverLocation,
    eta,
    isLoading,
    error,
    trackDelivery,
    setDriverLocation,
    setETA,
    updateDeliveryStatus,
  } = useDeliveryStore();

  const { socket, isConnected } = useSocket();
  const [lastUpdatedTime, setLastUpdatedTime] = useState<Date | null>(null);
  const [timeAgo, setTimeAgo] = useState<string>('Just now');
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch initial delivery details
  useEffect(() => {
    if (trackingNumber) {
      trackDelivery(trackingNumber).catch((err) => {
        console.error('Failed to load delivery:', err);
      });
    }
  }, [trackingNumber, trackDelivery]);

  // Set initial driver position if available from delivery record
  useEffect(() => {
    if (currentDelivery?.driver?.currentLat && currentDelivery?.driver?.currentLng) {
      setDriverLocation({
        lat: currentDelivery.driver.currentLat,
        lng: currentDelivery.driver.currentLng,
        timestamp: currentDelivery.driver.lastSeenAt,
      });
      setLastUpdatedTime(new Date());
    }
  }, [currentDelivery, setDriverLocation]);

  // Socket room joining and event listeners
  useEffect(() => {
    if (!socket || !currentDelivery?.id) return;

    // Join room for this specific delivery
    socket.emit(SOCKET_EVENTS.JOIN_DELIVERY_ROOM, currentDelivery.id);

    // Listen to real-time driver GPS updates
    const handleDriverLocation = (payload: {
      lat: number;
      lng: number;
      heading?: number;
      speed?: number;
      timestamp?: string;
    }) => {
      setDriverLocation({
        lat: payload.lat,
        lng: payload.lng,
        heading: payload.heading,
        speed: payload.speed,
        timestamp: payload.timestamp,
      });
      setLastUpdatedTime(new Date());
    };

    // Listen to status transitions
    const handleStatusUpdate = (payload: { status: DeliveryStatus }) => {
      useDeliveryStore.setState((state) => {
        if (!state.currentDelivery) return state;
        return {
          currentDelivery: {
            ...state.currentDelivery,
            status: payload.status,
          },
        };
      });
    };

    // Listen to live ETA calculations
    const handleETAUpdate = (payload: { eta: ETAResult }) => {
      setETA(payload.eta);
    };

    socket.on(SOCKET_EVENTS.DRIVER_LOCATION, handleDriverLocation);
    socket.on(SOCKET_EVENTS.DELIVERY_STATUS, handleStatusUpdate);
    socket.on(SOCKET_EVENTS.DELIVERY_ETA_UPDATE, handleETAUpdate);

    return () => {
      socket.off(SOCKET_EVENTS.DRIVER_LOCATION, handleDriverLocation);
      socket.off(SOCKET_EVENTS.DELIVERY_STATUS, handleStatusUpdate);
      socket.off(SOCKET_EVENTS.DELIVERY_ETA_UPDATE, handleETAUpdate);
    };
  }, [socket, currentDelivery?.id, setDriverLocation, setETA]);

  // Live "Last updated X ago" counter
  useEffect(() => {
    if (!lastUpdatedTime) return;
    const interval = setInterval(() => {
      setTimeAgo(formatDistanceToNow(lastUpdatedTime, { addSuffix: true }));
    }, 2000);
    return () => clearInterval(interval);
  }, [lastUpdatedTime]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading && !currentDelivery) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8 max-w-6xl mx-auto">
        <div className="h-8 w-48 skeleton mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[500px] skeleton rounded-2xl" />
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentDelivery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full card p-8 text-center border border-gray-100 shadow-lg">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Delivery Not Found</h2>
          <p className="text-sm text-gray-600 mb-6">
            We couldn't locate tracking information for #{trackingNumber}. Please verify the tracking number and try again.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  const pickup = currentDelivery.pickupAddress;
  const destination = currentDelivery.destinationAddress;

  const renderInfoPanel = () => (
    <div className="space-y-5">
      {/* Live ETA Card */}
      <div className="card p-5 border border-indigo-50/80 bg-gradient-to-br from-white to-primary-50/20">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Delivery Status
          </span>
          <StatusBadge status={currentDelivery.status} />
        </div>

        <ETAIndicator eta={eta} status={currentDelivery.status} className="mb-3" />

        {lastUpdatedTime && (
          <div className="text-[11px] text-gray-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Driver location updated {timeAgo}</span>
          </div>
        )}
      </div>

      {/* Driver Card */}
      {currentDelivery.driver && (
        <DriverCard driver={currentDelivery.driver} />
      )}

      {/* Delivery Timeline */}
      <div className="card p-5 border border-gray-100">
        <h3 className="font-semibold text-gray-900 text-sm mb-4">Delivery Progress</h3>
        <DeliveryTimeline status={currentDelivery.status} />
      </div>

      {/* Pickup & Destination Details */}
      <div className="card p-5 border border-gray-100 space-y-4">
        <h3 className="font-semibold text-gray-900 text-sm">Trip Details</h3>

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Store className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-medium">Pickup location</div>
            <div className="text-sm font-semibold text-gray-800">
              {pickup?.label || pickup?.street}
            </div>
            <div className="text-xs text-gray-500">
              {pickup?.street}, {pickup?.city}
            </div>
          </div>
        </div>

        <div className="ml-4 border-l-2 border-dashed border-gray-200 h-4" />

        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0 mt-0.5">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-medium">Delivery destination</div>
            <div className="text-sm font-semibold text-gray-800">
              {destination?.label || destination?.street}
            </div>
            <div className="text-xs text-gray-500">
              {destination?.street}, {destination?.city}
            </div>
          </div>
        </div>

        {currentDelivery.notes && (
          <div className="pt-3 border-t border-gray-100 text-xs text-gray-500">
            <span className="font-semibold text-gray-700">Delivery Instructions: </span>
            {currentDelivery.notes}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ConnectionStatus isConnected={isConnected} />

      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            to="/dashboard"
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-gray-900 text-base sm:text-lg">
                Delivery #{currentDelivery.trackingNumber}
              </h1>
              <span className="hidden sm:inline-block">
                <StatusBadge status={currentDelivery.status} />
              </span>
            </div>
            <div className="text-xs text-gray-400">Real-time live courier tracking</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full">
          {/* Map View Container - takes 7 or 8 columns on large screens */}
          <div className="lg:col-span-7 xl:col-span-8 bg-white card p-2 shadow-sm rounded-2xl flex flex-col h-[480px] sm:h-[600px] lg:h-[calc(100vh-140px)] sticky top-20">
            <MapView
              driverLocation={driverLocation}
              pickupLocation={
                pickup ? { lat: pickup.lat, lng: pickup.lng, label: pickup.label || pickup.street } : null
              }
              destinationLocation={
                destination ? { lat: destination.lat, lng: destination.lng, label: destination.label || destination.street } : null
              }
              className="h-full w-full"
            />

            {/* Mobile Draggable Trigger Pill */}
            <div className="lg:hidden mt-2 pt-2 flex justify-center">
              <button
                onClick={() => setMobileSheetOpen(true)}
                className="btn-primary text-xs w-full flex items-center justify-center gap-1 py-2"
              >
                <span>View Delivery & Courier Info</span>
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Side Info Panel - Desktop */}
          <div className="hidden lg:block lg:col-span-5 xl:col-span-4">
            {renderInfoPanel()}
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      <BottomSheet
        isOpen={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        title={`Order #${currentDelivery.trackingNumber}`}
      >
        {renderInfoPanel()}
      </BottomSheet>
    </div>
  );
};

export default CustomerTrackingPage;

