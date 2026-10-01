import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/client';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { UserRole, DeliveryStatus, VALID_STATUS_TRANSITIONS } from '@dts/shared';
import { io } from '../index';
import { SOCKET_EVENTS } from '@dts/shared';
import { calculateETA } from '../services/etaService';
import { sendNotification } from '../services/notificationService';
import { v4 as uuidv4 } from 'uuid';

export const deliveriesRouter = Router();

// Serialize a delivery from Prisma to API format
function serializeDelivery(d: any) {
  return {
    id: d.id,
    trackingNumber: d.trackingNumber,
    customerId: d.customerId,
    driverId: d.driverId,
    status: d.status,
    estimatedArrival: d.estimatedArrival?.toISOString(),
    notes: d.notes,
    totalAmount: d.totalAmount,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    customer: d.customer ? {
      id: d.customer.id,
      userId: d.customer.userId,
      user: d.customer.user ? {
        id: d.customer.user.id,
        email: d.customer.user.email,
        name: d.customer.user.name,
        phone: d.customer.user.phone,
        role: d.customer.user.role,
        avatar: d.customer.user.avatar,
        createdAt: d.customer.user.createdAt.toISOString(),
      } : null,
    } : null,
    driver: d.driver ? serializeDriver(d.driver) : null,
    pickupAddress: d.pickupAddress,
    destinationAddress: d.destinationAddress,
  };
}

function serializeDriver(d: any) {
  return {
    id: d.id,
    userId: d.userId,
    vehicleType: d.vehicleType,
    vehicleNumber: d.vehicleNumber,
    rating: d.rating,
    totalDeliveries: d.totalDeliveries,
    totalEarnings: d.totalEarnings,
    status: d.status,
    currentLat: d.currentLat,
    currentLng: d.currentLng,
    lastSeenAt: d.lastSeenAt?.toISOString(),
    user: d.user ? {
      id: d.user.id,
      email: d.user.email,
      name: d.user.name,
      phone: d.user.phone,
      role: d.user.role,
      avatar: d.user.avatar,
      createdAt: d.user.createdAt.toISOString(),
    } : undefined,
  };
}

const deliveryInclude = {
  customer: { include: { user: true } },
  driver: { include: { user: true } },
  pickupAddress: true,
  destinationAddress: true,
};

// GET /api/deliveries - list deliveries (scoped by role)
deliveriesRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string || '1');
    const pageSize = Math.min(parseInt(req.query.pageSize as string || '20'), 100);
    const status = req.query.status as string | undefined;

    let where: any = {};

    if (req.user!.role === UserRole.CUSTOMER) {
      where.customerId = req.user!.customerId;
    } else if (req.user!.role === UserRole.DRIVER) {
      where.driverId = req.user!.driverId;
    }
    // ADMIN sees all

    if (status) where.status = status;

    const [items, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        include: deliveryInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.delivery.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        items: items.map(serializeDelivery),
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      },
    });
  } catch (err) {
    console.error('List deliveries error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch deliveries' });
  }
});

// GET /api/deliveries/track/:trackingNumber - public tracking
deliveriesRouter.get('/track/:trackingNumber', async (req, res: Response) => {
  try {
    const delivery = await prisma.delivery.findUnique({
      where: { trackingNumber: req.params.trackingNumber },
      include: deliveryInclude,
    });

    if (!delivery) {
      return res.status(404).json({ success: false, error: 'Delivery not found' });
    }

    // Public tracking: minimal data exposure
    return res.json({ success: true, data: serializeDelivery(delivery) });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch delivery' });
  }
});

// GET /api/deliveries/:id
deliveriesRouter.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id: req.params.id },
      include: deliveryInclude,
    });

    if (!delivery) {
      return res.status(404).json({ success: false, error: 'Delivery not found' });
    }

    // Customers can only see their own deliveries
    if (req.user!.role === UserRole.CUSTOMER && delivery.customerId !== req.user!.customerId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Drivers can only see assigned deliveries
    if (req.user!.role === UserRole.DRIVER && delivery.driverId !== req.user!.driverId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    return res.json({ success: true, data: serializeDelivery(delivery) });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch delivery' });
  }
});

// POST /api/deliveries - create new delivery
const createDeliverySchema = z.object({
  pickupAddress: z.object({
    label: z.string().optional(),
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    lat: z.number(),
    lng: z.number(),
  }),
  destinationAddress: z.object({
    label: z.string().optional(),
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    lat: z.number(),
    lng: z.number(),
  }),
  notes: z.string().optional(),
  totalAmount: z.number().min(0).optional(),
});

deliveriesRouter.post('/', requireAuth, requireRole(UserRole.CUSTOMER, UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const data = createDeliverySchema.parse(req.body);

    // Determine customer
    let customerId = req.user!.customerId;
    if (req.user!.role === UserRole.ADMIN && req.body.customerId) {
      customerId = req.body.customerId;
    }
    if (!customerId) {
      return res.status(400).json({ success: false, error: 'Customer ID required' });
    }

    const trackingNumber = `DLV-${Date.now().toString().slice(-8)}`;

    const [pickupAddr, destAddr] = await Promise.all([
      prisma.address.create({ data: data.pickupAddress }),
      prisma.address.create({ data: data.destinationAddress }),
    ]);

    const delivery = await prisma.delivery.create({
      data: {
        trackingNumber,
        customerId,
        pickupAddressId: pickupAddr.id,
        destinationAddressId: destAddr.id,
        notes: data.notes,
        totalAmount: data.totalAmount || 0,
        status: DeliveryStatus.ORDER_CREATED,
      },
      include: deliveryInclude,
    });

    await prisma.deliveryStatusHistory.create({
      data: {
        deliveryId: delivery.id,
        status: DeliveryStatus.ORDER_CREATED,
        note: 'Order placed',
      },
    });

    // Notify admin
    io.to('admin').emit(SOCKET_EVENTS.DELIVERY_CREATED, serializeDelivery(delivery));

    return res.status(201).json({ success: true, data: serializeDelivery(delivery) });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    console.error('Create delivery error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create delivery' });
  }
});

