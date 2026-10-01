// ============================================================
// ENUMS
// ============================================================

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  DRIVER = 'DRIVER',
  ADMIN = 'ADMIN',
}

export enum DeliveryStatus {
  ORDER_CREATED = 'ORDER_CREATED',
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
  DRIVER_ACCEPTED = 'DRIVER_ACCEPTED',
  DRIVER_PICKED_UP = 'DRIVER_PICKED_UP',
  IN_TRANSIT = 'IN_TRANSIT',
  NEAR_DESTINATION = 'NEAR_DESTINATION',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
  DELAYED = 'DELAYED',
}

export enum DriverStatus {
  ONLINE = 'ONLINE',
  AVAILABLE = 'AVAILABLE',
  BUSY = 'BUSY',
  OFFLINE = 'OFFLINE',
}

export enum VehicleType {
  BIKE = 'BIKE',
  SCOOTER = 'SCOOTER',
  CAR = 'CAR',
  VAN = 'VAN',
}

export enum NotificationType {
  DELIVERY_ASSIGNED = 'DELIVERY_ASSIGNED',
  DELIVERY_PICKED_UP = 'DELIVERY_PICKED_UP',
  DELIVERY_NEAR = 'DELIVERY_NEAR',
  DELIVERY_COMPLETED = 'DELIVERY_COMPLETED',
  DELIVERY_DELAYED = 'DELIVERY_DELAYED',
  DRIVER_ASSIGNED = 'DRIVER_ASSIGNED',
  NEW_ORDER = 'NEW_ORDER',
}

// ============================================================
// CORE INTERFACES
// ============================================================

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  createdAt: string;
}

