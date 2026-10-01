import React from 'react';
import { ETAResult, DeliveryStatus } from '@dts/shared';
import { Clock, Navigation, CheckCircle2, AlertTriangle } from 'lucide-react';

interface ETAIndicatorProps {
  eta?: ETAResult | null;
  status?: DeliveryStatus;
  className?: string;
}

export const ETAIndicator: React.FC<ETAIndicatorProps> = ({ eta, status, className = '' }) => {
  if (status === DeliveryStatus.DELIVERED) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm font-medium ${className}`}>
        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
        <span>Delivered successfully</span>
      </div>
    );
  }

  if (status === DeliveryStatus.CANCELLED || status === DeliveryStatus.FAILED) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm font-medium ${className}`}>
        <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
        <span>Delivery {status.toLowerCase()}</span>
      </div>
    );
  }

  if (!eta && status !== DeliveryStatus.IN_TRANSIT && status !== DeliveryStatus.NEAR_DESTINATION) {
    return null;
  }

  const formatArrivalTime = (isoString?: string) => {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-3 bg-white/90 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm ${className}`}>
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">LIVE</span>
      </div>

      <div className="h-4 w-px bg-gray-200" />

      <div className="flex items-center gap-1.5">
        <Clock className="w-4 h-4 text-indigo-600" />
        <span className="text-sm font-semibold text-gray-900">
          {eta?.minutes !== undefined ? (
            eta.minutes <= 1 ? (
              <span className="text-emerald-600 font-bold">Arriving now!</span>
            ) : (
              `${eta.minutes} mins`
            )
          ) : (
            'Calculating...'
          )}
        </span>
        {eta?.arrivalTime && (
          <span className="text-xs text-gray-500">({formatArrivalTime(eta.arrivalTime)})</span>
        )}
      </div>

      {eta?.distanceKm !== undefined && (
        <>
          <div className="h-4 w-px bg-gray-200 hidden sm:block" />
          <div className="hidden sm:flex items-center gap-1 text-xs text-gray-600">
            <Navigation className="w-3.5 h-3.5 text-gray-400" />
            <span>{eta.distanceKm.toFixed(1)} km left</span>
          </div>
        </>
      )}
    </div>
  );
};

export default ETAIndicator;

