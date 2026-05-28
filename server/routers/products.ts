import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../_core/trpc";
import { adminProcedure, sellerProcedure, getCached, setCached } from "./_shared";
import {
  getProducts,
  getProductBySlug,
  getProductById,
  getProductsByIds,
  getSimilarProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  countProducts,
  getSellerByUserId,
  getProductById as getProductByIdDb,
  getHitProducts,
  getProductsByCategories,
  toggleProductHit,
  toggleProductActive,
  incrementViewCount,
  getSlugExists,
  getPendingProducts,
  getProductsNeedingTranslation,
  getDb,
  getSalesProducts,
  getProductBrands,
  getSellerProducts,
  getAllCategories,
  getActiveBanners,
  getApprovedReviewsByProduct,
  getReviewCountsByProduct,
} from "../db";
import { eq } from "drizzle-orm";
import { products as productsTable } from "../../drizzle/schema";
import { storagePut } from "../storage";
import { optimizeImage } from "../_core/imageOptimizer";
import { pingSitemaps } from "../sitemap";
import { invokeLLM } from "../_core/llm";
import { createHash } from "crypto";
import { ENV } from "../_core/env";
import { notifyNewProduct, publishProductToChannel } from "../telegram";

export const productsRouter = router({
  list: publicProcedure
    .input(z.object({
      categoryId: z.number().optional(),
      search: z.string().optional(),
      featured: z.boolean().optional(),
      isPremium: z.boolean().optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      sortBy: z.enum(['newest', 'price_asc', 'price_desc', 'discount', 'rating', 'reviews', 'popularity'] as const).optional(),
      brands: z.array(z.string()).optional(),
      minRating: z.number().min(1).max(5).optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      // Cache simple home-page queries (no filters, first page) for 2 minutes
      const isSimpleQuery = !input.categoryId && !input.search && !input.featured &&
        !input.isPremium && !input.minPrice && !input.maxPrice && !input.brands?.length &&
        !input.minRating && input.offset === 0 && !input.sortBy;
      if (isSimpleQuery) {
        const cacheKey = `products:list:${input.limit}`;
        const cached = getCached<{ items: Awaited<ReturnType<typeof getProducts>>; total: number }>(cacheKey);
        if (cached) return cached;
        const items = await getProducts({ ...input, approvedOnly: true });
        const total = await countProducts({ approvedOnly: true });
        const result = { items, total };
        setCached(cacheKey, result);
        return result;
      }
      const items = await getProducts({ ...input, approvedOnly: true });
      const total = await countProducts({ categoryId: input.categoryId, search: input.search, approvedOnly: true, isPremium: input.isPremium, minPrice: input.minPrice, maxPrice: input.maxPrice, brands: input.brands, minRating: input.minRating });
      return { items, total };
    }),
  getBrands: publicProcedure
    .input(z.object({ categoryId: z.number().optional() }))
    .query(async ({ input }) => {
      return getProductBrands({ categoryId: input.categoryId });
    }),

  // Get min/max price for slider range (filtered by category/search)
  priceRange: publicProcedure
    .input(z.object({
      categoryId: z.number().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { min: 0, max: 50000000 };
      const { products: productsTable } = await import("../../drizzle/schema");
      const { sql: drizzleSql, and, like, eq } = await import("drizzle-orm");
      const conditions: any[] = [
        drizzleSql`${productsTable.isActive} = 1`,
        drizzleSql`${productsTable.isApproved} = 1`,
      ];
      if (input.categoryId) conditions.push(eq(productsTable.categoryId, input.categoryId));
      if (input.search) conditions.push(like(productsTable.name, `%${input.search}%`));
      const rows = await db
        .select({
          minPrice: drizzleSql<number>`MIN(CAST(${productsTable.price} AS DECIMAL))`,
          maxPrice: drizzleSql<number>`MAX(CAST(${productsTable.price} AS DECIMAL))`,
        })
        .from(productsTable)
        .where(and(...conditions));
      const row = rows[0];
      return {
        min: Math.floor(Number(row?.minPrice ?? 0)),
        max: Math.ceil(Number(row?.maxPrice ?? 50000000)),
      };
    }),

  // Admin: all products including unapproved
  adminList: adminProcedure
    .input(z.object({
      categoryId: z.number().optional(),
      search: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const items = await getProducts({ ...input, includeInactive: true });
      const total = await countProducts({ categoryId: input.categoryId, search: input.search, includeInactive: true });
      return { items, total };
    }),

  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const product = await getProductBySlug(input.slug);
      if (!product) throw new TRPCError({ code: "NOT_FOUND" });
      return product;
    }),
  getByIds: publicProcedure
    .input(z.object({ ids: z.array(z.number()) }))
    .query(async ({ input }) => {
      return getProductsByIds(input.ids);
    }),
  getSimilar: publicProcedure
    .input(z.object({ categoryId: z.number(), excludeId: z.number(), limit: z.number().default(8) }))
    .query(async ({ input }) => {
      return getSimilarProducts(input.categoryId, input.excludeId, input.limit);
    }),

  incrementView: publicProcedure
    .input(z.object({ productId: z.number() }))
    .mutation(async ({ input }) => {
      const newCount = await incrementViewCount(input.productId);
      return { viewCount: newCount };
    }),
  similar: publicProcedure
    .input(z.object({ categoryId: z.number(), excludeId: z.number(), limit: z.number().default(8) }))
    .query(async ({ input }) => {
      return getSimilarProducts(input.categoryId, input.excludeId, input.limit);
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string(),
      nameUz: z.string().optional(),
      slug: z.string(),
      description: z.string().optional(),
      descriptionUz: z.string().optional(),
      categoryId: z.number(),
      brand: z.string().optional(),
      price: z.string(),
      priceUsd: z.coerce.number().optional(),
      originalPrice: z.string().optional(),
      originalPriceUsd: z.coerce.number().optional(),
      discount: z.number().default(0),
      imageUrl: z.string().optional(),
      images: z.array(z.string()).optional(),
      stock: z.number().default(0),
      isNew: z.boolean().default(false),
      isFeatured: z.boolean().default(false),
      isHit: z.boolean().default(false),
      isPremium: z.boolean().default(false),
      hitOrder: z.number().default(0),
      specs: z.record(z.string(), z.string()).optional(),
      sellerPhone: z.string().optional(),
      sellerTelegram: z.string().optional(),
      sellerName: z.string().optional(),
      stockCount: z.number().nullable().optional(),
      discountEndsAt: z.string().optional(),
      contactPhone: z.string().optional(),
      videoId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Normalize slug server-side: transliterate Cyrillic, strip emojis/special chars
      const cyrMap: Record<string, string> = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
      const translit = (s: string) => s.toLowerCase().split("").map(c => cyrMap[c] ?? c).join("");
      const rawSlug = translit(input.slug).replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
      const baseSlug = rawSlug || `product-${Date.now()}`;
      // Ensure slug uniqueness: add -2, -3, ... suffix if slug already exists
      let safeSlug = baseSlug;
      let suffix = 2;
      while (await getSlugExists(safeSlug)) {
        safeSlug = `${baseSlug}-${suffix++}`;
        if (suffix > 100) { safeSlug = `${baseSlug}-${Date.now()}`; break; }
      }
      // Convert empty string decimal fields to undefined (MySQL rejects empty strings for decimal columns)
      const toDecimal = (v: string | undefined) => (v && v.trim() !== '' ? v : undefined);
      const id = await createProduct({
        ...input,
        slug: safeSlug,
        price: toDecimal(input.price) as string,
        originalPrice: toDecimal(input.originalPrice),
        costPrice: toDecimal((input as any).costPrice),
        // Store USD prices directly in DB as source of truth (convert number → string for decimal column)
        priceUsd: input.priceUsd != null && input.priceUsd > 0 ? String(input.priceUsd) : undefined,
        originalPriceUsd: input.originalPriceUsd != null && input.originalPriceUsd > 0 ? String(input.originalPriceUsd) : undefined,
        images: input.images ?? [],
        specs: (input.specs ?? {}) as Record<string, string>,
        discountEndsAt: input.discountEndsAt ? new Date(input.discountEndsAt) : undefined,
        stockCount: input.stockCount ?? undefined,
        // Convert empty strings to undefined for optional text fields
        imageUrl: input.imageUrl || undefined,
        sellerPhone: input.sellerPhone || undefined,
        sellerTelegram: input.sellerTelegram || undefined,
        sellerName: input.sellerName || undefined,
        contactPhone: input.contactPhone || undefined,
        videoId: input.videoId || undefined,
      } as Parameters<typeof createProduct>[0]);
      pingSitemaps(`https://kattachegirma.uz/product/${safeSlug}`);
      return { id };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      nameUz: z.string().optional(),
      slug: z.string().optional(),
      description: z.string().optional(),
      descriptionUz: z.string().optional(),
      categoryId: z.number().optional(),
      brand: z.string().optional(),
      price: z.string().optional(),
      priceUsd: z.coerce.number().optional(),
      originalPrice: z.string().optional(),
      originalPriceUsd: z.coerce.number().optional(),
      discount: z.number().optional(),
      imageUrl: z.string().optional(),
      images: z.array(z.string()).optional(),
      stock: z.number().optional(),
      isNew: z.boolean().optional(),
      isFeatured: z.boolean().optional(),
      isHit: z.boolean().optional(),
      isPremium: z.boolean().optional(),
      hitOrder: z.number().optional(),
      specs: z.record(z.string(), z.string()).optional(),
      sellerPhone: z.string().optional(),
      sellerTelegram: z.string().optional(),
      sellerName: z.string().optional(),
      sellerId: z.number().optional(),
      isApproved: z.boolean().optional(),
      costPrice: z.string().optional(),
      stockCount: z.number().nullable().optional(),
      discountEndsAt: z.string().optional(),
      contactPhone: z.string().max(64).optional(),
      videoId: z.string().max(32).optional().nullable(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      // Helper: convert empty strings to undefined for decimal/varchar fields (MySQL rejects empty string for decimal)
      const toDecimalOrUndef = (v: string | undefined | null) => (v != null && v.trim() !== '' ? v : undefined);
      const toStrOrUndef = (v: string | undefined | null) => (v != null && v.trim() !== '' ? v : undefined);
      const updateData: Record<string, unknown> = {
        ...data,
        specs: data.specs as Record<string, string> | undefined,
        // Store USD prices directly in DB as source of truth
        priceUsd: data.priceUsd != null && data.priceUsd > 0 ? String(data.priceUsd) : undefined,
        originalPriceUsd: data.originalPriceUsd != null && data.originalPriceUsd > 0 ? String(data.originalPriceUsd) : undefined,
        // Sanitize decimal fields
        price: toDecimalOrUndef(data.price),
        originalPrice: toDecimalOrUndef(data.originalPrice),
        costPrice: toDecimalOrUndef(data.costPrice),
        // Sanitize varchar fields that should be null when empty
        videoId: toStrOrUndef(data.videoId),
        sellerTelegram: toStrOrUndef(data.sellerTelegram),
        sellerName: toStrOrUndef(data.sellerName),
        sellerPhone: toStrOrUndef(data.sellerPhone),
        contactPhone: toStrOrUndef(data.contactPhone),
      };
      if (data.discountEndsAt) updateData.discountEndsAt = new Date(data.discountEndsAt);
      else if (data.discountEndsAt === '') updateData.discountEndsAt = null;
      await updateProduct(id, updateData as Parameters<typeof updateProduct>[1]);
      // Fetch current slug to build the product URL for Google Indexing API
      const updatedProduct = await getProductById(id);
      if (updatedProduct?.slug) {
        pingSitemaps(`https://kattachegirma.uz/product/${updatedProduct.slug}`);
      } else {
        pingSitemaps();
      }
      return { success: true };
    }),
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      // Fetch slug before deletion so Google can be notified of URL_DELETED
      const productToDelete = await getProductById(input.id);
      await deleteProduct(input.id);
      if (productToDelete?.slug) {
        pingSitemaps(`https://kattachegirma.uz/product/${productToDelete.slug}`, true);
      } else {
        pingSitemaps();
      }
      return { success: true };
    }),

  uploadImage: adminProcedure
    .input(z.object({
      productId: z.number(),
      base64: z.string(),
      mimeType: z.string(),
      filename: z.string(),
    }))
    .mutation(async ({ input }) => {
      const rawBuffer = Buffer.from(input.base64, "base64");
      // Convert to WebP at upload time for faster delivery
      const optimized = await optimizeImage(rawBuffer, input.filename);
      const ts = Date.now();
      const fullKey = `products/${input.productId}/${ts}-${optimized.fullFilename}`;
      const thumbKey = `products/${input.productId}/${ts}-${optimized.thumbFilename}`;
      const [{ url }, { url: thumbUrl }] = await Promise.all([
        storagePut(fullKey, optimized.fullBuffer, optimized.fullMimeType),
        storagePut(thumbKey, optimized.thumbBuffer, optimized.thumbMimeType),
      ]);
      await updateProduct(input.productId, { imageUrl: url, thumbUrl });
      return { url, thumbUrl };
    }),

  // Seller: upload image (returns URL only, no product ID needed)
  sellerUploadImage: sellerProcedure
    .input(z.object({
      base64: z.string(),
      mimeType: z.string(),
      filename: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const seller = await getSellerByUserId(ctx.user.id);
      if (!seller) throw new TRPCError({ code: "FORBIDDEN", message: "Seller profile not found" });
      const rawBuffer = Buffer.from(input.base64, "base64");
      // Convert to WebP at upload time for faster delivery
      const optimized = await optimizeImage(rawBuffer, input.filename);
      const ts = Date.now();
      const key = `seller-products/${seller.id}/${ts}-${optimized.fullFilename}`;
      const { url } = await storagePut(key, optimized.fullBuffer, optimized.fullMimeType);
      return { url };
    }),

  // Seller: create product (pending approval)
  sellerCreate: sellerProcedure
    .input(z.object({
      name: z.string(),
      nameUz: z.string().optional(),
      slug: z.string(),
      description: z.string().optional(),
      descriptionUz: z.string().optional(),
      categoryId: z.number(),
      brand: z.string().optional(),
      price: z.string(),
      priceUsd: z.string().optional(),
      originalPrice: z.string().optional(),
      originalPriceUsd: z.string().optional(),
      discount: z.number().default(0),
      imageUrl: z.string().optional(),
      images: z.array(z.string()).optional(),
      stock: z.number().default(0),
      isNew: z.boolean().default(false),
      specs: z.record(z.string(), z.string()).optional(),
      contactPhone: z.string().max(64).optional(),
      videoId: z.string().max(32).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const seller = await getSellerByUserId(ctx.user.id);
      if (!seller) throw new TRPCError({ code: "FORBIDDEN", message: "Seller profile not found" });
      if (!seller.isApproved) throw new TRPCError({ code: "FORBIDDEN", message: "Seller not approved yet" });
      // Normalize slug: transliterate Cyrillic, strip leading/trailing dashes
      const cyrMap2: Record<string, string> = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"yo",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"kh",ц:"ts",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya" };
      const translit2 = (s: string) => s.toLowerCase().split("").map(c => cyrMap2[c] ?? c).join("");
      const rawSlug2 = translit2(input.slug).replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
      const safeSlug2 = rawSlug2 || `product-${Date.now()}`;
      const { priceUsd: _pu2, originalPriceUsd: _opu2, ...cleanInput } = input;
      const id = await createProduct({
        ...cleanInput,
        slug: safeSlug2,
        images: cleanInput.images ?? [],
        specs: (cleanInput.specs ?? {}) as Record<string, string>,
        sellerId: seller.id,
        sellerName: seller.name,
        sellerPhone: seller.phone ?? undefined,
        sellerTelegram: seller.telegram ?? undefined,
        isApproved: false,
        moderationStatus: "pending" as const,
        isFeatured: false,
      });
      // Send rich notification with inline Approve/Reject buttons
      notifyNewProduct({
        id,
        name: input.name,
        price: input.price,
        imageUrl: input.imageUrl,
        sellerName: seller.name,
        sellerPhone: seller.phone ?? undefined,
      }).catch(e => console.error("[Telegram] notifyNewProduct failed:", e));
      return { id };
    }),
  // Seller: update own product (only pending/rejected ones)
  sellerUpdate: sellerProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      nameUz: z.string().optional(),
      description: z.string().optional(),
      descriptionUz: z.string().optional(),
      categoryId: z.number().optional(),
      brand: z.string().optional(),
      price: z.string().optional(),
      priceUsd: z.string().optional(),
      originalPrice: z.string().optional(),
      originalPriceUsd: z.string().optional(),
      discount: z.number().optional(),
      imageUrl: z.string().optional(),
      images: z.array(z.string()).optional(),
      stock: z.number().optional(),
      isNew: z.boolean().optional(),
      specs: z.record(z.string(), z.string()).optional(),
      contactPhone: z.string().max(64).optional(),
      videoId: z.string().max(32).optional().nullable(),
    }))
    .mutation(async ({ input, ctx }) => {
      const seller = await getSellerByUserId(ctx.user.id);
      if (!seller) throw new TRPCError({ code: "FORBIDDEN", message: "Seller profile not found" });
      const { id, priceUsd: _pu3, originalPriceUsd: _opu3, ...data } = input;
      const product = await getProductByIdDb(id);
      if (!product || product.sellerId !== seller.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your product" });
      await updateProduct(id, { ...data, moderationStatus: "pending" as const, isApproved: false });
      return { ok: true };
    }),

  // Seller: delete own product
  sellerDelete: sellerProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const seller = await getSellerByUserId(ctx.user.id);
      if (!seller) throw new TRPCError({ code: "FORBIDDEN", message: "Seller profile not found" });
      const product = await getProductByIdDb(input.id);
      if (!product || product.sellerId !== seller.id) throw new TRPCError({ code: "FORBIDDEN", message: "Not your product" });
      await deleteProduct(input.id);
      return { ok: true };
    }),

  // Admin: auto-translate product name/description from RU to UZ
  translate: adminProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const prompt = [
        "Translate the following product information from Russian to Uzbek (Latin script, as used in modern Uzbekistan).",
        "Return ONLY a JSON object with keys \"nameUz\" and \"descriptionUz\". No extra text.",
        "",
        `Name (Russian): ${input.name}`,
        input.description ? `Description (Russian): ${input.description}` : "",
      ].filter(Boolean).join("\n");

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a professional Russian-to-Uzbek translator. Output only valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "product_translation",
            strict: true,
            schema: {
              type: "object",
              properties: {
                nameUz: { type: "string", description: "Product name in Uzbek" },
                descriptionUz: { type: "string", description: "Product description in Uzbek" },
              },
              required: ["nameUz", "descriptionUz"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      return {
        nameUz: parsed.nameUz ?? "",
        descriptionUz: parsed.descriptionUz ?? "",
      };
    }),

  // Admin: bulk translate all products without UZ fields
  bulkTranslate: adminProcedure
    .mutation(async () => {
      const toTranslate = await getProductsNeedingTranslation(2000);
      const total = toTranslate.length;
      let translated = 0;
      let skipped = 0;
      let errors = 0;

      // Process in batches of 5 to avoid LLM rate limits
      const BATCH_SIZE = 5;
      for (let i = 0; i < toTranslate.length; i += BATCH_SIZE) {
        const batch = toTranslate.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (product) => {
            try {
              // Skip if both fields already exist
              if (product.nameUz && product.descriptionUz) {
                skipped++;
                return;
              }
              const prompt = [
                "Translate the following product information from Russian to Uzbek (Latin script, as used in modern Uzbekistan).",
                "Return ONLY a JSON object with keys \"nameUz\" and \"descriptionUz\". No extra text.",
                "",
                `Name (Russian): ${product.name}`,
                product.description ? `Description (Russian): ${product.description}` : "",
              ].filter(Boolean).join("\n");

              const response = await invokeLLM({
                messages: [
                  { role: "system", content: "You are a professional Russian-to-Uzbek translator. Output only valid JSON." },
                  { role: "user", content: prompt },
                ],
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: "product_translation",
                    strict: true,
                    schema: {
                      type: "object",
                      properties: {
                        nameUz: { type: "string", description: "Product name in Uzbek" },
                        descriptionUz: { type: "string", description: "Product description in Uzbek" },
                      },
                      required: ["nameUz", "descriptionUz"],
                      additionalProperties: false,
                    },
                  },
                },
              });

              const content = response.choices?.[0]?.message?.content ?? "{}";
              const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));

              const updateData: Record<string, string> = {};
              if (!product.nameUz && parsed.nameUz) updateData.nameUz = parsed.nameUz;
              if (!product.descriptionUz && parsed.descriptionUz) updateData.descriptionUz = parsed.descriptionUz;

              if (Object.keys(updateData).length > 0) {
                await updateProduct(product.id, updateData as any);
                translated++;
              } else {
                skipped++;
              }
            } catch (e) {
              console.error(`[bulkTranslate] Error translating product ${product.id}:`, e);
              errors++;
            }
          })
        );
        // Small delay between batches to be gentle on the LLM API
        if (i + BATCH_SIZE < toTranslate.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      return { total, translated, skipped, errors };
    }),

  // Public: translate product description on demand (RU→UZ) for users who don't know Russian
  translateDescription: publicProcedure
    .input(z.object({
      text: z.string().min(1).max(8000),
    }))
    .mutation(async ({ input }) => {
      // Cache by text hash: same text won't be translated via AI again (saves cost + latency)
      const cacheKey = `translate:uz:${createHash("sha1").update(input.text).digest("hex")}`;
      const cached = getCached<{ translated: string }>(cacheKey);
      if (cached) return cached;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a professional Russian-to-Uzbek translator. Translate the given text to Uzbek using modern Latin script (as used in Uzbekistan). Output only the translated text, no explanations." },
          { role: "user", content: input.text },
        ],
      });
      const raw = response.choices?.[0]?.message?.content ?? "";
      const result = { translated: typeof raw === "string" ? raw : JSON.stringify(raw) };
      setCached(cacheKey, result, 24 * 60 * 60 * 1000); // cache for 24 hours
      return result;
    }),

  // Admin: generate UZ slugs for all products via LLM (uses nameUz if available, else name)
  generateUzSlugs: adminProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      const allProducts = await getProducts({ limit: 5000, offset: 0, includeInactive: true });
      const needsSlug = allProducts.filter((p: any) => !p.slugUz);
      let updated = 0;
      const BATCH_SIZE = 10;
      for (let i = 0; i < needsSlug.length; i += BATCH_SIZE) {
        const batch = needsSlug.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(async (p: any) => {
          try {
            const sourceName = p.nameUz || p.name;
            const response = await invokeLLM({
              messages: [
                { role: "system", content: "You are a URL slug generator. Given a product name (Russian or Uzbek), generate a short SEO-friendly URL slug in Uzbek Latin script. Use hyphens between words, only lowercase a-z, 0-9 and hyphens, max 80 chars. Output ONLY the slug, nothing else." },
                { role: "user", content: sourceName },
              ],
            });
            const raw = (response.choices?.[0]?.message?.content ?? "").toString().trim().toLowerCase();
            const slugUz = raw.replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
            if (slugUz) {
              await db.update(productsTable).set({ slugUz } as any).where(eq(productsTable.id, p.id));
              updated++;
            }
          } catch { /* skip on error */ }
        }));
        await new Promise(r => setTimeout(r, 300));
      }
      return { total: needsSlug.length, updated };
    }),

  // Admin/Seller: generate unique SEO description for a product using AI
  generateDescription: protectedProcedure
    .input(z.object({
      productId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const product = await getProductById(input.productId);
      if (!product) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found" });
      // Allow admin or the seller who owns the product
      if (ctx.user.role !== "admin") {
        const seller = await getSellerByUserId(ctx.user.id);
        if (!seller || (product as any).sellerId !== seller.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
        }
      }
      const allCategories = await (await import("../db")).getAllCategories();
      const category = allCategories.find((c: any) => c.id === (product as any).categoryId);
      const categoryName = category ? (category as any).name : "бытовая техника";

      const prompt = [
        "Ты — SEO-копирайтер интернет-магазина бытовой техники в Узбекистане.",
        "Напиши уникальное, привлекательное описание товара для карточки товара (150-250 слов).",
        "Описание должно:",
        "- Содержать ключевые слова для поиска (название, бренд, категория)",
        "- Описывать преимущества и характеристики товара",
        "- Быть написано простым языком для покупателей",
        "- Включать призыв к покупке",
        "",
        `Товар: ${product.name}`,
        `Бренд: ${(product as any).brand || 'не указан'}`,
        `Категория: ${categoryName}`,
        `Цена: ${product.price} сум`,
        (product as any).originalPrice ? `Старая цена: ${(product as any).originalPrice} сум (скидка!)` : "",
        (product as any).specs && Object.keys((product as any).specs).length > 0 ? `Характеристики: ${JSON.stringify((product as any).specs)}` : "",
        "",
        "Верни JSON с двумя полями:",
        '"description" — описание на русском языке',
        '"descriptionUz" — описание на узбекском языке (латиница)',
      ].filter(Boolean).join("\n");

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Ты SEO-копирайтер. Пиши только JSON без дополнительного текста." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "product_description",
            strict: true,
            schema: {
              type: "object",
              properties: {
                description: { type: "string", description: "Product description in Russian" },
                descriptionUz: { type: "string", description: "Product description in Uzbek Latin" },
              },
              required: ["description", "descriptionUz"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      const description = parsed.description ?? "";
      const descriptionUz = parsed.descriptionUz ?? "";

      // Save to DB
      await updateProduct(input.productId, { description, descriptionUz } as any);

      return { description, descriptionUz };
    }),

  // Admin: bulk generate descriptions for all products without descriptions
  bulkGenerateDescriptions: adminProcedure
    .mutation(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      const allProducts = await getProducts({ limit: 5000, offset: 0, includeInactive: true });
      const needsDescription = allProducts.filter((p: any) => !p.description || p.description.trim().length < 20);
      const total = needsDescription.length;
      let generated = 0;
      let skipped = 0;
      let errors = 0;

      const allCategories = await (await import("../db")).getAllCategories();

      const BATCH_SIZE = 3;
      for (let i = 0; i < needsDescription.length; i += BATCH_SIZE) {
        const batch = needsDescription.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (product: any) => {
            try {
              const category = allCategories.find((c: any) => c.id === product.categoryId);
              const categoryName = category ? (category as any).name : "бытовая техника";

              const prompt = [
                "Ты — SEO-копирайтер интернет-магазина бытовой техники в Узбекистане.",
                "Напиши уникальное описание товара (150-250 слов) с ключевыми словами для поиска.",
                "",
                `Товар: ${product.name}`,
                `Бренд: ${product.brand || 'не указан'}`,
                `Категория: ${categoryName}`,
                product.specs && Object.keys(product.specs).length > 0 ? `Характеристики: ${JSON.stringify(product.specs)}` : "",
                "",
                "Верни JSON: {\"description\": \"...\", \"descriptionUz\": \"...\"}",
              ].filter(Boolean).join("\n");

              const response = await invokeLLM({
                messages: [
                  { role: "system", content: "Ты SEO-копирайтер. Пиши только JSON." },
                  { role: "user", content: prompt },
                ],
                response_format: {
                  type: "json_schema",
                  json_schema: {
                    name: "product_description",
                    strict: true,
                    schema: {
                      type: "object",
                      properties: {
                        description: { type: "string", description: "Product description in Russian" },
                        descriptionUz: { type: "string", description: "Product description in Uzbek Latin" },
                      },
                      required: ["description", "descriptionUz"],
                      additionalProperties: false,
                    },
                  },
                },
              });

              const content = response.choices?.[0]?.message?.content ?? "{}";
              const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));

              if (parsed.description && parsed.description.length > 20) {
                await updateProduct(product.id, {
                  description: parsed.description,
                  descriptionUz: parsed.descriptionUz || "",
                } as any);
                generated++;
              } else {
                skipped++;
              }
            } catch (e) {
              console.error(`[bulkGenerateDescriptions] Error for product ${product.id}:`, e);
              errors++;
            }
          })
        );
        if (i + BATCH_SIZE < needsDescription.length) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      return { total, generated, skipped, errors };
    }),

  // Seller: list own products
  sellerList: sellerProcedure.query(async ({ ctx }) => {
    const seller = await getSellerByUserId(ctx.user.id);
    if (!seller) return [];
    return getSellerProducts(seller.id);
  }),

  // Public: get sale products (with discount)
  getSales: publicProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => {
      return getSalesProducts(input.limit);
    }),
  // Get products grouped by categories — for homepage sections
  // Returns a map of { [categoryId]: product[] } with perCategory items each
  listByCategories: publicProcedure
    .input(z.object({
      categoryIds: z.array(z.number()),
      perCategory: z.number().default(8),
    }))
    .query(async ({ input }) => {
      const cacheKey = `products:byCategories:${input.categoryIds.sort().join(',')}_${input.perCategory}`;
      const cached = getCached<Record<number, unknown[]>>(cacheKey);
      if (cached) return cached;
      const result = await getProductsByCategories(input.categoryIds, input.perCategory);
      setCached(cacheKey, result, 3 * 60 * 1000); // 3 min cache
      return result;
    }),
  getHits: publicProcedure
    .input(z.object({ limit: z.number().optional() }))
    .query(async ({ input }) => {
      const cacheKey = `hits:${input.limit ?? 'all'}`;
      const cached = getCached<Awaited<ReturnType<typeof getHitProducts>>>(cacheKey);
      if (cached) return cached;
      const result = await getHitProducts(input.limit, true);
      setCached(cacheKey, result, 3 * 60 * 1000); // 3 min cache
      return result;
    }),

  // Admin: toggle isHit flag
  toggleHit: adminProcedure
    .input(z.object({ id: z.number(), isHit: z.boolean() }))
    .mutation(async ({ input }) => {
      await toggleProductHit(input.id, input.isHit);
      return { success: true };
    }),

  toggleActive: adminProcedure
    .input(z.object({ id: z.number(), isActive: z.boolean() }))
    .mutation(async ({ input }) => {
      await toggleProductActive(input.id, input.isActive);
      return { success: true };
    }),

  setVideoReview: protectedProcedure
    .input(z.object({ productId: z.number(), videoId: z.string().max(32).nullable() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        const product = await getProductById(input.productId);
        if (!product) throw new TRPCError({ code: "NOT_FOUND" });
        const seller = await getSellerByUserId(ctx.user.id);
        if (!seller || product.sellerId !== seller.id) throw new TRPCError({ code: "FORBIDDEN" });
      }
      await updateProduct(input.productId, { videoId: input.videoId ?? undefined });
      return { success: true };
    }),

  // Optimized: single request for home page data (hits + categories + banners)
  getHomePage: publicProcedure.query(async () => {
    const cacheKey = 'homepage:data';
    const cached = getCached<{
      hits: Awaited<ReturnType<typeof getHitProducts>>;
      categories: Awaited<ReturnType<typeof getAllCategories>>;
      banners: Awaited<ReturnType<typeof getActiveBanners>>;
    }>(cacheKey);
    if (cached) return cached;

    const [hits, categories, banners] = await Promise.all([
      getHitProducts(20, true),
      getAllCategories(),
      getActiveBanners(),
    ]);

    const result = { hits, categories, banners };
    setCached(cacheKey, result, 3 * 60 * 1000); // 3 minutes
    return result;
  }),

  // Optimized: single request for product detail page
  getProductPage: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const product = await getProductBySlug(input.slug);
      if (!product) return null;

      // Load category for breadcrumb and SEO (categoryName, categorySlug)
      const allCats = await getAllCategories();
      const category = allCats.find(c => c.id === product.categoryId) ?? null;

      const [reviews, similar, reviewSummary] = await Promise.all([
        getApprovedReviewsByProduct(product.id),
        getSimilarProducts(product.categoryId ?? 0, product.id, 8),
        getReviewCountsByProduct(product.id),
      ]);

      // Attach category info directly to product for client-side breadcrumb and JSON-LD
      const productWithCategory = {
        ...product,
        categoryName: category?.name ?? "",
        categorySlug: category?.slug ?? "",
      };

      return { product: productWithCategory, reviews, similar, reviewSummary };
    }),

  autoScanVideoReviews: adminProcedure
  .input(z.object({ overwrite: z.boolean().default(false) }))
    .mutation(async ({ input }) => {
      const apiKey = ENV.youtubeApiKey;
      if (!apiKey) return { updated: 0, skipped: 0 };
      const allProducts = await getProducts({ limit: 2000, offset: 0, approvedOnly: true });
      const CHANNEL_ID = "UCo0v66OjZ8Z3LujfipwuQUA";
      let updated = 0;
      let skipped = 0;
      for (const product of allProducts) {
        if (!input.overwrite && product.videoId) { skipped++; continue; }
        try {
          const q = encodeURIComponent(product.name.slice(0, 100));
          const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&q=${q}&type=video&maxResults=1&order=relevance&key=${apiKey}`;
          const res = await fetch(url);
          if (!res.ok) { skipped++; continue; }
          const json = await res.json() as { items?: Array<{ id: { videoId: string } }> };
          const videoId = json.items?.[0]?.id?.videoId ?? null;
          if (videoId) { await updateProduct(product.id, { videoId }); updated++; }
          else skipped++;
          await new Promise(r => setTimeout(r, 250));
        } catch { skipped++; }
      }
      return { updated, skipped };
    }),

  // ─── Publish product to Telegram channel ──────────────────────────────────
  publishToTelegram: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db.select().from(productsTable).where(eq(productsTable.id, input.id)).limit(1);
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND" });
      const product = rows[0];
      const result = await publishProductToChannel({
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        originalPrice: product.originalPrice,
        discount: product.discount,
        imageUrl: product.imageUrl,
        brand: product.brand,
      });
      if (!result.success) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: result.error });
      return { success: true };
    }),

  // Fix broken product slugs: remove leading/trailing/double dashes
  // Run once after deploy to clean up old DB records that Google has indexed with broken URLs
  fixBrokenSlugs: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

    const all = await db.select({ id: productsTable.id, slug: productsTable.slug }).from(productsTable);
    const fixed: Array<{ id: number; old: string; newSlug: string }> = [];

    const cleanSlug = (s: string) =>
      s.toLowerCase()
       .replace(/[^a-z0-9-]/g, "-")
       .replace(/-+/g, "-")        // collapse consecutive dashes
       .replace(/^-+|-+$/g, "")   // strip leading/trailing dashes
       .slice(0, 80);

    for (const p of all) {
      if (!p.slug) continue;
      const clean = cleanSlug(p.slug);
      if (clean !== p.slug && clean.length > 0) {
        // Ensure uniqueness: append id if collision
        const exists = all.find((x) => x.slug === clean && x.id !== p.id);
        const finalSlug = exists ? `${clean}-${p.id}` : clean;
        await db.update(productsTable).set({ slug: finalSlug }).where(eq(productsTable.id, p.id));
        fixed.push({ id: p.id, old: p.slug, newSlug: finalSlug });
      }
    }
    return { fixedCount: fixed.length, fixed };
  }),
});
