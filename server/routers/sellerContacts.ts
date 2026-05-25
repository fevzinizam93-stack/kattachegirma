import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getSellerContacts,
  createSellerContact,
  deleteSellerContact,
  getSellerByUserId,
} from "../db";

export const sellerContactsRouter = router({
  // List all saved contacts — accessible to admin and sellers
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      const sellerProfile = await getSellerByUserId(ctx.user.id);
      if (!sellerProfile) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admin and sellers can access contacts" });
      }
    }
    return getSellerContacts();
  }),

  // Create a new contact
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(128),
      phone: z.string().min(5).max(64),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        const sellerProfile = await getSellerByUserId(ctx.user.id);
        if (!sellerProfile) throw new TRPCError({ code: "FORBIDDEN" });
      }
      const contact = await createSellerContact({
        name: input.name,
        phone: input.phone,
        createdBy: ctx.user.id,
      });
      return contact;
    }),

  // Delete a contact
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        const sellerProfile = await getSellerByUserId(ctx.user.id);
        if (!sellerProfile) throw new TRPCError({ code: "FORBIDDEN" });
      }
      await deleteSellerContact(input.id);
      return { success: true };
    }),
});
