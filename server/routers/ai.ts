import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { adminProcedure } from "./_shared";
import { invokeLLM } from "../_core/llm";
import {
  getAllCategories,
  getProductBrands,
  getProducts,
  getAllStoreSettings,
} from "../db";

export const aiRouter = router({
  // Public: AI product search — returns product IDs ranked by relevance
  search: protectedProcedure
    .input(z.object({
      query: z.string().min(1).max(500),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ input }) => {
      const [categories, brands, products] = await Promise.all([
        getAllCategories(),
        getProductBrands(),
        getProducts({ limit: 200, offset: 0, approvedOnly: true }),
      ]);

      const catalogSummary = products.slice(0, 100).map((p) => ({
        id: p.id,
        name: p.name,
        brand: (p as any).brand,
        category: categories.find((c: any) => c.id === (p as any).categoryId)?.name,
        price: p.price,
        discount: (p as any).discount,
      }));

      const prompt = [
        "You are a product search assistant for an electronics store in Uzbekistan.",
        "Given a user query, return the IDs of the most relevant products from the catalog.",
        "",
        `User query: "${input.query}"`,
        "",
        "Available products (JSON):",
        JSON.stringify(catalogSummary, null, 2),
        "",
        `Return a JSON array of up to ${input.limit} product IDs, most relevant first.`,
        "Example: [42, 17, 8]",
        "Return ONLY the JSON array, no explanation.",
      ].join("\n");

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a product search assistant. Output only valid JSON arrays." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "product_ids",
            strict: true,
            schema: {
              type: "object",
              properties: {
                ids: { type: "array", items: { type: "number" }, description: "Product IDs sorted by relevance" },
              },
              required: ["ids"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      return { ids: (parsed.ids ?? []).slice(0, input.limit) as number[] };
    }),

  // Public: AI product recommendation based on a product
  recommend: protectedProcedure
    .input(z.object({
      productId: z.number(),
      limit: z.number().min(1).max(20).default(6),
    }))
    .query(async ({ input }) => {
      const products = await getProducts({ limit: 200, offset: 0, approvedOnly: true });
      const target = products.find((p) => p.id === input.productId);
      if (!target) return { ids: [] };

      const others = products.filter((p) => p.id !== input.productId).slice(0, 80);
      const prompt = [
        "You are a product recommendation engine for an electronics store.",
        `Target product: ${JSON.stringify({ id: target.id, name: target.name, brand: (target as any).brand, price: target.price })}`,
        "",
        "Other products:",
        JSON.stringify(others.map(p => ({ id: p.id, name: p.name, brand: (p as any).brand, price: p.price })), null, 2),
        "",
        `Return a JSON object with "ids" array of up to ${input.limit} most similar/complementary product IDs.`,
      ].join("\n");

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are a product recommendation engine. Output only valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "product_ids",
            strict: true,
            schema: {
              type: "object",
              properties: {
                ids: { type: "array", items: { type: "number" }, description: "Recommended product IDs" },
              },
              required: ["ids"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices?.[0]?.message?.content ?? "{}";
      const parsed = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      return { ids: (parsed.ids ?? []).slice(0, input.limit) as number[] };
    }),

  // Public: chat with AI shopping assistant
  chat: protectedProcedure
    .input(z.object({
      messages: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(4000),
      })).max(20),
      productContext: z.object({
        name: z.string(),
        price: z.number().optional(),
        category: z.string().optional(),
      }).optional(),
      viewedProducts: z.array(z.object({
        id: z.number(),
        name: z.string(),
        brand: z.string().nullable().optional(),
        price: z.string(),
        discount: z.number().nullable().optional(),
        categoryId: z.number().optional(),
        viewedAt: z.number().optional(),
      })).max(10).optional(),
    }))
    .mutation(async ({ input }) => {
      const products = await getProducts({ limit: 40, offset: 0 });
      const settings = await getAllStoreSettings();
      const settingsMap = settings as Record<string, string>;
      const storeName = settingsMap["store_name"] ?? "Katta Chegirma";
      const storePhone = settingsMap["phone"] ?? "";
      const storeAddress = settingsMap["address"] ?? "";
      const productLines = (products as Array<{ name: string; price: string; originalPrice?: string | null; brand?: string | null; stockCount?: number | null }>)
        .slice(0, 40).map((p) => {
        const priceNum = parseFloat(p.price) || 0;
        const origNum = p.originalPrice ? parseFloat(p.originalPrice) : null;
        const discount = origNum && origNum > priceNum
          ? ` (скидка ${Math.round((1 - priceNum / origNum) * 100)}%)`
          : "";
        const stock = p.stockCount != null ? ` [${p.stockCount} шт]` : "";
        return `- ${p.name}${p.brand ? ` (${p.brand})` : ""}: ${priceNum.toLocaleString("ru")} сум${discount}${stock}`;
      }).join("\n");
      let viewedSection = "";
      if (input.viewedProducts && input.viewedProducts.length > 0) {
        const viewedLines = input.viewedProducts.map((p) => {
          const priceNum = parseFloat(p.price) || 0;
          const discount = p.discount ? ` (скидка ${p.discount}%)` : "";
          return `- ${p.name}${p.brand ? ` (${p.brand})` : ""}: ${priceNum.toLocaleString("ru")} сум${discount}`;
        }).join("\n");
        viewedSection = `\n\nНедавно просмотренные товары пользователя (${input.viewedProducts.length} шт):\n${viewedLines}`;
      }
      const systemPrompt = `Ты — умный помощник интернет-магазина «${storeName}» (kattachegirma.uz).${viewedSection}\nТекущий каталог товаров (${products.length} позиций):\n${productLines}\nИнформация о магазине:\n- Телефон: ${storePhone || "+998 XX XXX-XX-XX"}\n- Адрес: ${storeAddress || "Узбекистан"}\n- Доставка: по всему Узбекистану\n- Оплата: наличными при получении\nПравила: Отвечай на русском, кратко. Рекомендуй товары из каталога с ценами.`;
      const llmMessages = [
        { role: "system" as const, content: systemPrompt },
        ...input.messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      ];
      if (input.productContext) {
        const lastUserIdx = [...llmMessages].reverse().findIndex((m) => m.role === "user");
        if (lastUserIdx !== -1) {
          const idx = llmMessages.length - 1 - lastUserIdx;
          llmMessages[idx] = {
            ...llmMessages[idx],
            content: `[Пользователь смотрит товар: ${input.productContext.name}${input.productContext.price ? ` за ${input.productContext.price.toLocaleString("ru")} сум` : ""}]\n${llmMessages[idx].content}`,
          };
        }
      }
      const result = await invokeLLM({ messages: llmMessages });
      const reply = result.choices?.[0]?.message?.content ?? "Извините, не смог ответить.";
      return { reply };
    }),

  // Admin: generate SEO meta description for a product
  generateMeta: adminProcedure
    .input(z.object({
      productName: z.string(),
      brand: z.string().optional(),
      categoryName: z.string().optional(),
      price: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const prompt = [
        "Generate a concise SEO meta description (120-155 characters) for a product page.",
        "Include the product name, brand, and a call to action.",
        "Write in Russian. Output ONLY the description text.",
        "",
        `Product: ${input.productName}`,
        input.brand ? `Brand: ${input.brand}` : "",
        input.categoryName ? `Category: ${input.categoryName}` : "",
        input.price ? `Price: ${input.price} сум` : "",
      ].filter(Boolean).join("\n");

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "You are an SEO copywriter. Write concise meta descriptions in Russian." },
          { role: "user", content: prompt },
        ],
      });

      const description = (response.choices?.[0]?.message?.content ?? "").toString().trim();
      return { description };
    }),
});