export interface Address {
  id: string;
  label?: string;
  street: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export interface Driver {
  id: string;
  userId: string;
  user: User;
  vehicleType: VehicleType;
  vehicleNumber: string;
  rating: number;
  totalDeliveries: number;
  totalEarnings: number;
  status: DriverStatus;
  currentLat?: number;
  currentLng?: number;
  lastSeenAt?: string;
}

export interface Customer {
  id: string;
  userId: string;
  user: User;
}

export interface Delivery {
  id: string;
  trackingNumber: string;
  customerId: string;
  customer?: Customer;
  driverId?: string;
  driver?: Driver;
  pickupAddress: Address;
  destinationAddress: Address;
  status: DeliveryStatus;
  estimatedArrival?: string;
  notes?: string;
  totalAmount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocationUpdate {
  id: string;
  driverId: string;
  deliveryId?: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: string;
}

export interface DeliveryStatusHistory {
  id: string;
  deliveryId: string;
  status: DeliveryStatus;
  timestamp: string;
  note?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface AdminStats {
  activeDeliveries: number;
  availableDrivers: number;
  delayedDeliveries: number;
  completedToday: number;
  totalDrivers: number;
  totalCustomers: number;
  totalOrders: number;
  revenueToday: number;
}

export interface ETAResult {
  distanceKm: number;
  minutes: number;
  arrivalTime: string;
}

// ============================================================
// WEBSOCKET EVENT PAYLOADS
// ============================================================

export interface DriverLocationPayload {
  driverId: string;
  deliveryId?: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: string;
}

export interface DeliveryStatusPayload {
  deliveryId: string;
  status: DeliveryStatus;
  timestamp: string;
  eta?: ETAResult;
}

export interface DriverPresencePayload {
  driverId: string;
  status: DriverStatus;
  timestamp: string;
}

export interface NotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
}

// ============================================================
// SOCKET EVENT NAMES
// ============================================================

export const SOCKET_EVENTS = {
  // Driver → Server
  DRIVER_CONNECT: 'driver:connect',
  DRIVER_LOCATION_UPDATE: 'driver:location:update',
  DRIVER_STATUS_CHANGE: 'driver:status:change',

  // Server → Clients
  DRIVER_LOCATION: 'driver:location',
  DRIVER_ONLINE: 'driver:online',
  DRIVER_OFFLINE: 'driver:offline',
  DRIVER_STATUS: 'driver:status',

  // Delivery events (Server → Clients)
  DELIVERY_CREATED: 'delivery:created',
  DELIVERY_ASSIGNED: 'delivery:assigned',
  DELIVERY_STATUS: 'delivery:status',
  DELIVERY_ETA_UPDATE: 'delivery:eta',

  // Notifications
  NOTIFICATION: 'notification',

  // Admin
  ADMIN_STATS: 'admin:stats',

  // System
  JOIN_DELIVERY_ROOM: 'join:delivery',
  JOIN_DRIVER_ROOM: 'join:driver',
  JOIN_ADMIN_ROOM: 'join:admin',
} as const;

// ============================================================
// DELIVERY STATE MACHINE
// ============================================================

export const VALID_STATUS_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  [DeliveryStatus.ORDER_CREATED]: [DeliveryStatus.DRIVER_ASSIGNED, DeliveryStatus.CANCELLED],
  [DeliveryStatus.DRIVER_ASSIGNED]: [DeliveryStatus.DRIVER_ACCEPTED, DeliveryStatus.CANCELLED, DeliveryStatus.ORDER_CREATED],
  [DeliveryStatus.DRIVER_ACCEPTED]: [DeliveryStatus.DRIVER_PICKED_UP, DeliveryStatus.CANCELLED],
  [DeliveryStatus.DRIVER_PICKED_UP]: [DeliveryStatus.IN_TRANSIT, DeliveryStatus.FAILED],
  [DeliveryStatus.IN_TRANSIT]: [DeliveryStatus.NEAR_DESTINATION, DeliveryStatus.DELAYED, DeliveryStatus.DELIVERED],
  [DeliveryStatus.NEAR_DESTINATION]: [DeliveryStatus.DELIVERED, DeliveryStatus.DELAYED],
  [DeliveryStatus.DELIVERED]: [],
  [DeliveryStatus.CANCELLED]: [],
  [DeliveryStatus.FAILED]: [DeliveryStatus.ORDER_CREATED],
  [DeliveryStatus.DELAYED]: [DeliveryStatus.IN_TRANSIT, DeliveryStatus.NEAR_DESTINATION, DeliveryStatus.DELIVERED, DeliveryStatus.FAILED],
};

export const STATUS_DISPLAY: Record<DeliveryStatus, { label: string; color: string; icon: string }> = {
  [DeliveryStatus.ORDER_CREATED]: { label: 'Order Confirmed', color: 'blue', icon: '📋' },
  [DeliveryStatus.DRIVER_ASSIGNED]: { label: 'Driver Assigned', color: 'indigo', icon: '🚴' },
  [DeliveryStatus.DRIVER_ACCEPTED]: { label: 'Driver Accepted', color: 'purple', icon: '✅' },
  [DeliveryStatus.DRIVER_PICKED_UP]: { label: 'Package Picked Up', color: 'orange', icon: '📦' },
  [DeliveryStatus.IN_TRANSIT]: { label: 'In Transit', color: 'blue', icon: '🛵' },
  [DeliveryStatus.NEAR_DESTINATION]: { label: 'Almost There', color: 'teal', icon: '📍' },
  [DeliveryStatus.DELIVERED]: { label: 'Delivered', color: 'green', icon: '🎉' },
  [DeliveryStatus.CANCELLED]: { label: 'Cancelled', color: 'red', icon: '❌' },
  [DeliveryStatus.FAILED]: { label: 'Failed', color: 'red', icon: '⚠️' },
  [DeliveryStatus.DELAYED]: { label: 'Delayed', color: 'yellow', icon: '⏰' },
};

export const DELIVERY_TIMELINE_STEPS: DeliveryStatus[] = [
  DeliveryStatus.ORDER_CREATED,
  DeliveryStatus.DRIVER_ASSIGNED,
  DeliveryStatus.DRIVER_ACCEPTED,
  DeliveryStatus.DRIVER_PICKED_UP,
  DeliveryStatus.IN_TRANSIT,
  DeliveryStatus.NEAR_DESTINATION,
  DeliveryStatus.DELIVERED,
];
