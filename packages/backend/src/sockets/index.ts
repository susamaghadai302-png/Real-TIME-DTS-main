import { Server as SocketIOServer } from 'socket.io';
import { prisma } from '../db/client';
import { SOCKET_EVENTS, DeliveryStatus } from '@dts/shared';
import { verifyToken } from '../middleware/auth';
import { calculateETA } from '../services/etaService';
import { simulationService } from '../services/simulationService';

const THROTTLE_MS = parseInt(process.env.THROTTLE_LOCATION_MS || '2000');
const driverLastUpdate = new Map<string, number>();

export function setupSocketHandlers(io: SocketIOServer) {
  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
    if (!token) {
      // Allow unauthenticated connections for public tracking
      socket.data.user = null;
      return next();
    }
    try {
      socket.data.user = verifyToken(token);
      next();
    } catch {
      // Allow anonymous for tracking
      socket.data.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`Socket connected: ${socket.id} | User: ${user?.email || 'anonymous'}`);

    // Join admin room
    socket.on(SOCKET_EVENTS.JOIN_ADMIN_ROOM, () => {
      if (user?.role === 'ADMIN') {
        socket.join('admin');
        console.log(`Admin ${user.email} joined admin room`);
      }
    });

    // Join delivery tracking room (public - just needs trackingId or deliveryId)
    socket.on(SOCKET_EVENTS.JOIN_DELIVERY_ROOM, async (deliveryId: string) => {
      // Verify delivery exists
      const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
      if (!delivery) return;

      // If customer, verify ownership
      if (user?.role === 'CUSTOMER' && delivery.customerId !== user.customerId) return;

      socket.join(`delivery:${deliveryId}`);
      console.log(`Socket ${socket.id} joined delivery:${deliveryId}`);

      // Send current driver location if active
      if (delivery.driverId) {
        const driver = await prisma.driver.findUnique({ where: { id: delivery.driverId } });
        if (driver?.currentLat && driver?.currentLng) {
          const latest = await prisma.locationUpdate.findFirst({
            where: { driverId: delivery.driverId, deliveryId },
            orderBy: { timestamp: 'desc' },
          });
          if (latest) {
            socket.emit(SOCKET_EVENTS.DRIVER_LOCATION, {
              driverId: driver.id,
              deliveryId,
              lat: latest.lat,
              lng: latest.lng,
              heading: latest.heading,
              speed: latest.speed,
              accuracy: latest.accuracy,
              timestamp: latest.timestamp.toISOString(),
            });
          }
        }
      }
    });

    // Join driver room
    socket.on(SOCKET_EVENTS.JOIN_DRIVER_ROOM, async (driverId: string) => {
      if (!user || (user.role !== 'DRIVER' && user.role !== 'ADMIN')) return;
      if (user.role === 'DRIVER' && user.driverId !== driverId) return;

      socket.join(`driver:${driverId}`);
      console.log(`Socket ${socket.id} joined driver:${driverId}`);
    });

    // Driver sends location update
    socket.on(SOCKET_EVENTS.DRIVER_LOCATION_UPDATE, async (payload: {
      driverId: string;
      deliveryId?: string;
      lat: number;
      lng: number;
      heading?: number;
      speed?: number;
      accuracy?: number;
    }) => {
      if (!user || user.role !== 'DRIVER') return;
      if (user.driverId !== payload.driverId) return;

      // Throttle: skip if last update was too recent
      const now = Date.now();
      const lastUpdate = driverLastUpdate.get(payload.driverId) || 0;
      if (now - lastUpdate < THROTTLE_MS) return;
      driverLastUpdate.set(payload.driverId, now);

      const timestamp = new Date().toISOString();

      // Persist location
      try {
        await Promise.all([
          prisma.locationUpdate.create({
            data: {
              driverId: payload.driverId,
              deliveryId: payload.deliveryId,
              lat: payload.lat,
              lng: payload.lng,
              heading: payload.heading,
              speed: payload.speed,
              accuracy: payload.accuracy,
            },
          }),
          prisma.driver.update({
            where: { id: payload.driverId },
            data: {
              currentLat: payload.lat,
              currentLng: payload.lng,
              lastSeenAt: new Date(),
            },
          }),
        ]);
      } catch (err) {
        console.error('Failed to persist location:', err);
      }

      const locationPayload = { ...payload, timestamp };

      // Broadcast to delivery room
      if (payload.deliveryId) {
        io.to(`delivery:${payload.deliveryId}`).emit(SOCKET_EVENTS.DRIVER_LOCATION, locationPayload);

        // Auto-check NEAR_DESTINATION
        try {
          const delivery = await prisma.delivery.findUnique({
            where: { id: payload.deliveryId },
            include: { destinationAddress: true },
          });

          if (delivery && delivery.status === 'IN_TRANSIT' && delivery.destinationAddress) {
            const eta = calculateETA(
              payload.lat,
              payload.lng,
              delivery.destinationAddress.lat,
              delivery.destinationAddress.lng,
              payload.speed || 30
            );

            // Broadcast ETA
            io.to(`delivery:${payload.deliveryId}`).emit(SOCKET_EVENTS.DELIVERY_ETA_UPDATE, {
              deliveryId: payload.deliveryId,
              eta,
            });

            // Auto-transition to NEAR_DESTINATION at ~500m / 2 min
            if (eta.distanceKm < 0.5 && eta.minutes <= 2) {
              await prisma.delivery.update({
                where: { id: payload.deliveryId },
                data: { status: DeliveryStatus.NEAR_DESTINATION },
              });
              await prisma.deliveryStatusHistory.create({
                data: {
                  deliveryId: payload.deliveryId,
                  status: DeliveryStatus.NEAR_DESTINATION,
                  note: 'Auto-detected near destination',
                },
              });
              io.to(`delivery:${payload.deliveryId}`).emit(SOCKET_EVENTS.DELIVERY_STATUS, {
                deliveryId: payload.deliveryId,
                status: DeliveryStatus.NEAR_DESTINATION,
                timestamp,
              });
              io.to('admin').emit(SOCKET_EVENTS.DELIVERY_STATUS, {
                deliveryId: payload.deliveryId,
                status: DeliveryStatus.NEAR_DESTINATION,
                timestamp,
              });
            }
          }
        } catch (err) {
          console.error('ETA/proximity check error:', err);
        }
      }

      // Broadcast to admin
      io.to('admin').emit(SOCKET_EVENTS.DRIVER_LOCATION, locationPayload);
    });

    // Driver status change
    socket.on(SOCKET_EVENTS.DRIVER_STATUS_CHANGE, async (payload: { driverId: string; status: string }) => {
      if (!user || user.role !== 'DRIVER') return;
      if (user.driverId !== payload.driverId) return;

      try {
        await prisma.driver.update({
          where: { id: payload.driverId },
          data: { status: payload.status, lastSeenAt: new Date() },
        });

        io.to('admin').emit(SOCKET_EVENTS.DRIVER_STATUS, {
          driverId: payload.driverId,
          status: payload.status,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Status change error:', err);
      }
    });

    // Driver connects (goes online)
    socket.on(SOCKET_EVENTS.DRIVER_CONNECT, async (driverId: string) => {
      if (!user || user.role !== 'DRIVER') return;
      if (user.driverId !== driverId) return;

      try {
        await prisma.driver.update({
          where: { id: driverId },
          data: { status: 'AVAILABLE', lastSeenAt: new Date() },
        });

        io.to('admin').emit(SOCKET_EVENTS.DRIVER_ONLINE, {
          driverId,
          status: 'AVAILABLE',
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Driver connect error:', err);
      }
    });

    // Disconnect handler
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      if (user?.role === 'DRIVER' && user.driverId) {
        try {
          await prisma.driver.update({
            where: { id: user.driverId },
            data: { status: 'OFFLINE', lastSeenAt: new Date() },
          });
          io.to('admin').emit(SOCKET_EVENTS.DRIVER_OFFLINE, {
            driverId: user.driverId,
            status: 'OFFLINE',
            timestamp: new Date().toISOString(),
          });
        } catch (err) {
          console.error('Driver disconnect error:', err);
        }
      }
    });
  });

  console.log('✅ Socket.IO handlers configured');
}
