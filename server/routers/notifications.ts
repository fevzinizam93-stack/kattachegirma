import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getUserNotifications,
  countUnreadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../db";

export const notificationsRouter = router({
  // Get current user's notifications
  list: protectedProcedure.query(async ({ ctx }) => {
    return getUserNotifications(ctx.user.id);
  }),
  // Count unread notifications
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const count = await countUnreadNotifications(ctx.user.id);
    return { count };
  }),
  // Mark a single notification as read
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await markNotificationRead(input.id, ctx.user.id);
      return { success: true };
    }),
  // Mark all notifications as read
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.user.id);
    return { success: true };
  }),
});
