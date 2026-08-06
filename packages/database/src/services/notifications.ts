import type { NotificationType } from "@prisma/client";
import { prisma } from "../client";

export function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}) {
  return prisma.notification.create({ data: input });
}

export function listNotificationsForUser(userId: string, options: { onlyUnread?: boolean } = {}) {
  return prisma.notification.findMany({
    where: { userId, ...(options.onlyUnread ? { readAt: null } : {}) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export function countUnreadNotifications(userId: string) {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export function markNotificationRead(id: string, userId: string) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { readAt: new Date() },
  });
}

export function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}
