import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@dts/shared';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  connect(token?: string) {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_URL, {
      auth: token ? { token } : {},
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket.IO connected:', this.socket?.id);
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err.message);
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect', (attempt) => {
      console.log(`🔌 Socket.IO reconnected after ${attempt} attempts`);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Room management
  joinDeliveryRoom(deliveryId: string) {
    this.socket?.emit(SOCKET_EVENTS.JOIN_DELIVERY_ROOM, deliveryId);
  }

  joinDriverRoom(driverId: string) {
    this.socket?.emit(SOCKET_EVENTS.JOIN_DRIVER_ROOM, driverId);
  }

  joinAdminRoom() {
    this.socket?.emit(SOCKET_EVENTS.JOIN_ADMIN_ROOM);
  }

  // Driver events
  emitDriverConnect(driverId: string) {
    this.socket?.emit(SOCKET_EVENTS.DRIVER_CONNECT, driverId);
  }

  emitLocationUpdate(payload: {
    driverId: string;
    deliveryId?: string;
    lat: number;
    lng: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
  }) {
    this.socket?.emit(SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, payload);
  }

  emitStatusChange(driverId: string, status: string) {
    this.socket?.emit(SOCKET_EVENTS.DRIVER_STATUS_CHANGE, { driverId, status });
  }

  // Listeners
  on<T = unknown>(event: string, handler: (data: T) => void) {
    this.socket?.on(event, handler);
    return () => this.socket?.off(event, handler);
  }

  off(event: string, handler?: (...args: unknown[]) => void) {
    this.socket?.off(event, handler);
  }
}

export const socketService = new SocketService();
