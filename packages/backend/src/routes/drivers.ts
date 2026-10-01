import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { UserRole, DriverStatus, SOCKET_EVENTS } from '@dts/shared';
import { io } from '../index';
import { calculateETA } from '../services/etaService';

export const driversRouter = Router();

const STALE_THRESHOLD = parseInt(process.env.STALE_DRIVER_THRESHOLD_MS || '30000');

function serializeDriver(d: any) {
  const lastSeenAt = d.lastSeenAt ? new Date(d.lastSeenAt).toISOString() : null;
  const isStale = lastSeenAt
    ? Date.now() - new Date(lastSeenAt).getTime() > STALE_THRESHOLD
    : true;

  return {
    id: d.id,
    userId: d.userId,
    vehicleType: d.vehicleType,
    vehicleNumber: d.vehicleNumber,
    rating: d.rating,
    totalDeliveries: d.totalDeliveries,
    totalEarnings: d.totalEarnings,
    status: isStale && d.status !== 'OFFLINE' ? 'OFFLINE' : d.status,
    currentLat: d.currentLat,
    currentLng: d.currentLng,
    lastSeenAt,
    isStale,
    user: d.user ? {
      id: d.user.id,
      email: d.user.email,
      name: d.user.name,
      phone: d.user.phone,
      role: d.user.role,
      avatar: d.user.avatar,
      createdAt: d.user.createdAt.toISOString(),
    } : undefined,
    activeDelivery: d.deliveries?.[0] || null,
  };
}

// GET /api/drivers - list drivers (admin only except /me)
driversRouter.get('/', requireAuth, requireRole(UserRole.ADMIN), async (req, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const where = status ? { status } : {};

    const drivers = await prisma.driver.findMany({
      where,
      include: {
        user: true,
        deliveries: {
          where: {
            status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ACCEPTED', 'DRIVER_PICKED_UP', 'IN_TRANSIT', 'NEAR_DESTINATION'] },
          },
          take: 1,
          include: {
            pickupAddress: true,
            destinationAddress: true,
            customer: { include: { user: true } },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
      orderBy: { lastSeenAt: 'desc' },
    });

    return res.json({ success: true, data: drivers.map(serializeDriver) });
  } catch (err) {
    console.error('List drivers error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch drivers' });
  }
});

// GET /api/drivers/me
driversRouter.get('/me', requireAuth, requireRole(UserRole.DRIVER), async (req: AuthRequest, res: Response) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.user!.driverId },
      include: {
        user: true,
        deliveries: {
          where: {
            status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ACCEPTED', 'DRIVER_PICKED_UP', 'IN_TRANSIT', 'NEAR_DESTINATION'] },
          },
          take: 1,
          include: {
            pickupAddress: true,
            destinationAddress: true,
            customer: { include: { user: true } },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!driver) return res.status(404).json({ success: false, error: 'Driver not found' });
    return res.json({ success: true, data: serializeDriver(driver) });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch driver' });
  }
});

// GET /api/drivers/:id
driversRouter.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id },
      include: {
        user: true,
        deliveries: {
          where: {
            status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ACCEPTED', 'DRIVER_PICKED_UP', 'IN_TRANSIT', 'NEAR_DESTINATION'] },
          },
          take: 1,
          include: { pickupAddress: true, destinationAddress: true },
        },
      },
    });

    if (!driver) return res.status(404).json({ success: false, error: 'Driver not found' });

    // Drivers can only see themselves
    if (req.user!.role === UserRole.DRIVER && driver.id !== req.user!.driverId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    return res.json({ success: true, data: serializeDriver(driver) });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch driver' });
  }
});

// PATCH /api/drivers/:id/status - update driver status
driversRouter.patch('/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['ONLINE', 'AVAILABLE', 'BUSY', 'OFFLINE'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    const driver = await prisma.driver.findUnique({ where: { id: req.params.id } });
    if (!driver) return res.status(404).json({ success: false, error: 'Driver not found' });

    if (req.user!.role === UserRole.DRIVER && driver.id !== req.user!.driverId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const updated = await prisma.driver.update({
      where: { id: req.params.id },
      data: { status, lastSeenAt: new Date() },
      include: { user: true },
    });

    // Broadcast presence
    const event = status === 'OFFLINE' ? SOCKET_EVENTS.DRIVER_OFFLINE : SOCKET_EVENTS.DRIVER_ONLINE;
    io.to('admin').emit(event, {
      driverId: driver.id,
      status,
      timestamp: new Date().toISOString(),
    });

    return res.json({ success: true, data: serializeDriver(updated) });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// POST /api/drivers/:id/location - update driver location (via HTTP fallback)
const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  heading: z.number().optional(),
  speed: z.number().optional(),
  accuracy: z.number().optional(),
  deliveryId: z.string().optional(),
});

driversRouter.post('/:id/location', requireAuth, requireRole(UserRole.DRIVER), async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.driverId !== req.params.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const data = locationSchema.parse(req.body);

    // Update driver current location
    const driver = await prisma.driver.update({
      where: { id: req.params.id },
      data: {
        currentLat: data.lat,
        currentLng: data.lng,
        lastSeenAt: new Date(),
        status: 'BUSY',
      },
    });

    // Save location update
    await prisma.locationUpdate.create({
      data: {
        driverId: req.params.id,
        deliveryId: data.deliveryId,
        lat: data.lat,
        lng: data.lng,
        heading: data.heading,
        speed: data.speed,
        accuracy: data.accuracy,
      },
    });

    // Broadcast
    const payload = {
      driverId: req.params.id,
      deliveryId: data.deliveryId,
      lat: data.lat,
      lng: data.lng,
      heading: data.heading,
      speed: data.speed,
      accuracy: data.accuracy,
      timestamp: new Date().toISOString(),
    };

    if (data.deliveryId) {
      io.to(`delivery:${data.deliveryId}`).emit(SOCKET_EVENTS.DRIVER_LOCATION, payload);
    }
    io.to('admin').emit(SOCKET_EVENTS.DRIVER_LOCATION, payload);

    return res.json({ success: true, data: { received: true } });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    return res.status(500).json({ success: false, error: 'Failed to update location' });
  }
});

// GET /api/drivers/:id/deliveries - driver's delivery history
driversRouter.get('/:id/deliveries', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user!.role === UserRole.DRIVER && req.user!.driverId !== req.params.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const deliveries = await prisma.delivery.findMany({
      where: { driverId: req.params.id },
      include: {
        pickupAddress: true,
        destinationAddress: true,
        customer: { include: { user: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json({ success: true, data: deliveries });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch deliveries' });
  }
});
