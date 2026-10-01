import { Server as SocketIOServer } from 'socket.io';
import { prisma } from '../db/client';
import { DeliveryStatus, NotificationType, SOCKET_EVENTS } from '@dts/shared';

// Notification messages for each status transition
const CUSTOMER_MESSAGES: Partial<Record<DeliveryStatus, (driverName?: string) => { title: string; body: string }>> = {
  [DeliveryStatus.DRIVER_ASSIGNED]: (name) => ({
    title: '🚴 Driver Assigned',
    body: `${name || 'A driver'} has been assigned to your delivery.`,
  }),
  [DeliveryStatus.DRIVER_ACCEPTED]: (name) => ({
    title: '✅ Driver Accepted',
    body: `${name || 'Your driver'} has accepted the delivery and is on the way to pick up your order.`,
  }),
  [DeliveryStatus.DRIVER_PICKED_UP]: (name) => ({
    title: '📦 Package Picked Up',
    body: `${name || 'Your driver'} has picked up your package and is heading your way!`,
  }),
  [DeliveryStatus.NEAR_DESTINATION]: () => ({
    title: '📍 Almost There!',
    body: 'Your delivery is 5 minutes away. Please be ready to receive it.',
  }),
  [DeliveryStatus.DELIVERED]: () => ({
    title: '🎉 Delivered!',
    body: 'Your package has been delivered successfully. Thank you!',
  }),
  [DeliveryStatus.DELAYED]: () => ({
    title: '⏰ Delivery Delayed',
    body: 'Your delivery is experiencing a slight delay. We apologize for the inconvenience.',
  }),
};

const DRIVER_MESSAGES: Partial<Record<DeliveryStatus, () => { title: string; body: string }>> = {
  [DeliveryStatus.DRIVER_ASSIGNED]: () => ({
    title: '🆕 New Delivery Assigned',
    body: 'You have a new delivery assignment. Open the app to view details.',
  }),
};

/**
 * Send notification to a user via WebSocket and persist to DB
 */
export async function sendNotification(
  io: SocketIOServer,
  userId: string,
  status: DeliveryStatus,
  deliveryId: string,
  driverName?: string
) {
  try {
    const msgFn = CUSTOMER_MESSAGES[status];
    if (!msgFn) return;

    const { title, body } = msgFn(driverName);

    const notification = await prisma.notification.create({
      data: {
        userId,
        type: statusToNotificationType(status),
        title,
        body,
      },
    });

    // Emit to user's socket room (user:userId)
    io.to(`user:${userId}`).emit(SOCKET_EVENTS.NOTIFICATION, {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      timestamp: notification.createdAt.toISOString(),
    });
  } catch (err) {
    console.error('sendNotification error:', err);
  }
}

function statusToNotificationType(status: DeliveryStatus): string {
  const map: Partial<Record<DeliveryStatus, string>> = {
    [DeliveryStatus.DRIVER_ASSIGNED]: NotificationType.DRIVER_ASSIGNED,
    [DeliveryStatus.DRIVER_PICKED_UP]: NotificationType.DELIVERY_PICKED_UP,
    [DeliveryStatus.NEAR_DESTINATION]: NotificationType.DELIVERY_NEAR,
    [DeliveryStatus.DELIVERED]: NotificationType.DELIVERY_COMPLETED,
    [DeliveryStatus.DELAYED]: NotificationType.DELIVERY_DELAYED,
  };
  return map[status] || 'GENERAL';
}
