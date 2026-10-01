import React from 'react';
import { Driver, VehicleType } from '@dts/shared';
import { Star, Phone, MessageSquare, Bike, Car, Truck } from 'lucide-react';
import StatusBadge from '../ui/StatusBadge';

interface DriverCardProps {
  driver: Driver;
  onCall?: () => void;
  onMessage?: () => void;
  showActions?: boolean;
  className?: string;
}

export const DriverCard: React.FC<DriverCardProps> = ({
  driver,
  onCall,
  onMessage,
  showActions = true,
  className = '',
}) => {
  const getVehicleIcon = (type?: VehicleType | string) => {
    switch (type) {
      case VehicleType.CAR:
        return <Car className="w-4 h-4" />;
      case VehicleType.VAN:
        return <Truck className="w-4 h-4" />;
      case VehicleType.SCOOTER:
      case VehicleType.BIKE:
      default:
        return <Bike className="w-4 h-4" />;
    }
  };

  const name = driver.user?.name || 'Driver';
  const phone = driver.user?.phone || '+91 98765 43210';
  const rating = driver.rating || 4.9;
  const avatar = driver.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;

  return (
    <div className={`card p-4 border border-gray-100 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src={avatar}
            alt={name}
            className="w-12 h-12 rounded-full border-2 border-indigo-100 object-cover bg-gray-50 flex-shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900 text-sm">{name}</h4>
              <div className="flex items-center text-xs font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
                <Star className="w-3 h-3 fill-amber-400 mr-0.5" />
                {rating.toFixed(1)}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <span className="flex items-center gap-1 text-gray-600 font-medium">
                {getVehicleIcon(driver.vehicleType)}
                <span>{driver.vehicleNumber || 'KA-01-EQ-1234'}</span>
              </span>
              <span>•</span>
              <span>{driver.totalDeliveries || 0} deliveries</span>
            </div>
          </div>
        </div>

        {driver.status && (
          <StatusBadge status={driver.status} />
        )}
      </div>

      {showActions && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-2">
          <a
            href={`tel:${phone}`}
            onClick={(e) => {
              if (onCall) {
                e.preventDefault();
                onCall();
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 active:scale-98 transition"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Call Driver</span>
          </a>

          <a
            href={`sms:${phone}`}
            onClick={(e) => {
              if (onMessage) {
                e.preventDefault();
                onMessage();
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 active:scale-98 transition"
          >
            <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
            <span>Message</span>
          </a>
        </div>
      )}
    </div>
  );
};

export default DriverCard;

