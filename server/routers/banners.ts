import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { adminProcedure } from "./_shared";
import {
  getActiveBanners,
  getAllBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from "../db";

export const bannersRouter = router({
  // Public: list active banners
  listActive: publicProcedure.query(async () => {
    return getActiveBanners();
  }),

  // Alias for listActive (used in some places as list)
  list: publicProcedure.query(async () => {
    return getActiveBanners();
  }),

  // Admin: list all banners
  listAll: adminProcedure.query(async () => {
    return getAllBanners();
  }),

  // Alias for listAll (used in some places as adminList)
  adminList: adminProcedure.query(async () => {
    return getAllBanners();
  }),

  // Admin: create banner
  create: adminProcedure
    .input(z.object({
      title: z.string().min(1).max(256),
      titleUz: z.string().max(256).optional(),
      description: z.string().optional(),
      descriptionUz: z.string().optional(),
      bgColor: z.string().max(32).default("#dc2626"),
      textColor: z.string().max(32).default("#ffffff"),
      link: z.string().max(512).optional(),
      linkText: z.string().max(128).optional(),
      linkTextUz: z.string().max(128).optional(),
      imageUrl: z.string().max(512).optional(),
      imageUrlMobile: z.string().max(512).optional(),
      imageUrlUz: z.string().max(512).optional(),
      imageUrlMobileUz: z.string().max(512).optional(),
      startsAt: z.date().optional(),
      endsAt: z.date().optional(),
      isActive: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
    }))
    .mutation(async ({ input }) => {
      const id = await createBanner(input);
      return { id };
    }),

  // Admin: update banner
  update: adminProcedure
    .input(z.object({
      id: z.number(),
      title: z.string().min(1).max(256).optional(),
      titleUz: z.string().max(256).optional(),
      description: z.string().optional(),
      descriptionUz: z.string().optional(),
      bgColor: z.string().max(32).optional(),
      textColor: z.string().max(32).optional(),
      link: z.string().max(512).optional(),
      linkText: z.string().max(128).optional(),
      linkTextUz: z.string().max(128).optional(),
      imageUrl: z.string().max(512).nullable().optional(),
      imageUrlMobile: z.string().max(512).nullable().optional(),
      imageUrlUz: z.string().max(512).nullable().optional(),
      imageUrlMobileUz: z.string().max(512).nullable().optional(),
      startsAt: z.date().nullable().optional(),
      endsAt: z.date().nullable().optional(),
      isActive: z.boolean().optional(),
      sortOrder: z.number().int().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateBanner(id, data);
      return { ok: true };
    }),

  // Admin: delete banner
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteBanner(input.id);
      return { ok: true };
    }),

  // Alias for upsert (old API compatibility)
  upsert: adminProcedure
    .input(z.object({
      id: z.number().optional(),
      title: z.string().min(1).max(256),
      titleUz: z.string().max(256).optional(),
      description: z.string().optional(),
      descriptionUz: z.string().optional(),
      bgColor: z.string().max(32).default("#dc2626"),
      textColor: z.string().max(32).default("#ffffff"),
      link: z.string().max(512).optional(),
      linkText: z.string().max(128).optional(),
      linkTextUz: z.string().max(128).optional(),
      imageUrl: z.string().max(512).optional(),
      imageUrlMobile: z.string().max(512).optional(),
      imageUrlUz: z.string().max(512).optional(),
      imageUrlMobileUz: z.string().max(512).optional(),
      startsAt: z.date().optional(),
      endsAt: z.date().optional(),
      isActive: z.boolean().default(true),
      sortOrder: z.number().int().default(0),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      if (id) {
        await updateBanner(id, data);
        return { id };
      }
      const newId = await createBanner(data);
      return { id: newId };
    }),
});
