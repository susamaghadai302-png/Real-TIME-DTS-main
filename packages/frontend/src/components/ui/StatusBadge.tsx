import { DeliveryStatus, DriverStatus, STATUS_DISPLAY } from '@dts/shared';

type AnyStatus = DeliveryStatus | DriverStatus;

interface StatusBadgeProps {
  status: AnyStatus;
  size?: 'sm' | 'md';
}

const DRIVER_STATUS_CONFIG: Record<
  DriverStatus,
  { label: string; bgClass: string; textClass: string; dotClass: string; icon: string }
> = {
  [DriverStatus.AVAILABLE]: {
    label: 'Available',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    dotClass: 'bg-green-500',
    icon: '🟢',
  },
  [DriverStatus.BUSY]: {
    label: 'Busy',
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    dotClass: 'bg-blue-500',
    icon: '🔵',
  },
  [DriverStatus.ONLINE]: {
    label: 'Online',
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    dotClass: 'bg-green-500',
    icon: '🟢',
  },
  [DriverStatus.OFFLINE]: {
    label: 'Offline',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-600',
    dotClass: 'bg-gray-400',
    icon: '⚫',
  },
};

const DELIVERY_COLOR_MAP: Record<
  DeliveryStatus,
  { bgClass: string; textClass: string; dotClass: string }
> = {
  [DeliveryStatus.ORDER_CREATED]: {
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    dotClass: 'bg-blue-500',
  },
  [DeliveryStatus.DRIVER_ASSIGNED]: {
    bgClass: 'bg-indigo-100',
    textClass: 'text-indigo-700',
    dotClass: 'bg-indigo-500',
  },
  [DeliveryStatus.DRIVER_ACCEPTED]: {
    bgClass: 'bg-purple-100',
    textClass: 'text-purple-700',
    dotClass: 'bg-purple-500',
  },
  [DeliveryStatus.DRIVER_PICKED_UP]: {
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-700',
    dotClass: 'bg-orange-500',
  },
  [DeliveryStatus.IN_TRANSIT]: {
    bgClass: 'bg-blue-100',
    textClass: 'text-blue-700',
    dotClass: 'bg-blue-500',
  },
  [DeliveryStatus.NEAR_DESTINATION]: {
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-700',
    dotClass: 'bg-teal-500',
  },
  [DeliveryStatus.DELIVERED]: {
    bgClass: 'bg-green-100',
    textClass: 'text-green-700',
    dotClass: 'bg-green-500',
  },
  [DeliveryStatus.CANCELLED]: {
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
    dotClass: 'bg-red-500',
  },
  [DeliveryStatus.FAILED]: {
    bgClass: 'bg-red-100',
    textClass: 'text-red-700',
    dotClass: 'bg-red-500',
  },
  [DeliveryStatus.DELAYED]: {
    bgClass: 'bg-yellow-100',
    textClass: 'text-yellow-700',
    dotClass: 'bg-yellow-500',
  },
};

function isDeliveryStatus(status: AnyStatus): status is DeliveryStatus {
  return Object.values(DeliveryStatus).includes(status as DeliveryStatus);
}

export default function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  if (isDeliveryStatus(status)) {
    const display = STATUS_DISPLAY[status];
    const colors = DELIVERY_COLOR_MAP[status];
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClass} ${colors.bgClass} ${colors.textClass}`}
      >
        <span className={`rounded-full flex-shrink-0 ${dotSize} ${colors.dotClass}`} />
        {display.icon} {display.label}
      </span>
    );
  }

  const driverStatus = status as DriverStatus;
  const config = DRIVER_STATUS_CONFIG[driverStatus];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClass} ${config.bgClass} ${config.textClass}`}
    >
      <span className={`rounded-full flex-shrink-0 ${dotSize} ${config.dotClass}`} />
      {config.icon} {config.label}
    </span>
  );
}