// PATCH /api/deliveries/:id/status - update delivery status
deliveriesRouter.patch('/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status, note } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' });
    }

    const delivery = await prisma.delivery.findUnique({
      where: { id: req.params.id },
      include: deliveryInclude,
    });

    if (!delivery) {
      return res.status(404).json({ success: false, error: 'Delivery not found' });
    }

    // Authorization check
    if (req.user!.role === UserRole.DRIVER && delivery.driverId !== req.user!.driverId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }
    if (req.user!.role === UserRole.CUSTOMER) {
      return res.status(403).json({ success: false, error: 'Customers cannot update status' });
    }

    // Validate transition
    const currentStatus = delivery.status as DeliveryStatus;
    const newStatus = status as DeliveryStatus;
    const validTransitions = VALID_STATUS_TRANSITIONS[currentStatus] || [];
    if (!validTransitions.includes(newStatus)) {
      return res.status(422).json({
        success: false,
        error: `Invalid transition from ${currentStatus} to ${newStatus}`,
      });
    }

    const updated = await prisma.delivery.update({
      where: { id: req.params.id },
      data: { status: newStatus, updatedAt: new Date() },
      include: deliveryInclude,
    });

    await prisma.deliveryStatusHistory.create({
      data: {
        deliveryId: delivery.id,
        status: newStatus,
        note: note || `Status changed to ${newStatus}`,
      },
    });

    const serialized = serializeDelivery(updated);

    // Broadcast to delivery room and admin
    io.to(`delivery:${delivery.id}`).emit(SOCKET_EVENTS.DELIVERY_STATUS, {
      deliveryId: delivery.id,
      status: newStatus,
      timestamp: new Date().toISOString(),
    });
    io.to('admin').emit(SOCKET_EVENTS.DELIVERY_STATUS, {
      deliveryId: delivery.id,
      status: newStatus,
      timestamp: new Date().toISOString(),
    });

    // Send notifications
    if (delivery.customer?.userId) {
      await sendNotification(io, delivery.customer.userId, newStatus, delivery.id, delivery.driver?.user?.name);
    }

    return res.json({ success: true, data: serialized });
  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update status' });
  }
});

// POST /api/deliveries/:id/assign-driver
deliveriesRouter.post('/:id/assign-driver', requireAuth, requireRole(UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const { driverId } = req.body;
    if (!driverId) {
      return res.status(400).json({ success: false, error: 'Driver ID required' });
    }

    const [delivery, driver] = await Promise.all([
      prisma.delivery.findUnique({ where: { id: req.params.id }, include: deliveryInclude }),
      prisma.driver.findUnique({ where: { id: driverId }, include: { user: true } }),
    ]);

    if (!delivery) return res.status(404).json({ success: false, error: 'Delivery not found' });
    if (!driver) return res.status(404).json({ success: false, error: 'Driver not found' });

    const updated = await prisma.delivery.update({
      where: { id: req.params.id },
      data: {
        driverId,
        status: DeliveryStatus.DRIVER_ASSIGNED,
        updatedAt: new Date(),
      },
      include: deliveryInclude,
    });

    await prisma.deliveryStatusHistory.create({
      data: {
        deliveryId: delivery.id,
        status: DeliveryStatus.DRIVER_ASSIGNED,
        note: `Driver ${driver.user.name} assigned`,
      },
    });

    await prisma.driver.update({
      where: { id: driverId },
      data: { status: 'BUSY' },
    });

    const serialized = serializeDelivery(updated);

    // Notify driver
    io.to(`driver:${driverId}`).emit(SOCKET_EVENTS.DELIVERY_ASSIGNED, serialized);
    io.to(`delivery:${delivery.id}`).emit(SOCKET_EVENTS.DELIVERY_ASSIGNED, serialized);
    io.to('admin').emit(SOCKET_EVENTS.DELIVERY_ASSIGNED, serialized);

    if (driver.user) {
      await sendNotification(io, driver.user.id, DeliveryStatus.DRIVER_ASSIGNED, delivery.id);
    }

    return res.json({ success: true, data: serialized });
  } catch (err) {
    console.error('Assign driver error:', err);
    return res.status(500).json({ success: false, error: 'Failed to assign driver' });
  }
});

// GET /api/deliveries/:id/location-history
deliveriesRouter.get('/:id/location-history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id } });
    if (!delivery) return res.status(404).json({ success: false, error: 'Delivery not found' });

    if (req.user!.role === UserRole.CUSTOMER && delivery.customerId !== req.user!.customerId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const history = await prisma.locationUpdate.findMany({
      where: { deliveryId: req.params.id },
      orderBy: { timestamp: 'asc' },
      take: 500,
    });

    return res.json({ success: true, data: history });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch location history' });
  }
});

// GET /api/deliveries/:id/status-history
deliveriesRouter.get('/:id/status-history', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const history = await prisma.deliveryStatusHistory.findMany({
      where: { deliveryId: req.params.id },
      orderBy: { timestamp: 'asc' },
    });
    return res.json({ success: true, data: history });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch status history' });
  }
});
