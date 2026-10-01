import { Router, Response } from 'express';
import { prisma } from '../db/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

export const notificationsRouter = Router();

// GET /api/notifications
notificationsRouter.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json({
      success: true,
      data: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read
notificationsRouter.patch('/:id/read', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    if (notification.userId !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await prisma.notification.update({
      where: { id: req.params.id },
      data: { isRead: true },
    });

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to mark notification as read' });
  }
});

// PATCH /api/notifications/read-all
notificationsRouter.patch('/read-all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true },
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to mark all as read' });
  }
});
