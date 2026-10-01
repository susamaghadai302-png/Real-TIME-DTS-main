import { Router, Response } from 'express';
import { prisma } from '../db/client';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { UserRole } from '@dts/shared';

export const adminRouter = Router();

// All admin routes require ADMIN role
adminRouter.use(requireAuth, requireRole(UserRole.ADMIN));

// GET /api/admin/stats
adminRouter.get('/stats', async (_req, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      activeDeliveries,
      availableDrivers,
      delayedDeliveries,
      completedToday,
      totalDrivers,
      totalCustomers,
      totalOrders,
    ] = await Promise.all([
      prisma.delivery.count({
        where: {
          status: {
            in: ['DRIVER_ASSIGNED', 'DRIVER_ACCEPTED', 'DRIVER_PICKED_UP', 'IN_TRANSIT', 'NEAR_DESTINATION'],
          },
        },
      }),
      prisma.driver.count({ where: { status: 'AVAILABLE' } }),
      prisma.delivery.count({ where: { status: 'DELAYED' } }),
      prisma.delivery.count({
        where: { status: 'DELIVERED', updatedAt: { gte: today } },
      }),
      prisma.driver.count(),
      prisma.customer.count(),
      prisma.delivery.count(),
    ]);

    const revenueResult = await prisma.delivery.aggregate({
      where: { status: 'DELIVERED', updatedAt: { gte: today } },
      _sum: { totalAmount: true },
    });

    return res.json({
      success: true,
      data: {
        activeDeliveries,
        availableDrivers,
        delayedDeliveries,
        completedToday,
        totalDrivers,
        totalCustomers,
        totalOrders,
        revenueToday: revenueResult._sum.totalAmount || 0,
      },
    });
  } catch (err) {
    console.error('Admin stats error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/deliveries - all deliveries with filters
adminRouter.get('/deliveries', async (req, res: Response) => {
  try {
    const page = parseInt(req.query.page as string || '1');
    const pageSize = Math.min(parseInt(req.query.pageSize as string || '50'), 200);
    const status = req.query.status as string | undefined;
    const driverId = req.query.driverId as string | undefined;

    const where: any = {};
    if (status) where.status = status;
    if (driverId) where.driverId = driverId;

    const [items, total] = await Promise.all([
      prisma.delivery.findMany({
        where,
        include: {
          customer: { include: { user: true } },
          driver: { include: { user: true } },
          pickupAddress: true,
          destinationAddress: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.delivery.count({ where }),
    ]);

    const serialized = items.map((d) => ({
      id: d.id,
      trackingNumber: d.trackingNumber,
      status: d.status,
      totalAmount: d.totalAmount,
      estimatedArrival: d.estimatedArrival?.toISOString(),
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
      customer: d.customer ? {
        id: d.customer.id,
        name: d.customer.user?.name,
        phone: d.customer.user?.phone,
        email: d.customer.user?.email,
      } : null,
      driver: d.driver ? {
        id: d.driver.id,
        name: d.driver.user?.name,
        phone: d.driver.user?.phone,
        vehicleType: d.driver.vehicleType,
        vehicleNumber: d.driver.vehicleNumber,
        currentLat: d.driver.currentLat,
        currentLng: d.driver.currentLng,
        rating: d.driver.rating,
      } : null,
      pickupAddress: d.pickupAddress,
      destinationAddress: d.destinationAddress,
    }));

    return res.json({ success: true, data: { items: serialized, total, page, pageSize, hasMore: page * pageSize < total } });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch deliveries' });
  }
});

// GET /api/admin/drivers - drivers with live data
adminRouter.get('/drivers', async (_req, res: Response) => {
  try {
    const drivers = await prisma.driver.findMany({
      include: {
        user: true,
        deliveries: {
          where: {
            status: { in: ['DRIVER_ASSIGNED', 'DRIVER_ACCEPTED', 'DRIVER_PICKED_UP', 'IN_TRANSIT', 'NEAR_DESTINATION'] },
          },
          take: 1,
          include: { pickupAddress: true, destinationAddress: true, customer: { include: { user: true } } },
        },
      },
      orderBy: { lastSeenAt: 'desc' },
    });

    const STALE = parseInt(process.env.STALE_DRIVER_THRESHOLD_MS || '30000');

    return res.json({
      success: true,
      data: drivers.map((d) => {
        const lastSeen = d.lastSeenAt ? new Date(d.lastSeenAt).getTime() : 0;
        const isStale = Date.now() - lastSeen > STALE;
        return {
          id: d.id,
          name: d.user.name,
          phone: d.user.phone,
          avatar: d.user.avatar,
          vehicleType: d.vehicleType,
          vehicleNumber: d.vehicleNumber,
          rating: d.rating,
          totalDeliveries: d.totalDeliveries,
          totalEarnings: d.totalEarnings,
          status: isStale ? 'OFFLINE' : d.status,
          currentLat: d.currentLat,
          currentLng: d.currentLng,
          lastSeenAt: d.lastSeenAt?.toISOString(),
          isStale,
          activeDelivery: d.deliveries[0] || null,
        };
      }),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch drivers' });
  }
});

// GET /api/admin/customers
adminRouter.get('/customers', async (req, res: Response) => {
  try {
    const page = parseInt(req.query.page as string || '1');
    const pageSize = Math.min(parseInt(req.query.pageSize as string || '20'), 100);

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        include: { user: true },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.customer.count(),
    ]);

    return res.json({
      success: true,
      data: {
        items: items.map((c) => ({
          id: c.id,
          name: c.user.name,
          email: c.user.email,
          phone: c.user.phone,
          avatar: c.user.avatar,
          createdAt: c.createdAt.toISOString(),
        })),
        total,
        page,
        pageSize,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch customers' });
  }
});

// GET /api/admin/analytics
adminRouter.get('/analytics', async (_req, res: Response) => {
  try {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      return d;
    }).reverse();

    const dailyStats = await Promise.all(
      last7Days.map(async (day) => {
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);
        const [deliveries, completed, revenue] = await Promise.all([
          prisma.delivery.count({ where: { createdAt: { gte: day, lt: nextDay } } }),
          prisma.delivery.count({ where: { status: 'DELIVERED', updatedAt: { gte: day, lt: nextDay } } }),
          prisma.delivery.aggregate({
            where: { status: 'DELIVERED', updatedAt: { gte: day, lt: nextDay } },
            _sum: { totalAmount: true },
          }),
        ]);
        return {
          date: day.toISOString().split('T')[0],
          deliveries,
          completed,
          revenue: revenue._sum.totalAmount || 0,
        };
      })
    );

    const statusBreakdown = await prisma.delivery.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    return res.json({
      success: true,
      data: {
        dailyStats,
        statusBreakdown: statusBreakdown.map((s) => ({ status: s.status, count: s._count.id })),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch analytics' });
  }
});
