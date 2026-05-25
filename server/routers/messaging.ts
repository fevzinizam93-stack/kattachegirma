import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { adminProcedure } from "./_shared";
import {
  getAdminConversations,
  getOrCreateConversation,
  getConversationMessages,
  getSellerConversation,
  sendMessage,
  markConversationRead,
  countUnreadMessages,
  getSellerByUserId,
  createNotification,
  getUserById,
} from "../db";

export const messagingRouter = router({
  // Admin: list all conversations with sellers
  adminConversations: adminProcedure.query(async ({ ctx }) => {
    const convs = await getAdminConversations(ctx.user.id);
    const enriched = await Promise.all(
      convs.map(async (conv) => {
        const sellerUser = await getUserById(conv.sellerId);
        // Count unread messages for admin in this conversation
        const msgs = await getConversationMessages(conv.id);
        const unread = msgs.filter((m) => !m.isRead && m.senderId !== ctx.user.id).length;
        return { ...conv, sellerName: sellerUser?.name ?? "Продавец", unread };
      })
    );
    return enriched;
  }),

  // Admin: open/create conversation with a specific seller (by seller user ID)
  openConversation: adminProcedure
    .input(z.object({ sellerUserId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const conv = await getOrCreateConversation(ctx.user.id, input.sellerUserId);
      if (!conv) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const msgs = await getConversationMessages(conv.id);
      await markConversationRead(conv.id, ctx.user.id);
      return { conversation: conv, messages: msgs };
    }),

  // Seller: get their own conversation with admin
  sellerConversation: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "admin") {
      return { conversation: null, messages: [] };
    }
    const sellerProfile = await getSellerByUserId(ctx.user.id);
    if (!sellerProfile) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Only sellers can access messages" });
    }
    const conv = await getSellerConversation(ctx.user.id);
    if (!conv) return { conversation: null, messages: [] };
    const msgs = await getConversationMessages(conv.id);
    await markConversationRead(conv.id, ctx.user.id);
    return { conversation: conv, messages: msgs };
  }),

  // Send a message — admin can send to any seller, seller can only reply in their own conv
  send: protectedProcedure
    .input(z.object({
      conversationId: z.number(),
      body: z.string().min(1).max(2000),
    }))
    .mutation(async ({ input, ctx }) => {
      let isParticipant = false;
      if (ctx.user.role === "admin") {
        const adminConvs = await getAdminConversations(ctx.user.id);
        isParticipant = adminConvs.some((c) => c.id === input.conversationId);
      } else {
        const sellerConv = await getSellerConversation(ctx.user.id);
        isParticipant = sellerConv?.id === input.conversationId;
      }
      if (!isParticipant) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Not a participant of this conversation" });
      }
      await sendMessage({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        body: input.body,
      });
      // If admin sent the message, create an in-app notification for the seller
      if (ctx.user.role === "admin") {
        const adminConvs = await getAdminConversations(ctx.user.id);
        const conv = adminConvs.find((c) => c.id === input.conversationId);
        if (conv) {
          await createNotification({
            userId: conv.sellerId,
            title: "Новое сообщение от администратора",
            message: input.body.length > 80 ? input.body.slice(0, 80) + "..." : input.body,
            orderId: null,
            type: "message",
          });
        }
      }
      return { success: true };
    }),

  // Count unread messages for the current user
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      const sellerProfile = await getSellerByUserId(ctx.user.id);
      if (!sellerProfile) return { count: 0 };
    }
    const count = await countUnreadMessages(ctx.user.id);
    return { count };
  }),
});
