import React from 'react';
import { Delivery, DeliveryStatus } from '@dts/shared';
import StatusBadge from '../ui/StatusBadge';
import { MapPin, Clock, ArrowRight, User, Package } from 'lucide-react';
import { format } from 'date-fns';

interface DeliveryCardProps {
  delivery: Delivery;
  onClick?: () => void;
  compact?: boolean;
}

export const DeliveryCard: React.FC<DeliveryCardProps> = ({ delivery, onClick, compact = false }) => {
  const formattedDate = delivery.createdAt
    ? format(new Date(delivery.createdAt), 'MMM d, h:mm a')
    : '';

  return (
    <div
      onClick={onClick}
      className={`card transition-all duration-200 hover:shadow-md cursor-pointer border border-gray-100 p-4 ${
        onClick ? 'hover:border-primary-300' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary-600" />
          <span className="font-semibold text-gray-900 text-sm">{delivery.trackingNumber}</span>
        </div>
        <StatusBadge status={delivery.status} />
      </div>

      <div className="space-y-2 mb-3 text-xs text-gray-600">
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
          <div className="truncate">
            <span className="text-gray-400 font-medium">From: </span>
            <span className="text-gray-800 font-medium">{delivery.pickupAddress?.street || 'Pickup location'}</span>
            {delivery.pickupAddress?.city && <span className="text-gray-500">, {delivery.pickupAddress.city}</span>}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
          <div className="truncate">
            <span className="text-gray-400 font-medium">To: </span>
            <span className="text-gray-800 font-medium">{delivery.destinationAddress?.street || 'Destination'}</span>
            {delivery.destinationAddress?.city && <span className="text-gray-500">, {delivery.destinationAddress.city}</span>}
          </div>
        </div>
      </div>

      {!compact && (
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span>{formattedDate}</span>
          </div>

          {delivery.driver ? (
            <div className="flex items-center gap-1.5 font-medium text-gray-700">
              <User className="w-3.5 h-3.5 text-primary-600" />
              <span>{delivery.driver.user?.name || 'Assigned Driver'}</span>
            </div>
          ) : (
            <span className="text-gray-400 italic">Unassigned</span>
          )}

          {typeof delivery.totalAmount === 'number' && delivery.totalAmount > 0 && (
            <span className="font-semibold text-gray-900">₹{delivery.totalAmount}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default DeliveryCard;

